import { __, _n, sprintf } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { addQueryArgs } from '@wordpress/url';
import { useApi, siteNow } from '../lib/hooks';
import {
	money,
	compact,
	duration,
	dateTime,
	relative,
	integer,
} from '../lib/format';
import { makeColorer, providerColor } from '../lib/colors';
import {
	Card,
	SourceAvatar,
	RequestStatus,
	Segmented,
	PageHead,
	Empty,
	ErrorNotice,
	Button,
	Drawer,
	Switch,
	Term,
} from '../components/ui';
import Icon from '../components/Icon';

const PER_PAGE = 25;

export default function Requests() {
	const [ filters, setFilters ] = useState( {
		source: '',
		status: '',
		model: '',
		pii: false,
	} );
	const [ page, setPage ] = useState( 1 );
	const [ open, setOpen ] = useState( null );

	const path = addQueryArgs( 'requests', {
		page,
		per_page: PER_PAGE,
		source: filters.source || undefined,
		status: filters.status || undefined,
		model: filters.model || undefined,
		pii: filters.pii || undefined,
	} );
	const { data, error, loading, reload } = useApi( path );
	const colorOf = useMemo(
		() => makeColorer( data?.facets?.order ),
		[ data?.facets?.order ]
	);

	const update = ( key ) => ( value ) => {
		setFilters( ( f ) => ( { ...f, [ key ]: value } ) );
		setPage( 1 );
	};
	const filtered =
		filters.source || filters.status || filters.model || filters.pii;

	if ( error && ! data ) {
		return <ErrorNotice error={ error } onRetry={ reload } />;
	}

	return (
		<div className={ loading ? 'gatehouse-is-loading' : '' }>
			<PageHead
				help="requests"
				title={ __( 'Requests', 'gatehouse' ) }
				lede={ __(
					'AI calls made through the WordPress AI Client, and direct calls plugins make to AI providers with their own API key: completed, blocked by a policy, or failed at the provider.',
					'gatehouse'
				) }
			>
				<Button icon="refresh" onClick={ reload }>
					{ __( 'Refresh', 'gatehouse' ) }
				</Button>
			</PageHead>

			<div
				className="gatehouse-row"
				style={ { marginBottom: 16, gap: 10 } }
				role="group"
				aria-label={ __( 'Filters', 'gatehouse' ) }
			>
				<Segmented
					label={ __( 'Status', 'gatehouse' ) }
					value={ filters.status }
					onChange={ update( 'status' ) }
					options={ [
						{ value: '', label: __( 'All', 'gatehouse' ) },
						{ value: 'ok', label: __( 'Completed', 'gatehouse' ) },
						{
							value: 'blocked',
							label: __( 'Blocked', 'gatehouse' ),
						},
						{ value: 'error', label: __( 'Failed', 'gatehouse' ) },
					] }
				/>
				<select
					className="gatehouse-select"
					style={ { width: 'auto', minWidth: 180 } }
					value={ filters.source }
					onChange={ ( e ) => update( 'source' )( e.target.value ) }
					aria-label={ __( 'Source', 'gatehouse' ) }
				>
					<option value="">
						{ __( 'All sources', 'gatehouse' ) }
					</option>
					{ data?.facets.sources.map( ( s ) => (
						<option key={ s.id } value={ s.id }>
							{ s.label }
						</option>
					) ) }
				</select>
				<select
					className="gatehouse-select"
					style={ { width: 'auto', minWidth: 180 } }
					value={ filters.model }
					onChange={ ( e ) => update( 'model' )( e.target.value ) }
					aria-label={ __( 'Model', 'gatehouse' ) }
				>
					<option value="">
						{ __( 'All models', 'gatehouse' ) }
					</option>
					{ data?.facets.models.map( ( m ) => (
						<option key={ m } value={ m }>
							{ m }
						</option>
					) ) }
				</select>
				<div
					className="gatehouse-row"
					style={ {
						gap: 8,
						fontSize: 13,
						fontWeight: 540,
						cursor: 'pointer',
					} }
				>
					<Switch
						checked={ filters.pii }
						onChange={ update( 'pii' ) }
						label={ __(
							'Only calls with personal data',
							'gatehouse'
						) }
					/>
					{ __( 'With personal data', 'gatehouse' ) }
				</div>
				{ filtered && (
					<Button
						variant="ghost"
						size="sm"
						icon="x"
						onClick={ () => {
							setFilters( {
								source: '',
								status: '',
								model: '',
								pii: false,
							} );
							setPage( 1 );
						} }
					>
						{ __( 'Clear filters', 'gatehouse' ) }
					</Button>
				) }
			</div>

			<Card bodyClass={ null }>
				{ ! data && (
					<div className="gatehouse-boot">
						{ __( 'Loading…', 'gatehouse' ) }
					</div>
				) }
				{ data && data.rows.length === 0 && (
					<Empty
						title={
							filtered
								? __(
										'No requests match these filters',
										'gatehouse'
								  )
								: __( 'No requests yet', 'gatehouse' )
						}
						text={
							filtered
								? __(
										'Try a different source, model or status.',
										'gatehouse'
								  )
								: __(
										'AI calls appear here as soon as a plugin or theme makes one.',
										'gatehouse'
								  )
						}
					/>
				) }
				{ data && data.rows.length > 0 && (
					<>
						<div className="gatehouse-table-wrap">
							<table className="gatehouse-table">
								<thead>
									<tr>
										<th scope="col">
											{ __( 'When', 'gatehouse' ) }
										</th>
										<th scope="col">
											{ __( 'Source', 'gatehouse' ) }
										</th>
										<th scope="col">
											{ __( 'Model', 'gatehouse' ) }
										</th>
										<th scope="col" className="is-num">
											<Term
												label={ __(
													'Tokens in / out',
													'gatehouse'
												) }
												tip={ __(
													'Tokens sent to the provider and received back. Output includes any “thinking” tokens, which providers bill as output.',
													'gatehouse'
												) }
												align="right"
											/>
										</th>
										<th scope="col" className="is-num">
											{ __( 'Cost', 'gatehouse' ) }
										</th>
										<th scope="col" className="is-num">
											{ __( 'Time', 'gatehouse' ) }
										</th>
										<th scope="col">
											<Term
												label={ __(
													'Gateway',
													'gatehouse'
												) }
												tip={ __(
													'Personal data in the request. Outlined shield: found and sent unchanged. Filled shield: replaced with placeholders.',
													'gatehouse'
												) }
												align="right"
											/>
										</th>
										<th scope="col">
											{ __( 'Status', 'gatehouse' ) }
										</th>
									</tr>
								</thead>
								<tbody>
									{ data.rows.map( ( r ) => (
										<tr
											key={ r.id }
											className="is-clickable"
											tabIndex={ 0 }
											onClick={ () => setOpen( r ) }
											onKeyDown={ ( e ) =>
												( e.key === 'Enter' ||
													e.key === ' ' ) &&
												( e.preventDefault(),
												setOpen( r ) )
											}
										>
											<td
												style={ {
													whiteSpace: 'nowrap',
												} }
												title={ r.created_at }
											>
												{ relative(
													r.created_at,
													siteNow()
												) }
											</td>
											<td>
												<div className="gatehouse-source">
													<SourceAvatar
														label={ r.source_label }
														color={ colorOf(
															r.source
														) }
													/>
													<span
														className="gatehouse-source__name"
														style={ {
															fontWeight: 560,
														} }
													>
														{ r.source_label }
													</span>
												</div>
											</td>
											<td>
												{ r.model ? (
													<span className="gatehouse-chip">
														{ r.model }
													</span>
												) : (
													<span className="gatehouse-muted">
														–
													</span>
												) }
											</td>
											<td className="is-num">
												{ r.status === 'ok' ? (
													`${ compact(
														r.input_tokens
													) } / ${ compact(
														r.output_tokens
													) }`
												) : (
													<span className="gatehouse-muted">
														–
													</span>
												) }
											</td>
											<CostCell row={ r } />
											<td className="is-num">
												{ r.latency_ms ? (
													duration( r.latency_ms )
												) : (
													<span className="gatehouse-muted">
														–
													</span>
												) }
											</td>
											<td>
												<Flags row={ r } />
											</td>
											<td>
												<RequestStatus
													status={ r.status }
													cached={ r.cached }
												/>
											</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</div>
						<div className="gatehouse-pager">
							<span>
								{ sprintf(
									/* translators: 1: first row, 2: last row, 3: total rows. */ __(
										'%1$s–%2$s of %3$s',
										'gatehouse'
									),
									integer( ( page - 1 ) * PER_PAGE + 1 ),
									integer(
										Math.min( page * PER_PAGE, data.total )
									),
									integer( data.total )
								) }
							</span>
							<div className="gatehouse-row" style={ { gap: 6 } }>
								<Button
									size="sm"
									disabled={ page <= 1 }
									onClick={ () => setPage( page - 1 ) }
								>
									{ __( 'Previous', 'gatehouse' ) }
								</Button>
								<Button
									size="sm"
									disabled={ page >= data.pages }
									onClick={ () => setPage( page + 1 ) }
								>
									{ __( 'Next', 'gatehouse' ) }
								</Button>
							</div>
						</div>
					</>
				) }
			</Card>

			{ open && (
				<RequestDrawer
					row={ open }
					color={ colorOf( open.source ) }
					onClose={ () => setOpen( null ) }
				/>
			) }
		</div>
	);
}

function CostCell( { row } ) {
	if ( row.cached ) {
		return (
			<td className="is-num">
				<strong>{ money( 0 ) }</strong>
				<div className="gatehouse-muted" style={ { fontSize: 11.5 } }>
					{ sprintf(
						/* translators: %s: amount saved. */
						__( 'saved %s', 'gatehouse' ),
						money( row.saved )
					) }
				</div>
			</td>
		);
	}
	if ( row.status !== 'ok' ) {
		return (
			<td className="is-num">
				<span className="gatehouse-muted">–</span>
			</td>
		);
	}
	if ( ! row.priced ) {
		return (
			<td className="is-num">
				<span
					className="gatehouse-muted"
					title={ __( 'No price for this model', 'gatehouse' ) }
				>
					{ __( 'n/a', 'gatehouse' ) }
				</span>
			</td>
		);
	}
	return (
		<td className="is-num">
			<strong>{ money( row.cost ) }</strong>
		</td>
	);
}

function Flags( { row } ) {
	const found = Object.values( row.pii || {} ).reduce( ( a, n ) => a + n, 0 );
	let title = __( 'No personal data found', 'gatehouse' );
	let label = __( 'No personal data', 'gatehouse' );
	if ( row.redactions ) {
		title = sprintf(
			/* translators: %d: count. */ _n(
				'%d item of personal data replaced',
				'%d items of personal data replaced',
				row.redactions,
				'gatehouse'
			),
			row.redactions
		);
		label = __( 'Personal data replaced', 'gatehouse' );
	} else if ( found ) {
		title = sprintf(
			/* translators: %d: count. */ _n(
				'%d item of personal data found, sent unchanged',
				'%d items of personal data found, sent unchanged',
				found,
				'gatehouse'
			),
			found
		);
		label = __( 'Personal data sent', 'gatehouse' );
	}
	let state = '';
	if ( row.redactions ) {
		state = 'is-on';
	} else if ( found ) {
		state = 'is-found';
	}
	return (
		<span className="gatehouse-flags">
			<span className={ state } title={ title }>
				<Icon name="shield" size={ 13 } />
				<span className="gatehouse-sr">{ label }</span>
			</span>
		</span>
	);
}

function RequestDrawer( { row, color, onClose } ) {
	return (
		<Drawer
			onClose={ onClose }
			title={
				<div className="gatehouse-source">
					<SourceAvatar
						label={ row.source_label }
						color={ color }
						large
					/>
					<div>
						<div
							className="gatehouse-source__name"
							style={ { fontSize: 16 } }
						>
							{ row.source_label }
						</div>

						<div className="gatehouse-source__id">
							{ sprintf(
								/* translators: %d: request id. */ __(
									'Request #%d',
									'gatehouse'
								),
								row.id
							) }
						</div>
					</div>
				</div>
			}
		>
			<div className="gatehouse-row">
				<RequestStatus status={ row.status } cached={ row.cached } />
				{ row.note && (
					<span
						className="gatehouse-muted"
						style={ { fontSize: 13 } }
					>
						{ row.note }
					</span>
				) }
			</div>
			<dl className="gatehouse-dl">
				<dt>{ __( 'Time', 'gatehouse' ) }</dt>
				<dd>{ dateTime( row.created_at ) }</dd>
				<dt>{ __( 'Source', 'gatehouse' ) }</dt>
				<dd>
					<code>{ row.source }</code>
				</dd>
				<dt>{ __( 'Provider', 'gatehouse' ) }</dt>
				<dd className="gatehouse-row" style={ { gap: 6 } }>
					{ row.provider && (
						<span
							style={ {
								width: 8,
								height: 8,
								borderRadius: '50%',
								background: providerColor( row.provider ),
								display: 'inline-block',
							} }
						/>
					) }
					{ row.provider || '–' }
				</dd>
				<dt>{ __( 'Model', 'gatehouse' ) }</dt>
				<dd>
					{ row.model ? (
						<span className="gatehouse-chip">{ row.model }</span>
					) : (
						'–'
					) }
				</dd>
				<dt>{ __( 'Capability', 'gatehouse' ) }</dt>
				<dd>
					{ row.capability
						? row.capability.replace( /_/g, ' ' )
						: '–' }
				</dd>
				<dt>{ __( 'Input tokens', 'gatehouse' ) }</dt>
				<dd className="gatehouse-num">
					{ integer( row.input_tokens ) }
				</dd>
				<dt>{ __( 'Output tokens', 'gatehouse' ) }</dt>
				<dd className="gatehouse-num">
					{ integer( row.output_tokens ) }
				</dd>
				<dt>{ __( 'Estimated cost', 'gatehouse' ) }</dt>
				<dd className="gatehouse-num">
					{ row.priced
						? money( row.cost )
						: __( 'No price for this model', 'gatehouse' ) }
				</dd>
				{ row.cached && (
					<>
						<dt>{ __( 'Answered from cache', 'gatehouse' ) }</dt>
						<dd className="gatehouse-num">
							{ sprintf(
								/* translators: %s: amount saved. */
								__( 'Yes, saved %s', 'gatehouse' ),
								money( row.saved )
							) }
						</dd>
					</>
				) }
				<dt>{ __( 'Route', 'gatehouse' ) }</dt>
				<dd>
					{ row.channel === 'direct'
						? __(
								'Direct: the plugin called the provider with its own API key',
								'gatehouse'
						  )
						: __( 'WordPress AI Client', 'gatehouse' ) }
				</dd>
				<dt>{ __( 'Response time', 'gatehouse' ) }</dt>
				<dd>{ row.latency_ms ? duration( row.latency_ms ) : '–' }</dd>
				<dt>{ __( 'Personal data', 'gatehouse' ) }</dt>
				<dd>
					{ Object.keys( row.pii || {} ).length
						? Object.entries( row.pii )
								.map( ( [ type, n ] ) => `${ type } × ${ n }` )
								.join( ', ' )
						: __( 'None found', 'gatehouse' ) }
				</dd>
				<dt>{ __( 'Sent to the provider', 'gatehouse' ) }</dt>
				<dd>
					{ row.redactions
						? sprintf(
								/* translators: %d: count. */ _n(
									'With %d item replaced by a placeholder',
									'With %d items replaced by placeholders',
									row.redactions,
									'gatehouse'
								),
								row.redactions
						  )
						: __( 'Unchanged', 'gatehouse' ) }
				</dd>
			</dl>
			{ row.prompt_excerpt || row.response_excerpt ? (
				<>
					<div>
						<h3 className="gatehouse-section-title">
							{ __(
								'Prompt (personal data masked)',
								'gatehouse'
							) }
						</h3>
						<div className="gatehouse-excerpt">
							{ row.prompt_excerpt || '–' }
						</div>
					</div>
					<div>
						<h3 className="gatehouse-section-title">
							{ __( 'Response', 'gatehouse' ) }
						</h3>
						<div className="gatehouse-excerpt">
							{ row.response_excerpt || '–' }
						</div>
					</div>
				</>
			) : (
				<p
					className="gatehouse-muted"
					style={ { fontSize: 12.5, display: 'flex', gap: 8 } }
				>
					<Icon
						name="eye"
						size={ 15 }
						style={ { flexShrink: 0, marginTop: 1 } }
					/>
					{ __(
						'Prompt and response text are not stored. You can turn on excerpts under Settings → Logging.',
						'gatehouse'
					) }
				</p>
			) }
		</Drawer>
	);
}
