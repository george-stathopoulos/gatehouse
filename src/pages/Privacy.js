import { __, _n, sprintf } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import { send } from '../lib/hooks';
import { useSettingsDraft, SaveBar } from '../lib/settings';
import { compact } from '../lib/format';
import {
	Card,
	PageHead,
	Switch,
	Pill,
	ErrorNotice,
	Setting,
	Loading,
	Button,
	Segmented,
	useToast,
} from '../components/ui';
import Icon from '../components/Icon';

const DETECTORS = [
	{
		key: 'email',
		name: __( 'Email addresses', 'gatehouse' ),
		example: 'jane@example.com',
		token: '[EMAIL_1]',
	},
	{
		key: 'phone',
		name: __( 'Phone numbers', 'gatehouse' ),
		example: '+44 20 7946 0958',
		token: '[PHONE_1]',
		note: __(
			'Numbers without “+” or brackets count only after a word such as “phone” or “call”, so order numbers and amounts are left alone.',
			'gatehouse'
		),
	},
	{
		key: 'card',
		name: __( 'Payment card numbers', 'gatehouse' ),
		example: '4242 4242 4242 4242',
		token: '[CARD_1]',
		note: __(
			'Needs a known card prefix and a valid checksum, so most order numbers are left alone.',
			'gatehouse'
		),
	},
	{
		key: 'iban',
		name: __( 'Bank accounts (IBAN)', 'gatehouse' ),
		example: 'GB33BUKB20201555555555',
		token: '[IBAN_1]',
		note: __( 'Needs a valid IBAN checksum.', 'gatehouse' ),
	},
	{
		key: 'ssn',
		name: __( 'US Social Security numbers', 'gatehouse' ),
		example: '078-05-1120',
		token: '[SSN_1]',
	},
	{
		key: 'ip',
		name: __( 'IP addresses', 'gatehouse' ),
		example: '203.0.113.42',
		token: '[IP_1]',
	},
];

const SAMPLE = sprintf(
	/* translators: %s: an example date such as 2026-09-28. */
	__(
		'Hi, I’m Jane Cooper (jane.cooper@example.com, +1 415 555 0134). My card 4242 4242 4242 4242 was charged twice for order #100245 on %s. Please refund it to GB33BUKB20201555555555.',
		'gatehouse'
	),
	'2026-09-28'
);

const TYPE_LABELS = {
	email: __( 'Emails', 'gatehouse' ),
	phone: __( 'Phones', 'gatehouse' ),
	card: __( 'Cards', 'gatehouse' ),
	iban: __( 'IBANs', 'gatehouse' ),
	ssn: __( 'SSNs', 'gatehouse' ),
	ip: __( 'IPs', 'gatehouse' ),
	term: __( 'Custom terms', 'gatehouse' ),
};

export default function Privacy() {
	const {
		payload,
		draft,
		patch,
		dirty,
		save,
		discard,
		saving,
		error,
		reload,
	} = useSettingsDraft();

	if ( error && ! payload ) {
		return <ErrorNotice error={ error } onRetry={ reload } />;
	}
	if ( ! draft ) {
		return <Loading />;
	}

	const r = draft.redaction;
	const usage = payload.usage;
	const report = usage.privacy || [];
	const redactsFor = ( row ) =>
		draft.sources?.[ row.id ]?.redact ?? row.redact;
	const setRedact = ( row, value ) =>
		patch( 'sources', {
			[ row.id ]: {
				budget: 0,
				paused: false,
				...( draft.sources?.[ row.id ] || {} ),
				redact: value,
			},
		} );
	const sending = report.filter( ( row ) => row.pii_calls > 0 );
	const redacting = report.filter( redactsFor );

	return (
		<div>
			<PageHead
				help="privacy"
				title={ __( 'Privacy', 'gatehouse' ) }
				lede={ __(
					'Gatehouse checks AI requests for personal data and shows you which plugins send it. It changes nothing unless you turn on redaction for a plugin, because some plugins need the real data to work: a spam checker can’t judge an email address it can’t see. Detection is pattern-based: it finds emails, phone numbers, cards, IBANs, SSNs and your own terms, not every name or address.',
					'gatehouse'
				) }
			>
				{ r.enabled ? (
					<Pill tone="good" icon="shield">
						{ __( 'Detection on', 'gatehouse' ) }
					</Pill>
				) : (
					<Pill icon="x">{ __( 'Detection off', 'gatehouse' ) }</Pill>
				) }
			</PageHead>

			<div className="gatehouse-stats-strip">
				<Card bodyClass={ null }>
					<div className="gatehouse-stat">
						<div className="gatehouse-stat__label">
							<Icon name="requests" size={ 14 } />
							{ __(
								'Calls with personal data, last 30 days',
								'gatehouse'
							) }
						</div>
						<div className="gatehouse-stat__value">
							{ compact( usage.pii_calls_30d ) }
							<span
								className="gatehouse-muted"
								style={ {
									fontSize: 14,
									fontWeight: 500,
									marginLeft: 8,
								} }
							>
								{ usage.calls_30d
									? `${ Math.round(
											( usage.pii_calls_30d /
												usage.calls_30d ) *
												100
									  ) }%`
									: '' }
							</span>
						</div>
					</div>
				</Card>
				<Card bodyClass={ null }>
					<div className="gatehouse-stat">
						<div className="gatehouse-stat__label">
							<Icon name="sources" size={ 14 } />
							{ __(
								'Plugins sending personal data',
								'gatehouse'
							) }
						</div>
						<div className="gatehouse-stat__value">
							{ sending.length }
						</div>
					</div>
				</Card>
				<Card bodyClass={ null }>
					<div className="gatehouse-stat">
						<div className="gatehouse-stat__label">
							<Icon name="shield" size={ 14 } />
							{ __( 'Redaction turned on for', 'gatehouse' ) }
						</div>
						<div className="gatehouse-stat__value">
							{ sprintf(
								/* translators: %d: number of plugins. */ _n(
									'%d plugin',
									'%d plugins',
									redacting.length,
									'gatehouse'
								),
								redacting.length
							) }
						</div>
					</div>
				</Card>
			</div>

			<Card
				title={ __( 'Personal data by plugin', 'gatehouse' ) }
				sub={ __(
					'Last 30 days. Turn on redaction where a plugin doesn’t need the real values.',
					'gatehouse'
				) }
				bodyClass={ null }
				style={ { marginBottom: 18 } }
			>
				{ report.length ? (
					<table className="gatehouse-table">
						<thead>
							<tr>
								<th>{ __( 'Source', 'gatehouse' ) }</th>
								<th>
									{ __(
										'Calls with personal data',
										'gatehouse'
									) }
								</th>
								<th>{ __( 'Found', 'gatehouse' ) }</th>
								<th>{ __( 'Redact', 'gatehouse' ) }</th>
							</tr>
						</thead>
						<tbody>
							{ report.map( ( row ) => (
								<tr key={ row.id }>
									<td>
										<strong>{ row.label }</strong>
									</td>
									<td className="gatehouse-num">
										{ sprintf(
											/* translators: 1: calls with personal data, 2: all calls. */ __(
												'%1$s of %2$s',
												'gatehouse'
											),
											compact( row.pii_calls ),
											compact( row.calls )
										) }
									</td>
									<td>
										<div className="gatehouse-chips">
											{ Object.keys( row.types ).length
												? Object.entries(
														row.types
												  ).map( ( [ type, n ] ) => (
														<span
															key={ type }
															className="gatehouse-chip"
														>
															{ `${
																TYPE_LABELS[
																	type
																] || type
															} ${ compact(
																n
															) }` }
														</span>
												  ) )
												: '–' }
										</div>
									</td>
									<td>
										<Switch
											checked={ !! redactsFor( row ) }
											onChange={ ( v ) =>
												setRedact( row, v )
											}
											disabled={ ! r.enabled }
											label={ sprintf(
												/* translators: %s: plugin or theme name. */ __(
													'Redact personal data for %s',
													'gatehouse'
												),
												row.label
											) }
										/>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				) : (
					<p
						className="gatehouse-muted"
						style={ { padding: 20, margin: 0 } }
					>
						{ __(
							'No AI calls in the last 30 days yet. Plugins appear here after their first AI request.',
							'gatehouse'
						) }
					</p>
				) }
			</Card>

			<DataMapCard />

			<Card bodyClass={ null } style={ { marginBottom: 18 } }>
				<Setting
					title={ __(
						'Check requests for personal data',
						'gatehouse'
					) }
					desc={ __(
						'Scans each AI request and records what kind of personal data it contained (never the values). Detection alone sends every request unchanged. Turning this off also stops redaction.',
						'gatehouse'
					) }
				>
					<Switch
						checked={ r.enabled }
						onChange={ ( v ) =>
							patch( 'redaction', { enabled: v } )
						}
						label={ __(
							'Check requests for personal data',
							'gatehouse'
						) }
					/>
				</Setting>
			</Card>

			<div
				style={ {
					opacity: r.enabled ? 1 : 0.5,
					transition: 'opacity .2s',
				} }
				aria-disabled={ ! r.enabled }
			>
				<Card
					title={ __( 'What to look for', 'gatehouse' ) }
					sub={ __(
						'Each type is detected in every request, and replaced only for plugins with redaction on',
						'gatehouse'
					) }
					style={ { marginBottom: 18 } }
				>
					<div className="gatehouse-detectors">
						{ DETECTORS.map( ( d ) => (
							<div
								key={ d.key }
								className={ `gatehouse-detector ${
									r[ d.key ] ? 'is-on' : ''
								}` }
							>
								<div className="gatehouse-detector__top">
									<span className="gatehouse-detector__name">
										{ d.name }
									</span>
									<Switch
										checked={ r[ d.key ] }
										onChange={ ( v ) =>
											patch( 'redaction', {
												[ d.key ]: v,
											} )
										}
										label={ d.name }
										disabled={ ! r.enabled }
									/>
								</div>
								<div className="gatehouse-detector__example">
									<span>{ d.example }</span>
									<Icon name="arrowRight" size={ 13 } />
									<span className="gatehouse-token">
										{ d.token }
									</span>
								</div>
								{ d.note && (
									<div
										className="gatehouse-muted"
										style={ { fontSize: 12 } }
									>
										{ d.note }
									</div>
								) }
							</div>
						) ) }
					</div>
				</Card>

				<div className="gatehouse-grid">
					<Card
						className="gatehouse-span-5"
						title={ __( 'Custom terms', 'gatehouse' ) }
						sub={ __(
							'Names, project codes or anything else to watch for',
							'gatehouse'
						) }
					>
						<TagInput
							values={ r.custom }
							onChange={ ( custom ) =>
								patch( 'redaction', { custom } )
							}
							placeholder={ __(
								'Type a term and press Enter',
								'gatehouse'
							) }
						/>
						<p
							className="gatehouse-muted"
							style={ { fontSize: 12.5, marginTop: 10 } }
						>
							{ __(
								'Whole words only, ignoring upper and lower case: “Ann” matches “ann” but not “annual”. Each term becomes',
								'gatehouse'
							) }{ ' ' }
							<span className="gatehouse-token">[TERM_1]</span>,{ ' ' }
							<span className="gatehouse-token">[TERM_2]</span>…
						</p>
					</Card>
					<Card
						className="gatehouse-span-7"
						title={ __( 'Try it', 'gatehouse' ) }
						sub={ __(
							'What a provider receives from a plugin with redaction on, using your unsaved settings',
							'gatehouse'
						) }
					>
						<Tester config={ r } />
					</Card>
				</div>
			</div>

			<SaveBar
				dirty={ dirty }
				saving={ saving }
				save={ save }
				discard={ discard }
			/>
		</div>
	);
}

const PROVIDER_NAMES = {
	anthropic: 'Anthropic',
	openai: 'OpenAI',
	google: 'Google',
	openrouter: 'OpenRouter',
	xai: 'xAI',
	mistral: 'Mistral',
	deepseek: 'DeepSeek',
	groq: 'Groq',
	perplexity: 'Perplexity',
	ollama: 'Ollama',
	webllm: __( 'WebLLM (in the browser)', 'gatehouse' ),
};

/**
 * Turn rows into CSV text (RFC 4180 quoting).
 *
 * @param {Array[]} rows Rows of cells.
 * @return {string} CSV.
 */
function toCsv( rows ) {
	return rows
		.map( ( row ) =>
			row
				.map( ( cell ) => {
					const text =
						cell === null || cell === undefined
							? ''
							: String( cell );
					return /[",\n\r]/.test( text )
						? `"${ text.replace( /"/g, '""' ) }"`
						: text;
				} )
				.join( ',' )
		)
		.join( '\r\n' );
}

function DataMapCard() {
	const [ days, setDays ] = useState( 90 );
	const [ busy, setBusy ] = useState( false );
	const toast = useToast();

	const download = () => {
		setBusy( true );
		send( `data-map?days=${ days }`, 'GET' )
			.then( ( map ) => {
				const routes = {
					ai_client: __( 'WordPress AI Client', 'gatehouse' ),
					direct: __( 'Direct (own API key)', 'gatehouse' ),
				};
				const rows = [
					[
						__( 'Plugin or theme', 'gatehouse' ),
						__( 'Type', 'gatehouse' ),
						__( 'Source ID', 'gatehouse' ),
						__( 'AI providers', 'gatehouse' ),
						__( 'Models', 'gatehouse' ),
						__( 'How it calls AI', 'gatehouse' ),
						__( 'Calls', 'gatehouse' ),
						__( 'Blocked calls', 'gatehouse' ),
						__( 'Estimated cost (USD)', 'gatehouse' ),
						__( 'Calls with personal data', 'gatehouse' ),
						__( 'Personal data found', 'gatehouse' ),
						__( 'Redaction', 'gatehouse' ),
						__( 'Items replaced', 'gatehouse' ),
						__( 'Monthly budget (USD)', 'gatehouse' ),
						__( 'Hourly call limit', 'gatehouse' ),
						__( 'Paused', 'gatehouse' ),
						__( 'First call', 'gatehouse' ),
						__( 'Last call', 'gatehouse' ),
					],
					...map.sources.map( ( r ) => [
						r.label,
						r.type,
						r.id,
						r.providers
							.map( ( p ) => PROVIDER_NAMES[ p ] || p )
							.join( '; ' ),
						r.models.join( '; ' ),
						r.routes.map( ( k ) => routes[ k ] || k ).join( '; ' ),
						r.calls,
						r.blocked,
						r.cost.toFixed( 4 ),
						r.pii_calls,
						Object.entries( r.pii_types )
							.map(
								( [ type, n ] ) =>
									`${ TYPE_LABELS[ type ] || type }: ${ n }`
							)
							.join( '; ' ),
						r.redact
							? __( 'On', 'gatehouse' )
							: __( 'Off', 'gatehouse' ),
						r.redactions,
						r.budget || '',
						r.rate_limit || '',
						r.paused
							? __( 'Yes', 'gatehouse' )
							: __( 'No', 'gatehouse' ),
						r.first_seen,
						r.last_seen,
					] ),
				];
				// A byte-order mark so spreadsheet apps read accented characters correctly.
				const blob = new window.Blob( [ '﻿' + toCsv( rows ) ], {
					type: 'text/csv;charset=utf-8',
				} );
				const link = document.createElement( 'a' );
				link.href = window.URL.createObjectURL( blob );
				link.download = `ai-data-map-${ map.from }-to-${ map.to }.csv`;
				document.body.appendChild( link );
				link.click();
				link.remove();
				window.setTimeout(
					() => window.URL.revokeObjectURL( link.href ),
					1000
				);
				toast(
					sprintf(
						/* translators: %d: number of plugins and themes. */ _n(
							'Data map downloaded: %d source',
							'Data map downloaded: %d sources',
							map.sources.length,
							'gatehouse'
						),
						map.sources.length
					)
				);
			} )
			.catch( ( e ) =>
				toast(
					e.message ||
						__( 'Could not build the data map', 'gatehouse' ),
					'alert'
				)
			)
			.finally( () => setBusy( false ) );
	};

	return (
		<Card
			title={ __( 'AI data map', 'gatehouse' ) }
			sub={ __(
				'A spreadsheet of every plugin and theme that used AI: which providers and models, how it calls them, how often, what it cost, what personal data was found and which controls apply. Useful for GDPR records of processing, risk assessments and client reports. The values of personal data are never included.',
				'gatehouse'
			) }
			style={ { marginBottom: 18 } }
		>
			<div
				className="gatehouse-row"
				style={ { gap: 12, flexWrap: 'wrap' } }
			>
				<Segmented
					label={ __( 'Period', 'gatehouse' ) }
					value={ days }
					onChange={ setDays }
					options={ [
						{ value: 30, label: __( '30 days', 'gatehouse' ) },
						{ value: 90, label: __( '90 days', 'gatehouse' ) },
						{ value: 365, label: __( '12 months', 'gatehouse' ) },
					] }
				/>
				<Button
					variant="primary"
					icon="table"
					onClick={ download }
					disabled={ busy }
				>
					{ busy
						? __( 'Preparing…', 'gatehouse' )
						: __( 'Download CSV', 'gatehouse' ) }
				</Button>
			</div>
			<p
				className="gatehouse-muted"
				style={ { fontSize: 12.5, marginTop: 10, marginBottom: 0 } }
			>
				{ __(
					'Covers only what Gatehouse can see, and only as far back as your request history is kept (Settings → Logging).',
					'gatehouse'
				) }
			</p>
		</Card>
	);
}

function TagInput( { values, onChange, placeholder } ) {
	const [ text, setText ] = useState( '' );
	const add = () => {
		const t = text.trim();
		if (
			t.length >= 2 &&
			! values.some( ( v ) => v.toLowerCase() === t.toLowerCase() )
		) {
			onChange( [ ...values, t ] );
		}
		setText( '' );
	};
	return (
		<div className="gatehouse-tags">
			{ values.map( ( v ) => (
				<span key={ v } className="gatehouse-tag">
					{ v }

					<button
						type="button"
						aria-label={ sprintf(
							/* translators: %s: term. */ __(
								'Remove %s',
								'gatehouse'
							),
							v
						) }
						onClick={ () =>
							onChange( values.filter( ( x ) => x !== v ) )
						}
					>
						<Icon name="x" size={ 12 } />
					</button>
				</span>
			) ) }
			<input
				value={ text }
				placeholder={ values.length ? '' : placeholder }
				aria-label={ __( 'Add a custom term', 'gatehouse' ) }
				onChange={ ( e ) => setText( e.target.value ) }
				onBlur={ () => text.trim() && add() }
				onKeyDown={ ( e ) => {
					if ( e.key === 'Enter' || e.key === ',' ) {
						e.preventDefault();
						add();
					} else if (
						e.key === 'Backspace' &&
						! text &&
						values.length
					) {
						onChange( values.slice( 0, -1 ) );
					}
				} }
			/>
		</div>
	);
}

function Tester( { config } ) {
	const [ input, setInput ] = useState( SAMPLE );
	const [ result, setResult ] = useState( null );
	const timer = useRef();

	useEffect( () => {
		window.clearTimeout( timer.current );
		timer.current = window.setTimeout( () => {
			send( 'redact-preview', 'POST', { text: input, redaction: config } )
				.then( setResult )
				.catch( () => setResult( null ) );
		}, 250 );
		return () => window.clearTimeout( timer.current );
	}, [ input, config ] );

	const parts = result ? result.text.split( /(\[[A-Z]+_\d+\])/g ) : [];

	return (
		<div className="gatehouse-tester">
			<div className="gatehouse-field">
				<label htmlFor="gatehouse-tester-in">
					{ __( 'Prompt from a plugin', 'gatehouse' ) }
				</label>
				<textarea
					id="gatehouse-tester-in"
					className="gatehouse-textarea"
					value={ input }
					onChange={ ( e ) => setInput( e.target.value ) }
				/>
			</div>
			<div className="gatehouse-field">
				<span
					className="gatehouse-field__label gatehouse-row"
					style={ { justifyContent: 'space-between' } }
				>
					{ __( 'What the AI provider receives', 'gatehouse' ) }
					{ result && (
						<Pill
							tone={ result.count ? 'accent' : '' }
							icon="shield"
						>
							{ sprintf(
								/* translators: %d: number of items. */ __(
									'%d redacted',
									'gatehouse'
								),
								result.count
							) }
						</Pill>
					) }
				</span>
				<div className="gatehouse-tester__out" aria-live="polite">
					{ config.enabled
						? parts.map( ( p, i ) =>
								/^\[[A-Z]+_\d+\]$/.test( p ) ? (
									<span key={ i } className="gatehouse-token">
										{ p }
									</span>
								) : (
									<span key={ i }>{ p }</span>
								)
						  )
						: input }
				</div>
			</div>
		</div>
	);
}
