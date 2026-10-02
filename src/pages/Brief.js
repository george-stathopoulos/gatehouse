import { __, sprintf } from '@wordpress/i18n';
import { useSettingsDraft, SaveBar } from '../lib/settings';
import { money, integer } from '../lib/format';
import {
	Card,
	PageHead,
	Switch,
	Pill,
	ErrorNotice,
	Setting,
	SourceAvatar,
	typeLabel,
	Loading,
	Term,
} from '../components/ui';
import Icon from '../components/Icon';

const EXAMPLE = __(
	'You are a helpful assistant for an online shop. Write a short product description for: Ethiopian Yirgacheffe, light roast, 250 g.',
	'gatehouse'
);

const STARTERS = [
	{
		label: __( 'Voice and tone', 'gatehouse' ),
		text: __(
			'Write in a warm, plain-spoken voice. Prefer short sentences and everyday words.',
			'gatehouse'
		),
	},
	{
		label: __( 'Spelling', 'gatehouse' ),
		text: __( 'Use British English spelling.', 'gatehouse' ),
	},
	{
		label: __( 'Guardrails', 'gatehouse' ),
		text: __(
			'Never promise refunds, delivery dates or discounts. Point customers to the help centre instead.',
			'gatehouse'
		),
	},
	{
		label: __( 'Facts', 'gatehouse' ),
		text: __(
			'Do not invent product features, prices or statistics. If something is unknown, say so.',
			'gatehouse'
		),
	},
];

export default function Brief() {
	const {
		payload,
		draft,
		patch,
		setDraft,
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

	const brief = draft.brief;
	const usage = payload.usage;
	const tokens = Math.ceil( brief.text.trim().length / 4 );
	const sources = usage.sources;
	const policyOf = ( id ) => ( {
		...( sources.find( ( s ) => s.id === id )?.policy || {} ),
		...( draft.sources[ id ] || {} ),
	} );
	const included = sources.filter(
		( s ) => ! policyOf( s.id ).skip_brief
	).length;
	const monthlyCost =
		( tokens * usage.calls_30d * usage.avg_input_price ) / 1000000;

	const toggleSource = ( id, skip ) => {
		setDraft( ( d ) => ( {
			...d,
			sources: {
				...d.sources,
				[ id ]: { ...policyOf( id ), skip_brief: skip },
			},
		} ) );
	};

	const addStarter = ( text ) => {
		const current = brief.text.trim();
		patch( 'brief', { text: current ? `${ current }\n${ text }` : text } );
	};

	return (
		<div>
			<PageHead
				help="brief"
				title={ __( 'Brand brief', 'gatehouse' ) }
				lede={ __(
					'One set of instructions added to every AI request on your site, so content from every plugin sounds like you and follows your rules.',
					'gatehouse'
				) }
			>
				{ brief.enabled && brief.text.trim() ? (
					<Pill tone="good" icon="check">
						{ __( 'Active', 'gatehouse' ) }
					</Pill>
				) : (
					<Pill icon="quote">
						{ __( 'Not active', 'gatehouse' ) }
					</Pill>
				) }
			</PageHead>

			<Card bodyClass={ null } style={ { marginBottom: 18 } }>
				<Setting
					title={ __( 'Add the brief to AI requests', 'gatehouse' ) }
					desc={ __(
						'Appended to the system instructions each plugin already sends. Works with Anthropic, OpenAI and Google request formats.',
						'gatehouse'
					) }
				>
					<Switch
						checked={ brief.enabled }
						onChange={ ( v ) => patch( 'brief', { enabled: v } ) }
						label={ __( 'Enable brand brief', 'gatehouse' ) }
					/>
				</Setting>
			</Card>

			<div className="gatehouse-grid">
				<Card
					className="gatehouse-span-7"
					title={ __( 'Your brief', 'gatehouse' ) }
					sub={ __(
						'Plain instructions work best. Keep it short: it is sent with every request.',
						'gatehouse'
					) }
				>
					<textarea
						className="gatehouse-textarea"
						style={ { minHeight: 220 } }
						value={ brief.text }
						onChange={ ( e ) =>
							patch( 'brief', { text: e.target.value } )
						}
						aria-label={ __( 'Brand brief', 'gatehouse' ) }
						placeholder={ __(
							'For example: Write in a friendly, concise voice. Use British English. Never promise refunds.',
							'gatehouse'
						) }
					/>
					<div
						className="gatehouse-row"
						style={ {
							marginTop: 12,
							justifyContent: 'space-between',
						} }
					>
						<div className="gatehouse-row" style={ { gap: 6 } }>
							<span
								className="gatehouse-muted"
								style={ { fontSize: 12.5 } }
							>
								{ __( 'Add:', 'gatehouse' ) }
							</span>
							{ STARTERS.map( ( s ) => (
								<button
									key={ s.label }
									type="button"
									className="gatehouse-btn is-sm"
									onClick={ () => addStarter( s.text ) }
								>
									<Icon name="plus" size={ 13 } />
									{ s.label }
								</button>
							) ) }
						</div>

						<span
							className="gatehouse-muted gatehouse-num"
							style={ { fontSize: 12.5 } }
						>
							{ sprintf(
								/* translators: 1: characters, 2: tokens. */ __(
									'%1$s characters · about %2$s tokens',
									'gatehouse'
								),
								integer( brief.text.length ),
								integer( tokens )
							) }
						</span>
					</div>
				</Card>

				<div
					className="gatehouse-span-5"
					style={ {
						display: 'flex',
						flexDirection: 'column',
						gap: 18,
					} }
				>
					<Card
						title={ __( 'What the model receives', 'gatehouse' ) }
						sub={ __(
							'Example request from a shop plugin',
							'gatehouse'
						) }
					>
						<div className="gatehouse-prompt">
							<div className="gatehouse-prompt__part">
								<div className="gatehouse-prompt__tag">
									<Icon name="sources" size={ 12 } />
									{ __( 'From the plugin', 'gatehouse' ) }
								</div>
								{ EXAMPLE }
							</div>
							{ brief.enabled && brief.text.trim() && (
								<div className="gatehouse-prompt__part is-brief">
									<div className="gatehouse-prompt__tag">
										<Icon name="quote" size={ 12 } />
										{ __(
											'Added by Gatehouse',
											'gatehouse'
										) }
									</div>
									{ brief.text.trim() }
								</div>
							) }
						</div>
					</Card>
					<Card bodyClass={ null }>
						<div className="gatehouse-stat">
							<div className="gatehouse-stat__label">
								<Icon name="coins" size={ 14 } />
								<Term
									label={ __(
										'Estimated extra cost',
										'gatehouse'
									) }
									tip={ __(
										'The brief is sent with every request, so you pay for its tokens each time. Estimated as brief tokens × completed calls in the last 30 days × your average input price.',
										'gatehouse'
									) }
									align="left"
								/>
							</div>

							<div className="gatehouse-stat__value">
								{ sprintf(
									/* translators: %s: cost per month. */ __(
										'%s / month',
										'gatehouse'
									),
									money( monthlyCost )
								) }
							</div>
							<div
								className="gatehouse-muted"
								style={ { fontSize: 12.5 } }
							>
								{ sprintf(
									/* translators: 1: tokens, 2: calls. */ __(
										'%1$s extra input tokens × %2$s calls in the last 30 days, at your average input price.',
										'gatehouse'
									),
									integer( tokens ),
									integer( usage.calls_30d )
								) }
							</div>
						</div>
					</Card>
				</div>
			</div>

			<Card
				title={ __( 'Where the brief applies', 'gatehouse' ) }
				sub={ sprintf(
					/* translators: 1: included sources, 2: all sources. */ __(
						'Included for %1$d of %2$d sources. Turn it off for plugins whose prompts must stay exactly as written.',
						'gatehouse'
					),
					included,
					sources.length
				) }
				bodyClass={ null }
			>
				{ sources.length ? (
					<div style={ { marginTop: 8 } }>
						{ sources.map( ( s ) => (
							<Setting
								key={ s.id }
								title={
									<span className="gatehouse-source">
										<SourceAvatar label={ s.label } />
										<span>{ s.label }</span>
									</span>
								}
								desc={ null }
								badge={
									<span
										className="gatehouse-muted"
										style={ {
											fontWeight: 450,
											fontSize: 12.5,
										} }
									>
										{ typeLabel( s.type ) }
									</span>
								}
							>
								<Switch
									checked={ ! policyOf( s.id ).skip_brief }
									onChange={ ( on ) =>
										toggleSource( s.id, ! on )
									}
									label={ sprintf(
										/* translators: %s: source name. */ __(
											'Add brief to requests from %s',
											'gatehouse'
										),
										s.label
									) }
								/>
							</Setting>
						) ) }
					</div>
				) : (
					<div className="gatehouse-card__body gatehouse-muted">
						{ __(
							'Sources appear here after their first AI call.',
							'gatehouse'
						) }
					</div>
				) }
			</Card>

			<SaveBar
				dirty={ dirty }
				saving={ saving }
				save={ save }
				discard={ discard }
			/>
		</div>
	);
}
