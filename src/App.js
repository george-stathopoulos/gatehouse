import { __, sprintf } from '@wordpress/i18n';
import { applyFilters } from '@wordpress/hooks';
import {
	createInterpolateElement,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { send, useRoute, useTheme } from './lib/hooks';
import { Button, Switch, ToastProvider } from './components/ui';
import Icon from './components/Icon';
import Overview from './pages/Overview';
import Sources from './pages/Sources';
import Requests from './pages/Requests';
import Privacy from './pages/Privacy';
import Brief from './pages/Brief';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Welcome, { startDemo } from './pages/Welcome';

const ROUTES = [
	{
		id: 'overview',
		label: __( 'Overview', 'gatehouse' ),
		icon: 'overview',
		Page: Overview,
	},
	{
		id: 'sources',
		label: __( 'Sources', 'gatehouse' ),
		icon: 'sources',
		Page: Sources,
	},
	{
		id: 'requests',
		label: __( 'Requests', 'gatehouse' ),
		icon: 'requests',
		Page: Requests,
	},
	{
		id: 'privacy',
		label: __( 'Privacy', 'gatehouse' ),
		icon: 'shield',
		Page: Privacy,
	},
	{
		id: 'brief',
		label: __( 'Brand brief', 'gatehouse' ),
		icon: 'quote',
		Page: Brief,
	},
	{
		id: 'settings',
		label: __( 'Settings', 'gatehouse' ),
		icon: 'settings',
		Page: Settings,
	},
];

/** Pages reachable by link but not shown in the menu. */
const HIDDEN = [
	{ id: 'welcome', label: __( 'Setup', 'gatehouse' ), Page: Welcome },
	{ id: 'help', label: __( 'Help', 'gatehouse' ), Page: Help },
];

const THEMES = [
	{
		id: 'system',
		icon: 'monitor',
		label: __( 'Theme: match system', 'gatehouse' ),
	},
	{ id: 'light', icon: 'sun', label: __( 'Theme: light', 'gatehouse' ) },
	{ id: 'dark', icon: 'moon', label: __( 'Theme: dark', 'gatehouse' ) },
];

export default function App() {
	const [ route, go ] = useRoute( 'overview' );
	const [ theme, setTheme ] = useTheme();
	/**
	 * Filters the dashboard pages. Add-ons append `{ id, label, icon, Page }` entries.
	 */
	const routes = useMemo(
		() => applyFilters( 'gatehouse.routes', ROUTES ),
		[]
	);
	const current =
		[ ...routes, ...HIDDEN ].find( ( r ) => r.id === route ) || routes[ 0 ];
	const boot = window.gatehouseBoot || {};
	const [ busy, setBusy ] = useState( '' );

	// First visit: open the setup guide until it is completed or skipped.
	useEffect( () => {
		if ( ! boot.onboarded && ! window.location.hash ) {
			go( 'welcome' );
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const setDemo = ( on ) => {
		setBusy(
			on
				? __( 'Preparing demo data…', 'gatehouse' )
				: __( 'Switching back to your data…', 'gatehouse' )
		);
		const done = on
			? startDemo()
			: send( 'demo', 'POST', { enabled: false } ).then( () =>
					window.location.reload()
			  );
		done.catch( () => setBusy( '' ) );
	};

	const deleteDemo = () => {
		setBusy( __( 'Deleting demo data…', 'gatehouse' ) );
		send( 'demo', 'DELETE' )
			.then( () => window.location.reload() )
			.catch( () => setBusy( '' ) );
	};
	const themeIndex = Math.max(
		0,
		THEMES.findIndex( ( t ) => t.id === theme )
	);
	const nextTheme = THEMES[ ( themeIndex + 1 ) % THEMES.length ];
	const { Page } = current;

	return (
		<div
			className="gatehouse-root"
			data-theme={ theme === 'system' ? undefined : theme }
		>
			<ToastProvider>
				<header className="gatehouse-header">
					<div className="gatehouse-header__inner">
						<div className="gatehouse-brand">
							<span className="gatehouse-brand__mark">
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									aria-hidden="true"
								>
									<path
										fill="currentColor"
										d="M10 2a7 7 0 0 0-7 7v8a1 1 0 0 0 1 1h3v-6a3 3 0 0 1 6 0v6h3a1 1 0 0 0 1-1V9a7 7 0 0 0-7-7Zm0 3.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"
									/>
								</svg>
							</span>
							<span>
								<div className="gatehouse-brand__name">
									Gatehouse
								</div>
								<div className="gatehouse-brand__sub">
									{ __(
										'Cost, privacy & policy for site AI',
										'gatehouse'
									) }
								</div>
							</span>
						</div>
						<nav
							className="gatehouse-nav"
							aria-label={ __(
								'Gatehouse sections',
								'gatehouse'
							) }
						>
							{ routes.map( ( r ) => (
								<a
									key={ r.id }
									href={ `#/${ r.id }` }
									className={ `gatehouse-nav__item ${
										r.id === current.id ? 'is-active' : ''
									}` }
									aria-current={
										r.id === current.id ? 'page' : undefined
									}
								>
									<Icon name={ r.icon } size={ 15 } />
									{ r.label }
								</a>
							) ) }
						</nav>
						<div className="gatehouse-header__end">
							<a
								href="#/help"
								className={ `gatehouse-btn is-ghost is-sm ${
									current.id === 'help' ? 'is-active' : ''
								}` }
								aria-current={
									current.id === 'help' ? 'page' : undefined
								}
							>
								<Icon name="info" size={ 15 } />
								{ __( 'Help', 'gatehouse' ) }
							</a>
							<span
								className="gatehouse-demo-toggle"
								title={ __(
									'Show sample numbers from fictional plugins. Your real data and settings are not affected.',
									'gatehouse'
								) }
							>
								<Switch
									checked={ !! boot.demo }
									onChange={ setDemo }
									label={ __( 'Demo data', 'gatehouse' ) }
								/>
								<span aria-hidden="true">
									{ __( 'Demo data', 'gatehouse' ) }
								</span>
							</span>
							<button
								type="button"
								className="gatehouse-btn is-ghost is-icon"
								onClick={ () => setTheme( nextTheme.id ) }
								title={ THEMES[ themeIndex ].label }
								aria-label={ `${
									THEMES[ themeIndex ].label
								}. ${ __( 'Click to change.', 'gatehouse' ) }` }
							>
								<Icon
									name={ THEMES[ themeIndex ].icon }
									size={ 17 }
								/>
							</button>
						</div>
					</div>
				</header>
				<main className="gatehouse-shell" key={ current.id }>
					{ boot.demo && current.id !== 'welcome' && (
						<div className="gatehouse-demo-bar" role="status">
							<Icon name="spark" size={ 18 } />
							<div className="gatehouse-demo-bar__text">
								<strong>
									{ __(
										'You’re viewing demo data.',
										'gatehouse'
									) }
								</strong>{ ' ' }
								{ __(
									'The numbers come from fictional plugins, and changes you make here are saved to the demo only. Your real AI calls, budgets and settings are not affected.',
									'gatehouse'
								) }
							</div>
							<Button
								size="sm"
								variant="primary"
								onClick={ () => setDemo( false ) }
							>
								{ __( 'Back to my data', 'gatehouse' ) }
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={ deleteDemo }
							>
								{ __( 'Delete demo data', 'gatehouse' ) }
							</Button>
						</div>
					) }
					<Page go={ go } />
				</main>
				<footer className="gatehouse-footer">
					<span>
						{ createInterpolateElement(
							__(
								'Made with <heart /> by <a>Gatehouse</a>',
								'gatehouse'
							),
							{
								heart: (
									<span
										className="gatehouse-footer__heart"
										role="img"
										aria-label={ __( 'love', 'gatehouse' ) }
									>
										♥
									</span>
								),
								a: (
									// eslint-disable-next-line jsx-a11y/anchor-has-content
									<a
										href={ boot.siteUrl }
										target="_blank"
										rel="noopener noreferrer"
									/>
								),
							}
						) }
					</span>
					<span className="gatehouse-footer__links">
						<a
							href={ boot.docsUrl }
							target="_blank"
							rel="noopener noreferrer"
						>
							{ __( 'Help center', 'gatehouse' ) }
						</a>
						<a
							href={ boot.supportUrl }
							target="_blank"
							rel="noopener noreferrer"
						>
							{ __( 'Support', 'gatehouse' ) }
						</a>
						<span>
							{ sprintf(
								/* translators: %s: plugin version number. */
								__( 'Version %s', 'gatehouse' ),
								boot.version
							) }
						</span>
					</span>
				</footer>
				{ busy && (
					<div className="gatehouse-busy" role="status">
						<div className="gatehouse-busy__box">
							<span className="gatehouse-busy__spin" />
							{ busy }
						</div>
					</div>
				) }
			</ToastProvider>
		</div>
	);
}
