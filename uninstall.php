<?php
/**
 * Uninstall: remove the request table and every option.
 *
 * @package Gatehouse
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once __DIR__ . '/includes/class-settings.php';
require_once __DIR__ . '/includes/class-ledger.php';
require_once __DIR__ . '/includes/class-alerts.php';
require_once __DIR__ . '/includes/class-demo.php';

Gatehouse_Ledger::uninstall();
Gatehouse_Demo::run(
	static function () {
		Gatehouse_Ledger::uninstall();
	}
);
delete_option( 'gatehouse_demo_settings' );
delete_option( 'gatehouse_onboarding' );
delete_option( 'gatehouse_synced_prices' );
wp_clear_scheduled_hook( 'gatehouse_price_sync' );
delete_metadata( 'user', 0, 'gatehouse_demo_mode', '', true );
Gatehouse_Alerts::uninstall();
delete_option( Gatehouse_Settings::OPTION );
delete_option( 'gatehouse_source_labels' );
delete_transient( 'gatehouse_providers' );
wp_clear_scheduled_hook( 'gatehouse_prune' );
