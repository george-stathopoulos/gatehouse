<?php
/**
 * The gateway: attribution, policy enforcement, request rewriting and logging.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hooks into the WordPress AI Client and the HTTP API.
 *
 * Flow for one `generate_*()` call:
 * 1. `wp_ai_client_prevent_prompt`  - attribute the caller, block it when paused or over budget.
 * 2. `wp_ai_client_before_generate_result` - start the timer.
 * 3. `http_request_args`            - redact personal data and add the brand brief.
 * 4. `http_response`                - restore redacted values in the answer.
 * 5. `wp_ai_client_after_generate_result`  - record model, tokens and cost.
 * Failed provider calls are recorded from `http_api_debug`.
 */
final class Gatehouse_Gateway {

	/**
	 * State of the call in flight.
	 *
	 * @var array
	 */
	private static $call = array();

	/**
	 * Redactor for the provider request in flight.
	 *
	 * @var Gatehouse_Redactor|null
	 */
	private static $redactor = null;

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_filter( 'wp_ai_client_prevent_prompt', array( __CLASS__, 'enforce' ), 20, 2 );
		add_action( 'wp_ai_client_before_generate_result', array( __CLASS__, 'before_generate' ) );
		add_action( 'wp_ai_client_after_generate_result', array( __CLASS__, 'after_generate' ) );
		add_filter( 'http_request_args', array( __CLASS__, 'rewrite_request' ), 20, 2 );
		add_filter( 'http_response', array( __CLASS__, 'restore_response' ), 5, 3 );
		add_action( 'http_api_debug', array( __CLASS__, 'record_failure' ), 10, 5 );
		add_filter( 'pre_http_request', array( __CLASS__, 'record_approval_block' ), 6, 3 );
	}

	/**
	 * Attribute the call and block it when policy says so.
	 *
	 * @param bool   $prevent Whether another filter already prevented the prompt.
	 * @param object $builder Clone of the prompt builder.
	 * @return bool
	 */
	public static function enforce( $prevent, $builder ) {
		$method = self::builder_method();
		$source = Gatehouse_Attribution::detect();

		self::$call = array(
			'source'  => $source,
			'method'  => $method,
			'started' => microtime( true ),
			'prompt'  => '',
		);

		$reason = self::block_reason( $source );
		if ( null === $reason ) {
			return $prevent;
		}

		// is_supported_*() checks are blocked silently so calling plugins can hide their AI UI;
		// only real generation attempts are recorded.
		if ( $method && 0 !== strpos( $method, 'is_supported' ) ) {
			Gatehouse_Ledger::insert(
				array(
					'source' => $source,
					'status' => 'blocked',
					'note'   => $reason,
				)
			);
		}
		return true;
	}

	/**
	 * State of the call in flight (source, prompt hash, redactions…), for add-ons.
	 *
	 * @return array
	 */
	public static function current_call() {
		return self::$call;
	}

	/**
	 * Why a source may not call AI right now, or null when it may.
	 *
	 * @param string $source Source id.
	 * @return string|null
	 */
	public static function block_reason( $source ) {
		$policy = Gatehouse_Settings::source( $source );
		if ( $policy['paused'] ) {
			return __( 'Source is paused', 'gatehouse' );
		}
		if ( $policy['budget'] > 0 && Gatehouse_Ledger::month_spend( $source ) >= $policy['budget'] ) {
			return __( 'Monthly budget reached', 'gatehouse' );
		}
		$global = (float) Gatehouse_Settings::get( 'global_budget' );
		if ( $global > 0 && Gatehouse_Ledger::month_spend( '__total' ) >= $global ) {
			return __( 'Site-wide monthly budget reached', 'gatehouse' );
		}
		return null;
	}

	/**
	 * Start timing a generation.
	 */
	public static function before_generate() {
		if ( ! self::$call ) {
			self::$call = array(
				'source'  => Gatehouse_Attribution::detect(),
				'method'  => '',
				'prompt'  => '',
			);
		}
		self::$call['started'] = microtime( true );
	}

	/**
	 * Record a successful generation.
	 *
	 * @param object $event AfterGenerateResultEvent.
	 */
	public static function after_generate( $event ) {
		$call = self::$call ? self::$call : array( 'source' => Gatehouse_Attribution::detect() );

		try {
			$model      = $event->getModel();
			$result     = $event->getResult();
			$usage      = $result->getTokenUsage();
			$model_id   = $model->metadata()->getId();
			$provider   = $model->providerMetadata()->getId();
			$capability = $event->getCapability() ? $event->getCapability()->value : '';
			$input      = (int) $usage->getPromptTokens();
			$output     = (int) $usage->getCompletionTokens() + (int) $usage->getThoughtTokens();
		} catch ( \Throwable $e ) {
			self::reset();
			return;
		}

		// Local models (WebLLM runs in the browser) cost nothing.
		$cost    = Gatehouse_Pricing::is_local( $provider ) ? 0.0 : Gatehouse_Pricing::cost( $model_id, $input, $output );
		$logging = Gatehouse_Settings::get( 'logging' );
		$excerpt = array();
		if ( ! empty( $logging['store_excerpts'] ) ) {
			$excerpt = array(
				'prompt_excerpt'   => mb_substr( (string) ( $call['prompt'] ?? '' ), 0, 1000 ),
				'response_excerpt' => mb_substr( self::result_text( $result ), 0, 1000 ),
			);
		}

		Gatehouse_Ledger::insert(
			array_merge(
				array(
					'source'        => $call['source'],
					'provider'      => $provider,
					'model'         => $model_id,
					'capability'    => $capability,
					'status'        => 'ok',
					'input_tokens'  => $input,
					'output_tokens' => $output,
					'cost'          => null === $cost ? 0 : $cost,
					'priced'        => null === $cost ? 0 : 1,
					'latency_ms'    => isset( $call['started'] ) ? (int) round( ( microtime( true ) - $call['started'] ) * 1000 ) : 0,
					'redactions'    => (int) ( $call['redactions'] ?? 0 ),
					'brief'         => ! empty( $call['brief'] ) ? 1 : 0,
					'prompt_hash'   => (string) ( $call['prompt_hash'] ?? '' ),
				),
				$excerpt
			)
		);

		self::reset();
	}

	/**
	 * Redact personal data and add the brand brief to an outgoing provider request.
	 *
	 * @param array  $args Request arguments.
	 * @param string $url  Request URL.
	 * @return array
	 */
	public static function rewrite_request( $args, $url ) {
		$method = isset( $args['method'] ) ? $args['method'] : 'GET';
		if ( empty( $args['body'] ) || ! is_string( $args['body'] ) || null === Gatehouse_Provider_Adapters::provider_for( $url, $method ) ) {
			return $args;
		}
		$body = json_decode( $args['body'], true );
		if ( ! is_array( $body ) ) {
			return $args;
		}

		$source    = self::$call['source'] ?? Gatehouse_Attribution::detect();
		$policy    = Gatehouse_Settings::source( $source );
		$redaction = Gatehouse_Settings::get( 'redaction' );
		$brief     = Gatehouse_Settings::get( 'brief' );
		$format    = Gatehouse_Provider_Adapters::text_format( $url );

		self::$redactor = null;
		if ( ! empty( $redaction['enabled'] ) && ! $policy['skip_redaction'] ) {
			self::$redactor = new Gatehouse_Redactor( $redaction );
			$body           = self::$redactor->redact_tree( $body );
		}

		$brief_applied = false;
		if ( $format && ! empty( $brief['enabled'] ) && '' !== trim( $brief['text'] ) && ! $policy['skip_brief'] ) {
			$body          = Gatehouse_Provider_Adapters::add_brief( $body, $format, $brief['text'] );
			$brief_applied = true;
		}

		self::$call['source']     = $source;
		self::$call['redactions'] = self::$redactor ? self::$redactor->count() : 0;
		self::$call['brief']      = $brief_applied;
		self::$call['prompt']     = self::prompt_text( $body );

		$args['body'] = wp_json_encode( $body );

		// Fingerprint of the request exactly as sent (after redaction, so personal data is not part of it).
		// Identical fingerprints mean a repeated prompt; nothing about the prompt itself is stored.
		self::$call['prompt_hash'] = sha1( (string) wp_parse_url( $url, PHP_URL_HOST ) . (string) wp_parse_url( $url, PHP_URL_PATH ) . '|' . $args['body'] );

		return $args;
	}

	/**
	 * Put redacted values back into the provider's answer.
	 *
	 * @param array|WP_Error $response Response.
	 * @param array          $args     Request arguments.
	 * @param string         $url      Request URL.
	 * @return array|WP_Error
	 */
	public static function restore_response( $response, $args, $url ) {
		if ( self::$redactor && is_array( $response ) && isset( $response['body'] ) && null !== Gatehouse_Provider_Adapters::provider_for( $url, $args['method'] ?? 'GET' ) ) {
			$response['body'] = self::$redactor->restore( $response['body'] );
			if ( isset( $response['http_response'] ) && $response['http_response'] instanceof WP_HTTP_Requests_Response ) {
				$response['http_response']->set_data( $response['body'] );
			}
		}
		return $response;
	}

	/**
	 * Record provider errors and network failures.
	 *
	 * @param array|WP_Error $response Response.
	 * @param string         $context  Context, `response`.
	 * @param string         $class    Transport class.
	 * @param array          $args     Request arguments.
	 * @param string         $url      Request URL.
	 */
	public static function record_failure( $response, $context, $class, $args, $url ) {
		$provider = Gatehouse_Provider_Adapters::provider_for( $url, $args['method'] ?? 'GET' );
		if ( 'response' !== $context || null === $provider ) {
			return;
		}

		if ( is_wp_error( $response ) ) {
			$note = $response->get_error_message();
		} else {
			$code = (int) wp_remote_retrieve_response_code( $response );
			if ( $code < 400 ) {
				return;
			}
			$note = self::error_message( wp_remote_retrieve_body( $response ), $code );
		}

		$call = self::$call;
		Gatehouse_Ledger::insert(
			array(
				'source'     => $call['source'] ?? Gatehouse_Attribution::detect(),
				'provider'   => $provider,
				'model'      => self::request_model( $args, $url ),
				'status'     => 'error',
				'latency_ms' => isset( $call['started'] ) ? (int) round( ( microtime( true ) - $call['started'] ) * 1000 ) : 0,
				'redactions' => (int) ( $call['redactions'] ?? 0 ),
				'brief'      => ! empty( $call['brief'] ) ? 1 : 0,
				'note'       => $note,
			)
		);
		self::reset();
	}

	/**
	 * Record calls stopped by the AI plugin's Connector Approval feature.
	 *
	 * That feature blocks unapproved callers from `pre_http_request` (priority 5), which bypasses
	 * WordPress's normal error reporting, so these calls would otherwise never appear in the log.
	 *
	 * @param false|array|WP_Error $pre  Short-circuit value.
	 * @param array                $args Request arguments.
	 * @param string               $url  URL.
	 * @return false|array|WP_Error Unchanged.
	 */
	public static function record_approval_block( $pre, $args, $url ) {
		static $logged = array();
		if ( ! is_wp_error( $pre ) || Gatehouse_Compat::APPROVAL_ERROR !== $pre->get_error_code() ) {
			return $pre;
		}
		// Any request to an AI provider counts, including the model lookup the AI Client makes
		// before generating, which is often the first request Connector Approval blocks.
		$hosts = Gatehouse_Provider_Adapters::hosts();
		$host  = (string) wp_parse_url( $url, PHP_URL_HOST );
		if ( ! isset( $hosts[ $host ] ) ) {
			return $pre;
		}
		$source = self::$call['source'] ?? Gatehouse_Attribution::detect();
		$key    = $source . '|' . $host . '|' . ( self::$call['started'] ?? '' );
		if ( isset( $logged[ $key ] ) ) {
			return $pre;
		}
		$logged[ $key ] = true;

		Gatehouse_Ledger::insert(
			array(
				'source'   => $source,
				'provider' => $hosts[ $host ],
				'model'    => self::request_model( $args, $url ),
				'status'   => 'blocked',
				'note'     => __( 'Not approved in AI → Connector Approval', 'gatehouse' ),
			)
		);
		return $pre;
	}


	/**
	 * Name of the prompt builder method that triggered the prevent filter.
	 *
	 * @return string
	 */
	private static function builder_method() {
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_debug_backtrace
		foreach ( debug_backtrace( 0, 12 ) as $frame ) {
			if ( isset( $frame['class'], $frame['function'], $frame['args'][0] ) && '__call' === $frame['function'] && is_a( $frame['class'], 'WP_AI_Client_Prompt_Builder', true ) ) {
				return (string) $frame['args'][0];
			}
		}
		return '';
	}

	/**
	 * Readable error from a provider error body.
	 *
	 * @param string $body Response body.
	 * @param int    $code HTTP status.
	 * @return string
	 */
	private static function error_message( $body, $code ) {
		$data = json_decode( (string) $body, true );
		$msg  = '';
		if ( isset( $data['error']['message'] ) ) {
			$msg = $data['error']['message'];
		} elseif ( isset( $data['error'] ) && is_string( $data['error'] ) ) {
			$msg = $data['error'];
		} elseif ( isset( $data['message'] ) ) {
			$msg = $data['message'];
		}
		return trim( 'HTTP ' . $code . ( $msg ? ': ' . $msg : '' ) );
	}

	/**
	 * Model id from a request body or Google-style URL.
	 *
	 * @param array  $args Request arguments.
	 * @param string $url  URL.
	 * @return string
	 */
	private static function request_model( $args, $url ) {
		$body = isset( $args['body'] ) && is_string( $args['body'] ) ? json_decode( $args['body'], true ) : null;
		if ( isset( $body['model'] ) && is_string( $body['model'] ) ) {
			return $body['model'];
		}
		if ( preg_match( '#/models/([^/:]+)#', (string) $url, $m ) ) {
			return $m[1];
		}
		return '';
	}

	/**
	 * Last user text in a (redacted) request body, for optional excerpts.
	 *
	 * @param array $body Decoded body.
	 * @return string
	 */
	private static function prompt_text( array $body ) {
		$texts = array();
		array_walk_recursive(
			$body,
			function ( $value, $key ) use ( &$texts ) {
				if ( is_string( $value ) && in_array( $key, array( 'text', 'content', 'input', 'prompt' ), true ) ) {
					$texts[] = $value;
				}
			}
		);
		return $texts ? (string) end( $texts ) : '';
	}

	/**
	 * Plain text of a result, if any.
	 *
	 * @param object $result GenerativeAiResult.
	 * @return string
	 */
	private static function result_text( $result ) {
		try {
			return (string) $result->toText();
		} catch ( \Throwable $e ) {
			return '';
		}
	}

	/**
	 * Clear per-call state.
	 */
	private static function reset() {
		self::$call     = array();
		self::$redactor = null;
	}
}
