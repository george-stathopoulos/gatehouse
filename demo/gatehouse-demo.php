<?php
/**
 * Plugin Name: Gatehouse demo
 * Description: Runs the Gatehouse live demo in WordPress Playground: Pro is unlocked, email is off, and no AI calls leave the browser. Not for production.
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

// Pro features on, for the demo only.
add_filter( 'gatehouse_pro_license_active', '__return_true' );

// No real email from the demo.
add_filter( 'pre_wp_mail', '__return_true' );

// Nothing in the demo talks to an AI provider: the placeholder key would only produce errors.
add_filter(
	'pre_http_request',
	static function ( $pre, $args, $url ) {
		$host = (string) wp_parse_url( $url, PHP_URL_HOST );
		if ( false === $pre && preg_match( '/(anthropic\.com|openai\.com|googleapis\.com)$/', $host ) ) {
			return new WP_Error( 'gatehouse_demo', 'The live demo does not call AI providers.' );
		}
		return $pre;
	},
	1,
	3
);

// A label in the admin bar, so visitors know where they are.
add_action(
	'admin_bar_menu',
	static function ( $bar ) {
		$bar->add_node(
			array(
				'id'    => 'gatehouse-demo',
				'title' => '<span style="background:#4a3aa7;color:#fff;padding:2px 8px;border-radius:4px">' . esc_html__( 'Gatehouse demo', 'gatehouse' ) . '</span>',
				'href'  => admin_url( 'admin.php?page=gatehouse' ),
			)
		);
	},
	5
);
