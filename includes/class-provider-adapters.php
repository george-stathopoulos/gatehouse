<?php
/**
 * Provider request formats.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

/**
 * Recognises outgoing AI provider requests and adds the brand brief in each provider's format.
 */
final class Gatehouse_Provider_Adapters {

	/**
	 * Known provider hosts.
	 *
	 * Each entry maps a host to a provider id. Extra hosts (for example a self-hosted,
	 * OpenAI-compatible server) can be added with the `gatehouse_provider_hosts` filter.
	 *
	 * @return array<string,string> Host => provider id.
	 */
	public static function hosts() {
		return (array) apply_filters(
			'gatehouse_provider_hosts',
			array(
				'api.anthropic.com'                 => 'anthropic',
				'api.openai.com'                    => 'openai',
				'generativelanguage.googleapis.com' => 'google',
			)
		);
	}

	/**
	 * Provider id for a request URL, or null when the URL is not an AI provider generation call.
	 *
	 * @param string $url    Request URL.
	 * @param string $method HTTP method.
	 * @return string|null
	 */
	public static function provider_for( $url, $method = 'POST' ) {
		if ( 'POST' !== strtoupper( (string) $method ) ) {
			return null;
		}
		$host  = wp_parse_url( $url, PHP_URL_HOST );
		$hosts = self::hosts();
		if ( ! $host || ! isset( $hosts[ $host ] ) ) {
			return null;
		}
		$path = (string) wp_parse_url( $url, PHP_URL_PATH );
		if ( preg_match( '#/models/?$#', $path ) ) {
			return null;
		}
		return $hosts[ $host ];
	}

	/**
	 * Whether this request is a text generation call that carries a system prompt.
	 *
	 * @param string $url Request URL.
	 * @return string|null Format: `anthropic`, `openai-responses`, `openai-chat` or `google`.
	 */
	public static function text_format( $url ) {
		$path = (string) wp_parse_url( $url, PHP_URL_PATH );
		if ( preg_match( '#/v1/messages$#', $path ) ) {
			return 'anthropic';
		}
		if ( preg_match( '#/responses$#', $path ) ) {
			return 'openai-responses';
		}
		if ( preg_match( '#/chat/completions$#', $path ) ) {
			return 'openai-chat';
		}
		if ( preg_match( '#:(stream)?generateContent$#i', $path ) ) {
			return 'google';
		}
		return null;
	}

	/**
	 * Append the brief to the system prompt of a decoded request body.
	 *
	 * @param array  $body   Decoded body.
	 * @param string $format Format from text_format().
	 * @param string $brief  Brief text.
	 * @return array
	 */
	public static function add_brief( array $body, $format, $brief ) {
		$brief = trim( (string) $brief );
		if ( '' === $brief ) {
			return $body;
		}

		switch ( $format ) {
			case 'anthropic':
				if ( isset( $body['system'] ) && is_array( $body['system'] ) ) {
					$body['system'][] = array(
						'type' => 'text',
						'text' => $brief,
					);
				} else {
					$body['system'] = self::join( $body['system'] ?? '', $brief );
				}
				break;

			case 'openai-responses':
				$body['instructions'] = self::join( $body['instructions'] ?? '', $brief );
				break;

			case 'openai-chat':
				$messages = isset( $body['messages'] ) && is_array( $body['messages'] ) ? $body['messages'] : array();
				if ( isset( $messages[0]['role'] ) && in_array( $messages[0]['role'], array( 'system', 'developer' ), true ) && is_string( $messages[0]['content'] ) ) {
					$messages[0]['content'] = self::join( $messages[0]['content'], $brief );
				} else {
					array_unshift(
						$messages,
						array(
							'role'    => 'system',
							'content' => $brief,
						)
					);
				}
				$body['messages'] = $messages;
				break;

			case 'google':
				$key = isset( $body['system_instruction'] ) ? 'system_instruction' : 'systemInstruction';
				if ( ! isset( $body[ $key ]['parts'] ) || ! is_array( $body[ $key ]['parts'] ) ) {
					$body[ $key ] = array( 'parts' => array() );
				}
				$body[ $key ]['parts'][] = array( 'text' => $brief );
				break;
		}

		return $body;
	}

	/**
	 * Join an existing system prompt and the brief.
	 *
	 * @param string $existing Existing text.
	 * @param string $brief    Brief.
	 * @return string
	 */
	private static function join( $existing, $brief ) {
		$existing = is_string( $existing ) ? trim( $existing ) : '';
		return '' === $existing ? $brief : $existing . "\n\n" . $brief;
	}
}
