import { __, sprintf } from '@wordpress/i18n';
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
	},
	{
		key: 'card',
		name: __( 'Payment card numbers', 'gatehouse' ),
		example: '4242 4242 4242 4242',
		token: '[CARD_1]',
		note: __(
			'Checked with the Luhn algorithm, so order numbers are left alone.',
			'gatehouse'
		),
	},
	{
		key: 'iban',
		name: __( 'Bank accounts (IBAN)', 'gatehouse' ),
		example: 'GB33BUKB20201555555555',
		token: '[IBAN_1]',
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
	const enabledCount =
		DETECTORS.filter( ( d ) => r[ d.key ] ).length +
		( r.custom.length ? 1 : 0 );

	return (
		<div>
			<PageHead
				help="privacy"
				title={ __( 'Privacy', 'gatehouse' ) }
				lede={ __(
					'Personal data in prompts is replaced with placeholders before the request leaves your server. When the answer comes back, the gateway puts the real values back, so plugins keep working.',
					'gatehouse'
				) }
			>
				{ r.enabled ? (
					<Pill tone="good" icon="shield">
						{ __( 'Redaction on', 'gatehouse' ) }
					</Pill>
				) : (
					<Pill tone="critical" icon="x">
						{ __( 'Redaction off', 'gatehouse' ) }
					</Pill>
				) }
			</PageHead>

			<div className="gatehouse-stats-strip">
				<Card bodyClass={ null }>
					<div className="gatehouse-stat">
						<div className="gatehouse-stat__label">
							<Icon name="shield" size={ 14 } />
							{ __(
								'Items redacted, last 30 days',
								'gatehouse'
							) }
						</div>
						<div className="gatehouse-stat__value">
							{ compact( usage.redactions_30d ) }
						</div>
					</div>
				</Card>
				<Card bodyClass={ null }>
					<div className="gatehouse-stat">
						<div className="gatehouse-stat__label">
							<Icon name="requests" size={ 14 } />
							{ __(
								'Calls that contained personal data',
								'gatehouse'
							) }
						</div>
						<div className="gatehouse-stat__value">
							{ compact( usage.redacted_calls ) }
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
											( usage.redacted_calls /
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
							<Icon name="filter" size={ 14 } />
							{ __( 'Active detectors', 'gatehouse' ) }
						</div>

						<div className="gatehouse-stat__value">
							{ sprintf(
								/* translators: 1: active detectors, 2: total detectors. */ __(
									'%1$d of %2$d',
									'gatehouse'
								),
								enabledCount,
								DETECTORS.length + 1
							) }
						</div>
					</div>
				</Card>
			</div>

			<Card bodyClass={ null } style={ { marginBottom: 18 } }>
				<Setting
					title={ __(
						'Redact personal data in AI requests',
						'gatehouse'
					) }
					desc={ __(
						'Applies to every source except those set to “Skip redaction” on the Sources page.',
						'gatehouse'
					) }
				>
					<Switch
						checked={ r.enabled }
						onChange={ ( v ) =>
							patch( 'redaction', { enabled: v } )
						}
						label={ __( 'Redact personal data', 'gatehouse' ) }
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
					title={ __( 'Detectors', 'gatehouse' ) }
					sub={ __( 'What to look for in prompts', 'gatehouse' ) }
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
							'Names, project codes or anything else that must never reach an AI provider',
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
								'Matching ignores upper and lower case. Each term becomes',
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
							'Live preview with your unsaved settings',
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
