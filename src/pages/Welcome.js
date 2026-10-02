import { __, _n, sprintf } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { send, useApi } from '../lib/hooks';
import {
	Button,
	ErrorNotice,
	Loading,
	MoneyInput,
	CountInput,
	Pill,
	Setting,
	Switch,
	useToast,
} from '../components/ui';
import Icon from '../components/Icon';

/**
 * Turn demo mode on, then reload so every page shows sample data.
 *
 * @return {Promise} Request.
 */
export function startDemo() {
	return send( 'demo', 'POST', { enabled: true } ).then( () => {
		window.location.hash = '#/overview';
		window.location.reload();
	} );
}

/**
 * Class for a step in the progress bar.
 *
 * @param {number} i    Step index.
 * @param {number} step Current step.
 * @return {string} Class name.
 */
function stepClass( i, step ) {
	if ( i === step ) {
		return 'is-current';
	}
	return i < step ? 'is-done' : '';
}

export default function Welcome( { go } ) {
	const { data, error, reload } = useApi( 'setup' );
	const [ step, setStep ] = useState( 0 );
	const [ form, setForm ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const toast = useToast();

	useEffect( () => {
		if ( data && ! form ) {
			setForm( {
				global_budget: data.budget,
				rate_limit: data.rate_limit,
				alerts: {
					enabled: data.alerts.enabled,
					email: data.alerts.email,
				},
				redaction: { enabled: data.redaction },
				// Pre-ticked: the guide shows exactly what is downloaded before anything is saved.
				prices_auto: true,
			} );
		}
	}, [ data, form ] );

	if ( error && ! data ) {
		return <ErrorNotice error={ error } onRetry={ reload } />;
	}
	if ( ! data || ! form ) {
		return <Loading />;
	}

	const steps = [
		{ id: 'welcome', label: __( 'Welcome', 'gatehouse' ) },
		{ id: 'provider', label: __( 'AI provider', 'gatehouse' ) },
		...( data.approval.active
			? [ { id: 'approval', label: __( 'Approvals', 'gatehouse' ) } ]
			: [] ),
		{ id: 'protect', label: __( 'Safeguards', 'gatehouse' ) },
		{ id: 'done', label: __( 'Ready', 'gatehouse' ) },
	];
	const current = steps[ Math.min( step, steps.length - 1 ) ];
	const last = step >= steps.length - 1;

	const saveForm = () =>
		send( 'setup', 'POST', {
			...form,
			global_budget: Number( form.global_budget ) || 0,
		} );

	const next = () => {
		if ( current.id === 'protect' ) {
			setBusy( true );
			saveForm()
				.then( () => setStep( step + 1 ) )
				.catch( ( e ) => toast( e.message, 'alert' ) )
				.finally( () => setBusy( false ) );
			return;
		}
		setStep( step + 1 );
	};

	const finish = ( demo ) => {
		setBusy( true );
		send( 'setup', 'POST', { complete: true } )
			.then( () => {
				window.gatehouseBoot.onboarded = true;
				if ( demo ) {
					return startDemo();
				}
				go( 'overview' );
			} )
			.catch( ( e ) => {
				toast( e.message, 'alert' );
				setBusy( false );
			} );
	};

	return (
		<div className="gatehouse-wizard">
			<ol
				className="gatehouse-wizard__steps"
				aria-label={ __( 'Setup steps', 'gatehouse' ) }
			>
				{ steps.map( ( s, i ) => (
					<li
						key={ s.id }
						className={ stepClass( i, step ) }
						aria-current={ i === step ? 'step' : undefined }
					>
						<span className="gatehouse-wizard__dot">
							{ i < step ? (
								<Icon name="check" size={ 13 } />
							) : (
								i + 1
							) }
						</span>
						<span className="gatehouse-wizard__label">
							{ s.label }
						</span>
					</li>
				) ) }
			</ol>

			<section className="gatehouse-card gatehouse-wizard__card">
				{ current.id === 'welcome' && <StepWelcome /> }
				{ current.id === 'provider' && (
					<StepProvider data={ data } reload={ reload } />
				) }
				{ current.id === 'approval' && (
					<StepApproval data={ data } reload={ reload } />
				) }
				{ current.id === 'protect' && (
					<StepProtect form={ form } setForm={ setForm } />
				) }
				{ current.id === 'done' && (
					<StepDone busy={ busy } finish={ finish } />
				) }

				{ ! last && (
					<footer className="gatehouse-wizard__foot">
						<Button
							variant="ghost"
							onClick={ () => finish( false ) }
							disabled={ busy }
						>
							{ __( 'Skip setup', 'gatehouse' ) }
						</Button>
						<span className="gatehouse-spacer" />
						{ step > 0 && (
							<Button
								onClick={ () => setStep( step - 1 ) }
								disabled={ busy }
							>
								{ __( 'Back', 'gatehouse' ) }
							</Button>
						) }
						<Button
							variant="primary"
							onClick={ next }
							disabled={ busy }
						>
							{ step === 0
								? __( 'Get started', 'gatehouse' )
								: __( 'Continue', 'gatehouse' ) }
							<Icon name="arrowRight" size={ 14 } />
						</Button>
					</footer>
				) }
			</section>
		</div>
	);
}

function StepWelcome() {
	const points = [
		{
			icon: 'coins',
			title: __( 'See what AI costs', 'gatehouse' ),
			text: __(
				'AI calls made through WordPress, traced to the plugin that made it, with an estimated cost.',
				'gatehouse'
			),
		},
		{
			icon: 'gauge',
			title: __( 'Stop runaway spending', 'gatehouse' ),
			text: __(
				'Monthly budgets for the whole site and for each plugin, enforced before anything is sent.',
				'gatehouse'
			),
		},
		{
			icon: 'shield',
			title: __( 'Know what personal data leaves', 'gatehouse' ),
			text: __(
				'See which plugins send emails, phone numbers or card numbers to AI providers, and replace them for the plugins that don’t need them. Pattern-based, so it does not catch every name or address.',
				'gatehouse'
			),
		},
	];
	return (
		<div className="gatehouse-wizard__body">
			<h1 className="gatehouse-wizard__title">
				{ __( 'Welcome to Gatehouse', 'gatehouse' ) }
			</h1>
			<p className="gatehouse-wizard__lede">
				{ __(
					'Gatehouse sits between your plugins and AI providers, with no setup in those plugins. It sees plugins that use the AI Client built into WordPress, and plugins that call Anthropic, OpenAI, Google and similar providers directly with their own API key. It can’t see plugins that send AI requests to their own service (as many SEO and page builder plugins do), or that bypass WordPress’s HTTP functions. This short guide takes about two minutes.',
					'gatehouse'
				) }
			</p>
			<div className="gatehouse-wizard__points">
				{ points.map( ( p ) => (
					<div key={ p.title } className="gatehouse-wizard__point">
						<span
							className="gatehouse-savings__icon"
							style={ { width: 36, height: 36 } }
						>
							<Icon name={ p.icon } size={ 18 } />
						</span>
						<div>
							<div style={ { fontWeight: 620 } }>{ p.title }</div>
							<div
								className="gatehouse-muted"
								style={ { fontSize: 13 } }
							>
								{ p.text }
							</div>
						</div>
					</div>
				) ) }
			</div>
		</div>
	);
}

function StepProvider( { data, reload } ) {
	const connected = data.providers.filter( ( p ) => p.configured );
	return (
		<div className="gatehouse-wizard__body">
			<h1 className="gatehouse-wizard__title">
				{ __( 'Connect an AI provider', 'gatehouse' ) }
			</h1>
			<p className="gatehouse-wizard__lede">
				{ __(
					'Plugins use the AI provider you connect to WordPress, such as Anthropic, OpenAI or Google. Gatehouse does not need its own API key.',
					'gatehouse'
				) }
			</p>

			{ data.providers.length > 0 && (
				<ul className="gatehouse-checklist">
					{ data.providers.map( ( p ) => (
						<li key={ p.id }>
							<span>{ p.name }</span>
							{ p.configured ? (
								<Pill tone="good" icon="check">
									{ __( 'API key added', 'gatehouse' ) }
								</Pill>
							) : (
								<Pill tone="warning" icon="alert">
									{ __( 'No API key yet', 'gatehouse' ) }
								</Pill>
							) }
						</li>
					) ) }
				</ul>
			) }

			{ connected.length > 0 ? (
				<p className="gatehouse-wizard__ok">
					<Icon name="check" size={ 16 } />
					{ __(
						'You’re connected. Continue to the next step.',
						'gatehouse'
					) }
				</p>
			) : (
				<ol className="gatehouse-howto">
					{ data.providers.length === 0 && (
						<li>
							<strong>
								{ __(
									'Install a provider plugin.',
									'gatehouse'
								) }
							</strong>{ ' ' }
							{ __(
								'For example “AI Provider for Anthropic”, “AI Provider for OpenAI” or “AI Provider for Google”.',
								'gatehouse'
							) }
							<div>
								<a
									className="gatehouse-btn is-sm"
									href={ data.plugins }
									target="_blank"
									rel="noopener noreferrer"
								>
									{ __(
										'Find provider plugins',
										'gatehouse'
									) }
									<Icon name="external" size={ 13 } />
								</a>
							</div>
						</li>
					) }
					<li>
						<strong>
							{ __( 'Add your API key.', 'gatehouse' ) }
						</strong>{ ' ' }
						{ __(
							'Go to Settings → Connectors and paste the key from your provider’s account.',
							'gatehouse'
						) }
						<div>
							<a
								className="gatehouse-btn is-sm"
								href={ data.connectors }
								target="_blank"
								rel="noopener noreferrer"
							>
								{ __( 'Open Connectors', 'gatehouse' ) }
								<Icon name="external" size={ 13 } />
							</a>
						</div>
					</li>
					<li>
						<strong>{ __( 'Come back here', 'gatehouse' ) }</strong>{ ' ' }
						{ __( 'and check again.', 'gatehouse' ) }
						<div>
							<Button size="sm" icon="refresh" onClick={ reload }>
								{ __( 'Check again', 'gatehouse' ) }
							</Button>
						</div>
					</li>
				</ol>
			) }
			<p
				className="gatehouse-muted"
				style={ { fontSize: 12.5, marginTop: 16 } }
			>
				{ __(
					'No provider yet? You can still continue and explore Gatehouse with demo data at the end.',
					'gatehouse'
				) }
			</p>
		</div>
	);
}

function StepApproval( { data, reload } ) {
	const pending = data.approval.pending.filter( ( p ) => ! p.self );
	const self = data.approval.pending.some( ( p ) => p.self );
	return (
		<div className="gatehouse-wizard__body">
			<h1 className="gatehouse-wizard__title">
				{ __( 'Approve plugins that use AI', 'gatehouse' ) }
			</h1>
			<p className="gatehouse-wizard__lede">
				{ __(
					'Your site uses the AI plugin’s Connector Approval feature: each plugin must be approved before it can use your AI provider. Until then its AI calls are blocked, and Gatehouse logs them as “Blocked”.',
					'gatehouse'
				) }
			</p>

			{ pending.length > 0 ? (
				<>
					<h2 className="gatehouse-section-title">
						{ sprintf(
							/* translators: %d: number of plugins. */
							_n(
								'%d plugin is waiting for approval',
								'%d plugins are waiting for approval',
								pending.length,
								'gatehouse'
							),
							pending.length
						) }
					</h2>
					<ul className="gatehouse-checklist">
						{ pending.map( ( p ) => (
							<li key={ `${ p.basename }-${ p.connector }` }>
								<span>
									{ p.name }
									<span
										className="gatehouse-muted"
										style={ { fontSize: 12.5 } }
									>
										{ ` · ${ p.connector }` }
									</span>
								</span>
								<Pill tone="warning" icon="clock">
									{ __( 'Waiting', 'gatehouse' ) }
								</Pill>
							</li>
						) ) }
					</ul>
				</>
			) : (
				<p className="gatehouse-wizard__ok">
					<Icon name="check" size={ 16 } />
					{ __(
						'No plugins are waiting for approval right now.',
						'gatehouse'
					) }
				</p>
			) }

			<ol className="gatehouse-howto">
				<li>
					<strong>
						{ __(
							'Open Tools → Connector Approval.',
							'gatehouse'
						) }
					</strong>
					<div>
						<a
							className="gatehouse-btn is-sm"
							href={ data.approval.url }
							target="_blank"
							rel="noopener noreferrer"
						>
							{ __( 'Open Connector Approval', 'gatehouse' ) }
							<Icon name="external" size={ 13 } />
						</a>
					</div>
				</li>
				<li>
					<strong>
						{ __(
							'Approve the plugins you trust to use AI.',
							'gatehouse'
						) }
					</strong>{ ' ' }
					{ __(
						'A plugin appears there after it first tries to use AI.',
						'gatehouse'
					) }
				</li>
				<li>
					<strong>
						{ __( 'Come back and check again.', 'gatehouse' ) }
					</strong>
					<div>
						<Button size="sm" icon="refresh" onClick={ reload }>
							{ __( 'Check again', 'gatehouse' ) }
						</Button>
					</div>
				</li>
			</ol>

			<p className="gatehouse-callout-inline" style={ { marginTop: 16 } }>
				<Icon
					name="info"
					size={ 16 }
					style={ { flexShrink: 0, marginTop: 2 } }
				/>
				<span>
					{ __(
						'Gatehouse itself never uses AI, so it never needs approval.',
						'gatehouse'
					) }
					{ self &&
						' ' +
							__(
								'If “Gatehouse” is listed on the approval screen (earlier versions checked providers in a way that triggered this), you can deny or ignore it.',
								'gatehouse'
							) }
				</span>
			</p>
		</div>
	);
}

function StepProtect( { form, setForm } ) {
	const set = ( patch ) => setForm( ( f ) => ( { ...f, ...patch } ) );
	return (
		<div className="gatehouse-wizard__body">
			<h1 className="gatehouse-wizard__title">
				{ __( 'Set up safeguards', 'gatehouse' ) }
			</h1>
			<p className="gatehouse-wizard__lede">
				{ __(
					'Safe defaults you can change any time under Settings and Privacy.',
					'gatehouse'
				) }
			</p>
			<div className="gatehouse-card" style={ { boxShadow: 'none' } }>
				<Setting
					title={ __(
						'Monthly AI budget for the whole site',
						'gatehouse'
					) }
					desc={ __(
						'AI calls stop when this is reached, until the 1st of next month. Leave empty for no limit.',
						'gatehouse'
					) }
				>
					<div style={ { width: 140 } }>
						<MoneyInput
							value={ form.global_budget }
							onChange={ ( v ) => set( { global_budget: v } ) }
							label={ __(
								'Monthly budget in US dollars',
								'gatehouse'
							) }
						/>
					</div>
				</Setting>
				<Setting
					title={ __( 'Hourly call limit per plugin', 'gatehouse' ) }
					desc={ __(
						'Stops a plugin stuck in a loop: once it makes this many AI calls in an hour, its further calls are blocked and you get an email. Set it well above normal use. Leave empty for no limit.',
						'gatehouse'
					) }
				>
					<div style={ { width: 170 } }>
						<CountInput
							value={ form.rate_limit }
							onChange={ ( v ) => set( { rate_limit: v } ) }
							suffix={ __( 'per hour', 'gatehouse' ) }
							placeholder={ __( 'No limit', 'gatehouse' ) }
							label={ __(
								'Hourly call limit per plugin',
								'gatehouse'
							) }
						/>
					</div>
				</Setting>
				<Setting
					title={ __( 'Email me about budgets', 'gatehouse' ) }
					desc={ __(
						'One email at 80% of a budget, one when it is reached, and one if a plugin hits the hourly limit.',
						'gatehouse'
					) }
				>
					<Switch
						checked={ form.alerts.enabled }
						onChange={ ( v ) =>
							set( { alerts: { ...form.alerts, enabled: v } } )
						}
						label={ __( 'Email alerts', 'gatehouse' ) }
					/>
				</Setting>
				{ form.alerts.enabled && (
					<Setting title={ __( 'Send alerts to', 'gatehouse' ) }>
						<input
							type="email"
							className="gatehouse-input"
							style={ { width: 260 } }
							value={ form.alerts.email }
							aria-label={ __(
								'Alert email address',
								'gatehouse'
							) }
							onChange={ ( e ) =>
								set( {
									alerts: {
										...form.alerts,
										email: e.target.value,
									},
								} )
							}
						/>
					</Setting>
				) }
				<Setting
					title={ __( 'Keep model prices up to date', 'gatehouse' ) }
					desc={ __(
						'Downloads current prices once a day from OpenRouter’s public model list, so cost estimates stay accurate. Nothing about your site is sent. Without this, the prices built into the plugin are used.',
						'gatehouse'
					) }
				>
					<Switch
						checked={ form.prices_auto }
						onChange={ ( v ) => set( { prices_auto: v } ) }
						label={ __(
							'Keep model prices up to date',
							'gatehouse'
						) }
					/>
				</Setting>
				<Setting
					title={ __(
						'Check AI requests for personal data',
						'gatehouse'
					) }
					desc={ __(
						'Shows which plugins send emails, phone numbers and similar to AI providers. Nothing is changed; later you can turn on redaction for the plugins that don’t need the real values.',
						'gatehouse'
					) }
				>
					<Switch
						checked={ form.redaction.enabled }
						onChange={ ( v ) =>
							set( { redaction: { enabled: v } } )
						}
						label={ __(
							'Check AI requests for personal data',
							'gatehouse'
						) }
					/>
				</Setting>
			</div>
		</div>
	);
}

function StepDone( { busy, finish } ) {
	return (
		<div
			className="gatehouse-wizard__body"
			style={ { textAlign: 'center' } }
		>
			<span
				className="gatehouse-savings__icon"
				style={ { width: 52, height: 52, margin: '0 auto 14px' } }
			>
				<Icon name="check" size={ 24 } />
			</span>
			<h1 className="gatehouse-wizard__title">
				{ __( 'You’re all set', 'gatehouse' ) }
			</h1>
			<p
				className="gatehouse-wizard__lede"
				style={ { margin: '0 auto' } }
			>
				{ __(
					'Gatehouse now records the AI calls plugins make through WordPress. They appear on the dashboard as soon as a plugin uses AI.',
					'gatehouse'
				) }
			</p>
			<div className="gatehouse-wizard__choices">
				<button
					type="button"
					className="gatehouse-choice"
					onClick={ () => finish( false ) }
					disabled={ busy }
				>
					<Icon name="overview" size={ 22 } />
					<strong>{ __( 'Go to my dashboard', 'gatehouse' ) }</strong>
					<span>
						{ __(
							'See your site’s real AI activity.',
							'gatehouse'
						) }
					</span>
				</button>
				<button
					type="button"
					className="gatehouse-choice"
					onClick={ () => finish( true ) }
					disabled={ busy }
				>
					<Icon name="spark" size={ 22 } />
					<strong>
						{ __( 'Explore with demo data', 'gatehouse' ) }
					</strong>
					<span>
						{ __(
							'Try every feature with sample numbers. Your real data and settings aren’t touched; switch back any time.',
							'gatehouse'
						) }
					</span>
				</button>
			</div>
			<p
				className="gatehouse-muted"
				style={ { fontSize: 12.5, marginTop: 18 } }
			>
				{ __(
					'You can open this guide again from Help.',
					'gatehouse'
				) }
			</p>
		</div>
	);
}
