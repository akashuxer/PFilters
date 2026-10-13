import type {
  ArvoPopoverActionConfig,
} from '../Popover/Popover';
import type {
  ArvoListEmptyState,
  ArvoListGroup,
  ArvoListItemData,
} from '../List/List';
import type {
  HybridPopoverEmptyConfig,
  HybridPopoverGroup,
  HybridPopoverInlineConfig,
  HybridPopoverItem,
} from './HybridPopover';

// ---------------------------------------------------------------------------
// Inline config types
// ---------------------------------------------------------------------------

export interface PopoverInlineConfig {
  title?: string;
  content: HTMLElement;
  actions?: ArvoPopoverActionConfig[];
  isClosable?: boolean;
  hasBackButton?: boolean;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// hasInline deprecation + inline resolution
// ---------------------------------------------------------------------------

let _hasInlineWarned = false;

export function warnHasInlineDeprecated(): void {
  if (_hasInlineWarned) return;
  _hasInlineWarned = true;
  console.warn(
    'HybridPopover: item.hasInline is deprecated; use item.inline instead.',
  );
}

export function resolveItemInline(
  item: HybridPopoverItem,
): HybridPopoverInlineConfig | PopoverInlineConfig | null {
  if (item.inline) return item.inline;
  if (!item.hasInline) return null;
  warnHasInlineDeprecated();
  if (item.hasInline === true) return {};
  if (Array.isArray(item.hasInline)) return { items: item.hasInline };
  return item.hasInline as HybridPopoverInlineConfig;
}

export function isPopoverInlineConfig(
  cfg: HybridPopoverInlineConfig | PopoverInlineConfig,
): cfg is PopoverInlineConfig {
  return 'content' in cfg && (cfg as PopoverInlineConfig).content != null;
}

// ---------------------------------------------------------------------------
// Empty-state mapping (emptyConfig -> ArvoListEmptyState)
// ---------------------------------------------------------------------------

const EMPTY_DEFAULTS: Required<HybridPopoverEmptyConfig> = {
  noDataTitle: 'No data available',
  noDataMessage: 'There are no values to display.',
  noResultsTitle: 'No results found',
  noResultsMessage: 'Adjust your filter search query.',
  noResultsClearLabel: 'Clear Search',
  appliesToAllMessage: 'This filter currently applies to all values.',
};

/**
 * Convert HybridPopoverEmptyConfig into the ArvoListEmptyState shape consumed
 * by the embedded ArvoList. Mirrors the React counterpart `mapListEmptyState`.
 */
export function mapListEmptyState(
  kind: 'no-data' | 'no-results',
  config?: HybridPopoverEmptyConfig,
  onClear?: () => void,
): ArvoListEmptyState {
  const cfg = { ...EMPTY_DEFAULTS, ...config };
  const isNoResults = kind === 'no-results';
  return {
    // Figma spec 7.13 caps the illustration at 124px (`--arvo-illus-124`);
    // ArvoList renders ArvoEmptyState at size='md' which honors that cap.
    illustration: isNoResults ? 'no-results' : 'no-data',
    title: isNoResults ? cfg.noResultsTitle : cfg.noDataTitle,
    description: isNoResults ? cfg.noResultsMessage : cfg.noDataMessage,
    ctaLabel: isNoResults && onClear ? cfg.noResultsClearLabel : undefined,
    onCtaClick: isNoResults && onClear ? onClear : undefined,
  };
}

// ---------------------------------------------------------------------------
// HybridPopoverItem -> ArvoListItemData mapping
// ---------------------------------------------------------------------------

export function isGroupedItems(
  items: HybridPopoverItem[] | HybridPopoverGroup[],
): items is HybridPopoverGroup[] {
  return items.length > 0 && 'items' in (items[0] as object);
}

/**
 * Map a single HybridPopoverItem onto the ArvoListItemData shape consumed
 * by the embedded ArvoList. `groupDraggable` plus the per-item
 * `isDraggable` flag determine whether the row exposes a drag handle
 * (`undefined`, which lets the list-level default kick in) or a
 * column-aligning spacer (`isReorderable: false`). The original
 * HybridPopoverItem is retained on `data` so callers can recover the
 * source row in selection / activation handlers.
 */
export function toListItem(
  item: HybridPopoverItem,
  groupDraggable: boolean,
): ArvoListItemData {
  const inlineCfg = resolveItemInline(item);
  const draggable = groupDraggable && item.isDraggable !== false;
  return {
    id: item.id,
    label: item.label,
    icon: item.icon,
    isDisabled: item.isDisabled,
    isExcluded: item.isExcluded,
    isIndeterminate: item.isIndeterminate,
    isReorderable: draggable ? undefined : false,
    hasInlineNav: inlineCfg !== null,
    data: item,
  };
}

/**
 * Normalize a HybridPopover items / defaultItems payload into the
 * ArvoList input shape. Returns either { items } (flat) or { groups }
 * (grouped) so the consumer can spread into ArvoList directly.
 */
export function toListPayload(
  items: HybridPopoverItem[] | HybridPopoverGroup[],
  enableReorder: boolean,
): { items?: ArvoListItemData[]; groups?: ArvoListGroup[] } {
  if (items.length === 0) return { items: [] };
  if (isGroupedItems(items)) {
    return {
      groups: items.map((g) => ({
        id: g.id,
        label: g.label,
        hasSelectAll: g.hasSelectAll,
        items: g.items.map((it) =>
          toListItem(it, enableReorder && g.isDraggable !== false),
        ),
      })),
    };
  }
  return {
    items: (items as HybridPopoverItem[]).map((it) =>
      toListItem(it, enableReorder),
    ),
  };
}
