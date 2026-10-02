<?php
/**
 * Admin screen.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the Gatehouse admin page and loads the dashboard app.
 */
final class Gatehouse_Admin {

	const SLUG = 'gatehouse';

	/**
	 * Page hook suffix.
	 *
	 * @var string
	 */
	private static $hook = '';

	/**
	 * Register hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( GATEHOUSE_FILE ), array( __CLASS__, 'action_links' ) );
	}

	/**
	 * Add the top-level menu.
	 */
	public static function menu() {
		self::$hook = add_menu_page(
			__( 'Gatehouse', 'gatehouse' ),
			__( 'Gatehouse', 'gatehouse' ),
			'manage_options',
			self::SLUG,
			array( __CLASS__, 'render' ),
			self::menu_icon(),
			80
		);
	}

	/**
	 * Mount point for the React app.
	 */
	public static function render() {
		echo '<div id="gatehouse-root" class="gatehouse-root"><div class="gatehouse-boot" role="status">' . esc_html__( 'Loading Gatehouse…', 'gatehouse' ) . '</div></div>';
	}

	/**
	 * Enqueue the dashboard bundle on our page only.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public static function assets( $hook ) {
		if ( $hook !== self::$hook ) {
			return;
		}
		$asset_file = GATEHOUSE_DIR . 'build/index.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		wp_enqueue_script( 'gatehouse-admin', GATEHOUSE_URL . 'build/index.js', $asset['dependencies'], $asset['version'], true );
		wp_enqueue_style( 'gatehouse-admin', GATEHOUSE_URL . 'build/style-index.css', array(), $asset['version'] );
		wp_style_add_data( 'gatehouse-admin', 'rtl', 'replace' );
		wp_set_script_translations( 'gatehouse-admin', 'gatehouse' );

		$user = wp_get_current_user();
		wp_add_inline_script(
			'gatehouse-admin',
			'window.gatehouseBoot = ' . wp_json_encode(
				array(
					'version'   => GATEHOUSE_VERSION,
					'siteUrl'   => GATEHOUSE_SITE,
					'adminUrl'  => admin_url(),
					'siteName'  => get_bloginfo( 'name' ),
					'userName'  => $user->display_name,
					'aiEnabled' => function_exists( 'wp_supports_ai' ) ? wp_supports_ai() : false,
					'connectorsUrl' => admin_url( 'options-connectors.php' ),
					'localAi'       => Gatehouse_Pricing::local_ai(),
					'gmtOffset'     => (float) get_option( 'gmt_offset' ),
					'demo'          => Gatehouse_Demo::enabled_for_user(),
					'onboarded'     => Gatehouse_Onboarding::done(),
					'docsUrl'       => esc_url_raw( (string) apply_filters( 'gatehouse_docs_url', GATEHOUSE_SITE . 'docs/' ) ),
					'supportUrl'    => esc_url_raw( (string) apply_filters( 'gatehouse_support_url', 'https://wordpress.org/support/plugin/gatehouse/' ) ),
					/**
					 * Filters whether an add-on that provides response caching is active.
					 *
					 * @param bool $active Active.
					 */
					'pro'           => (bool) apply_filters( 'gatehouse_pro_active', false ),
					/**
					 * Filters the address of the Gatehouse Pro page shown in the dashboard. Empty hides the link.
					 *
					 * @param string $url URL.
					 */
					'proUrl'        => esc_url_raw( (string) apply_filters( 'gatehouse_pro_url', GATEHOUSE_SITE . 'pro/' ) ),
				)
			) . ';',
			'before'
		);

		/**
		 * Fires after the dashboard script is enqueued, so add-ons can enqueue their own.
		 *
		 * Add-ons should depend on the `gatehouse-admin` script handle and use `window.gatehouse`.
		 *
		 * @param string $handle Dashboard script handle.
		 */
		do_action( 'gatehouse_admin_enqueue', 'gatehouse-admin' );
	}

	/**
	 * "Dashboard" link on the Plugins screen.
	 *
	 * @param string[] $links Links.
	 * @return string[]
	 */
	public static function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=' . self::SLUG ) ) . '">' . esc_html__( 'Dashboard', 'gatehouse' ) . '</a>' );
		return $links;
	}

	/**
	 * Menu icon: a gateway arch with a flow line, as a data URI SVG.
	 *
	 * @return string
	 */
	private static function menu_icon() {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="black" d="M10 2a7 7 0 0 0-7 7v8a1 1 0 0 0 1 1h3v-6a3 3 0 0 1 6 0v6h3a1 1 0 0 0 1-1V9a7 7 0 0 0-7-7Zm0 3.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"/></svg>';
		return 'data:image/svg+xml;base64,' . base64_encode( $svg ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}
}
