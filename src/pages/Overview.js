import { __, _n, sprintf } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { useApi, useStored, siteNow } from '../lib/hooks';
import {
	dateLong,
	money,
	moneyParts,
	compact,
	duration,
	change,
	relative,
	integer,
} from '../lib/format';
import { makeColorer, providerColor } from '../lib/colors';
import {
	Card,
	Delta,
	Meter,
	SourceAvatar,
	SourceStatus,
	RequestStatus,
	Segmented,
	PageHead,
	Empty,
	ErrorNotice,
	RANGE_OPTIONS,
	rangeLabel,
	Pill,
	Button,
	Loading,
	InfoTip,
	Term,
} from '../components/ui';
import {
	StackedColumns,
	Sparkline,
	BarList,
	Heatmap,
} from '../components/charts';
import Icon from '../components/Icon';
import { startDemo } from './Welcome';

export default function Overview( { go } ) {
	const [ days, setDays ] = useStored( 'range', 30 );
	const { data, error, loading, reload } = useApi(
		`overview?days=${ days }`
	);

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

	const { kpis, previous, series, month } = data;
	const range = rangeLabel( days );

	const vs = sprintf(
		/* translators: %s: period, e.g. "last 30 days". */ __(
			'compared with the previous %s',
			'gatehouse'
		),
		range.replace( /^last /, '' )
	);
	const isEmpty = kpis.requests === 0 && data.recent.length === 0;

	return (
		<div className={ loading ? 'gatehouse-is-loading' : '' }>
			<PageHead
				help="overview"
				title={ __( 'Overview', 'gatehouse' ) }
				lede={ __(
					'The AI calls plugins on this site make through WordPress: who made it, what it cost, and what the gateway changed or blocked.',
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

			<Banners data={ data } go={ go } />

			{ isEmpty ? (
				<Onboarding />
			) : (
				<>
					<div className="gatehouse-grid">
						<Card className="gatehouse-span-8" bodyClass={ null }>
							<div
								className="gatehouse-hero"
								style={ { height: 'auto', paddingBottom: 8 } }
							>
								<div
									className="gatehouse-row"
									style={ {
										justifyContent: 'space-between',
										alignItems: 'flex-start',
										position: 'relative',
									} }
								>
									<div>
										<div className="gatehouse-hero__label">
											<Icon name="coins" size={ 15 } />

											{ sprintf(
												/* translators: %s: period, e.g. "last 30 days". */ __(
													'AI spend, %s',
													'gatehouse'
												),
												range
											) }
										</div>
										<HeroFigure value={ kpis.cost } />
										<div className="gatehouse-hero__meta">
											<Delta
												value={ change(
													kpis.cost,
													previous.cost
												) }
												goodWhen="down"
												label={ vs }
											/>
											<span>{ vs }</span>
										</div>
									</div>
									<div
										style={ {
											textAlign: 'right',
											fontSize: 13,
											color: 'var(--gatehouse-ink-2)',
											position: 'relative',
										} }
									>
										<div>
											<strong
												style={ {
													color: 'var(--gatehouse-ink)',
												} }
											>
												{ integer( kpis.ok ) }
											</strong>{ ' ' }
											{ _n(
												'completed call',
												'completed calls',
												kpis.ok,
												'gatehouse'
											) }
										</div>
										<div>
											<strong
												style={ {
													color: 'var(--gatehouse-ink)',
												} }
											>
												{
													data.sources.filter(
														( s ) => s.requests > 0
													).length
												}
											</strong>{ ' ' }
											{ __(
												'plugins and themes',
												'gatehouse'
											) }
										</div>
									</div>
								</div>
							</div>
							<div style={ { padding: '0 20px 18px' } }>
								<StackedColumns
									title={ __(
										'Daily AI spend by source',
										'gatehouse'
									) }
									dates={ series.dates }
									series={ series.stack.map( ( s ) => ( {
										id: s.source,
										label: s.label,
										values: s.values,
										color: colorOf( s.source ),
									} ) ) }
									format={ ( v ) =>
										money( v, { short: true } )
									}
									height={ 210 }
								/>
							</div>
						</Card>

						<div
							className="gatehouse-span-4"
							style={ {
								display: 'flex',
								flexDirection: 'column',
								gap: 18,
							} }
						>
							<BudgetCard month={ month } go={ go } />
							<AttentionCard
								sources={ data.sources }
								spikes={ data.spikes || [] }
								kpis={ kpis }
								go={ go }
							/>
						</div>
					</div>

					<div className="gatehouse-kpis">
						<Stat
							icon="bolt"
							label={ __( 'Requests', 'gatehouse' ) }
							tip={ __(
								'Every AI call in the period: completed, blocked and failed.',
								'gatehouse'
							) }
							value={ compact( kpis.requests ) }
							delta={ change( kpis.requests, previous.requests ) }
							goodWhen="neutral"
							trend={ series.requests }
							vs={ vs }
						/>
						<Stat
							icon="tokens"
							label={ __( 'Tokens', 'gatehouse' ) }
							tip={ __(
								'Tokens are the units AI providers charge by, roughly ¾ of a word. This is input plus output for completed calls.',
								'gatehouse'
							) }
							value={ compact( kpis.tokens ) }
							delta={ change( kpis.tokens, previous.tokens ) }
							goodWhen="neutral"
							trend={ series.tokens }
							vs={ vs }
						/>
						<Stat
							icon="coins"
							label={ __( 'Avg. cost per call', 'gatehouse' ) }
							tip={ __(
								'Estimated spend divided by completed calls. Lower is better.',
								'gatehouse'
							) }
							value={ money( kpis.avg_cost ) }
							delta={ change( kpis.avg_cost, previous.avg_cost ) }
							goodWhen="down"
							vs={ vs }
							trend={ series.cost.map( ( c, i ) =>
								series.requests[ i ]
									? c / series.requests[ i ]
									: 0
							) }
						/>
						<Stat
							icon="clock"
							label={ __( 'Avg. response time', 'gatehouse' ) }
							tip={ __(
								'How long completed calls took, from sending the request to receiving the answer.',
								'gatehouse'
							) }
							value={ duration( kpis.avg_latency ) }
							delta={ change(
								kpis.avg_latency,
								previous.avg_latency
							) }
							goodWhen="down"
							vs={ vs }
						/>
						<Stat
							icon="shield"
							label={ __(
								'Calls with personal data',
								'gatehouse'
							) }
							tip={ __(
								'AI calls that contained emails, phone numbers or other personal data. See which plugins send it, and turn on redaction where it isn’t needed, on the Privacy page.',
								'gatehouse'
							) }
							value={ compact( kpis.pii_calls ) }
							delta={ change(
								kpis.pii_calls,
								previous.pii_calls
							) }
							goodWhen="down"
							trend={ series.pii_calls }
							vs={ vs }
						/>
						<Stat
							icon="ban"
							label={ __( 'Blocked calls', 'gatehouse' ) }
							tip={ __(
								'Calls stopped before reaching the provider by a pause, a budget, or Connector Approval. They cost nothing.',
								'gatehouse'
							) }
							value={ compact( kpis.blocked ) }
							delta={ change( kpis.blocked, previous.blocked ) }
							goodWhen="neutral"
							trend={ series.blocked }
							vs={ vs }
						/>
					</div>

					<div className="gatehouse-grid">
						<Card
							className="gatehouse-span-7"
							title={
								<Term
									label={ __( 'Top sources', 'gatehouse' ) }
									tip={ __(
										'The plugins and themes that spent the most in this period. The bar shows this month against each budget: solid is spent, striped is the forecast, and the tick marks the budget.',
										'gatehouse'
									) }
									align="left"
								/>
							}
							sub={ __(
								'Spend in this period, and this month against each budget',
								'gatehouse'
							) }
							action={
								<Button
									variant="ghost"
									size="sm"
									onClick={ () => go( 'sources' ) }
								>
									{ __( 'Manage', 'gatehouse' ) }
									<Icon name="arrowRight" size={ 14 } />
								</Button>
							}
							bodyClass={ null }
						>
							<TopSources
								sources={ data.sources.slice( 0, 6 ) }
								colorOf={ colorOf }
							/>
						</Card>
						<Card
							className="gatehouse-span-5"
							title={
								<Term
									label={ __( 'Model mix', 'gatehouse' ) }
									tip={ __(
										'Which AI models the money went to. Models without a price count as $0 until you add one in Settings.',
										'gatehouse'
									) }
									align="left"
								/>
							}
							sub={ __(
								'Spend by model, completed calls',
								'gatehouse'
							) }
						>
							{ data.models.length ? (
								<BarList
									items={ data.models
										.slice( 0, 6 )
										.map( ( m ) => ( {
											id: `${ m.provider }/${ m.model }`,
											label: m.model,
											value: m.cost,
											color: 'var(--gatehouse-s7)',
											prefix: (
												<span
													className="gatehouse-pill__dot"
													style={ {
														width: 8,
														height: 8,
														borderRadius: '50%',
														background:
															providerColor(
																m.provider
															),
														flexShrink: 0,
													} }
												/>
											),

											meta:
												sprintf(
													/* translators: 1: provider, 2: number of calls, 3: tokens. */ __(
														'%1$s · %2$s calls · %3$s tokens',
														'gatehouse'
													),
													m.provider ||
														__(
															'unknown',
															'gatehouse'
														),
													compact( m.requests ),
													compact( m.tokens )
												) +
												( m.priced
													? ''
													: ` · ${ __(
															'no price set',
															'gatehouse'
													  ) }` ),
										} ) ) }
									format={ ( v ) => money( v ) }
								/>
							) : (
								<Empty
									compact
									title={ __(
										'No completed calls yet',
										'gatehouse'
									) }
								/>
							) }
						</Card>
					</div>

					<div className="gatehouse-grid">
						<Card
							className="gatehouse-span-7"
							title={
								<Term
									label={ __( 'When AI runs', 'gatehouse' ) }
									tip={ __(
										'Requests by weekday and hour in your site’s timezone. Darker squares mean more calls. Useful for spotting scheduled jobs.',
										'gatehouse'
									) }
									align="left"
								/>
							}
							sub={ __(
								'Requests by weekday and hour',
								'gatehouse'
							) }
						>
							<Heatmap grid={ data.heatmap } />
						</Card>
						<Card
							className="gatehouse-span-5"
							title={ __( 'Recent activity', 'gatehouse' ) }
							action={
								<Button
									variant="ghost"
									size="sm"
									onClick={ () => go( 'requests' ) }
								>
									{ __( 'All requests', 'gatehouse' ) }
									<Icon name="arrowRight" size={ 14 } />
								</Button>
							}
							bodyClass={ null }
						>
							<ul
								className="gatehouse-feed"
								style={ { marginTop: 10 } }
							>
								{ data.recent.map( ( r ) => (
									<li
										key={ r.id }
										className="gatehouse-feed__item"
									>
										<SourceAvatar
											label={ r.source_label }
											color={ colorOf( r.source ) }
										/>
										<div className="gatehouse-feed__main">
											<div>{ r.source_label }</div>
											<div>
												{ r.status === 'ok' ? (
													r.model
												) : (
													<RequestStatus
														status={ r.status }
														cached={ r.cached }
													/>
												) }
												{ r.status === 'ok' &&
													r.redactions > 0 &&
													` · ${ sprintf(
														/* translators: %d: number of items redacted. */ _n(
															'%d item replaced',
															'%d items replaced',
															r.redactions,
															'gatehouse'
														),
														r.redactions
													) }` }
											</div>
										</div>
										<div className="gatehouse-feed__end">
											<div>
												{ r.status === 'ok'
													? money( r.cost )
													: '–' }
											</div>
											<div>
												{ relative(
													r.created_at,
													siteNow()
												) }
											</div>
										</div>
									</li>
								) ) }
							</ul>
						</Card>
					</div>
					<PricingNote pricing={ data.pricing } go={ go } />
				</>
			) }
		</div>
	);
}

function PricingNote( { pricing, go } ) {
	const text = pricing.live
		? sprintf(
				/* translators: 1: date, 2: source name. */
				__(
					'Costs are estimates: tokens reported by the provider × current prices, updated automatically from %2$s (last update %1$s).',
					'gatehouse'
				),
				dateLong( pricing.updated_at.slice( 0, 10 ) ),
				pricing.source
		  )
		: sprintf(
				/* translators: 1: date, 2: plugin version. */
				__(
					'Costs are estimates: tokens reported by the provider × prices built into Gatehouse %2$s (checked %1$s). Turn on automatic price updates in Settings to keep them current.',
					'gatehouse'
				),
				dateLong( pricing.checked ),
				pricing.version
		  );
	return (
		<p
			className="gatehouse-muted gatehouse-row"
			style={ { fontSize: 12.5, gap: 8, marginTop: 6 } }
		>
			<Icon name="info" size={ 14 } />
			<span>
				{ text }{ ' ' }
				<a
					href="#/settings"
					onClick={ ( e ) => {
						e.preventDefault();
						go( 'settings' );
					} }
				>
					{ __( 'Review prices', 'gatehouse' ) }
				</a>
			</span>
		</p>
	);
}

function HeroFigure( { value } ) {
	const { whole, fraction } = moneyParts( value );
	return (
		<div className="gatehouse-hero__value">
			{ whole }
			<span className="gatehouse-hero__cents">{ fraction }</span>
		</div>
	);
}

function Stat( { icon, label, value, delta, goodWhen, trend, vs, tip } ) {
	return (
		<Card bodyClass={ null }>
			<div className="gatehouse-stat">
				<div className="gatehouse-stat__label">
					<Icon name={ icon } size={ 14 } />
					{ label }
					{ tip && <InfoTip align="left">{ tip }</InfoTip> }
				</div>
				<div className="gatehouse-stat__value">{ value }</div>
				<div className="gatehouse-stat__foot">
					<Delta value={ delta } goodWhen={ goodWhen } label={ vs } />
					{ trend && (
						<Sparkline
							values={ trend.slice( -14 ) }
							width={ 84 }
							height={ 28 }
						/>
					) }
				</div>
			</div>
		</Card>
	);
}

function BudgetCard( { month, go } ) {
	const hasBudget = month.budget > 0;
	const over = hasBudget && month.projection > month.budget;
	return (
		<Card bodyClass={ null }>
			<div className="gatehouse-budget">
				<div
					className="gatehouse-row"
					style={ { justifyContent: 'space-between' } }
				>
					<div className="gatehouse-hero__label">
						<Icon name="gauge" size={ 15 } />
						{ month.label }
						<InfoTip align="left">
							{ __(
								'This calendar month, whatever period you picked. The solid bar is what you’ve spent; the striped part is the forecast: spend so far plus the last 7 days’ daily average for each day left.',
								'gatehouse'
							) }
						</InfoTip>
					</div>
					{ hasBudget &&
						( over ? (
							<Pill tone="serious" icon="alert">
								{ __( 'Over pace', 'gatehouse' ) }
							</Pill>
						) : (
							<Pill tone="good" icon="check">
								{ __( 'On track', 'gatehouse' ) }
							</Pill>
						) ) }
				</div>
				<div className="gatehouse-budget__figures">
					<span className="gatehouse-budget__spent">
						{ money( month.spend ) }
					</span>
					<span className="gatehouse-budget__of">
						{ hasBudget
							? /* translators: %s: monthly budget. */ sprintf(
									__( 'of %s budget', 'gatehouse' ),
									money( month.budget )
							  )
							: __( 'spent this month', 'gatehouse' ) }
					</span>
				</div>
				{ hasBudget && (
					<Meter
						value={ month.spend }
						max={ month.budget }
						forecast={ month.projection }
						label={ __( 'Site-wide monthly budget', 'gatehouse' ) }
					/>
				) }
				<div className="gatehouse-budget__legend">
					<span>
						<i style={ { background: 'var(--gatehouse-s1)' } } />
						{ __( 'Spent', 'gatehouse' ) }
					</span>
					<span>
						<i
							style={ {
								background:
									'repeating-linear-gradient(135deg, color-mix(in srgb, var(--gatehouse-s1) 45%, transparent) 0 3px, transparent 3px 6px)',
								border: '1px solid var(--gatehouse-border)',
							} }
						/>
						{ __( 'Forecast', 'gatehouse' ) }
					</span>

					<span
						style={ {
							marginLeft: 'auto',
							color: 'var(--gatehouse-muted)',
						} }
					>
						{ sprintf(
							/* translators: 1: day of month, 2: days in month. */ __(
								'Day %1$d of %2$d',
								'gatehouse'
							),
							month.day,
							month.days
						) }
					</span>
				</div>
				<div className="gatehouse-callout-inline">
					<Icon
						name="chart"
						size={ 16 }
						style={ { flexShrink: 0, marginTop: 2 } }
					/>
					<span>
						{ __( 'Month-end forecast:', 'gatehouse' ) }{ ' ' }
						<strong>{ money( month.projection ) }</strong>
						{ ! hasBudget && (
							<>
								{ ' · ' }
								<a
									href="#/settings"
									onClick={ ( e ) => {
										e.preventDefault();
										go( 'settings' );
									} }
								>
									{ __(
										'Set a site-wide budget',
										'gatehouse'
									) }
								</a>
							</>
						) }
					</span>
				</div>
			</div>
		</Card>
	);
}

function AttentionCard( { sources, spikes, kpis, go } ) {
	const items = [];
	spikes.forEach( ( spike ) => {
		items.push( {
			id: `${ spike.source }-${ spike.kind }`,
			tone: 'serious',
			icon: 'up',
			title: spike.label,
			text:
				spike.kind === 'calls'
					? sprintf(
							/* translators: 1: calls in the last hour, 2: usual calls per hour. */ __(
								'Unusual activity: %1$s calls in the last hour, usually about %2$s',
								'gatehouse'
							),
							spike.now,
							spike.normal
					  )
					: sprintf(
							/* translators: 1: spend in the last 24 hours, 2: usual daily spend. */ __(
								'Unusual spending: %1$s in the last 24 hours, usually about %2$s a day',
								'gatehouse'
							),
							money( spike.now ),
							money( spike.normal )
					  ),
		} );
	} );
	sources.forEach( ( s ) => {
		if ( s.status === 'paused' ) {
			items.push( {
				id: s.id,
				tone: 'critical',
				icon: 'pause',
				title: s.label,
				text: __( 'Paused: its AI calls are blocked', 'gatehouse' ),
			} );
		} else if ( s.status === 'limited' ) {
			items.push( {
				id: s.id,
				tone: 'critical',
				icon: 'gauge',
				title: s.label,
				text: sprintf(
					/* translators: 1: calls in the last hour, 2: hourly limit. */ __(
						'Hit its hourly limit: %1$s calls (limit %2$s). Possible loop or spam wave',
						'gatehouse'
					),
					s.last_hour,
					s.rate_limit
				),
			} );
		} else if ( s.status === 'capped' ) {
			items.push( {
				id: s.id,
				tone: 'critical',
				icon: 'ban',
				title: s.label,
				text: __( 'Reached its monthly budget', 'gatehouse' ),
			} );
		} else if ( s.status === 'near' ) {
			items.push( {
				id: s.id,
				tone: 'warning',
				icon: 'alert',
				title: s.label,
				text: sprintf(
					/* translators: %s: amount spent and budget. */ __(
						'Near its budget: %s',
						'gatehouse'
					),
					`${ money( s.month ) } / ${ money( s.policy.budget ) }`
				),
			} );
		} else if ( s.status === 'forecast' ) {
			items.push( {
				id: s.id,
				tone: 'serious',
				icon: 'gauge',
				title: s.label,
				text: sprintf(
					/* translators: 1: forecast, 2: budget. */ __(
						'On pace for %1$s against a %2$s budget',
						'gatehouse'
					),
					money( s.forecast ),
					money( s.policy.budget )
				),
			} );
		}
	} );
	if ( kpis.errors > 0 ) {
		items.push( {
			id: 'errors',
			tone: 'warning',
			icon: 'alert',
			title: __( 'Provider errors', 'gatehouse' ),
			text: sprintf(
				/* translators: %d: number of failed calls. */ _n(
					'%d call failed at the provider',
					'%d calls failed at the provider',
					kpis.errors,
					'gatehouse'
				),
				kpis.errors
			),
			route: 'requests',
		} );
	}

	return (
		<Card
			title={
				<Term
					label={ __( 'Needs attention', 'gatehouse' ) }
					tip={ __(
						'Sources that are paused, over or near their budget, or on pace to exceed it, plus calls that failed at the provider.',
						'gatehouse'
					) }
					align="left"
				/>
			}
			bodyClass={ null }
			style={ { flex: 1 } }
		>
			{ items.length ? (
				<ul className="gatehouse-feed" style={ { marginTop: 8 } }>
					{ items.slice( 0, 4 ).map( ( it ) => (
						<li
							key={ it.id }
							className="gatehouse-feed__item"
							style={ {
								gridTemplateColumns: '30px minmax(0,1fr) auto',
							} }
						>
							<span
								className={ `gatehouse-pill is-${ it.tone }` }
								style={ {
									width: 30,
									height: 30,
									padding: 0,
									justifyContent: 'center',
									borderRadius: 9,
								} }
							>
								<Icon name={ it.icon } size={ 15 } />
							</span>
							<div className="gatehouse-feed__main">
								<div>{ it.title }</div>
								<div title={ it.text }>{ it.text }</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								icon="arrowRight"
								aria-label={ __( 'Open', 'gatehouse' ) }
								onClick={ () => go( it.route || 'sources' ) }
							/>
						</li>
					) ) }
				</ul>
			) : (
				<div
					className="gatehouse-card__body gatehouse-row"
					style={ { color: 'var(--gatehouse-ink-2)' } }
				>
					<Pill tone="good" icon="check">
						{ __( 'All clear', 'gatehouse' ) }
					</Pill>
					{ __( 'Every source is within budget.', 'gatehouse' ) }
				</div>
			) }
		</Card>
	);
}

function TopSources( { sources, colorOf } ) {
	if ( ! sources.length ) {
		return <Empty compact title={ __( 'No sources yet', 'gatehouse' ) } />;
	}
	return (
		<div className="gatehouse-table-wrap" style={ { marginTop: 10 } }>
			<table className="gatehouse-table">
				<thead>
					<tr>
						<th scope="col">{ __( 'Source', 'gatehouse' ) }</th>
						<th scope="col" className="is-num">
							{ __( 'Spend', 'gatehouse' ) }
						</th>
						<th scope="col" style={ { width: '34%' } }>
							{ __( 'This month', 'gatehouse' ) }
						</th>
						<th scope="col">{ __( 'Status', 'gatehouse' ) }</th>
					</tr>
				</thead>
				<tbody>
					{ sources.map( ( s ) => (
						<tr key={ s.id }>
							<td>
								<div className="gatehouse-source">
									<SourceAvatar
										label={ s.label }
										color={ colorOf( s.id ) }
									/>
									<div style={ { minWidth: 0 } }>
										<div className="gatehouse-source__name">
											{ s.label }
										</div>

										<div
											className="gatehouse-muted"
											style={ { fontSize: 12 } }
										>
											{ sprintf(
												/* translators: %s: number of calls. */ __(
													'%s calls',
													'gatehouse'
												),
												compact( s.requests )
											) }
										</div>
									</div>
								</div>
							</td>
							<td className="is-num">
								<strong>{ money( s.cost ) }</strong>
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
											className="gatehouse-muted gatehouse-num"
											style={ {
												fontSize: 12,
												marginTop: 6,
											} }
										>{ `${ money( s.month ) } / ${ money(
											s.policy.budget
										) }` }</div>
									</div>
								) : (
									<span
										className="gatehouse-muted"
										style={ { fontSize: 12.5 } }
									>{ `${ money( s.month ) } · ${ __(
										'no budget',
										'gatehouse'
									) }` }</span>
								) }
							</td>
							<td>
								<SourceStatus status={ s.status } />
							</td>
						</tr>
					) ) }
				</tbody>
			</table>
		</div>
	);
}

function Banners( { data, go } ) {
	const boot = window.gatehouseBoot || {};
	const configured = data.providers.filter( ( p ) => p.configured );
	const waiting = ( data.approval?.pending || [] ).filter(
		( p ) => ! p.self
	);
	return (
		<>
			{ data.approval?.active && waiting.length > 0 && (
				<div className="gatehouse-banner" role="status">
					<span className="gatehouse-banner__icon">
						<Icon name="clock" />
					</span>
					<div className="gatehouse-banner__text">
						<strong>
							{ sprintf(
								/* translators: %s: plugin names. */
								_n(
									'%s is waiting for AI approval.',
									'%s are waiting for AI approval.',
									waiting.length,
									'gatehouse'
								),
								waiting.map( ( p ) => p.name ).join( ', ' )
							) }
						</strong>{ ' ' }
						{ __(
							'The AI plugin’s Connector Approval blocks their AI calls until you approve them.',
							'gatehouse'
						) }
					</div>
					<a
						className="gatehouse-btn is-sm"
						href={ data.approval.url }
					>
						{ __( 'Review approvals', 'gatehouse' ) }
					</a>
				</div>
			) }
			{ boot.aiEnabled === false && (
				<div className="gatehouse-banner" role="status">
					<span className="gatehouse-banner__icon">
						<Icon name="alert" />
					</span>
					<div className="gatehouse-banner__text">
						<strong>
							{ __(
								'AI features are turned off on this site.',
								'gatehouse'
							) }
						</strong>{ ' ' }
						{ __(
							'Something has disabled the WordPress AI Client, so no AI calls can run.',
							'gatehouse'
						) }
					</div>
				</div>
			) }
			{ boot.aiEnabled !== false && configured.length === 0 && (
				<div className="gatehouse-banner is-info" role="status">
					<span className="gatehouse-banner__icon">
						<Icon name="plug" />
					</span>
					<div className="gatehouse-banner__text">
						{ data.providers.length ? (
							<>
								<strong>
									{ sprintf(
										/* translators: %s: provider names. */ __(
											'%s is installed but not connected.',
											'gatehouse'
										),
										data.providers
											.map( ( p ) => p.name )
											.join( ', ' )
									) }
								</strong>{ ' ' }
								{ __(
									'Its API key hasn’t been added yet, so AI calls will fail until it is.',
									'gatehouse'
								) }
							</>
						) : (
							<>
								<strong>
									{ __(
										'No AI provider is connected.',
										'gatehouse'
									) }
								</strong>{ ' ' }
								{ __(
									'Connect Anthropic, OpenAI, Google or another provider so plugins can use AI. Plugins that use their own API key are recorded too, as soon as they make a call.',
									'gatehouse'
								) }{ ' ' }
								<a
									href={ boot.localAi?.url }
									target="_blank"
									rel="noopener noreferrer"
								>
									{ __(
										'On a development site, you can also try AI Provider for WebLLM, which runs a small model in your browser.',
										'gatehouse'
									) }
								</a>
							</>
						) }
					</div>
					<a
						className="gatehouse-btn is-sm"
						href={ boot.connectorsUrl }
					>
						{ __( 'Open Connectors', 'gatehouse' ) }
						<Icon name="external" size={ 13 } />
					</a>
				</div>
			) }
			{ boot.localAi?.active && ! boot.localAi?.worker && (
				<div className="gatehouse-banner is-info" role="status">
					<span className="gatehouse-banner__icon">
						<Icon name="plug" />
					</span>
					<div className="gatehouse-banner__text">
						<strong>
							{ __(
								'AI Provider for WebLLM is active, but its in-browser worker is off.',
								'gatehouse'
							) }
						</strong>{ ' ' }
						{ __(
							'AI calls started by plugins on the server need it, and a dashboard tab open. Local calls cost $0 in Gatehouse.',
							'gatehouse'
						) }
					</div>
					<a
						className="gatehouse-btn is-sm"
						href={ boot.localAi.settings }
					>
						{ __( 'Open WebLLM settings', 'gatehouse' ) }
					</a>
				</div>
			) }
			{ data.kpis.unpriced > 0 && (
				<div className="gatehouse-banner" role="status">
					<span className="gatehouse-banner__icon">
						<Icon name="coins" />
					</span>
					<div className="gatehouse-banner__text">
						<strong>
							{ sprintf(
								/* translators: %s: number of calls. */ _n(
									'%s call used a model with no price.',
									'%s calls used models with no price.',
									data.kpis.unpriced,
									'gatehouse'
								),
								integer( data.kpis.unpriced )
							) }
						</strong>{ ' ' }
						{ __(
							'Their cost shows as $0 until you add a price.',
							'gatehouse'
						) }
					</div>
					<Button size="sm" onClick={ () => go( 'settings' ) }>
						{ __( 'Add prices', 'gatehouse' ) }
					</Button>
				</div>
			) }
			{ data.pricing?.stale && (
				<div className="gatehouse-banner" role="status">
					<span className="gatehouse-banner__icon">
						<Icon name="coins" />
					</span>
					<div className="gatehouse-banner__text">
						<strong>
							{ sprintf(
								/* translators: %d: number of days. */
								__(
									'Built-in model prices are %d days old.',
									'gatehouse'
								),
								data.pricing.age_days
							) }
						</strong>{ ' ' }
						{ __(
							'Turn on automatic price updates in Settings, or update Gatehouse.',
							'gatehouse'
						) }
					</div>
					<Button size="sm" onClick={ () => go( 'settings' ) }>
						{ __( 'Review prices', 'gatehouse' ) }
					</Button>
				</div>
			) }
		</>
	);
}

function Onboarding() {
	return (
		<Card bodyClass={ null }>
			<Empty
				art={ <GatewayArt /> }
				title={ __( 'Waiting for the first AI call', 'gatehouse' ) }
				text={ __(
					'Gatehouse is active. As soon as a plugin or theme calls AI, through the WordPress AI Client or directly with its own API key, its calls appear here with cost, model and any personal data they contained.',
					'gatehouse'
				) }
			>
				<div className="gatehouse-steps">
					<div className="gatehouse-step">
						<div className="gatehouse-step__n">1</div>
						<div className="gatehouse-step__title">
							{ __( 'Attribute', 'gatehouse' ) }
						</div>
						<div className="gatehouse-step__text">
							{ __(
								'Each call is traced to the plugin or theme that made it.',
								'gatehouse'
							) }
						</div>
					</div>
					<div className="gatehouse-step">
						<div className="gatehouse-step__n">2</div>
						<div className="gatehouse-step__title">
							{ __( 'Check', 'gatehouse' ) }
						</div>
						<div className="gatehouse-step__text">
							{ __(
								'Requests are checked for personal data such as emails and phone numbers, so you see which plugins send it. Turn on redaction per plugin when you want it replaced.',
								'gatehouse'
							) }
						</div>
					</div>
					<div className="gatehouse-step">
						<div className="gatehouse-step__n">3</div>
						<div className="gatehouse-step__title">
							{ __( 'Control', 'gatehouse' ) }
						</div>
						<div className="gatehouse-step__text">
							{ __(
								'Budgets and pauses stop runaway spend before the provider is ever called.',
								'gatehouse'
							) }
						</div>
					</div>
				</div>
				<div
					className="gatehouse-row"
					style={ { justifyContent: 'center', marginTop: 16 } }
				>
					<Button
						variant="primary"
						icon="spark"
						onClick={ () => startDemo() }
					>
						{ __( 'Explore with demo data', 'gatehouse' ) }
					</Button>
					<a className="gatehouse-btn" href="#/welcome">
						{ __( 'Run the setup guide', 'gatehouse' ) }
					</a>
				</div>
				<p
					className="gatehouse-muted"
					style={ { fontSize: 12.5, marginTop: 6 } }
				>
					{ __(
						'Demo data uses fictional plugins in a separate sandbox. Your real data and settings are not touched, and you can switch back at any time.',
						'gatehouse'
					) }
				</p>
			</Empty>
		</Card>
	);
}

function GatewayArt() {
	return (
		<svg width="168" height="96" viewBox="0 0 168 96" aria-hidden="true">
			<defs>
				<linearGradient
					id="gatehouse-art"
					gradientUnits="userSpaceOnUse"
					x1="84"
					y1="0"
					x2="164"
					y2="0"
				>
					<stop offset="0" stopColor="var(--gatehouse-s1)" />
					<stop offset="1" stopColor="var(--gatehouse-accent)" />
				</linearGradient>
			</defs>
			{ [ 22, 40, 58, 76 ].map( ( y ) => (
				<path
					key={ y }
					d={ `M4 ${ y } C 40 ${ y }, 52 48, 84 48` }
					fill="none"
					stroke="var(--gatehouse-axis)"
					strokeWidth="1.5"
				/>
			) ) }
			<path
				d="M84 48 H 164"
				stroke="url(#gatehouse-art)"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
			<rect
				x="66"
				y="26"
				width="36"
				height="44"
				rx="12"
				fill="var(--gatehouse-surface)"
				stroke="var(--gatehouse-accent)"
				strokeWidth="2"
			/>
			<path
				d="M76 62v-10a8 8 0 0 1 16 0v10"
				fill="none"
				stroke="var(--gatehouse-accent)"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<circle cx="84" cy="38" r="2.5" fill="var(--gatehouse-accent)" />
			{ [ 22, 40, 58, 76 ].map( ( cy, i ) => (
				<circle
					key={ cy }
					cx="4"
					cy={ cy }
					r="4"
					fill={ `var(--gatehouse-s${ i + 1 })` }
					stroke="var(--gatehouse-surface)"
					strokeWidth="2"
				/>
			) ) }
			<circle
				cx="164"
				cy="48"
				r="4.5"
				fill="var(--gatehouse-accent)"
				stroke="var(--gatehouse-surface)"
				strokeWidth="2"
			/>
		</svg>
	);
}
