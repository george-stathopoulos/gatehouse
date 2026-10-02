import { __ } from '@wordpress/i18n';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { Card, PageHead, Button, Pill } from '../components/ui';
import Icon from '../components/Icon';
import { startDemo } from './Welcome';
import { send } from '../lib/hooks';

/**
 * Help topics. `id` is used by "Help" links on other pages: #/help?topic=<id>.
 */
const GUIDES = [
	{
		id: 'overview',
		route: 'overview',
		icon: 'overview',
		title: __( 'Overview', 'gatehouse' ),
		text: __(
			'Your AI spend for the period, the month-end forecast against your budget, anything that needs attention, and charts of what runs when.',
			'gatehouse'
		),
	},
	{
		id: 'sources',
		route: 'sources',
		icon: 'sources',
		title: __( 'Sources and budgets', 'gatehouse' ),
		text: __(
			'Every plugin and theme that used AI. Open a source’s Policy to give it a monthly budget, pause it, or change how the gateway treats it.',
			'gatehouse'
		),
	},
	{
		id: 'requests',
		route: 'requests',
		icon: 'requests',
		title: __( 'Requests', 'gatehouse' ),
		text: __(
			'A log of every AI call: completed, blocked by a budget, pause or approval, or failed at the provider. Click a row for details.',
			'gatehouse'
		),
	},
	{
		id: 'privacy',
		route: 'privacy',
		icon: 'shield',
		title: __( 'Privacy', 'gatehouse' ),
		text: __(
			'Choose what personal data is removed from prompts, add your own terms, and test it live.',
			'gatehouse'
		),
	},
	{
		id: 'brief',
		route: 'brief',
		icon: 'quote',
		title: __( 'Brand brief', 'gatehouse' ),
		text: __(
			'One set of instructions added to every AI request, so every plugin writes in your voice and follows your rules.',
			'gatehouse'
		),
	},
	{
		id: 'settings',
		route: 'settings',
		icon: 'settings',
		title: __( 'Settings', 'gatehouse' ),
		text: __(
			'Site-wide budget, alert emails, what is logged and for how long, and the prices used to estimate cost.',
			'gatehouse'
		),
	},
];

const FAQ = [
	{
		id: 'nothing',
		topic: 'troubleshooting',
		q: __( 'Why don’t I see any AI calls?', 'gatehouse' ),
		a: __(
			'Gatehouse sees calls made through WordPress’s built-in AI (the AI Client). Check that an AI provider is connected under Settings → Connectors, that the plugin you use works through WordPress AI, and that you picked a long enough period at the top of the Overview. Plugins that call a provider directly with their own API key can’t be seen.',
			'gatehouse'
		),
	},
	{
		id: 'approval',
		topic: 'troubleshooting',
		q: __(
			'A plugin’s calls show “Not approved in AI → Connector Approval”.',
			'gatehouse'
		),
		a: __(
			'Your site uses the AI plugin’s Connector Approval feature, which blocks plugins until an administrator approves them. Go to Tools → Connector Approval and approve the plugin. Gatehouse itself never uses AI and never needs approval.',
			'gatehouse'
		),
	},
	{
		id: 'disappeared',
		topic: 'troubleshooting',
		q: __( 'A plugin’s AI features disappeared.', 'gatehouse' ),
		a: __(
			'It is probably blocked: paused, over its monthly budget, or over the site-wide budget. Check its status on Sources, or filter Requests by “Blocked” to see the reason.',
			'gatehouse'
		),
	},
	{
		id: 'provider',
		topic: 'troubleshooting',
		q: __( 'A banner says my provider is not connected.', 'gatehouse' ),
		a: __(
			'Install a provider plugin (for example “AI Provider for Anthropic”) and add its API key under Settings → Connectors. If it says the provider is installed but not connected, the key is missing.',
			'gatehouse'
		),
	},
	{
		id: 'costs',
		topic: 'costs',
		q: __( 'Are the costs exact?', 'gatehouse' ),
		a: __(
			'They are estimates: the tokens your provider reports × the price table under Settings. Discounts (caching, batch, negotiated rates), taxes and fees aren’t included. Your provider’s invoice is the source of truth.',
			'gatehouse'
		),
	},
	{
		id: 'prices',
		topic: 'costs',
		q: __( 'How are model prices kept up to date?', 'gatehouse' ),
		a: __(
			'Turn on “Update prices automatically” under Settings → Model prices. Gatehouse then downloads current prices once a day from OpenRouter’s public model list (nothing about your site is sent). With it off, the prices built into the plugin are used and updated with each release. Prices you edit always take priority.',
			'gatehouse'
		),
	},
	{
		id: 'noprice',
		topic: 'costs',
		q: __( 'A model shows “no price”.', 'gatehouse' ),
		a: __(
			'The model isn’t in your price table. Turn on automatic price updates, or add its price under Settings → Model prices (there is a one-click button for each). Its calls are logged at $0 until it has a price.',
			'gatehouse'
		),
	},
	{
		id: 'budgets',
		topic: 'budgets',
		q: __( 'What happens when a budget is reached?', 'gatehouse' ),
		a: __(
			'The next AI call is stopped before anything is sent, so it costs nothing. The plugin gets the same error as when AI is unavailable, and many plugins hide their AI buttons. Budgets reset on the 1st of each month, or straight away if you raise them.',
			'gatehouse'
		),
	},
	{
		id: 'forecast',
		topic: 'budgets',
		q: __( 'How is the forecast worked out?', 'gatehouse' ),
		a: __(
			'Spend so far this month, plus the average daily spend of the last 7 days for each remaining day. “On pace to exceed” means a source is still under budget but its forecast is over.',
			'gatehouse'
		),
	},
	{
		id: 'names',
		topic: 'privacy',
		q: __( 'Are names removed from prompts?', 'gatehouse' ),
		a: __(
			'Not automatically. Add the names that matter (key customers, staff) as custom terms on the Privacy page.',
			'gatehouse'
		),
	},
	{
		id: 'placeholders',
		topic: 'privacy',
		q: __(
			'An answer contains [EMAIL_1] instead of the real address.',
			'gatehouse'
		),
		a: __(
			'The AI model changed the placeholder, so it couldn’t be put back. Turn on “Skip redaction” for that plugin on the Sources page if this keeps happening.',
			'gatehouse'
		),
	},
	{
		id: 'stored',
		topic: 'privacy',
		q: __(
			'Does Gatehouse store my prompts or send data anywhere?',
			'gatehouse'
		),
		a: __(
			'No. It stores facts about each call (plugin, model, tokens, cost, timing) in your own database. Prompt text is only stored if you turn on excerpts under Settings → Logging. Nothing is sent to Gatehouse’s makers. The only outside request is the optional daily price download, which sends nothing about your site.',
			'gatehouse'
		),
	},
	{
		id: 'demo',
		topic: 'demo',
		q: __( 'What is demo data?', 'gatehouse' ),
		a: __(
			'Sample numbers from fictional plugins, so you can try every feature. Demo data lives in a separate sandbox: your real log, budgets and settings are never touched, and real AI calls keep being controlled by your real settings. Turn it off with “Back to my data”.',
			'gatehouse'
		),
	},
	{
		id: 'alerts',
		topic: 'troubleshooting',
		q: __( 'I don’t receive alert emails.', 'gatehouse' ),
		a: __(
			'Check that Email alerts is on under Settings and the address is right. Each alert is sent once per budget per month. If other WordPress emails also don’t arrive, install an SMTP plugin.',
			'gatehouse'
		),
	},
];

const GLOSSARY = [
	[
		__( 'Source', 'gatehouse' ),
		__( 'The plugin or theme that made an AI call.', 'gatehouse' ),
	],
	[
		__( 'Token', 'gatehouse' ),
		__(
			'The unit AI providers count and charge by, roughly ¾ of a word. Input tokens are what you send; output tokens are the answer.',
			'gatehouse'
		),
	],
	[
		__( 'Budget', 'gatehouse' ),
		__(
			'A monthly spending limit, for the whole site or one source. Calls are blocked once it is reached.',
			'gatehouse'
		),
	],
	[
		__( 'Forecast', 'gatehouse' ),
		__(
			'Where spending is likely to end up by the end of the month, based on the last 7 days.',
			'gatehouse'
		),
	],
	[
		__( 'Redaction', 'gatehouse' ),
		__(
			'Replacing personal data with placeholders such as [EMAIL_1] before a prompt leaves your site, and putting the real values back in the answer.',
			'gatehouse'
		),
	],
	[
		__( 'Brand brief', 'gatehouse' ),
		__(
			'Instructions added to every AI request so all plugins follow the same voice and rules.',
			'gatehouse'
		),
	],
	[
		__( 'Blocked', 'gatehouse' ),
		__(
			'A call stopped before reaching the provider: by a pause, a budget, or Connector Approval.',
			'gatehouse'
		),
	],
	[
		__( 'Repeated request', 'gatehouse' ),
		__(
			'A call identical to an earlier one. A response cache (Gatehouse Pro) can answer these without paying again.',
			'gatehouse'
		),
	],
	[
		__( 'Connector', 'gatehouse' ),
		__(
			'WordPress’s connection to an AI provider, set up under Settings → Connectors.',
			'gatehouse'
		),
	],
];

/**
 * Topic from the URL: #/help?topic=budgets.
 *
 * @return {string} Topic or ''.
 */
function topicFromHash() {
	const query = window.location.hash.split( '?' )[ 1 ] || '';
	return new URLSearchParams( query ).get( 'topic' ) || '';
}

export default function Help( { go } ) {
	const [ query, setQuery ] = useState( '' );
	const [ topic, setTopic ] = useState( topicFromHash );
	const boot = window.gatehouseBoot || {};

	useEffect( () => {
		const onHash = () => setTopic( topicFromHash() );
		window.addEventListener( 'hashchange', onHash );
		return () => window.removeEventListener( 'hashchange', onHash );
	}, [] );

	useEffect( () => {
		if ( topic ) {
			const el = document.getElementById( `gatehouse-help-${ topic }` );
			if ( el ) {
				el.scrollIntoView( { block: 'start', behavior: 'smooth' } );
			}
		}
	}, [ topic ] );

	const q = query.trim().toLowerCase();
	const faq = useMemo(
		() =>
			FAQ.filter(
				( f ) =>
					! q ||
					f.q.toLowerCase().includes( q ) ||
					f.a.toLowerCase().includes( q )
			),
		[ q ]
	);
	const glossary = GLOSSARY.filter(
		( [ t, d ] ) =>
			! q ||
			t.toLowerCase().includes( q ) ||
			d.toLowerCase().includes( q )
	);
	const guides = GUIDES.filter(
		( g ) =>
			! q ||
			g.title.toLowerCase().includes( q ) ||
			g.text.toLowerCase().includes( q )
	);

	return (
		<div>
			<PageHead
				title={ __( 'Help', 'gatehouse' ) }
				lede={ __(
					'Guides, answers and quick actions. Hover the ⓘ icons anywhere in Gatehouse for short explanations.',
					'gatehouse'
				) }
			/>

			<div className="gatehouse-help-search">
				<Icon name="filter" size={ 16 } />
				<input
					type="search"
					value={ query }
					onChange={ ( e ) => setQuery( e.target.value ) }
					placeholder={ __(
						'Search help, for example “budget” or “approval”',
						'gatehouse'
					) }
					aria-label={ __( 'Search help', 'gatehouse' ) }
				/>
			</div>

			{ ! q && (
				<div className="gatehouse-grid">
					<QuickAction
						icon="spark"
						title={ __( 'Run the setup guide', 'gatehouse' ) }
						text={ __(
							'Connect a provider, approve plugins and set a budget, step by step.',
							'gatehouse'
						) }
						action={ __( 'Open setup guide', 'gatehouse' ) }
						onClick={ () => go( 'welcome' ) }
					/>
					<QuickAction
						icon="chart"
						title={
							boot.demo
								? __( 'You are viewing demo data', 'gatehouse' )
								: __( 'Explore with demo data', 'gatehouse' )
						}
						text={ __(
							'Sample numbers in a separate sandbox. Your real data and settings aren’t touched.',
							'gatehouse'
						) }
						action={
							boot.demo
								? __( 'Back to my data', 'gatehouse' )
								: __( 'Show demo data', 'gatehouse' )
						}
						onClick={ () =>
							boot.demo
								? send( 'demo', 'POST', {
										enabled: false,
								  } ).then( () => window.location.reload() )
								: startDemo()
						}
					/>
					<QuickAction
						icon="external"
						title={ __( 'Still stuck?', 'gatehouse' ) }
						text={ __(
							'Ask on the support forum. Include your WordPress and Gatehouse versions and what you expected to happen.',
							'gatehouse'
						) }
						action={ __( 'Get support', 'gatehouse' ) }
						href={ boot.supportUrl }
					/>
				</div>
			) }

			{ guides.length > 0 && (
				<section
					id="gatehouse-help-guides"
					style={ { marginBottom: 18 } }
				>
					<h2 className="gatehouse-section-title">
						{ __( 'Guides', 'gatehouse' ) }
					</h2>
					<div className="gatehouse-help-guides">
						{ guides.map( ( g ) => (
							<button
								key={ g.id }
								id={ `gatehouse-help-${ g.id }` }
								type="button"
								className={ `gatehouse-help-guide ${
									topic === g.id ? 'is-highlight' : ''
								}` }
								onClick={ () => go( g.route ) }
							>
								<Icon name={ g.icon } size={ 18 } />
								<strong>{ g.title }</strong>
								<span>{ g.text }</span>
								<em>
									{ __( 'Open', 'gatehouse' ) }
									<Icon name="arrowRight" size={ 13 } />
								</em>
							</button>
						) ) }
					</div>
				</section>
			) }

			<Card
				title={ __( 'Questions and troubleshooting', 'gatehouse' ) }
				bodyClass={ null }
				style={ { marginBottom: 18 } }
			>
				<div className="gatehouse-faq" id="gatehouse-help-faq">
					{ faq.length === 0 && (
						<p className="gatehouse-card__body gatehouse-muted">
							{ __(
								'No answers match your search.',
								'gatehouse'
							) }
						</p>
					) }
					{ faq.map( ( f ) => (
						<details
							key={ f.id }
							id={ `gatehouse-help-${ f.id }` }
							open={
								topic === f.id ||
								topic === f.topic ||
								( q && faq.length <= 3 )
							}
						>
							<summary>
								{ f.q }
								{ f.topic === 'troubleshooting' && (
									<Pill>
										{ __( 'Troubleshooting', 'gatehouse' ) }
									</Pill>
								) }
							</summary>
							<p>{ f.a }</p>
						</details>
					) ) }
				</div>
			</Card>

			{ glossary.length > 0 && (
				<Card
					title={ __( 'Glossary', 'gatehouse' ) }
					style={ { marginBottom: 18 } }
				>
					<dl className="gatehouse-dl" id="gatehouse-help-glossary">
						{ glossary.map( ( [ term, text ] ) => (
							<div key={ term } style={ { display: 'contents' } }>
								<dt
									style={ {
										color: 'var(--gatehouse-ink)',
										fontWeight: 620,
									} }
								>
									{ term }
								</dt>
								<dd style={ { fontWeight: 450 } }>{ text }</dd>
							</div>
						) ) }
					</dl>
				</Card>
			) }

			{ boot.docsUrl && (
				<p className="gatehouse-muted" style={ { fontSize: 13 } }>
					<a
						href={ boot.docsUrl }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ __( 'Full documentation', 'gatehouse' ) }
					</a>
				</p>
			) }
		</div>
	);
}

function QuickAction( { icon, title, text, action, onClick, href } ) {
	return (
		<Card className="gatehouse-span-4" bodyClass={ null }>
			<div className="gatehouse-quick">
				<span
					className="gatehouse-savings__icon"
					style={ { width: 36, height: 36 } }
				>
					<Icon name={ icon } size={ 18 } />
				</span>
				<div className="gatehouse-quick__title">{ title }</div>
				<div
					className="gatehouse-muted"
					style={ { fontSize: 13, flex: 1 } }
				>
					{ text }
				</div>
				{ href ? (
					<a
						className="gatehouse-btn is-sm"
						href={ href }
						target="_blank"
						rel="noopener noreferrer"
					>
						{ action }
						<Icon name="external" size={ 13 } />
					</a>
				) : (
					<Button size="sm" onClick={ onClick }>
						{ action }
					</Button>
				) }
			</div>
		</Card>
	);
}
