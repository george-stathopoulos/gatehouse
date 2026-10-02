import { createRoot } from '@wordpress/element';
import App from './App';
import * as ui from './components/ui';
import * as charts from './components/charts';
import Icon from './components/Icon';
import * as format from './lib/format';
import * as hooks from './lib/hooks';
import * as colors from './lib/colors';
import * as settings from './lib/settings';
import './style.scss';

/**
 * Building blocks for add-ons. An add-on script that depends on the `gatehouse-admin` handle can use
 * these to build pages that match the dashboard, and register pages with the `gatehouse.routes` filter
 * from `@wordpress/hooks`.
 */
window.gatehouse = { ui, charts, Icon, format, hooks, colors, settings };

function mount() {
	const root = document.getElementById( 'gatehouse-root' );
	if ( ! root ) {
		return;
	}
	// The page markup ships its own .gatehouse-root wrapper for the loading state; the app renders its own.
	root.classList.remove( 'gatehouse-root' );
	createRoot( root ).render( <App /> );
}

// Render after every footer script has run, so add-ons can register their pages first.
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', mount );
} else {
	mount();
}
