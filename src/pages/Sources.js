import { __, sprintf } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { useApi, useStored, send, siteNow } from '../lib/hooks';
import { money, compact, relative } from '../lib/format';
import { makeColorer } from '../lib/colors';
import {
	Card,
	Meter,
	SourceAvatar,
	SourceStatus,
	Segmented,
	PageHead,
	Empty,
	ErrorNotice,
	RANGE_OPTIONS,
	Button,
	Drawer,
	Switch,
	Setting,
	MoneyInput,
	useToast,
	typeLabel,
	Pill,
	Loading,
	Term,
} from '../components/ui';
import Icon from '../components/Icon';

export default function Sources() {
	const [ days, setDays ] = useStored( 'range', 30 );
	const { data, error, loading, reload } = useApi( `sources?days=${ days }` );
	const [ editing, setEditing ] = useState( null );
	const colorOf = useMemo(
		() => makeColorer( data?.order ),
		[ data?.order ]
	);

	if ( error && ! data ) {
		return <ErrorNotice error={ error } onRetry={ reload } />;
	}
	if ( ! data ) {
		return <Loading />;
	}

	const sources = data.sources;
	const budgeted = sources.filter( ( s ) => s.policy.budget > 0 ).length;
	const paused = sources.filter( ( s ) => s.policy.paused ).length;
	const attention = sources.filter( ( s ) =>
		[ 'forecast', 'near', 'capped' ].includes( s.status )
	).length;
	const current = editing ? sources.find( ( s ) => s.id === editing ) : null;

	return (
		<div className={ loading ? 'gatehouse-is-loading' : '' }>
			<PageHead
				help="sources"
				title={ __( 'Sources', 'gatehouse' ) }
				lede={ __(
					'Every plugin and theme that has called AI on this site. Give each one a monthly budget, pause it, or change how the gateway treats its requests.',
					'gatehouse'
				) }
			>
				<Segmented
					label={ __( 'Date range', 'gatehouse' ) }
					options={ RANGE_OPTIONS }
					value={ days }
					onChange={ setDays }
				/>
			</PageHead>

			<div
				className="gatehouse-row"
				style={ { marginBottom: 16, gap: 8 } }
			>
				<Pill icon="sources">
					{ sprintf(
						/* translators: %d: number of sources. */ __(
							'%d sources',
							'gatehouse'
						),
						sources.length
					) }
				</Pill>

				<Pill icon="gauge">
					{ sprintf(
						/* translators: %d: number of sources with a budget. */ __(
							'%d with a budget',
							'gatehouse'
						),
						budgeted
					) }
				</Pill>

				{ attention > 0 && (
					<Pill tone="serious" icon="alert">
						{ sprintf(
							/* translators: %d: number of sources that need attention. */ __(
								'%d need attention',
								'gatehouse'
							),
							attention
						) }
					</Pill>
				) }

				{ paused > 0 && (
					<Pill tone="critical" icon="pause">
						{ sprintf(
							/* translators: %d: number of paused sources. */ __(
								'%d paused',
								'gatehouse'
							),
							paused
						) }
					</Pill>
				) }
				<span className="gatehouse-spacer" />

				<span className="gatehouse-muted" style={ { fontSize: 12.5 } }>
					{ sprintf(
						/* translators: %s: month and year. */ __(
							'Budgets reset on the 1st. Now: %s.',
							'gatehouse'
						),
						data.month.label
					) }
				</span>
			</div>

			<Card bodyClass={ null }>
				{ sources.length === 0 ? (
					<Empty
						title={ __( 'No sources yet', 'gatehouse' ) }
						text={ __(
							'Plugins and themes appear here the first time they call AI through the WordPress AI Client.',
							'gatehouse'
						) }
					/>
				) : (
					<div className="gatehouse-table-wrap">
						<table className="gatehouse-table">
							<thead>
								<tr>
									<th scope="col">
										{ __( 'Source', 'gatehouse' ) }
									</th>
									<th scope="col" style={ { minWidth: 220 } }>
										<Term
											label={ __(
												'This month vs budget',
												'gatehouse'
											) }
											tip={ __(
												'Spend since the 1st of this month against the source’s monthly budget. The striped part is the forecast for the month; the tick marks the budget.',
												'gatehouse'
											) }
											align="left"
										/>
									</th>
									<th scope="col" className="is-num">
										{ __( 'Spend', 'gatehouse' ) }
									</th>
									<th scope="col" className="is-num">
										{ __( 'Calls', 'gatehouse' ) }
									</th>
									<th scope="col">
										{ __( 'Models', 'gatehouse' ) }
									</th>
									<th scope="col">
										<Term
											label={ __(
												'Status',
												'gatehouse'
											) }
											tip={ __(
												'Active: within budget. On pace to exceed: under budget now, but the forecast is over. Near budget: past your alert threshold. Budget reached or Paused: its AI calls are blocked.',
												'gatehouse'
											) }
											align="right"
										/>
									</th>
									<th scope="col">
										<span className="gatehouse-sr">
											{ __( 'Actions', 'gatehouse' ) }
										</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{ sources.map( ( s ) => (
									<tr
										key={ s.id }
										className="is-clickable"
										onClick={ () => setEditing( s.id ) }
									>
										<td>
											<div className="gatehouse-source">
												<SourceAvatar
													label={ s.label }
													color={ colorOf( s.id ) }
													large
												/>
												<div style={ { minWidth: 0 } }>
													<div className="gatehouse-source__name">
														{ s.label }
													</div>
													<div
														className="gatehouse-muted"
														style={ {
															fontSize: 12,
														} }
													>
														{ typeLabel( s.type ) }
														{ s.last_seen &&
															` · ${ relative(
																s.last_seen,
																siteNow()
															) }` }
													</div>
												</div>
											</div>
										</td>
										<td>
											{ s.policy.budget > 0 ? (
												<div>
													<Meter
														small
														value={ s.month }
														max={ s.policy.budget }
														forecast={ s.forecast }
														label={ s.label }
													/>
													<div
														className="gatehouse-row gatehouse-num"
														style={ {
															fontSize: 12,
															marginTop: 7,
															justifyContent:
																'space-between',
														} }
													>
														<span>{ `${ money(
															s.month
														) } / ${ money(
															s.policy.budget
														) }` }</span>

														<span className="gatehouse-muted">
															{ sprintf(
																/* translators: %s: forecast amount. */ __(
																	'forecast %s',
																	'gatehouse'
																),
																money(
																	s.forecast
																)
															) }
														</span>
													</div>
												</div>
											) : (
												<span
													className="gatehouse-muted"
													style={ { fontSize: 12.5 } }
												>
													{ money( s.month ) } ·{ ' ' }
													{ __(
														'No budget',
														'gatehouse'
													) }
												</span>
											) }
										</td>
										<td className="is-num">
											<strong>{ money( s.cost ) }</strong>
										</td>
										<td className="is-num">
											{ compact( s.requests ) }
										</td>
										<td>
											<div className="gatehouse-chips">
												{ s.models
													.slice( 0, 2 )
													.map( ( m ) => (
														<span
															key={ m }
															className="gatehouse-chip"
														>
															{ m }
														</span>
													) ) }
												{ s.models.length > 2 && (
													<span className="gatehouse-chip">{ `+${
														s.models.length - 2
													}` }</span>
												) }
											</div>
										</td>
										<td>
											<SourceStatus status={ s.status } />
										</td>
										<td style={ { textAlign: 'right' } }>
											<Button
												variant="ghost"
												size="sm"
												icon="edit"
												onClick={ ( e ) => {
													e.stopPropagation();
													setEditing( s.id );
												} }
											>
												{ __( 'Policy', 'gatehouse' ) }
											</Button>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				) }
			</Card>

			{ current && (
				<PolicyDrawer
					source={ current }
					color={ colorOf( current.id ) }
					onClose={ () => setEditing( null ) }
					onSaved={ () => {
						reload();
						setEditing( null );
					} }
				/>
			) }
		</div>
	);
}

function PolicyDrawer( { source, color, onClose, onSaved } ) {
	const [ policy, setPolicy ] = useState( source.policy );
	const [ saving, setSaving ] = useState( false );
	const toast = useToast();
	const set = ( key ) => ( value ) =>
		setPolicy( ( p ) => ( { ...p, [ key ]: value } ) );

	const save = () => {
		setSaving( true );
		send( 'sources', 'POST', {
			source: source.id,
			policy: { ...policy, budget: Number( policy.budget ) || 0 },
		} )
			.then( () => {
				toast( __( 'Policy saved', 'gatehouse' ) );
				onSaved();
			} )
			.catch( ( e ) =>
				toast(
					e.message || __( 'Could not save', 'gatehouse' ),
					'alert'
				)
			)
			.finally( () => setSaving( false ) );
	};

	const budget = Number( policy.budget ) || 0;

	return (
		<Drawer
			onClose={ onClose }
			title={
				<div className="gatehouse-source">
					<SourceAvatar
						label={ source.label }
						color={ color }
						large
					/>
					<div>
						<div
							className="gatehouse-source__name"
							style={ { fontSize: 16 } }
						>
							{ source.label }
						</div>
						<div className="gatehouse-source__id">
							{ source.id }
						</div>
					</div>
				</div>
			}
			footer={
				<>
					<Button onClick={ onClose }>
						{ __( 'Cancel', 'gatehouse' ) }
					</Button>
					<Button
						variant="primary"
						onClick={ save }
						disabled={ saving }
					>
						{ saving
							? __( 'Saving…', 'gatehouse' )
							: __( 'Save policy', 'gatehouse' ) }
					</Button>
				</>
			}
		>
			<div>
				<h3 className="gatehouse-section-title">
					{ __( 'This month', 'gatehouse' ) }
				</h3>
				<div
					className="gatehouse-row"
					style={ {
						alignItems: 'baseline',
						gap: 8,
						marginBottom: 10,
					} }
				>
					<span
						style={ {
							fontSize: 28,
							fontWeight: 680,
							letterSpacing: '-0.03em',
						} }
					>
						{ money( source.month ) }
					</span>
					<span className="gatehouse-muted">
						{ budget > 0
							? /* translators: %s: budget. */ sprintf(
									__( 'of %s', 'gatehouse' ),
									money( budget )
							  )
							: __( 'spent, no budget', 'gatehouse' ) }
					</span>
				</div>
				{ budget > 0 && (
					<Meter
						value={ source.month }
						max={ budget }
						forecast={ source.forecast }
						label={ __( 'Monthly budget', 'gatehouse' ) }
					/>
				) }

				<p
					className="gatehouse-muted"
					style={ { fontSize: 12.5, marginTop: 8 } }
				>
					{ sprintf(
						/* translators: %s: forecast. */ __(
							'Month-end forecast at the current pace: %s',
							'gatehouse'
						),
						money( source.forecast )
					) }
				</p>
			</div>

			<dl className="gatehouse-dl">
				<dt>{ __( 'Calls in period', 'gatehouse' ) }</dt>
				<dd className="gatehouse-num">
					{ compact( source.requests ) }
				</dd>
				<dt>{ __( 'Tokens', 'gatehouse' ) }</dt>
				<dd className="gatehouse-num">{ compact( source.tokens ) }</dd>
				<dt>{ __( 'Items redacted', 'gatehouse' ) }</dt>
				<dd className="gatehouse-num">
					{ compact( source.redactions ) }
				</dd>
				<dt>{ __( 'Blocked / failed', 'gatehouse' ) }</dt>
				<dd className="gatehouse-num">{ `${ compact(
					source.blocked
				) } / ${ compact( source.errors ) }` }</dd>
				<dt>{ __( 'Models', 'gatehouse' ) }</dt>
				<dd>
					<div className="gatehouse-chips">
						{ source.models.length
							? source.models.map( ( m ) => (
									<span key={ m } className="gatehouse-chip">
										{ m }
									</span>
							  ) )
							: '–' }
					</div>
				</dd>
			</dl>

			<div>
				<h3 className="gatehouse-section-title">
					{ __( 'Policy', 'gatehouse' ) }
				</h3>
				<div className="gatehouse-card" style={ { boxShadow: 'none' } }>
					<Setting
						title={ __( 'Monthly budget', 'gatehouse' ) }
						desc={ __(
							'Calls are blocked once this is reached. Leave empty for no limit.',
							'gatehouse'
						) }
					>
						<div style={ { width: 130 } }>
							<MoneyInput
								value={ policy.budget }
								onChange={ set( 'budget' ) }
								label={ __(
									'Monthly budget in US dollars',
									'gatehouse'
								) }
							/>
						</div>
					</Setting>
					<Setting
						title={ __( 'Pause AI', 'gatehouse' ) }
						desc={ __(
							'Block every AI call from this source. Well-behaved plugins hide their AI features while paused.',
							'gatehouse'
						) }
						badge={
							policy.paused ? (
								<Pill tone="critical" icon="pause">
									{ __( 'Paused', 'gatehouse' ) }
								</Pill>
							) : null
						}
					>
						<Switch
							checked={ policy.paused }
							onChange={ set( 'paused' ) }
							label={ __(
								'Pause AI for this source',
								'gatehouse'
							) }
						/>
					</Setting>
					<Setting
						title={ __( 'Skip redaction', 'gatehouse' ) }
						desc={ __(
							'Send this source’s prompts unchanged. Only for plugins that need exact personal data, such as a CRM.',
							'gatehouse'
						) }
					>
						<Switch
							checked={ policy.skip_redaction }
							onChange={ set( 'skip_redaction' ) }
							label={ __(
								'Skip redaction for this source',
								'gatehouse'
							) }
						/>
					</Setting>
					<Setting
						title={ __( 'Skip brand brief', 'gatehouse' ) }
						desc={ __(
							'Do not add the brand brief to this source’s prompts.',
							'gatehouse'
						) }
					>
						<Switch
							checked={ policy.skip_brief }
							onChange={ set( 'skip_brief' ) }
							label={ __(
								'Skip brand brief for this source',
								'gatehouse'
							) }
						/>
					</Setting>
				</div>
			</div>

			<p
				className="gatehouse-muted"
				style={ { fontSize: 12.5, display: 'flex', gap: 8 } }
			>
				<Icon
					name="info"
					size={ 15 }
					style={ { flexShrink: 0, marginTop: 1 } }
				/>
				{ __(
					'Costs are estimates from token counts and the price table in Settings. Your provider’s invoice is the source of truth.',
					'gatehouse'
				) }
			</p>
		</Drawer>
	);
}
