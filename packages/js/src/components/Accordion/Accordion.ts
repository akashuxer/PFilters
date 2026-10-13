import { attachTitleTruncationTooltip, type TitleTruncationHandle } from '@arvo/utils';
import { ArvoIconButton } from '../IconButton/IconButton';
import {
  ArvoDropdownIconButton,
  type ArvoDropdownIconButtonOptions,
} from '../DropdownIconButton/DropdownIconButton';
import { ArvoStatus, type ArvoStatusOptions, type ArvoStatusType } from '../Status/Status';
import { ArvoBadge, type ArvoBadgeOptions, type ArvoBadgeSemanticType } from '../Badge/Badge';
import { ArvoSwitch, type ArvoSwitchOptions } from '../Switch/Switch';
import { ArvoSearch, type ArvoSearchOptions } from '../Search/Search';
import { ArvoEmptyState, type ArvoEmptyStateOptions } from '../EmptyState/EmptyState';
import type { MenuItemData } from '../ActionMenu/ActionMenu';

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { ArvoStatusType, ArvoBadgeSemanticType, MenuItemData };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoAccordionSize = 'sm' | 'lg';
export type ArvoAccordionVariant = 'surface' | 'transparent';
export type ArvoAccordionAlign = 'start' | 'end';
export type ArvoAccordionExpandMode = 'single' | 'multiple';

export interface ArvoAccordionItemAction {
  id: string;
  icon: string;
  tooltip: string;
  isDisabled?: boolean;
  onClick?: (event?: Event) => void;
}

export interface ArvoAccordionItemSearchConfig {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  shortcut?: string;
  expandDirection?: 'start' | 'end';
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  onChange?: (value: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export interface ArvoAccordionItemSwitchConfig {
  isChecked?: boolean;
  defaultChecked?: boolean;
  isDisabled?: boolean;
  ariaLabel?: string;
  onChange?: (isChecked: boolean) => void;
}

export interface ArvoAccordionItemData {
  value: string;
  title: string;
  description?: string;
  icon?: string;
  status?: { type: ArvoStatusType; label?: string } | null;
  badge?: { message: string; semanticType?: ArvoBadgeSemanticType } | null;
  actions?: ArvoAccordionItemAction[];
  menuItems?: MenuItemData[];
  switch?: ArvoAccordionItemSwitchConfig | null;
  search?: ArvoAccordionItemSearchConfig | null;
  hasDivider?: boolean;
  panelPadding?: 'none' | 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: Pick<
    ArvoEmptyStateOptions,
    'title' | 'message' | 'illustration'
  > | null;
  statusProps?: Pick<ArvoStatusOptions, 'icon'>;
  // Accordion header badges are always icon-less label pills. The bag
  // intentionally excludes `icon` / `hasBadgeIcon` so the inner badge
  // default can't be re-enabled at the call site (matches React twin).
  badgeProps?: Pick<
    ArvoBadgeOptions,
    'colorMode' | 'customColor' | 'appearance'
  >;
  menuProps?: Pick<
    ArvoDropdownIconButtonOptions,
    'placement' | 'maxHeight' | 'hasGroupDividers' | 'search' | 'menuProps'
  >;
  // Accordion header switches MUST NOT render a visible label -- the
  // accordion title carries the meaning. The bag only exposes
  // `isReadOnly` so `label` / `labelPosition` can't reintroduce a visible
  // label (matches React twin).
  switchProps?: Pick<ArvoSwitchOptions, 'isReadOnly'>;
  searchProps?: Pick<
    ArvoSearchOptions,
    'width' | 'isFullWidth' | 'isLoading' | 'isDisabled'
  >;
  /** Panel content. Accepts plain HTML string, a DOM node, or document fragment. */
  content?: string | HTMLElement | DocumentFragment;
}

export interface ArvoAccordionValueChangeMeta {
  itemValue: string;
  isExpanded: boolean;
}

export interface ArvoAccordionOptions {
  variant?: ArvoAccordionVariant;
  size?: ArvoAccordionSize;
  align?: ArvoAccordionAlign;
  expandMode?: ArvoAccordionExpandMode;
  isCollapsible?: boolean;
  value?: string | string[] | null;
  defaultValue?: string | string[] | null;
  items?: ArvoAccordionItemData[];
  isDisabled?: boolean;
  isLoading?: boolean;
  skeletonRowCount?: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  onValueChange?: (
    value: string | string[],
    meta: ArvoAccordionValueChangeMeta,
  ) => void;
  onExpand?: (detail: { itemValue: string }) => void;
  onCollapse?: (detail: { itemValue: string }) => void;
}

interface RequiredOptions {
  variant: ArvoAccordionVariant;
  size: ArvoAccordionSize;
  align: ArvoAccordionAlign;
  expandMode: ArvoAccordionExpandMode;
  isCollapsible: boolean;
  items: ArvoAccordionItemData[];
  expandedValues: Set<string>;
  isDisabled: boolean;
  isLoading: boolean;
  skeletonRowCount: number;
  ariaLabel: string | null;
  ariaLabelledBy: string | null;
  onValueChange:
    | ((value: string | string[], meta: ArvoAccordionValueChangeMeta) => void)
    | null;
  onExpand: ((detail: { itemValue: string }) => void) | null;
  onCollapse: ((detail: { itemValue: string }) => void) | null;
}

interface ItemEntry {
  data: ArvoAccordionItemData;
  rootEl: HTMLDivElement;
  trgEl: HTMLButtonElement;
  panelEl: HTMLDivElement;
  titleEl: HTMLSpanElement;
  chevEl: HTMLSpanElement;
  truncationHandle: TitleTruncationHandle | null;
  statusInstance: ArvoStatus | null;
  badgeInstance: ArvoBadge | null;
  inlineButtons: ArvoIconButton[];
  menuButton: ArvoDropdownIconButton | null;
  switchInstance: ArvoSwitch | null;
  searchInstance: ArvoSearch | null;
  emptyInstance: ArvoEmptyState | null;
  searchExpanded: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSet(
  value: string | string[] | null | undefined,
  mode: ArvoAccordionExpandMode,
): Set<string> {
  if (value == null) return new Set<string>();
  if (mode === 'multiple') {
    if (Array.isArray(value)) return new Set(value);
    return new Set([value]);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? new Set([value[0]]) : new Set<string>();
  }
  return new Set([value]);
}

function fromSet(
  set: ReadonlySet<string>,
  mode: ArvoAccordionExpandMode,
): string | string[] {
  if (mode === 'multiple') return Array.from(set);
  const first = set.values().next();
  return first.done ? '' : first.value;
}

function seedExpandedValues(opts: ArvoAccordionOptions): Set<string> {
  const mode = opts.expandMode ?? 'single';
  if (opts.value !== undefined) return toSet(opts.value, mode);
  if (opts.defaultValue !== undefined) return toSet(opts.defaultValue, mode);
  return new Set<string>();
}

function resolveEmptyState(
  override: Pick<ArvoEmptyStateOptions, 'title' | 'message' | 'illustration'> | null | undefined,
): Pick<ArvoEmptyStateOptions, 'title' | 'message' | 'illustration'> {
  return {
    title: override?.title,
    message: override?.message ?? 'No Items Available',
    illustration: override?.illustration ?? 'no-data',
  };
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoAccordion {
  private _element: HTMLElement | null;
  private _options: RequiredOptions;
  private _listEl: HTMLDivElement | null = null;
  private _skelEl: HTMLDivElement | null = null;
  private _entries: ItemEntry[] = [];
  private _boundHandleKeyDown: (e: KeyboardEvent) => void;

  static readonly VARIANTS = ['surface', 'transparent'] as const;
  static readonly SIZES = ['sm', 'lg'] as const;
  static readonly ALIGNS = ['start', 'end'] as const;
  static readonly EXPAND_MODES = ['single', 'multiple'] as const;

  static readonly DEFAULTS: Omit<RequiredOptions, 'items' | 'expandedValues'> = {
    variant: 'surface',
    size: 'lg',
    align: 'end',
    expandMode: 'single',
    isCollapsible: true,
    isDisabled: false,
    isLoading: false,
    skeletonRowCount: 4,
    ariaLabel: null,
    ariaLabelledBy: null,
    onValueChange: null,
    onExpand: null,
    onCollapse: null,
  };

  static initialize(
    element: HTMLElement,
    options?: ArvoAccordionOptions,
  ): ArvoAccordion {
    return new ArvoAccordion(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoAccordionOptions) {
    this._element = element;

    this._options = {
      ...ArvoAccordion.DEFAULTS,
      ...options,
      variant: options?.variant ?? ArvoAccordion.DEFAULTS.variant,
      size: options?.size ?? ArvoAccordion.DEFAULTS.size,
      align: options?.align ?? ArvoAccordion.DEFAULTS.align,
      expandMode: options?.expandMode ?? ArvoAccordion.DEFAULTS.expandMode,
      isCollapsible: options?.isCollapsible ?? ArvoAccordion.DEFAULTS.isCollapsible,
      items: options?.items ? options.items.map((i) => ({ ...i })) : [],
      expandedValues: seedExpandedValues(options ?? {}),
      ariaLabel: options?.ariaLabel ?? null,
      ariaLabelledBy: options?.ariaLabelledBy ?? null,
      onValueChange: options?.onValueChange ?? null,
      onExpand: options?.onExpand ?? null,
      onCollapse: options?.onCollapse ?? null,
    };


    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._render();
    this._bindEvents();
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  private _render(): void {
    const el = this._element;
    if (!el) return;

    this._destroyInstances();
    el.textContent = '';
    this._entries = [];

    // Wrapper classes
    el.classList.add(
      'arvo-acc',
      `arvo-acc--${this._options.variant}`,
      `arvo-acc--${this._options.size}`,
      `arvo-acc--align-${this._options.align}`,
    );
    if (this._options.isDisabled) el.classList.add('is-disabled');
    else el.classList.remove('is-disabled');
    if (this._options.isLoading) {
      el.classList.add('loading');
      el.setAttribute('aria-busy', 'true');
    } else {
      el.classList.remove('loading');
      el.removeAttribute('aria-busy');
    }

    if (this._options.ariaLabel) {
      el.setAttribute('aria-label', this._options.ariaLabel);
    } else {
      el.removeAttribute('aria-label');
    }
    if (this._options.ariaLabelledBy) {
      el.setAttribute('aria-labelledby', this._options.ariaLabelledBy);
    } else {
      el.removeAttribute('aria-labelledby');
    }

    if (this._options.isLoading) {
      this._skelEl = document.createElement('div');
      this._skelEl.className = 'arvo-acc__skel';
      this._skelEl.setAttribute('aria-hidden', 'true');
      const count = Math.max(1, this._options.skeletonRowCount);
      for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'arvo-acc__skel-row';
        this._skelEl.appendChild(row);
      }
      el.appendChild(this._skelEl);
      return;
    }

    this._listEl = document.createElement('div');
    this._listEl.className = 'arvo-acc__list';
    for (const item of this._options.items) {
      const entry = this._createItemEntry(item);
      this._listEl.appendChild(entry.rootEl);
      this._entries.push(entry);
    }
    el.appendChild(this._listEl);
  }

  private _createItemEntry(item: ArvoAccordionItemData): ItemEntry {
    const isExpanded = this._options.expandedValues.has(item.value);
    const isItemDisabled = this._options.isDisabled || !!item.isDisabled;
    const isItemLoading = (this._options.isLoading || !!item.isLoading) === true;
    const hasDivider = item.hasDivider !== false;
    const panelPadding = item.panelPadding ?? 'md';
    const triggerId = `arvo-acc-item-${this._uniqueId()}-trg`;
    const panelId = `arvo-acc-item-${this._uniqueId()}-panel`;
    const isItemEmpty = !!item.isEmpty;

    // -- Root ---------------------------------------------------------------
    const rootEl = document.createElement('div');
    rootEl.className = [
      'arvo-acc-item',
      `arvo-acc-item--${this._options.size}`,
      `arvo-acc-item--align-${this._options.align}`,
      `arvo-acc-item--pad-${panelPadding}`,
      isExpanded ? 'expanded' : '',
      isItemDisabled ? 'is-disabled' : '',
      isItemLoading ? 'loading' : '',
      isItemEmpty ? 'is-empty' : '',
      !hasDivider ? 'no-divider' : '',
    ]
      .filter(Boolean)
      .join(' ');
    rootEl.setAttribute('data-arvo-acc-item-value', item.value);

    // -- Trigger ------------------------------------------------------------
    const trgEl = document.createElement('button');
    trgEl.type = 'button';
    trgEl.id = triggerId;
    trgEl.className = 'arvo-acc-item__trg';
    trgEl.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    trgEl.setAttribute('aria-controls', panelId);
    if (isItemDisabled) {
      trgEl.setAttribute('aria-disabled', 'true');
      trgEl.disabled = true;
    }
    if (isItemLoading) trgEl.setAttribute('aria-busy', 'true');

    // -- Chevron ------------------------------------------------------------
    // The chevron always renders the `angle-right` glyph. Expanded items
    // rotate it 90deg via CSS (see _arvo-acc-item.scss).
    const chevEl = document.createElement('span');
    chevEl.className = 'arvo-acc-item__chev o9con o9con-angle-right';
    chevEl.setAttribute('aria-hidden', 'true');

    // -- Header inner -------------------------------------------------------
    const hdrEl = document.createElement('span');
    hdrEl.className = 'arvo-acc-item__hdr';

    // Left cluster (icon + title + status)
    const lftEl = document.createElement('span');
    lftEl.className = 'arvo-acc-item__lft';

    if (item.icon) {
      const ico = document.createElement('span');
      ico.className = `arvo-acc-item__ico o9con o9con-${item.icon}`;
      ico.setAttribute('aria-hidden', 'true');
      lftEl.appendChild(ico);
    }

    const titleEl = document.createElement('span');
    titleEl.className = 'arvo-acc-item__title';
    titleEl.textContent = item.title;
    lftEl.appendChild(titleEl);

    let statusInstance: ArvoStatus | null = null;
    if (item.status) {
      const stsWrap = document.createElement('span');
      stsWrap.className = 'arvo-acc-item__sts';
      const stsHost = document.createElement('span');
      stsWrap.appendChild(stsHost);
      statusInstance = ArvoStatus.initialize(stsHost, {
        ...(item.statusProps ?? {}),
        type: item.status.type,
        placement: 'inline',
        size: 'sm',
        tooltip: item.status.label,
      });
      lftEl.appendChild(stsWrap);
    }

    hdrEl.appendChild(lftEl);

    // Description
    if (item.description) {
      const desc = document.createElement('span');
      desc.className = 'arvo-acc-item__desc';
      desc.textContent = item.description;
      hdrEl.appendChild(desc);
    }

    // Badge
    let badgeInstance: ArvoBadge | null = null;
    if (item.badge) {
      const bdgWrap = document.createElement('span');
      bdgWrap.className = 'arvo-acc-item__bdg';
      const bdgHost = document.createElement('span');
      bdgWrap.appendChild(bdgHost);
      // Accordion-header badges are always icon-less label pills. We
      // explicitly pin `hasBadgeIcon: false` so the inner ArvoBadge
      // default (true) cannot leak through. Matches React behavior.
      badgeInstance = ArvoBadge.initialize(bdgHost, {
        ...(item.badgeProps ?? {}),
        size: 'sm',
        variant: 'label',
        semanticType: item.badge.semanticType ?? 'negative',
        appearance: item.badgeProps?.appearance ?? 'primary',
        message: item.badge.message,
        hasBadgeIcon: false,
      });
      hdrEl.appendChild(bdgWrap);
    }

    // Inline actions cluster
    const inlineButtons: ArvoIconButton[] = [];
    if (item.actions && item.actions.length > 0) {
      const actionsEl = document.createElement('span');
      actionsEl.className = 'arvo-acc-item__actions';
      actionsEl.addEventListener('click', (e) => e.stopPropagation());
      for (const action of item.actions) {
        const wrap = document.createElement('span');
        wrap.className = 'arvo-acc-item__act';
        const btnEl = document.createElement('button');
        btnEl.type = 'button';
        btnEl.tabIndex = -1;
        wrap.appendChild(btnEl);
        const inst = ArvoIconButton.initialize(btnEl, {
          icon: action.icon,
          variant: 'tertiary',
          size: 'sm',
          tooltip: action.tooltip,
          isDisabled: isItemDisabled || !!action.isDisabled,
          isLoading: isItemLoading,
          onClick: (e: Event) => {
            e.stopPropagation();
            if (isItemDisabled || isItemLoading || action.isDisabled) return;
            action.onClick?.(e);
          },
        });
        inlineButtons.push(inst);
        actionsEl.appendChild(wrap);
      }
      hdrEl.appendChild(actionsEl);
    }

    // Overflow menu
    let menuButton: ArvoDropdownIconButton | null = null;
    if (item.menuItems && item.menuItems.length > 0) {
      const menuWrap = document.createElement('span');
      menuWrap.className = 'arvo-acc-item__menu';
      menuWrap.addEventListener('click', (e) => e.stopPropagation());
      const ddBtnEl = document.createElement('button');
      ddBtnEl.type = 'button';
      ddBtnEl.tabIndex = -1;
      menuWrap.appendChild(ddBtnEl);
      menuButton = ArvoDropdownIconButton.initialize(ddBtnEl, {
        ...(item.menuProps ?? {}),
        icon: 'ellipsis-v',
        variant: 'tertiary',
        size: 'sm',
        isCompact: true,
        tooltip: 'More actions',
        items: item.menuItems,
        isDisabled: isItemDisabled || isItemLoading,
        isLoading: isItemLoading,
        closeOnSelect: true,
      });
      hdrEl.appendChild(menuWrap);
    }

    // Switch
    let switchInstance: ArvoSwitch | null = null;
    if (item.switch) {
      const swWrap = document.createElement('span');
      swWrap.className = 'arvo-acc-item__switch';
      swWrap.addEventListener('click', (e) => e.stopPropagation());
      swWrap.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
      });
      const swHost = document.createElement('div');
      swWrap.appendChild(swHost);
      switchInstance = ArvoSwitch.initialize(swHost, {
        ...(item.switchProps ?? {}),
        size: this._options.size,
        isChecked: item.switch.defaultChecked ?? item.switch.isChecked ?? false,
        isDisabled: isItemDisabled || item.switch.isDisabled,
        // Accordion header switches never render a visible label. The
        // visible meaning is the accordion title; the switch carries an
        // aria-label set directly on the inner input below for SR users.
        label: null,
        onChange: (detail: { isChecked: boolean; value: string }) => {
          item.switch?.onChange?.(detail.isChecked);
        },
      });
      // Apply the accessible label to the inner native input -- the
      // switch's `label` slot is suppressed (no visible label) so we
      // need an explicit `aria-label` on the input for SR users.
      if (item.switch.ariaLabel) {
        const inputEl = swHost.querySelector('input');
        inputEl?.setAttribute('aria-label', item.switch.ariaLabel);
      }
      hdrEl.appendChild(swWrap);
    }

    // Search affordance
    let searchInstance: ArvoSearch | null = null;
    let searchExpanded =
      item.search?.isExpanded ?? item.search?.defaultExpanded ?? false;
    if (item.search) {
      const srchWrap = document.createElement('span');
      srchWrap.className = 'arvo-acc-item__search';
      srchWrap.addEventListener('click', (e) => e.stopPropagation());
      srchWrap.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
      });
      const srchHost = document.createElement('div');
      srchWrap.appendChild(srchHost);
      searchInstance = ArvoSearch.initialize(srchHost, {
        ...(item.searchProps ?? {}),
        variant: 'expandable-filter',
        placeholder: item.search.placeholder ?? 'Search',
        value: item.search.value,
        defaultValue: item.search.defaultValue,
        shortcut: item.search.shortcut ?? null,
        expandDirection: item.search.expandDirection ?? 'start',
        isExpanded: searchExpanded,
        isDisabled: isItemDisabled || item.searchProps?.isDisabled,
        onChange: (next: string) => {
          item.search?.onChange?.(next);
        },
        onExpandedChange: (expanded: boolean) => {
          searchExpanded = expanded;
          if (expanded) rootEl.classList.add('is-searching');
          else rootEl.classList.remove('is-searching');
          item.search?.onExpandedChange?.(expanded);
        },
      });
      if (searchExpanded) rootEl.classList.add('is-searching');
      hdrEl.appendChild(srchWrap);
    }

    // Trigger composition: align controls chevron position.
    if (this._options.align === 'start') {
      trgEl.appendChild(chevEl);
      trgEl.appendChild(hdrEl);
    } else {
      trgEl.appendChild(hdrEl);
      trgEl.appendChild(chevEl);
    }

    // Skeleton (item-level loading)
    if (isItemLoading) {
      const skel = document.createElement('span');
      skel.className = 'arvo-acc-item__skel';
      skel.setAttribute('aria-hidden', 'true');
      const bar = document.createElement('span');
      bar.className = 'arvo-acc-item__skel-bar';
      const trail = document.createElement('span');
      trail.className = 'arvo-acc-item__skel-trail';
      skel.appendChild(bar);
      skel.appendChild(trail);
      trgEl.appendChild(skel);
    }

    trgEl.addEventListener('click', (e) => this._handleItemClick(item, e));
    rootEl.appendChild(trgEl);

    // -- Panel --------------------------------------------------------------
    // Panel uses the grid-template-rows 0fr <-> 1fr trick for height
    // animation (see _arvo-acc-item.scss). Content lives in __panel-inner
    // so the outer row track can clip while it grows / shrinks. The panel
    // is always mounted -- collapsed state is signalled via `aria-hidden`
    // and `inert` so focusable descendants stay out of the tab order
    // without killing the in-flight transition (which `[hidden]` would).
    const panelEl = document.createElement('div');
    panelEl.id = panelId;
    panelEl.className = 'arvo-acc-item__panel';
    panelEl.setAttribute('role', 'region');
    panelEl.setAttribute('aria-labelledby', triggerId);
    if (!isExpanded) {
      panelEl.setAttribute('aria-hidden', 'true');
      panelEl.setAttribute('inert', '');
    }

    const panelInner = document.createElement('div');
    panelInner.className = 'arvo-acc-item__panel-inner';
    // Padding lives on `__panel-pad` (a child of `__panel-inner`) so the
    // outer grid track can collapse to 0fr cleanly. Padding on the inner
    // would survive the collapse because padding is part of the box's
    // height regardless of `min-height: 0`. See _arvo-acc-item.scss.
    const panelPad = document.createElement('div');
    panelPad.className = 'arvo-acc-item__panel-pad';
    panelInner.appendChild(panelPad);

    let emptyInstance: ArvoEmptyState | null = null;
    if (isItemEmpty && !isItemLoading) {
      const emptyWrap = document.createElement('div');
      emptyWrap.className = 'arvo-acc-item__empty';
      const emptyHost = document.createElement('div');
      emptyWrap.appendChild(emptyHost);
      const resolved = resolveEmptyState(item.emptyState ?? null);
      emptyInstance = ArvoEmptyState.initialize(emptyHost, {
        size: 'sm',
        orientation: 'horizontal',
        title: resolved.title,
        message: resolved.message,
        illustration: resolved.illustration,
      });
      panelPad.appendChild(emptyWrap);
    } else if (!isItemLoading && item.content !== undefined) {
      if (typeof item.content === 'string') {
        panelPad.innerHTML = item.content;
      } else {
        panelPad.appendChild(item.content);
      }
    }

    panelEl.appendChild(panelInner);
    rootEl.appendChild(panelEl);

    // -- Truncation tooltip --------------------------------------------------
    let truncationHandle: TitleTruncationHandle | null = null;
    if (!isItemLoading) {
      truncationHandle = attachTitleTruncationTooltip({
        element: titleEl,
        content: item.title,
        placement: 'bottom-center',
      });
    }

    return {
      data: item,
      rootEl,
      trgEl,
      panelEl,
      titleEl,
      chevEl,
      truncationHandle,
      statusInstance,
      badgeInstance,
      inlineButtons,
      menuButton,
      switchInstance,
      searchInstance,
      emptyInstance,
      searchExpanded,
    };
  }

  private _uniqueId(): string {
    return Math.random().toString(36).slice(2, 11);
  }

  // =========================================================================
  // Events
  // =========================================================================

  private _bindEvents(): void {
    this._element?.addEventListener('keydown', this._boundHandleKeyDown);
  }

  private _unbindEvents(): void {
    this._element?.removeEventListener('keydown', this._boundHandleKeyDown);
  }

  private _handleItemClick(item: ArvoAccordionItemData, e: MouseEvent): void {
    if (this._options.isDisabled || this._options.isLoading) {
      e.preventDefault();
      return;
    }
    const itemDisabled = !!item.isDisabled;
    const itemLoading = (!!item.isLoading) === true;
    if (itemDisabled || itemLoading) {
      e.preventDefault();
      return;
    }
    this._toggleInternal(item.value);
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    const el = this._element;
    if (!el) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (!target.matches('button.arvo-acc-item__trg')) return;

    const triggers = Array.from(
      el.querySelectorAll<HTMLButtonElement>(
        'button.arvo-acc-item__trg:not([aria-disabled="true"]):not([disabled])',
      ),
    );
    if (triggers.length === 0) return;
    const currentIdx = triggers.indexOf(target as HTMLButtonElement);
    let nextIdx: number | null = null;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % triggers.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIdx =
          currentIdx < 0
            ? triggers.length - 1
            : (currentIdx - 1 + triggers.length) % triggers.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = triggers.length - 1;
        break;
      default:
        return;
    }
    if (nextIdx !== null) triggers[nextIdx]?.focus();
  }

  private _dispatchEvent(
    name: string,
    detail: Record<string, unknown>,
    cancelable = false,
  ): boolean {
    if (!this._element) return true;
    const evt = new CustomEvent(name, { detail, bubbles: true, cancelable });
    return this._element.dispatchEvent(evt);
  }

  // =========================================================================
  // Internal expansion logic
  // =========================================================================

  private _toggleInternal(itemValue: string): void {
    const isExpanded = this._options.expandedValues.has(itemValue);
    if (isExpanded) this._collapseInternal(itemValue);
    else this._expandInternal(itemValue);
  }

  private _expandInternal(itemValue: string): void {
    const existing = this._options.expandedValues;
    if (existing.has(itemValue)) return;

    const next = new Set(existing);
    if (this._options.expandMode === 'single') next.clear();
    next.add(itemValue);

    // Dispatch cancellable acc:expand. Honor cancellation.
    const ok = this._dispatchEvent(
      'acc:expand',
      { itemValue, value: fromSet(next, this._options.expandMode) },
      true,
    );
    if (!ok) return;

    this._options.expandedValues = next;
    this._applyExpansionState();
    const nextValue = fromSet(next, this._options.expandMode);
    this._dispatchEvent(
      'acc:change',
      { value: nextValue, itemValue, isExpanded: true },
      false,
    );
    this._options.onValueChange?.(nextValue, { itemValue, isExpanded: true });
    this._options.onExpand?.({ itemValue });
  }

  private _collapseInternal(itemValue: string): void {
    const existing = this._options.expandedValues;
    if (!existing.has(itemValue)) return;
    if (!this._options.isCollapsible && existing.size === 1) return;

    const next = new Set(existing);
    next.delete(itemValue);

    const ok = this._dispatchEvent(
      'acc:collapse',
      { itemValue, value: fromSet(next, this._options.expandMode) },
      true,
    );
    if (!ok) return;

    this._options.expandedValues = next;
    this._applyExpansionState();
    const nextValue = fromSet(next, this._options.expandMode);
    this._dispatchEvent(
      'acc:change',
      { value: nextValue, itemValue, isExpanded: false },
      false,
    );
    this._options.onValueChange?.(nextValue, { itemValue, isExpanded: false });
    this._options.onCollapse?.({ itemValue });
  }

  private _applyExpansionState(): void {
    for (const entry of this._entries) {
      const isExpanded = this._options.expandedValues.has(entry.data.value);
      entry.rootEl.classList.toggle('expanded', isExpanded);
      entry.trgEl.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      // The panel is always mounted so the grid-template-rows height
      // animation can run in both directions. Collapsed state is signalled
      // via `aria-hidden` + `inert` (not `[hidden]`, which would set
      // display:none and kill the transition).
      if (isExpanded) {
        entry.panelEl.removeAttribute('aria-hidden');
        entry.panelEl.removeAttribute('inert');
      } else {
        entry.panelEl.setAttribute('aria-hidden', 'true');
        entry.panelEl.setAttribute('inert', '');
      }
      // Chevron glyph stays angle-right; the .expanded class rotates it
      // 90deg via CSS (see _arvo-acc-item.scss).
    }
  }

  // =========================================================================
  // Public API
  // =========================================================================

  value(): string | string[] | null;
  value(next: string | string[] | null): void;
  value(next?: string | string[] | null): string | string[] | null | void {
    if (arguments.length === 0) {
      return fromSet(
        this._options.expandedValues,
        this._options.expandMode,
      ) as string | string[];
    }
    this._options.expandedValues = toSet(next ?? null, this._options.expandMode);
    this._applyExpansionState();
  }

  expand(itemValue: string): void {
    this._expandInternal(itemValue);
  }

  collapse(itemValue: string): void {
    this._collapseInternal(itemValue);
  }

  toggle(itemValue: string): void {
    this._toggleInternal(itemValue);
  }

  setItems(items: ArvoAccordionItemData[]): void {
    const next = items.map((i) => ({ ...i }));
    this._options.items = next;
    // Drop expanded values whose item no longer exists.
    const valid = new Set(next.map((i) => i.value));
    const trimmed = new Set<string>();
    for (const v of this._options.expandedValues) if (valid.has(v)) trimmed.add(v);
    this._options.expandedValues = trimmed;
    this._render();
  }

  addItem(item: ArvoAccordionItemData, index?: number): void {
    const next = [...this._options.items];
    if (typeof index === 'number') next.splice(index, 0, { ...item });
    else next.push({ ...item });
    this._options.items = next;
    this._render();
  }

  removeItem(itemValue: string): void {
    const next = this._options.items.filter((i) => i.value !== itemValue);
    this._options.expandedValues.delete(itemValue);
    this._options.items = next;
    this._render();
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (arguments.length === 0) return this._options.isDisabled;
    this._options.isDisabled = !!state;
    this._render();
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading === true;
    this._render();
  }

  destroy(): void {
    this._unbindEvents();
    this._destroyInstances();
    if (this._element) {
      this._element.textContent = '';
      this._element.classList.remove(
        'arvo-acc',
        'arvo-acc--surface',
        'arvo-acc--transparent',
        'arvo-acc--sm',
        'arvo-acc--lg',
        'arvo-acc--align-start',
        'arvo-acc--align-end',
        'is-disabled',
        'loading',
      );
      this._element.removeAttribute('aria-busy');
      this._element.removeAttribute('aria-label');
      this._element.removeAttribute('aria-labelledby');
    }
    this._element = null;
    this._listEl = null;
    this._skelEl = null;
    this._entries = [];
  }

  private _destroyInstances(): void {
    for (const entry of this._entries) {
      entry.truncationHandle?.destroy();
      entry.statusInstance?.destroy?.();
      entry.badgeInstance?.destroy?.();
      for (const btn of entry.inlineButtons) btn.destroy?.();
      entry.menuButton?.destroy?.();
      entry.switchInstance?.destroy?.();
      entry.searchInstance?.destroy?.();
      entry.emptyInstance?.destroy?.();
    }
  }
}
