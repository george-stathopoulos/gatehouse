<?php
/**
 * Plugin Name:       Gatehouse
 * Plugin URI:        https://wordpress.org/plugins/gatehouse/
 * Description:       Cost tracking, budgets and personal-data checks for the AI calls plugins make, through the WordPress AI Client or directly with their own API key.
 * Version:           2.0.0
 * Requires at least: 7.0
 * Requires PHP:      7.4
 * Author:            George Stathopoulos
 * Author URI:        https://george-stathopoulos.github.io/gatehouse/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       gatehouse
 *
 * @package Gatehouse
 */

defined( 'ABSPATH' ) || exit;

define( 'GATEHOUSE_VERSION', '2.0.0' );
define( 'GATEHOUSE_FILE', __FILE__ );
define( 'GATEHOUSE_DIR', plugin_dir_path( __FILE__ ) );
define( 'GATEHOUSE_URL', plugin_dir_url( __FILE__ ) );
define( 'GATEHOUSE_SITE', 'https://george-stathopoulos.github.io/gatehouse/' );

require_once GATEHOUSE_DIR . 'includes/class-settings.php';
require_once GATEHOUSE_DIR . 'includes/class-pricing.php';
require_once GATEHOUSE_DIR . 'includes/class-price-sync.php';
require_once GATEHOUSE_DIR . 'includes/class-compat.php';
require_once GATEHOUSE_DIR . 'includes/class-demo.php';
require_once GATEHOUSE_DIR . 'includes/class-sample.php';
require_once GATEHOUSE_DIR . 'includes/class-onboarding.php';
require_once GATEHOUSE_DIR . 'includes/class-attribution.php';
require_once GATEHOUSE_DIR . 'includes/class-redactor.php';
require_once GATEHOUSE_DIR . 'includes/class-provider-adapters.php';
require_once GATEHOUSE_DIR . 'includes/class-ledger.php';
require_once GATEHOUSE_DIR . 'includes/class-alerts.php';
require_once GATEHOUSE_DIR . 'includes/class-privacy.php';
require_once GATEHOUSE_DIR . 'includes/class-gateway.php';
require_once GATEHOUSE_DIR . 'includes/class-stats.php';
require_once GATEHOUSE_DIR . 'includes/class-rest-controller.php';
require_once GATEHOUSE_DIR . 'includes/class-admin.php';
require_once GATEHOUSE_DIR . 'includes/class-plugin.php';

register_activation_hook( __FILE__, array( 'Gatehouse_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Gatehouse_Plugin', 'deactivate' ) );

Gatehouse_Plugin::instance();
