<?php
/**
 * Budget alert emails.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

/**
 * Emails the site owner once per month when a budget passes the alert threshold and when it is reached.
 */
final class Gatehouse_Alerts {

	/**
	 * Hook into the ledger.
	 */
	public static function init() {
		add_action( 'gatehouse_recorded', array( __CLASS__, 'check' ), 10, 2 );
	}

	/**
	 * Check the budgets touched by a newly recorded call.
	 *
	 * @param int   $id  Row id.
	 * @param array $row Row values.
	 */
	public static function check( $id, $row ) {
		if ( (float) $row['cost'] <= 0 ) {
			return;
		}
		$alerts = Gatehouse_Settings::get( 'alerts' );
		if ( empty( $alerts['enabled'] ) || ! is_email( $alerts['email'] ) ) {
			return;
		}

		$month  = substr( $row['created_at'], 0, 7 );
		$budget = (float) Gatehouse_Settings::source( $row['source'] )['budget'];
		if ( $budget > 0 ) {
			self::maybe_send( $row['source'], Gatehouse_Ledger::month_spend( $row['source'], $month ), $budget, $month, (int) $alerts['threshold'], $alerts['email'] );
		}

		$global = (float) Gatehouse_Settings::get( 'global_budget' );
		if ( $global > 0 ) {
			self::maybe_send( '__total', Gatehouse_Ledger::month_spend( '__total', $month ), $global, $month, (int) $alerts['threshold'], $alerts['email'] );
		}
	}

	/**
	 * Send the threshold or limit email when it has not been sent this month.
	 *
	 * @param string $source    Source id or `__total`.
	 * @param float  $spend     Month-to-date spend.
	 * @param float  $budget    Budget.
	 * @param string $month     Month as `YYYY-MM`.
	 * @param int    $threshold Alert threshold percent.
	 * @param string $email     Recipient.
	 */
	private static function maybe_send( $source, $spend, $budget, $month, $threshold, $email ) {
		$pct = $spend / $budget * 100;
		if ( $pct >= 100 ) {
			$level = 'limit';
		} elseif ( $pct >= $threshold ) {
			$level = 'threshold';
		} else {
			return;
		}

		$option = 'gatehouse_alerts_' . str_replace( '-', '', $month );
		$sent   = (array) get_option( $option, array() );
		$key    = $source . '|' . $level;
		if ( isset( $sent[ $key ] ) ) {
			return;
		}
		$sent[ $key ] = time();
		update_option( $option, $sent, false );

		$name = '__total' === $source ? __( 'Your whole site', 'gatehouse' ) : Gatehouse_Attribution::label( $source );
		$site = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );

		if ( 'limit' === $level ) {
			/* translators: 1: site name, 2: plugin or theme name. */
			$subject = sprintf( __( '[%1$s] AI budget reached: %2$s', 'gatehouse' ), $site, $name );
			/* translators: 1: plugin or theme name, 2: amount spent, 3: monthly budget. */
			$message = sprintf( __( "%1\$s has spent %2\$s of its %3\$s monthly AI budget.\n\nGatehouse is now blocking its AI requests until next month, or until you raise the budget.", 'gatehouse' ), $name, self::money( $spend ), self::money( $budget ) );
		} else {
			/* translators: 1: site name, 2: plugin or theme name, 3: percent used. */
			$subject = sprintf( __( '[%1$s] %2$s has used %3$d%% of its AI budget', 'gatehouse' ), $site, $name, (int) $pct );
			/* translators: 1: plugin or theme name, 2: amount spent, 3: monthly budget. */
			$message = sprintf( __( "%1\$s has spent %2\$s of its %3\$s monthly AI budget.\n\nRequests will be blocked when it reaches 100%%.", 'gatehouse' ), $name, self::money( $spend ), self::money( $budget ) );
		}

		$message .= "\n\n" . admin_url( 'admin.php?page=gatehouse#/sources' );
		wp_mail( $email, $subject, $message );
	}

	/**
	 * Format a USD amount.
	 *
	 * @param float $amount Amount.
	 * @return string
	 */
	private static function money( $amount ) {
		return '$' . number_format_i18n( $amount, 2 );
	}

	/**
	 * Delete sent-alert markers (uninstall).
	 */
	public static function uninstall() {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$names = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( 'gatehouse_alerts_' ) . '%' ) );
		foreach ( $names as $name ) {
			delete_option( $name );
		}
	}
}
