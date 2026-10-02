<?php
/**
 * Personal-data redaction with reversible placeholders.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

/**
 * Replaces personal data with placeholders such as `[EMAIL_1]` and can put the originals back.
 *
 * One instance covers one provider request, so the same value always gets the same placeholder
 * within that request and the map can be used to restore the response.
 */
final class Gatehouse_Redactor {

	/**
	 * Placeholder => original value.
	 *
	 * @var array<string,string>
	 */
	private $map = array();

	/**
	 * Original value => placeholder.
	 *
	 * @var array<string,string>
	 */
	private $reverse = array();

	/**
	 * Counts per type.
	 *
	 * @var array<string,int>
	 */
	private $counts = array();

	/**
	 * Enabled detectors.
	 *
	 * @var array
	 */
	private $config;

	/**
	 * JSON keys whose string values are never prose and must not be touched.
	 *
	 * @var string[]
	 */
	const SKIP_KEYS = array( 'model', 'role', 'type', 'id', 'call_id', 'tool_call_id', 'tool_use_id', 'name', 'mime_type', 'mimeType', 'media_type', 'data', 'url', 'image_url', 'file_id', 'file_data', 'fileUri', 'format', 'voice', 'response_format', 'effort', 'stop_reason', 'signature' );

	/**
	 * Detector keys available in settings.
	 *
	 * @return string[]
	 */
	public static function detector_keys() {
		return array( 'email', 'phone', 'card', 'iban', 'ssn', 'ip' );
	}

	/**
	 * Constructor.
	 *
	 * @param array|null $config Redaction settings (defaults to saved settings).
	 */
	public function __construct( $config = null ) {
		$this->config = null === $config ? Gatehouse_Settings::get( 'redaction' ) : $config;
	}

	/**
	 * Detector patterns keyed by placeholder type.
	 *
	 * Order matters: specific formats run before the generic phone pattern.
	 *
	 * @return array<string,string>
	 */
	private function patterns() {
		$all = array(
			'email' => array( 'EMAIL', '/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i' ),
			'iban'  => array( 'IBAN', '/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?\b/' ),
			'card'  => array( 'CARD', '/\b(?:\d[ \-]?){12,18}\d\b/' ),
			'ssn'   => array( 'SSN', '/\b\d{3}-\d{2}-\d{4}\b/' ),
			'ip'    => array( 'IP', '/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/' ),
			// Grouped numbers such as "+1 415 555 0134", "(020) 7946 0958" or "415-555-0134".
			'phone' => array( 'PHONE', '/(?<![\w@.\-])(?:\+\d{1,3}[ \-.]?)?(?:\(\d{1,4}\)[ \-.]?)?\d{2,5}(?:[ \-.]\d{2,5}){1,4}(?![\w.\-]?\d)/' ),
		);
		$out = array();
		foreach ( $all as $key => $pattern ) {
			if ( ! empty( $this->config[ $key ] ) ) {
				$out[ $pattern[0] ] = $pattern[1];
			}
		}
		return $out;
	}

	/**
	 * Redact a single string.
	 *
	 * @param string $text Text.
	 * @return string
	 */
	public function redact( $text ) {
		if ( ! is_string( $text ) || '' === $text ) {
			return $text;
		}

		foreach ( (array) ( $this->config['custom'] ?? array() ) as $term ) {
			if ( '' !== $term && false !== stripos( $text, $term ) ) {
				$text = preg_replace_callback(
					'/' . preg_quote( $term, '/' ) . '/i',
					function ( $m ) {
						return $this->placeholder( 'TERM', $m[0] );
					},
					$text
				);
			}
		}

		foreach ( $this->patterns() as $type => $regex ) {
			$text = preg_replace_callback(
				$regex,
				function ( $m ) use ( $type ) {
					// Leave placeholders created by an earlier detector alone.
					if ( isset( $this->map[ $m[0] ] ) ) {
						return $m[0];
					}
					if ( 'CARD' === $type && ! self::luhn( $m[0] ) ) {
						return $m[0];
					}
					if ( 'PHONE' === $type && ! self::looks_like_phone( $m[0] ) ) {
						return $m[0];
					}
					return $this->placeholder( $type, $m[0] );
				},
				$text
			);
		}

		return $text;
	}

	/**
	 * Redact every prose string inside a decoded JSON request body.
	 *
	 * @param mixed  $node Decoded JSON node.
	 * @param string $key  Key of this node in its parent.
	 * @return mixed
	 */
	public function redact_tree( $node, $key = '' ) {
		if ( is_string( $node ) ) {
			return in_array( $key, self::SKIP_KEYS, true ) ? $node : $this->redact( $node );
		}
		if ( is_array( $node ) ) {
			// Inline binary payloads (images, audio) are skipped as a whole.
			if ( isset( $node['type'] ) && in_array( $node['type'], array( 'image', 'input_image', 'document', 'input_file', 'input_audio' ), true ) ) {
				return $node;
			}
			foreach ( $node as $k => $child ) {
				if ( in_array( $k, array( 'inlineData', 'inline_data', 'fileData', 'tools', 'functionDeclarations', 'text_format', 'json_schema', 'response_schema', 'responseSchema' ), true ) ) {
					continue;
				}
				$node[ $k ] = $this->redact_tree( $child, is_string( $k ) ? $k : $key );
			}
		}
		return $node;
	}

	/**
	 * Put original values back into a response body.
	 *
	 * Placeholders are restored both as plain text and in their JSON-escaped form.
	 *
	 * @param string $body Response body.
	 * @return string
	 */
	public function restore( $body ) {
		if ( ! $this->map || ! is_string( $body ) ) {
			return $body;
		}
		$pairs = array();
		foreach ( $this->map as $token => $original ) {
			$pairs[ $token ] = substr( wp_json_encode( $original ), 1, -1 );
		}
		return strtr( $body, $pairs );
	}

	/**
	 * Total number of distinct values redacted.
	 *
	 * @return int
	 */
	public function count() {
		return count( $this->map );
	}

	/**
	 * Distinct values redacted per type.
	 *
	 * @return array<string,int>
	 */
	public function counts() {
		return $this->counts;
	}

	/**
	 * Placeholder for a value, reusing it when the value was seen before.
	 *
	 * @param string $type  Placeholder type.
	 * @param string $value Original value.
	 * @return string
	 */
	private function placeholder( $type, $value ) {
		if ( isset( $this->reverse[ $value ] ) ) {
			return $this->reverse[ $value ];
		}
		$this->counts[ $type ]   = ( $this->counts[ $type ] ?? 0 ) + 1;
		$token                   = '[' . $type . '_' . $this->counts[ $type ] . ']';
		$this->map[ $token ]     = $value;
		$this->reverse[ $value ] = $token;
		return $token;
	}

	/**
	 * Filters out dates, versions and decimals that the grouped-number pattern also matches.
	 *
	 * @param string $match Candidate.
	 * @return bool
	 */
	private static function looks_like_phone( $match ) {
		$digits = strlen( preg_replace( '/\D/', '', $match ) );
		if ( $digits < 8 || $digits > 15 ) {
			return false;
		}
		// Dates: 2026-10-01, 01.10.2026, 2026 10 01.
		if ( preg_match( '/^\d{4}[\-. ]\d{1,2}[\-. ]\d{1,2}$|^\d{1,2}[\-. ]\d{1,2}[\-. ]\d{4}$/', $match ) ) {
			return false;
		}
		// Dotted numbers without a leading + are far more often versions or amounts.
		if ( false === strpos( $match, '+' ) && preg_match( '/^[\d.]+$/', $match ) ) {
			return false;
		}
		return true;
	}

	/**
	 * Luhn checksum, used to avoid flagging order numbers as card numbers.
	 *
	 * @param string $number Candidate number.
	 * @return bool
	 */
	private static function luhn( $number ) {
		$digits = preg_replace( '/\D/', '', $number );
		$len    = strlen( $digits );
		if ( $len < 13 || $len > 19 ) {
			return false;
		}
		$sum = 0;
		for ( $i = 0; $i < $len; $i++ ) {
			$d = (int) $digits[ $len - 1 - $i ];
			if ( $i % 2 ) {
				$d *= 2;
				if ( $d > 9 ) {
					$d -= 9;
				}
			}
			$sum += $d;
		}
		return 0 === $sum % 10;
	}
}
