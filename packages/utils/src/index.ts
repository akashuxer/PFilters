// @arvo/utils - Shared DOM utilities

export { createCharCounter, updateCharCounter, formatCharCount } from './form-char-counter';
export type { CharCounterOptions } from './form-char-counter';

export { attachTitleTruncationTooltip } from './title-truncation';
export type {
  TitleTruncationOptions,
  TitleTruncationHandle,
} from './title-truncation';

export {
  clampFooterActions,
  attachOverlayFooterFit,
} from './overlay-footer';
export type {
  ClampFooterActionsOptions,
  OverlayFooterFitOptions,
  OverlayFooterFitHandle,
} from './overlay-footer';

// Keyboard-shortcut helpers live in `@arvo/core` (so the tooltip-manager
// can use them without a circular dependency); re-exported here for
// consumers that already import other helpers from `@arvo/utils`.
export {
  getOperatingSystem,
  isMacOS,
  isModKey,
  parseShortcut,
  matchesShortcut,
  formatShortcutDisplay,
  type ArvoOperatingSystem,
  type ParsedShortcut,
} from '@arvo/core';

export {
  runItemFilter,
  formatMatchCountMessage,
  validateHeaderAction,
} from './panel-shell';
export type {
  PanelShellOptions,
  PanelShellInstance,
  ArvoPanelHeaderAction,
  ArvoPanelHeaderActionType,
  ArvoPanelHeaderActionBtn,
  ArvoPanelHeaderActionDropdown,
  ArvoPanelHeaderActionSplit,
  ArvoPanelHeaderActionSwitch,
  ArvoPanelHeaderActionCheckbox,
  ArvoPanelMenuItem,
  ArvoPanelStickyHeaderConfig,
  ArvoPanelBannerConfig,
  ArvoPanelBannerButton,
  ArvoPanelBannerLink,
  ArvoPanelInfoConfig,
  ArvoPanelTabConfig,
  ArvoPanelSearchConfig,
  ArvoPanelSearchVariant,
  ArvoPanelRichHeaderConfigShape,
  ArvoPanelPlacement,
  ArvoPanelDisplayMode,
  ArvoPanelExpandMode,
  ArvoPanelCloseReason,
  ArvoPanelFilterGroup,
  ArvoPanelAction,
  ArvoPanelDefaultItem,
  PanelContent,
} from './panel-shell';
