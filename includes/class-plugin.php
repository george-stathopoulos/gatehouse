<?php
/**
 * Plugin bootstrap.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

/**
 * Wires the plugin together.
 */
final class Gatehouse_Plugin {

	const PRUNE_HOOK = 'gatehouse_prune';

	/**
	 * Singleton.
	 *
	 * @var Gatehouse_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Get the instance.
	 *
	 * @return Gatehouse_Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		Gatehouse_Gateway::init();
		Gatehouse_Alerts::init();
		Gatehouse_Admin::init();
		Gatehouse_Demo::init();
		Gatehouse_Onboarding::init();
		Gatehouse_Price_Sync::init();
		Gatehouse_Privacy::init();

		add_action( 'init', array( 'Gatehouse_Ledger', 'maybe_install' ) );
		add_action( 'rest_api_init', array( 'Gatehouse_REST_Controller', 'register' ) );
		add_action( self::PRUNE_HOOK, array( 'Gatehouse_Ledger', 'prune' ) );

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			require_once GATEHOUSE_DIR . 'includes/class-cli.php';
			WP_CLI::add_command( 'gatehouse', 'Gatehouse_CLI' );
		}
	}

	/**
	 * Activation: create the table and schedule pruning.
	 */
	public static function activate() {
		Gatehouse_Ledger::install();
		Gatehouse_Onboarding::on_activate();
		if ( ! wp_next_scheduled( self::PRUNE_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::PRUNE_HOOK );
		}
	}

	/**
	 * Deactivation: stop pruning. Data is kept until uninstall.
	 */
	public static function deactivate() {
		wp_clear_scheduled_hook( self::PRUNE_HOOK );
		wp_clear_scheduled_hook( Gatehouse_Price_Sync::CRON );
	}
}
