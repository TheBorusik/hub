/* =============================================================================
 *  design-tokens.ts — type-safe wrapper over CSS custom properties.
 *
 *  Purpose: consumers that can't use CSS directly (inline styles, JS animation,
 *  Monaco theme wiring) have a single, autocomplete-friendly object. Values are
 *  always `var(--...)` strings — the CSS source of truth stays in
 *  `src/styles/tokens.css`.
 *
 *  Usage:
 *    import { t } from "@/lib/design-tokens";
 *    <div style={{ padding: t.space[4], background: t.color.bg.sidebar }} />
 *
 *  Rule: never hard-code hex colors or magic pixel values in TSX. If a token
 *  is missing here — add it to tokens.css first, then expose it here.
 * ============================================================================= */

const cssVar = <T extends string>(name: T): `var(${T})` => `var(${name})`;

/* ----- colors (grouped by role) ------------------------------------------- */
const color = {
  bg: {
    app:            cssVar("--color-bg-app"),
    activitybar:    cssVar("--color-bg-activitybar"),
    sidebar:        cssVar("--color-bg-sidebar"),
    panel:          cssVar("--color-bg-panel"),
    editor:         cssVar("--color-bg-editor"),
    titlebar:       cssVar("--color-bg-titlebar"),
    statusbar:      cssVar("--color-bg-statusbar"),
    toolbar:        cssVar("--color-bg-toolbar"),
    tabActive:      cssVar("--color-bg-tab-active"),
    tabInactive:    cssVar("--color-bg-tab-inactive"),
    hover:          cssVar("--color-bg-hover"),
    hoverStrong:    cssVar("--color-bg-hover-strong"),
    selected:       cssVar("--color-bg-selected"),
    selectedSoft:   cssVar("--color-bg-selected-soft"),
    accentSoft:     cssVar("--color-bg-accent-soft"),
    dangerSoft:     cssVar("--color-bg-danger-soft"),
    warningSoft:    cssVar("--color-bg-warning-soft"),
    successSoft:    cssVar("--color-bg-success-soft"),
    infoSoft:       cssVar("--color-bg-info-soft"),
    backdrop:       cssVar("--color-bg-backdrop"),
  },
  text: {
    primary: cssVar("--color-text-primary"),
    active:  cssVar("--color-text-active"),
    muted:   cssVar("--color-text-muted"),
    inverse: cssVar("--color-text-inverse"),
    link:    cssVar("--color-text-link"),
    danger:  cssVar("--color-text-danger"),
    warning: cssVar("--color-text-warning"),
    success: cssVar("--color-text-success"),
    info:    cssVar("--color-text-info"),
  },
  border: {
    default: cssVar("--color-border"),
    subtle:  cssVar("--color-border-subtle"),
    strong:  cssVar("--color-border-strong"),
  },
  accent:    cssVar("--color-accent"),
  focusRing: cssVar("--color-focus-ring"),
  danger:    cssVar("--color-danger"),
  warning:   cssVar("--color-warning"),
  success:   cssVar("--color-success"),
  info:      cssVar("--color-info"),
  stage: {
    start:     cssVar("--color-stage-start"),
    crud:      cssVar("--color-stage-crud"),
    command:   cssVar("--color-stage-command"),
    transform: cssVar("--color-stage-transform"),
    event:     cssVar("--color-stage-event"),
    substart:  cssVar("--color-stage-substart"),
    final:     cssVar("--color-stage-final"),
    unknown:   cssVar("--color-stage-unknown"),
  },
} as const;

/* ----- spacing scale ------------------------------------------------------ */
const space = {
  0:  cssVar("--space-0"),
  1:  cssVar("--space-1"),
  2:  cssVar("--space-2"),
  3:  cssVar("--space-3"),
  4:  cssVar("--space-4"),
  5:  cssVar("--space-5"),
  6:  cssVar("--space-6"),
  7:  cssVar("--space-7"),
  8:  cssVar("--space-8"),
  10: cssVar("--space-10"),
  12: cssVar("--space-12"),
  16: cssVar("--space-16"),
  20: cssVar("--space-20"),
} as const;

/* ----- radii -------------------------------------------------------------- */
const radius = {
  sm:   cssVar("--radius-sm"),
  md:   cssVar("--radius-md"),
  lg:   cssVar("--radius-lg"),
  xl:   cssVar("--radius-xl"),
  full: cssVar("--radius-full"),
} as const;

/* ----- shadows ------------------------------------------------------------ */
const shadow = {
  elev1: cssVar("--shadow-elev-1"),
  elev2: cssVar("--shadow-elev-2"),
  elev3: cssVar("--shadow-elev-3"),
} as const;

/* ----- typography --------------------------------------------------------- */
const font = {
  ui:   cssVar("--font-ui"),
  mono: cssVar("--font-mono"),
  size: {
    xs: cssVar("--font-size-xs"),
    sm: cssVar("--font-size-sm"),
    md: cssVar("--font-size-md"),
    lg: cssVar("--font-size-lg"),
    xl: cssVar("--font-size-xl"),
  },
} as const;

/* ----- motion ------------------------------------------------------------- */
const duration = {
  fast: cssVar("--duration-fast"),
  base: cssVar("--duration-base"),
  slow: cssVar("--duration-slow"),
} as const;

/* ----- z-index stack ------------------------------------------------------ */
const z = {
  base:            cssVar("--z-base"),
  tabs:            cssVar("--z-tabs"),
  panelToolbar:    cssVar("--z-panel-toolbar"),
  panelOverlay:    cssVar("--z-panel-overlay"),
  stickyHeader:    cssVar("--z-sticky-header"),
  dropdown:        cssVar("--z-dropdown"),
  tooltip:         cssVar("--z-tooltip"),
  modalBackdrop:   cssVar("--z-modal-backdrop"),
  modal:           cssVar("--z-modal"),
  contextMenu:     cssVar("--z-context-menu"),
  commandPalette:  cssVar("--z-command-palette"),
  toast:           cssVar("--z-toast"),
  system:          cssVar("--z-system"),
} as const;

/* ----- component-level (widget sizes) ------------------------------------ */
const component = {
  panelHeader: {
    height:          cssVar("--panel-header-height"),
    paddingX:        cssVar("--panel-header-padding-x"),
    paddingY:        cssVar("--panel-header-padding-y"),
    fontSize:        cssVar("--panel-header-font-size"),
    letterSpacing:   cssVar("--panel-header-letter-spacing"),
  },
  toolbar: {
    height:   cssVar("--toolbar-height"),
    paddingX: cssVar("--toolbar-padding-x"),
    paddingY: cssVar("--toolbar-padding-y"),
  },
  activitybar: { width: cssVar("--activitybar-width") },
  statusbar:   { height: cssVar("--statusbar-height") },
  tab:         { height: cssVar("--tab-height") },
  subtab:      { height: cssVar("--subtab-height") },
  input:       { height: cssVar("--input-height") },
  button: {
    height:   cssVar("--button-height"),
    heightSm: cssVar("--button-height-sm"),
  },
} as const;

export const t = {
  color,
  space,
  radius,
  shadow,
  font,
  duration,
  z,
  component,
} as const;

export type DesignTokens = typeof t;
