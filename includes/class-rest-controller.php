<?php
/**
 * REST API for the admin dashboard.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

/**
 * Routes under `gatehouse/v1`. Every route requires `manage_options`.
 */
final class Gatehouse_REST_Controller {

	const NS = 'gatehouse/v1';

	/**
	 * Register routes.
	 */
	public static function register() {
		$admin = array( __CLASS__, 'can_manage' );

		register_rest_route(
			self::NS,
			'/overview',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'overview' ),
				'permission_callback' => $admin,
				'args'                => array(
					'days' => array(
						'type'    => 'integer',
						'default' => 30,
						'minimum' => 1,
						'maximum' => 365,
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/sources',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'sources' ),
					'permission_callback' => $admin,
					'args'                => array(
						'days' => array(
							'type'    => 'integer',
							'default' => 30,
							'minimum' => 1,
							'maximum' => 365,
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_source' ),
					'permission_callback' => $admin,
					'args'                => array(
						'source' => array(
							'type'     => 'string',
							'required' => true,
						),
						'policy' => array(
							'type'     => 'object',
							'required' => true,
						),
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/requests',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'requests' ),
					'permission_callback' => $admin,
					'args'                => array(
						'page'     => array(
							'type'    => 'integer',
							'default' => 1,
							'minimum' => 1,
						),
						'per_page' => array(
							'type'    => 'integer',
							'default' => 25,
							'minimum' => 1,
							'maximum' => 200,
						),
						'source'   => array( 'type' => 'string' ),
						'status'   => array(
							'type' => 'string',
							'enum' => array( '', 'ok', 'blocked', 'error' ),
						),
						'model'    => array( 'type' => 'string' ),
						'redacted' => array( 'type' => 'boolean' ),
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'clear_requests' ),
					'permission_callback' => $admin,
				),
			)
		);

		register_rest_route(
			self::NS,
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'get_settings' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( __CLASS__, 'update_settings' ),
					'permission_callback' => $admin,
				),
			)
		);

		register_rest_route(
			self::NS,
			'/setup',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'setup' ),
					'permission_callback' => $admin,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'complete_setup' ),
					'permission_callback' => $admin,
				),
			)
		);

		register_rest_route(
			self::NS,
			'/demo',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'set_demo' ),
					'permission_callback' => $admin,
					'args'                => array(
						'enabled' => array(
							'type'     => 'boolean',
							'required' => true,
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'reset_demo' ),
					'permission_callback' => $admin,
				),
			)
		);

		register_rest_route(
			self::NS,
			'/prices/update',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'update_prices' ),
				'permission_callback' => $admin,
			)
		);

		register_rest_route(
			self::NS,
			'/redact-preview',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'redact_preview' ),
				'permission_callback' => $admin,
				'args'                => array(
					'text'      => array(
						'type'     => 'string',
						'required' => true,
					),
					'redaction' => array( 'type' => 'object' ),
				),
			)
		);
	}

	/**
	 * Permission check.
	 *
	 * @return bool
	 */
	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * GET /overview.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function overview( WP_REST_Request $request ) {
		return rest_ensure_response( Gatehouse_Stats::overview( (int) $request['days'] ) );
	}

	/**
	 * GET /sources.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function sources( WP_REST_Request $request ) {
		$now   = current_time( 'timestamp' ); // phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp.Requested
		$start = strtotime( gmdate( 'Y-m-d', $now ) ) - ( (int) $request['days'] - 1 ) * DAY_IN_SECONDS;
		return rest_ensure_response(
			array(
				'sources'   => Gatehouse_Stats::sources( $start, $now + 1 ),
				'order'     => Gatehouse_Stats::source_order(),
				'threshold' => (int) Gatehouse_Settings::get( 'alerts' )['threshold'],
				'month'     => Gatehouse_Stats::overview_month(),
			)
		);
	}

	/**
	 * POST /sources: update one source's policy.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_source( WP_REST_Request $request ) {
		$source = Gatehouse_Settings::source_id( $request['source'] );
		if ( '' === $source ) {
			return new WP_Error( 'gatehouse_invalid_source', __( 'Invalid source.', 'gatehouse' ), array( 'status' => 400 ) );
		}
		return rest_ensure_response(
			array(
				'source' => $source,
				'policy' => Gatehouse_Settings::update_source( $source, (array) $request['policy'] ),
			)
		);
	}

	/**
	 * GET /requests.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function requests( WP_REST_Request $request ) {
		$data           = Gatehouse_Stats::requests( $request->get_params() );
		$data['facets'] = Gatehouse_Stats::facets();
		return rest_ensure_response( $data );
	}

	/**
	 * DELETE /requests: clear the log.
	 *
	 * @return WP_REST_Response
	 */
	public static function clear_requests() {
		Gatehouse_Ledger::clear();
		return rest_ensure_response( array( 'cleared' => true ) );
	}

	/**
	 * GET /settings.
	 *
	 * @return WP_REST_Response
	 */
	public static function get_settings() {
		return rest_ensure_response( self::settings_payload() );
	}

	/**
	 * POST /settings.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function update_settings( WP_REST_Request $request ) {
		$input   = $request->get_json_params();
		$was_on  = Gatehouse_Price_Sync::enabled();
		Gatehouse_Settings::update( is_array( $input ) ? $input : array() );
		// Turning automatic prices on downloads them straight away instead of waiting a day.
		if ( ! $was_on && Gatehouse_Price_Sync::enabled() && ! Gatehouse_Demo::active() ) {
			Gatehouse_Price_Sync::update();
			Gatehouse_Price_Sync::schedule();
		}
		return rest_ensure_response( self::settings_payload() );
	}

	/**
	 * GET /setup: what the setup guide needs.
	 *
	 * @return WP_REST_Response
	 */
	public static function setup() {
		return rest_ensure_response( Gatehouse_Onboarding::status() );
	}

	/**
	 * POST /setup: save the guide's choices (budget, alerts, redaction) and, with `complete`,
	 * mark the guide as done.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function complete_setup( WP_REST_Request $request ) {
		$input = $request->get_json_params();
		$input = is_array( $input ) ? array_intersect_key( $input, array_flip( array( 'global_budget', 'alerts', 'redaction', 'prices_auto' ) ) ) : array();
		if ( $input ) {
			Gatehouse_Settings::update( $input );
		}
		if ( ! empty( $input['prices_auto'] ) && ! Gatehouse_Price_Sync::state()['updated_at'] ) {
			Gatehouse_Price_Sync::update();
		}
		if ( ! empty( $request['complete'] ) ) {
			Gatehouse_Onboarding::complete();
		}
		return rest_ensure_response( Gatehouse_Onboarding::status() );
	}

	/**
	 * POST /demo: switch demo mode for the current user.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function set_demo( WP_REST_Request $request ) {
		$created = 0;
		if ( $request['enabled'] ) {
			$created = Gatehouse_Demo::enable();
		} else {
			Gatehouse_Demo::disable();
		}
		return rest_ensure_response(
			array(
				'demo'    => Gatehouse_Demo::enabled_for_user(),
				'created' => $created,
			)
		);
	}

	/**
	 * DELETE /demo: delete the sample data and switch everyone back to live data.
	 *
	 * @return WP_REST_Response
	 */
	public static function reset_demo() {
		Gatehouse_Demo::reset();
		return rest_ensure_response( array( 'demo' => false ) );
	}

	/**
	 * POST /prices/update: download current prices now.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_prices() {
		if ( ! Gatehouse_Price_Sync::enabled() ) {
			return new WP_Error( 'gatehouse_prices_off', __( 'Automatic price updates are turned off.', 'gatehouse' ), array( 'status' => 400 ) );
		}
		$result = Gatehouse_Price_Sync::update();
		if ( is_wp_error( $result ) ) {
			$result->add_data( array( 'status' => 502 ) );
			return $result;
		}
		return rest_ensure_response( self::settings_payload() );
	}

	/**
	 * POST /redact-preview.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function redact_preview( WP_REST_Request $request ) {
		$config = Gatehouse_Settings::get( 'redaction' );
		if ( is_array( $request['redaction'] ) ) {
			foreach ( Gatehouse_Redactor::detector_keys() as $key ) {
				if ( isset( $request['redaction'][ $key ] ) ) {
					$config[ $key ] = (bool) $request['redaction'][ $key ];
				}
			}
			if ( isset( $request['redaction']['custom'] ) ) {
				$config['custom'] = array_values( array_filter( array_map( 'sanitize_text_field', (array) $request['redaction']['custom'] ) ) );
			}
		}
		$redactor = new Gatehouse_Redactor( $config );
		$text     = $redactor->redact( (string) $request['text'] );
		return rest_ensure_response(
			array(
				'text'   => $text,
				'count'  => $redactor->count(),
				'counts' => $redactor->counts(),
			)
		);
	}

	/**
	 * Settings plus read-only context for the settings screens.
	 *
	 * @return array
	 */
	private static function settings_payload() {
		return array(
			'settings'       => Gatehouse_Settings::all(),
			'default_prices' => Gatehouse_Pricing::defaults(),
			'prices_checked' => Gatehouse_Pricing::CHECKED,
			'pricing'        => Gatehouse_Pricing::info(),
			'live_prices'    => Gatehouse_Price_Sync::prices(),
			'usage'          => Gatehouse_Stats::usage_context(),
			'seen_models'    => Gatehouse_Stats::facets()['models'],
		);
	}
}
