// @arvo/core - Framework-agnostic shared logic

export { warnDeprecated } from './diagnostics/warn-deprecated';

export {
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  isFocusable,
  saveFocus,
  restoreFocus,
  createFocusTrap,
  createTabRoving,
  resolveOverlayInitialFocus,
  type FocusState,
  type FocusTrap,
  type FocusTrapOptions,
  type TabRoving,
  type TabRovingOptions,
  type ArvoInitialFocusTarget,
  type OverlayInitialFocusRegions,
  type ResolveInitialFocusOptions,
} from './focus';

export {
  createArrowNav,
  createEscapeHandler,
  createActivationHandler,
  createTreeNav,
  getOperatingSystem,
  isMacOS,
  isModKey,
  parseShortcut,
  matchesShortcut,
  formatShortcutDisplay,
  __resetOperatingSystemCacheForTests,
  type ArrowNav,
  type ArrowNavOptions,
  type EscapeHandler,
  type ActivationHandler,
  type TreeNav,
  type TreeNavOptions,
  type TreeNavRowMeta,
  type ArvoOperatingSystem,
  type ParsedShortcut,
} from './keyboard';

export {
  enter,
  exit,
  prefersReducedMotion,
  onReducedMotionChange,
  type TransitionType,
  type TransitionOptions,
} from './animation';

export {
  computePosition,
  createPositionWatcher,
  applyPositionToSurface,
  resolvePositionSide,
  type ApplyPositionOptions,
  type Placement,
  type PlacementFlip,
  type ResolvedPlacement,
  type PositionOptions,
  type PositionResult,
  type PositionWatcherOptions,
  type PositionWatcher,
  type PositionUpdateSource,
  type VirtualAnchorProvider,
} from './position';

export {
  createOverlayHub,
  overlayHub,
  createBackdropManager,
  createOverlaySurface,
  createInlinePanelStack,
  lockPageScroll,
  isPageScrollLocked,
  type OverlayConfig,
  type OverlayType,
  type OverlayEntry,
  type OverlayHub,
  type OverlayRelation,
  type BackdropOptions,
  type BackdropManager,
  type OverlaySurface,
  type OverlaySurfaceOptions,
  type OverlaySurfaceTriggerAria,
  type OverlaySurfaceFocusOptions,
  type OverlaySurfacePositionOptions,
  type InlinePanelStack,
  type InlinePanelStackEntry,
  type InlinePanelStackOptions,
  type InlinePanelPushOptions,
  type InlinePanelPopOptions,
  type InlinePanelPopVia,
  type InlinePanelKind,
} from './overlay';

export {
  createMask,
  type MaskOptions,
  type MaskInstance,
} from './mask';

export {
  normalizeQuery,
  filterItems,
  filterGroups,
  aggregateSelectionState,
  nextSelectionForRangeShift,
  type ListItemBase,
  type ListGroup,
  type ListFilterOptions,
  type AggregateSelectionState,
} from './list';

export { isTruncated } from './dom';

export {
  formatBadgeCount,
  type FormatBadgeCountOptions,
} from './format';

export {
  resolveInitials,
  parseInitialsFromName,
  parseInitialsFromEmail,
  type ResolveInitialsOptions,
} from './initials';

export {
  validateInlineContent,
  sanitizeLink,
  normalizeInlineContent,
  renderInlineContent,
  domInlineAdapter,
  renderInlineContentToDOM,
  replaceInlineContentInElement,
  BASIC_INLINE_NODES,
  EXTENDED_INLINE_NODES,
  getAllowedNodeTypes,
  type TextNode,
  type EmNode,
  type StrongNode,
  type LinkNode,
  type CodeNode,
  type KbdNode,
  type AbbrNode,
  type TimeNode,
  type SupNode,
  type SubNode,
  type BreakNode,
  type InlineNode,
  type InlineContent,
  type BasicInlineNode,
  type BasicInlineContent,
  type ExtendedInlineContent,
  type ContentProfile,
  type NormalizedLink,
  type InlineValidationMode,
  type InlineValidationOptions,
  type InlineContentAdapter,
  type RenderInlineContentOptions,
} from './inline-content';

export {
  createSortableList,
  type SortableListOptions,
  type SortableHandle,
} from './dnd';

export {
  createOverflowManager,
  type OverflowManager,
  type OverflowManagerOptions,
  type OverflowItem,
} from './overflow';

export {
  createResizeHandle,
  type ResizeCorner,
  type ResizeRect,
  type ResizeHandleOptions,
  type ResizeHandleInstance,
} from './resize';

export {
  createDragHandle,
  type DragOffset,
  type DragBoundsRect,
  type DragHandleOptions,
  type DragHandleInstance,
} from './drag';

export {
  createTooltipManager,
  tooltipManager,
  connectTooltip,
  type TooltipPlacement,
  type TooltipManagerConfig,
  type TooltipShowOptions,
  type TooltipManager,
  type TooltipManagerDeps,
  type TooltipConnectorOptions,
  type TooltipConnector,
} from './tooltip';

export {
  createContextMenuController,
  type ContextMenuAnchor,
  type ContextMenuController,
  type ContextMenuControllerOptions,
  type ContextMenuModality,
  type ContextMenuOnRequest,
  type ContextMenuRequest,
  type ContextMenuRequestHelpers,
} from './context-menu';

// Date/Time engine - tokenizer, parse/format, calendar math, member index,
// rolling time, and the headless segment controller (see ./datetime).
export {
  // config
  configureDateTime,
  getDateTimeConfig,
  resetDateTimeConfig,
  // tokenizer
  tokenizeFormat,
  hasTimeTokens,
  hasDateTokens,
  // locale
  getUserLocale,
  getMonthNames,
  getDayNames,
  getWeekdayHeaders,
  getAmPmStrings,
  shouldUse12Hour,
  getLocaleDateFormat,
  getLocaleTimeFormat,
  getLocaleDateTimeFormat,
  // format / parse
  formatDate,
  formatTime,
  formatDateTime,
  parseDate,
  parseTime,
  parseDateTime,
  splitDateTimeFormat,
  // calendar
  normalizeDate,
  normalize,
  isSameDay,
  isBeforeDay,
  isAfterDay,
  isSameWeek,
  isSameMonth,
  isSameQuarter,
  isSameYear,
  addDays,
  addMonths,
  inDateRange,
  pickAnchorDate,
  getWeekNumber,
  formatWeekNumber,
  getMonthMatrix,
  getMonthRange,
  getYearRange,
  monthOverlapsRange,
  yearOverlapsRange,
  // member index
  parseMemberKey,
  buildMemberIndex,
  findMemberForDate,
  findMemberByDate,
  findMemberByIndex,
  getMembersForYear,
  getMembersForMonth,
  getMembersForDecade,
  getMembersInRange,
  listMembersBetween,
  getMemberRange,
  isMemberInRange,
  detectFrequency,
  getFrequencyViewConfig,
  getAdjacentMember,
  // rolling
  resolveCurrentMember,
  rollingRangeToMembers,
  validateRollingRange,
  formatRollingValue,
  formatRollingRange,
  rangeIncludedCount,
  rangeIncludedMessage,
  rollingIncludedCount,
  rollingIncludedMessage,
  // segment controller
  createSegmentController,
  getSegmentBounds,
  // types
  type Locale,
  type TimeObject,
  type TokenKind,
  type Token,
  type DateTimeConfig,
  type MemberItem,
  type NormalizedMember,
  type Frequency,
  type MemberIndex,
  type MonthMatrix,
  type MonthWeek,
  type MonthDay,
  type MonthMatrixOptions,
  type BuildMemberIndexOptions,
  type FrequencyViewConfig,
  type RollingRange,
  type RollingPrefix,
  type RollingRangeWithPrefix,
  type RollingValidation,
  type SegmentBoundsContext,
  type SegmentKind,
  type SegmentDescriptor,
  type SegmentValue,
  type SegmentControllerOptions,
  type SegmentController,
  type SegmentEventName,
  type SegmentEventPayload,
  type SegmentCommitPayload,
} from './datetime';
