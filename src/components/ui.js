import { __, sprintf } from '@wordpress/i18n';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import Icon from './Icon';
import { initials } from '../lib/format';

/* ------------------------------------------------------------------ Card */

export function Card( {
	title,
	sub,
	action,
	children,
	className = '',
	bodyClass = 'gatehouse-card__body',
	foot,
	...rest
} ) {
	return (
		<section className={ `gatehouse-card ${ className }` } { ...rest }>
			{ ( title || action ) && (
				<header className="gatehouse-card__head">
					<div>
						{ title && (
							<h2 className="gatehouse-card__title">{ title }</h2>
						) }
						{ sub && (
							<p className="gatehouse-card__sub">{ sub }</p>
						) }
					</div>
					{ action }
				</header>
			) }
			{ bodyClass === null ? (
				children
			) : (
				<div className={ bodyClass }>{ children }</div>
			) }
			{ foot && (
				<footer className="gatehouse-card__foot">{ foot }</footer>
			) }
		</section>
	);
}

/* ------------------------------------------------------------------ Delta */

/**
 * Signed change vs the previous period. `goodWhen` says which direction is good.
 *
 * @param {Object}      props          Props.
 * @param {number|null} props.value    Percent change.
 * @param {string}      props.goodWhen 'up', 'down' or 'neutral'.
 * @param {string}      props.label    Accessible comparison label.
 * @return {JSX.Element|null} Delta badge.
 */
export function Delta( { value, goodWhen = 'up', label } ) {
	if ( value === null || value === undefined || ! isFinite( value ) ) {
		return (
			<span className="gatehouse-delta">
				{ __( 'New', 'gatehouse' ) }
			</span>
		);
	}
	const rounded =
		Math.abs( value ) < 10 ? value.toFixed( 1 ) : Math.round( value );
	const up = value > 0.05;
	const down = value < -0.05;
	let tone = '';
	if ( goodWhen !== 'neutral' && ( up || down ) ) {
		tone =
			( up && goodWhen === 'up' ) || ( down && goodWhen === 'down' )
				? 'is-good'
				: 'is-bad';
	}
	return (
		<span className={ `gatehouse-delta ${ tone }` } title={ label }>
			{ up && <Icon name="up" size={ 12 } /> }
			{ down && <Icon name="down" size={ 12 } /> }
			{ `${ Math.abs( rounded ) }%` }
			<span className="gatehouse-sr">{ label }</span>
		</span>
	);
}

/* ------------------------------------------------------------------ Pill */

export function Pill( { tone = '', dot = false, icon, children } ) {
	return (
		<span className={ `gatehouse-pill ${ tone ? `is-${ tone }` : '' }` }>
			{ dot && <span className="gatehouse-pill__dot" /> }
			{ icon && <Icon name={ icon } size={ 12 } /> }
			{ children }
		</span>
	);
}

const SOURCE_STATUS = {
	active: {
		tone: 'good',
		icon: 'check',
		label: __( 'Active', 'gatehouse' ),
	},
	forecast: {
		tone: 'serious',
		icon: 'gauge',
		label: __( 'On pace to exceed', 'gatehouse' ),
	},
	near: {
		tone: 'warning',
		icon: 'alert',
		label: __( 'Near budget', 'gatehouse' ),
	},
	capped: {
		tone: 'critical',
		icon: 'ban',
		label: __( 'Budget reached', 'gatehouse' ),
	},
	paused: {
		tone: 'critical',
		icon: 'pause',
		label: __( 'Paused', 'gatehouse' ),
	},
};

export function SourceStatus( { status } ) {
	const s = SOURCE_STATUS[ status ] || SOURCE_STATUS.active;
	return (
		<Pill tone={ s.tone } icon={ s.icon }>
			{ s.label }
		</Pill>
	);
}

const REQUEST_STATUS = {
	ok: { tone: 'good', icon: 'check', label: __( 'Completed', 'gatehouse' ) },
	blocked: {
		tone: 'critical',
		icon: 'ban',
		label: __( 'Blocked', 'gatehouse' ),
	},
	error: {
		tone: 'warning',
		icon: 'alert',
		label: __( 'Failed', 'gatehouse' ),
	},
};

export function RequestStatus( { status, cached = false } ) {
	if ( cached && status === 'ok' ) {
		return (
			<Pill tone="accent" icon="bolt">
				{ __( 'From cache', 'gatehouse' ) }
			</Pill>
		);
	}
	const s = REQUEST_STATUS[ status ] || REQUEST_STATUS.ok;
	return (
		<Pill tone={ s.tone } icon={ s.icon }>
			{ s.label }
		</Pill>
	);
}

/* ------------------------------------------------------------------ Avatar */

const TYPE_LABEL = {
	plugin: __( 'Plugin', 'gatehouse' ),
	theme: __( 'Theme', 'gatehouse' ),
	'mu-plugin': __( 'Must-use plugin', 'gatehouse' ),
	core: __( 'WordPress', 'gatehouse' ),
};

export function typeLabel( type ) {
	return TYPE_LABEL[ type ] || type;
}

export function SourceAvatar( { label, color, large = false } ) {
	return (
		<span
			className={ `gatehouse-avatar ${ large ? 'is-lg' : '' }` }
			aria-hidden="true"
		>
			{ initials( label ) }
			{ color && (
				<span
					className="gatehouse-avatar__dot"
					style={ { background: color } }
				/>
			) }
		</span>
	);
}

/* ------------------------------------------------------------------ Controls */

export function Button( { variant = '', size = '', icon, children, ...rest } ) {
	const cls = [
		'gatehouse-btn',
		variant && `is-${ variant }`,
		size && `is-${ size }`,
		! children && 'is-icon',
	]
		.filter( Boolean )
		.join( ' ' );
	return (
		<button type="button" className={ cls } { ...rest }>
			{ icon && <Icon name={ icon } size={ 15 } /> }
			{ children }
		</button>
	);
}

export function Switch( { checked, onChange, label, id, disabled } ) {
	return (
		<span className="gatehouse-switch">
			<input
				type="checkbox"
				role="switch"
				id={ id }
				checked={ !! checked }
				disabled={ disabled }
				aria-label={ label }
				onChange={ ( e ) => onChange( e.target.checked ) }
			/>
			<span className="gatehouse-switch__track" aria-hidden="true" />
		</span>
	);
}

export function Segmented( { options, value, onChange, label } ) {
	return (
		<div className="gatehouse-seg" role="group" aria-label={ label }>
			{ options.map( ( o ) => (
				<button
					key={ o.value }
					type="button"
					className={ o.value === value ? 'is-active' : '' }
					aria-pressed={ o.value === value }
					onClick={ () => onChange( o.value ) }
				>
					{ o.label }
				</button>
			) ) }
		</div>
	);
}

export function Setting( { title, desc, children, badge } ) {
	return (
		<div className="gatehouse-setting">
			<div className="gatehouse-setting__text">
				<div className="gatehouse-setting__title">
					{ title }
					{ badge }
				</div>
				{ desc && (
					<div className="gatehouse-setting__desc">{ desc }</div>
				) }
			</div>
			<div className="gatehouse-setting__control">{ children }</div>
		</div>
	);
}

export function MoneyInput( {
	value,
	onChange,
	id,
	placeholder = '0.00',
	label,
} ) {
	return (
		<span className="gatehouse-money">
			<input
				id={ id }
				className="gatehouse-input gatehouse-num"
				type="number"
				min="0"
				step="0.01"
				inputMode="decimal"
				aria-label={ label }
				placeholder={ placeholder }
				value={ value === 0 || value === '0' ? '' : value }
				onChange={ ( e ) =>
					onChange( e.target.value === '' ? 0 : e.target.value )
				}
			/>
		</span>
	);
}

/* ------------------------------------------------------------------ Meter */

/**
 * Budget meter with an optional forecast extension and a marker at 100%.
 *
 * @param {Object}  props          Props.
 * @param {number}  props.value    Spent.
 * @param {number}  props.max      Budget.
 * @param {number}  props.forecast Forecast (optional).
 * @param {boolean} props.small    Smaller variant.
 * @param {string}  props.label    Accessible name.
 * @return {JSX.Element} Meter.
 */
export function Meter( { value, max, forecast, small = false, label } ) {
	// Scale so the budget sits at 100% unless the forecast overshoots it.
	const scaleMax = Math.max( max, forecast || 0, value ) || 1;
	const pct = ( v ) => `${ Math.min( 100, ( v / scaleMax ) * 100 ) }%`;
	const ratio = max ? value / max : 0;
	let color = 'var(--gatehouse-s1)';
	if ( ratio >= 1 ) {
		color = 'var(--gatehouse-critical)';
	} else if ( ratio >= 0.8 ) {
		color = 'var(--gatehouse-warning)';
	} else if ( forecast && max && forecast > max ) {
		color = 'var(--gatehouse-serious)';
	}
	return (
		<div
			className={ `gatehouse-meter ${ small ? 'is-sm' : '' }` }
			style={ { '--gatehouse-meter-color': color } }
			role="meter"
			aria-valuemin={ 0 }
			aria-valuemax={ max }
			aria-valuenow={ value }
			aria-label={ label }
		>
			{ forecast > value && (
				<span
					className="gatehouse-meter__forecast"
					style={ { width: pct( forecast ) } }
				/>
			) }
			<span
				className="gatehouse-meter__fill"
				style={ { width: pct( value ) } }
			/>
			{ max > 0 && scaleMax > max && (
				<span
					className="gatehouse-meter__mark"
					style={ { left: pct( max ) } }
				/>
			) }
		</div>
	);
}

/* ------------------------------------------------------------------ Drawer */

export function Drawer( { title, sub, onClose, children, footer } ) {
	const panel = useRef( null );
	useEffect( () => {
		const doc = panel.current.ownerDocument;
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				onClose();
				return;
			}
			if ( e.key !== 'Tab' || ! panel.current ) {
				return;
			}
			// Keep keyboard focus inside the open drawer.
			const items = panel.current.querySelectorAll(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			);
			if ( ! items.length ) {
				e.preventDefault();
				return;
			}
			const first = items[ 0 ];
			const last = items[ items.length - 1 ];
			const active = doc.activeElement;
			if (
				e.shiftKey &&
				( active === first || active === panel.current )
			) {
				e.preventDefault();
				last.focus();
			} else if ( ! e.shiftKey && active === last ) {
				e.preventDefault();
				first.focus();
			} else if ( ! panel.current.contains( active ) ) {
				e.preventDefault();
				first.focus();
			}
		};
		doc.addEventListener( 'keydown', onKey );
		const previous = doc.activeElement;
		panel.current.focus();
		return () => {
			doc.removeEventListener( 'keydown', onKey );
			previous?.focus?.();
		};
	}, [ onClose ] );

	return (
		<>
			<div
				className="gatehouse-scrim"
				onClick={ onClose }
				aria-hidden="true"
			/>
			<aside
				className="gatehouse-drawer"
				role="dialog"
				aria-modal="true"
				aria-label={ typeof title === 'string' ? title : undefined }
				tabIndex={ -1 }
				ref={ panel }
			>
				<header className="gatehouse-drawer__head">
					<div>
						{ title }
						{ sub }
					</div>
					<Button
						variant="ghost"
						icon="x"
						onClick={ onClose }
						aria-label={ __( 'Close', 'gatehouse' ) }
					/>
				</header>
				<div className="gatehouse-drawer__body">{ children }</div>
				{ footer && (
					<footer className="gatehouse-drawer__foot">
						{ footer }
					</footer>
				) }
			</aside>
		</>
	);
}

/* ------------------------------------------------------------------ Toast */

const ToastContext = createContext( () => {} );

export function ToastProvider( { children } ) {
	const [ toast, setToast ] = useState( null );
	const timer = useRef();
	const show = useCallback( ( message, icon = 'check' ) => {
		window.clearTimeout( timer.current );
		setToast( { message, icon } );
		timer.current = window.setTimeout( () => setToast( null ), 2600 );
	}, [] );
	return (
		<ToastContext.Provider value={ show }>
			{ children }
			<div aria-live="polite" className="gatehouse-sr">
				{ toast?.message }
			</div>
			{ toast && (
				<div className="gatehouse-toast" role="status">
					<Icon name={ toast.icon } size={ 15 } />
					{ toast.message }
				</div>
			) }
		</ToastContext.Provider>
	);
}

export function useToast() {
	return useContext( ToastContext );
}

/* ------------------------------------------------------------------ Empty */

export function Empty( { title, text, children, compact = false, art } ) {
	return (
		<div className={ `gatehouse-empty ${ compact ? 'is-compact' : '' }` }>
			{ art && <div className="gatehouse-empty__art">{ art }</div> }
			<h3 className="gatehouse-empty__title">{ title }</h3>
			{ text && <p className="gatehouse-empty__text">{ text }</p> }
			{ children }
		</div>
	);
}

export function ErrorNotice( { error, onRetry } ) {
	return (
		<div className="gatehouse-banner" role="alert">
			<span className="gatehouse-banner__icon">
				<Icon name="alert" />
			</span>
			<div className="gatehouse-banner__text">
				<strong>{ __( 'Could not load data.', 'gatehouse' ) }</strong>{ ' ' }
				{ error?.message || '' }
			</div>
			{ onRetry && (
				<Button size="sm" icon="refresh" onClick={ onRetry }>
					{ __( 'Retry', 'gatehouse' ) }
				</Button>
			) }
		</div>
	);
}

/* ------------------------------------------------------------------ Page head */

export function PageHead( { title, lede, children, help } ) {
	return (
		<div className="gatehouse-pagehead">
			<div>
				<h1 className="gatehouse-pagehead__title">{ title }</h1>
				{ lede && <p className="gatehouse-pagehead__lede">{ lede }</p> }
			</div>
			{ ( children || help ) && (
				<div className="gatehouse-toolbar">
					{ children }
					{ help && (
						<a
							className="gatehouse-btn is-ghost is-icon"
							href={ `#/help?topic=${ help }` }
							title={ __( 'Help for this page', 'gatehouse' ) }
							aria-label={ __(
								'Help for this page',
								'gatehouse'
							) }
						>
							<span
								className="gatehouse-qmark"
								aria-hidden="true"
							>
								?
							</span>
						</a>
					) }
				</div>
			) }
		</div>
	);
}

export const RANGE_OPTIONS = [
	{ value: 7, label: __( '7 days', 'gatehouse' ) },
	{ value: 30, label: __( '30 days', 'gatehouse' ) },
	{ value: 90, label: __( '90 days', 'gatehouse' ) },
];

export function rangeLabel( days ) {
	/* translators: %d: number of days. */
	return sprintf( __( 'last %d days', 'gatehouse' ), days );
}

/* ------------------------------------------------------------------ Loading */

/**
 * Initial-load placeholder shaped like a page: a heading, a wide card and a row of cards.
 *
 * @return {JSX.Element} Skeleton.
 */
export function Loading() {
	const blocks = [
		[ 12, 56 ],
		[ 8, 320 ],
		[ 4, 320 ],
		[ 4, 120 ],
		[ 4, 120 ],
		[ 4, 120 ],
	];
	return (
		<div
			className="gatehouse-skeleton"
			role="status"
			aria-label={ __( 'Loading', 'gatehouse' ) }
		>
			{ blocks.map( ( [ span, height ], i ) => (
				<div
					key={ i }
					style={ {
						gridColumn: `span ${ span }`,
						height,
						opacity: i === 0 ? 0.5 : 1,
					} }
				/>
			) ) }
		</div>
	);
}

/* ------------------------------------------------------------------ InfoTip */

let tipId = 0;

/**
 * Small "i" button that explains a term. Opens on hover, focus or click; Escape closes it.
 *
 * @param {Object} props          Props.
 * @param {*}      props.children Explanation.
 * @param {string} props.label    Accessible name of the button.
 * @param {string} props.align    'center', 'left' or 'right' edge alignment of the popover.
 * @return {JSX.Element} Tooltip.
 */
export function InfoTip( { children, label, align = 'center' } ) {
	const [ open, setOpen ] = useState( false );
	const [ pinned, setPinned ] = useState( false );
	const id = useRef( `gatehouse-tip-${ ++tipId }` ).current;
	const show = open || pinned;
	return (
		<span
			className={ `gatehouse-tip is-${ align }` }
			onMouseEnter={ () => setOpen( true ) }
			onMouseLeave={ () => setOpen( false ) }
		>
			<button
				type="button"
				className="gatehouse-tip__btn"
				aria-label={ label || __( 'More information', 'gatehouse' ) }
				aria-expanded={ show }
				aria-describedby={ show ? id : undefined }
				onClick={ ( e ) => {
					e.stopPropagation();
					setPinned( ! pinned );
				} }
				onFocus={ () => setOpen( true ) }
				onBlur={ () => {
					setOpen( false );
					setPinned( false );
				} }
				onKeyDown={ ( e ) => {
					if ( e.key === 'Escape' ) {
						setOpen( false );
						setPinned( false );
					}
				} }
			>
				<Icon name="info" size={ 13 } />
			</button>
			{ show && (
				<span role="tooltip" id={ id } className="gatehouse-tip__pop">
					{ children }
				</span>
			) }
		</span>
	);
}

/**
 * A label followed by an InfoTip.
 *
 * @param {Object} props       Props.
 * @param {*}      props.label Label.
 * @param {*}      props.tip   Explanation.
 * @param {string} props.align Popover alignment.
 * @return {JSX.Element} Label with tooltip.
 */
export function Term( { label, tip, align } ) {
	return (
		<span className="gatehouse-term">
			{ label }
			<InfoTip align={ align }>{ tip }</InfoTip>
		</span>
	);
}
