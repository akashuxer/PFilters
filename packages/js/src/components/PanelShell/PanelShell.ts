// Internal -- not exported from @arvo/js public API.
//
// JS-side panel-shell factory. Composes Arvo* primitives (IconButton,
// DropdownIconButton, SplitIconButton, Switch, Checkbox, Tabstrip, Search,
// Button, MessageAlert) into the shared inner anatomy used by ArvoSidePanel
// and ArvoDrawer.
//
// The framework-agnostic types and pure helpers live in `@arvo/utils` so the
// React shell (`PanelShell.tsx`) and the JS shell (this file) share a single
// surface. The factory itself lives here because `@arvo/utils` cannot import
// from `@arvo/js` without creating a circular dependency.
//
// The `__info` slot is rendered as an ArvoMessageAlert primitive (full mode).
// ArvoMessageAlert auto-resolves the live-region role per type
// (error/warning/block -> alert; info/success/neutral -> status), so the
// panel-shell does not need to override role manually.

import {
  createTabRoving,
  type ListItemBase,
  type TabRoving,
} from '@arvo/core';
import {
  runItemFilter,
  formatMatchCountMessage,
  validateHeaderAction,
  clampFooterActions,
  attachOverlayFooterFit,
  type ArvoPanelHeaderAction,
  type ArvoPanelHeaderActionType,
  type ArvoPanelStickyHeaderConfig,
  type ArvoPanelInfoConfig,
  type ArvoPanelSearchConfig,
  type ArvoPanelAction,
  type ArvoPanelDefaultItem,
  type PanelContent,
  type PanelShellOptions,
  type PanelShellInstance,
  type OverlayFooterFitHandle,
} from '@arvo/utils';

import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoDropdownIconButton } from '../DropdownIconButton/DropdownIconButton';
import { ArvoSplitIconButton } from '../SplitIconButton/SplitIconButton';
import { ArvoSwitch } from '../Switch/Switch';
import { ArvoCheckbox } from '../Checkbox/Checkbox';
import { ArvoTabstrip } from '../Tabstrip/Tabstrip';
import { ArvoSearch } from '../Search/Search';
import {
  ArvoAdvanceSearch,
  type ArvoAdvanceSearchOptions,
} from '../AdvanceSearch/AdvanceSearch';
import { ArvoButton } from '../Button/Button';
import { ArvoBannerAlert } from '../BannerAlert/BannerAlert';
import { ArvoMessageAlert, type ArvoMessageAlertType } from '../MessageAlert/MessageAlert';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(tag: string, className: string, parent?: HTMLElement): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

// Render arbitrary custom content into a container -- mirrors the
// `ArvoPopover` content contract (element / HTML string / callback / null).
function renderPanelContent(container: HTMLElement, content: PanelContent): void {
  container.textContent = '';
  if (content == null) return;
  if (typeof content === 'string') {
    container.innerHTML = content;
  } else if (typeof content === 'function') {
    content(container);
  } else if (content instanceof Node) {
    container.appendChild(content);
  }
}

function warnActionCap(total: number): void {
  if (process.env.NODE_ENV !== 'production' && total > 4) {
    console.warn(
      `[panel-shell] Total header actions (${total}) exceeds cap of 4. ` +
      `Computed across headerActions + isPinnable + isClosable.`,
    );
  }
}

// Default `__item` template -- emits the shared list-item DOM contract inside
// the `__item` host row. Ordering: optional `<img>` OR `<i>` (avatar wins),
// then `<div class="{block}__item__txt">` containing the label and optional
// secondary line. Mirrors the React `renderDefaultItem` helper exactly.
function renderDefaultItem(
  item: ArvoPanelDefaultItem,
  row: HTMLElement,
  block: string,
): void {
  const secondary = item.secondaryLabel ?? item.description;
  const hasAvatar = !!item.avatarUrl;
  const hasIcon = !hasAvatar && !!item.icon;

  if (hasAvatar) {
    const img = document.createElement('img');
    img.className = `${block}__item__avatar`;
    img.src = item.avatarUrl as string;
    img.alt = '';
    row.appendChild(img);
  } else if (hasIcon) {
    const ico = document.createElement('i');
    ico.className = `o9con-${item.icon} ${block}__item__ico`;
    ico.setAttribute('aria-hidden', 'true');
    row.appendChild(ico);
  }

  const txt = document.createElement('div');
  txt.className = `${block}__item__txt`;
  row.appendChild(txt);

  const lbl = document.createElement('span');
  lbl.className = `${block}__item__lbl`;
  lbl.textContent = item.label;
  txt.appendChild(lbl);

  if (secondary) {
    const sec = document.createElement('span');
    sec.className = `${block}__item__secondary`;
    sec.textContent = secondary;
    txt.appendChild(sec);
  }
}

interface HeaderActionInstance {
  id: string;
  type: ArvoPanelHeaderActionType;
  wrapper: HTMLElement;
  instance: { destroy(): void } | null;
}

interface FooterActionInstance {
  id: string;
  wrapper: HTMLButtonElement;
  instance: ArvoButton | null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPanelShell<T extends ListItemBase = ListItemBase>(config: {
  parentBlock: string;
  parent: HTMLElement;
  options: PanelShellOptions<T>;
}): PanelShellInstance<T> {
  const { parentBlock: block, parent, options } = config;

  // -- State ----------------------------------------------------------------
  let _items: T[] = options.items ?? [];
  let _query = '';
  let _selectedTabId: string | null = options.selectedTabId ?? null;
  let _isLoading = false;
  let _isDisabled = false;
  let _headerActions: ArvoPanelHeaderAction[] = options.headerActions ?? [];
  let _stickyConfig: ArvoPanelStickyHeaderConfig | false = options.stickyHeader ?? false;
  let _actions: ArvoPanelAction[] | false = options.actions ?? false;
  let _content: PanelContent = options.content ?? null;
  let _pinSlot: HTMLElement | null = options.pinSlot ?? null;
  let _title: string | null = options.title ?? null;
  let _tabRoving: TabRoving | null = null;
  let _destroyed = false;

  const _headerActionInstances: HeaderActionInstance[] = [];
  const _footerActionInstances: FooterActionInstance[] = [];
  let _backInstance: ArvoIconButton | null = null;
  let _closeInstance: ArvoIconButton | null = null;
  // The search slot in the sticky region mounts one of two primitives
  // depending on `stickyHeader.search.variant`:
  //   - `undefined | 'search'`   -> `ArvoSearch`
  //   - `'advance-search'`       -> `ArvoAdvanceSearch`
  // Only one primitive is mounted at a time. Both expose a compatible
  // `value(query)` setter and `focus()` so the shell's shared search()
  // / focus('search') methods work regardless of which is mounted.
  let _searchInstance: ArvoSearch | ArvoAdvanceSearch | null = null;
  let _tabstripInstance: ArvoTabstrip | null = null;
  let _clearSearchInstance: ArvoButton | null = null;
  let _bannerInstance: ArvoBannerAlert | null = null;
  let _infoInstance: ArvoMessageAlert | null = null;

  const getItemId = options.getItemId ?? ((item: T) => (item as ListItemBase).id);

  // -- Header ---------------------------------------------------------------
  const hdrEl = options.hasHeader !== false ? el('div', `${block}__hdr`, parent) : null;
  let hdrLftEl: HTMLElement | null = null;
  let backEl: HTMLButtonElement | null = null;
  let titleLeadingHostEl: HTMLElement | null = null;
  let titleTrailingHostEl: HTMLElement | null = null;
  let _titleLeading: HTMLElement | null = options.titleLeading ?? null;
  let _titleTrailing: HTMLElement | null = options.titleTrailing ?? null;
  let titleEl: HTMLElement | null = null;
  let hdrActionsEl: HTMLElement | null = null;
  let closeEl: HTMLButtonElement | null = null;

  if (hdrEl) {
    hdrLftEl = el('div', `${block}__hdr-lft`, hdrEl);

    if (options.hasBackButton) {
      backEl = document.createElement('button');
      backEl.className = `${block}__back`;
      hdrLftEl.appendChild(backEl);
      _backInstance = new ArvoIconButton(backEl, {
        size: 'sm',
        variant: 'tertiary',
        icon: 'arrow-left',
        tooltip: 'Back',
        onClick: () => {
          if (_isDisabled) return;
          options.onBack?.();
          parent.dispatchEvent(new CustomEvent('back', { bubbles: true }));
        },
      });
    }

    // Leading title slot -- rendered between back button and title.
    // Wrapper is always mounted so setTitleLeading() can swap the inner
    // element without needing to know DOM ordering. Empty wrapper is
    // invisible (no padding / margin) and adds no layout impact.
    titleLeadingHostEl = el('span', `${block}__title-leading`, hdrLftEl);
    if (_titleLeading) titleLeadingHostEl.appendChild(_titleLeading);

    titleEl = el('span', `${block}__title`, hdrLftEl);
    const titleId = `${block}-title-${Math.random().toString(36).slice(2, 9)}`;
    titleEl.id = titleId;
    if (_title) {
      titleEl.textContent = _title;
      parent.setAttribute('aria-labelledby', titleId);
    }

    // Trailing title slot -- rendered after title (for status / badge).
    titleTrailingHostEl = el('span', `${block}__title-trailing`, hdrLftEl);
    if (_titleTrailing) titleTrailingHostEl.appendChild(_titleTrailing);

    hdrActionsEl = el('div', `${block}__hdr-actions`, hdrEl);
    renderHeaderActions();

    if (options.isClosable) {
      closeEl = document.createElement('button');
      closeEl.className = `${block}__close`;
      hdrActionsEl.appendChild(closeEl);
      _closeInstance = new ArvoIconButton(closeEl, {
        size: 'sm',
        variant: 'tertiary',
        icon: 'close',
        tooltip: 'Close',
        onClick: () => {
          if (_isDisabled) return;
          options.onClose?.();
          parent.dispatchEvent(new CustomEvent('close', { bubbles: true }));
        },
      });
    }
  }

  const pinnableCount = options.isPinnableCount ?? 0;
  const closableCount = options.isClosableCount ?? (options.isClosable ? 1 : 0);
  warnActionCap(_headerActions.filter((a) => validateHeaderAction(a)).length + pinnableCount + closableCount);

  // -- Sticky region --------------------------------------------------------
  let stickyEl: HTMLElement | null = null;
  let bannerEl: HTMLElement | null = null;
  let tabsEl: HTMLDivElement | null = null;
  let stickySlotEl: HTMLElement | null = null;
  let searchEl: HTMLElement | null = null;
  let infoEl: HTMLElement | null = null;
  // Inner ArvoMessageAlert element rendered inside `__info`. Tracked separately
  // so updateInfoText() can call instance.type()/.message() (which keeps the
  // icon span intact) instead of clobbering textContent on the wrapper. Reset
  // to null whenever the sticky region (and therefore infoEl) is rebuilt or
  // torn down. ArvoMessageAlert auto-resolves the live-region role per type
  // (error/warning/block -> alert, info/success/neutral -> status), so the
  // panel-shell does not need to override role manually.
  let infoInnerEl: HTMLElement | null = null;

  if (_stickyConfig) {
    stickyEl = el('div', `${block}__sticky`, parent);
    buildStickyContent();
  }

  // -- Body -----------------------------------------------------------------
  const bodyEl = el('div', `${block}__body`, parent);

  let listEl: HTMLElement | null = null;
  let emptyEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;

  function ensureItemsInfrastructure(): void {
    if (listEl) return;
    listEl = el('div', `${block}__list`, bodyEl);
    listEl.setAttribute('role', options.itemsRole ?? 'list');
    listEl.setAttribute('tabindex', '-1');

    emptyEl = el('div', `${block}__empty`, bodyEl);
    emptyEl.style.display = 'none';
    buildEmptyContent();
  }

  // Custom-content slot. Generic body content (element / HTML / callback)
  // poured into `{block}__content`. Mutually exclusive with the internal
  // items pipeline -- SidePanel / Drawer use this path exclusively.
  function ensureContentInfrastructure(): void {
    if (contentEl) return;
    contentEl = el('div', `${block}__content`, bodyEl);
  }

  function renderContentSlot(): void {
    ensureContentInfrastructure();
    renderPanelContent(contentEl as HTMLElement, _content);
  }

  if (options.items !== undefined) {
    ensureItemsInfrastructure();
    renderItems();
    setupTabRoving();
  } else if (_content != null) {
    renderContentSlot();
  }

  // Skeleton: always built; gated via `.loading` host class.
  const skeletonEl = el('div', `${block}__skeleton`, bodyEl);
  skeletonEl.style.display = 'none';
  const _SKEL_WIDTHS = ['wide', 'medium', 'narrow', 'wide', 'medium'] as const;
  for (const w of _SKEL_WIDTHS) {
    el('div', `${block}__skeleton__row ${block}__skeleton__row--${w}`, skeletonEl);
  }

  // -- Footer ---------------------------------------------------------------
  let footerEl: HTMLElement | null = null;
  let footerActionsEl: HTMLElement | null = null;
  // Overlay-family shared rule: grow the equal-column flex basis
  // (--arvo-overlay-footer-btn-min) when labels would otherwise truncate
  // at the 112px floor. Paired with the `overlay-footer-actions-layout`
  // SCSS mixin (8px gap from `panel-shell-footer`). Recreated whenever
  // `footerActionsEl` is rebuilt; destroyed when the footer is torn down
  // or the shell is destroyed.
  let _footerFit: OverlayFooterFitHandle | null = null;

  function destroyFooterFit(): void {
    _footerFit?.destroy();
    _footerFit = null;
  }
  function attachFooterFit(): void {
    destroyFooterFit();
    if (!footerActionsEl) return;
    _footerFit = attachOverlayFooterFit(footerActionsEl, { gap: 8 });
  }

  if (_actions && _actions.length > 0) {
    footerEl = el('div', `${block}__footer`, parent);
    footerActionsEl = el('div', `${block}__footer-actions`, footerEl);
    renderFooterActions();
    attachFooterFit();
  }

  // -----------------------------------------------------------------------
  // Header-action rendering
  // -----------------------------------------------------------------------

  function destroyHeaderActions(): void {
    for (const entry of _headerActionInstances) {
      try { entry.instance?.destroy(); } catch { /* ignore */ }
      entry.wrapper.remove();
    }
    _headerActionInstances.length = 0;
  }

  function renderHeaderActions(): void {
    if (!hdrActionsEl) return;
    destroyHeaderActions();

    for (const action of _headerActions) {
      if (!validateHeaderAction(action)) continue;

      const wrapper = document.createElement('div');
      wrapper.className = `${block}__action`;
      wrapper.setAttribute('data-action-id', action.id);
      wrapper.setAttribute('data-action-type', action.type);

      // Insert before pin slot / close so source order maps to visual order,
      // with pin and close pinned at the trailing edge.
      if (closeEl) {
        hdrActionsEl.insertBefore(wrapper, _pinSlot ?? closeEl);
      } else if (_pinSlot) {
        hdrActionsEl.insertBefore(wrapper, _pinSlot);
      } else {
        hdrActionsEl.appendChild(wrapper);
      }

      const instance = renderHeaderActionInstance(action, wrapper);
      _headerActionInstances.push({ id: action.id, type: action.type, wrapper, instance });
    }

    insertPinSlot();
  }

  function renderHeaderActionInstance(
    action: ArvoPanelHeaderAction,
    wrapper: HTMLElement,
  ): { destroy(): void } | null {
    switch (action.type) {
      case 'btn': {
        const btn = document.createElement('button');
        wrapper.appendChild(btn);
        const tt = action.tooltip ?? action.label ?? action.id;
        return new ArvoIconButton(btn, {
          size: 'sm',
          variant: 'tertiary',
          icon: action.icon,
          tooltip: tt,
          isDisabled: action.isDisabled,
          isLoading: action.isLoading,
          isSelected: action.isSelected,
          onClick: (e) => {
            if (_isDisabled || action.isDisabled) return;
            action.onClick?.(e);
          },
        });
      }
      case 'dropdown': {
        const btn = document.createElement('button');
        wrapper.appendChild(btn);
        const tt = action.tooltip ?? action.label ?? action.id;
        return new ArvoDropdownIconButton(btn, {
          size: 'sm',
          variant: 'tertiary',
          icon: action.icon,
          tooltip: tt,
          // ArvoDropdownIconButtonOptions['items'] is structurally compatible
          // with the framework-agnostic ArvoPanelMenuItem[] shape.
          items: action.items as never,
          placement: action.placement ?? 'bottom-end',
          isDisabled: action.isDisabled,
          isLoading: action.isLoading,
          onSelect: (item: { id: string }) => {
            if (_isDisabled || action.isDisabled) return;
            action.onSelect?.(item.id);
          },
        });
      }
      case 'split': {
        const btn = document.createElement('button');
        wrapper.appendChild(btn);
        const tt = action.tooltip ?? action.label ?? action.id;
        return new ArvoSplitIconButton(btn, {
          size: 'sm',
          variant: 'tertiary',
          icon: action.icon,
          tooltip: tt,
          triggerLabel: action.triggerLabel,
          items: action.items as never,
          placement: action.placement ?? 'bottom-end',
          isDisabled: action.isDisabled,
          isActionDisabled: action.isActionDisabled,
          isTriggerDisabled: action.isTriggerDisabled,
          isLoading: action.isLoading,
          onAction: (e) => {
            if (_isDisabled || action.isDisabled) return;
            action.onClick?.(e);
          },
          onSelect: (item: { id: string }) => {
            if (_isDisabled || action.isDisabled) return;
            action.onSelect?.(item.id);
          },
        });
      }
      case 'switch': {
        const sw = document.createElement('div');
        wrapper.appendChild(sw);
        if (action.label) wrapper.setAttribute('aria-label', action.label);
        return new ArvoSwitch(sw, {
          isChecked: action.isChecked ?? action.defaultChecked ?? false,
          isDisabled: action.isDisabled,
          isReadOnly: action.isReadOnly,
          isLoading: action.isLoading,
          onChange: (detail: { isChecked: boolean }) => {
            if (_isDisabled || action.isDisabled) return;
            action.onChange?.(detail.isChecked);
          },
        });
      }
      case 'checkbox': {
        const cb = document.createElement('div');
        wrapper.appendChild(cb);
        if (action.label) wrapper.setAttribute('aria-label', action.label);
        return new ArvoCheckbox(cb, {
          size: 'sm',
          isChecked: action.isChecked ?? action.defaultChecked ?? false,
          isIndeterminate: action.isIndeterminate,
          isDisabled: action.isDisabled,
          isReadOnly: action.isReadOnly,
          isLoading: action.isLoading,
          onChange: (detail: { isChecked: boolean }) => {
            if (_isDisabled || action.isDisabled) return;
            action.onChange?.(detail.isChecked);
          },
        });
      }
    }
    return null;
  }

  function insertPinSlot(): void {
    if (!_pinSlot || !hdrActionsEl) return;
    if (closeEl) {
      hdrActionsEl.insertBefore(_pinSlot, closeEl);
    } else {
      hdrActionsEl.appendChild(_pinSlot);
    }
  }

  // -----------------------------------------------------------------------
  // Sticky region (banner + tabs + slot + search + info)
  // -----------------------------------------------------------------------

  function buildStickyContent(): void {
    if (!stickyEl || !_stickyConfig) return;

    // Tear down nested instances before re-rendering.
    try { _tabstripInstance?.destroy(); } catch { /* ignore */ }
    try { _searchInstance?.destroy(); } catch { /* ignore */ }
    try { _bannerInstance?.destroy(); } catch { /* ignore */ }
    try { _infoInstance?.destroy(); } catch { /* ignore */ }
    _tabstripInstance = null;
    _searchInstance = null;
    _bannerInstance = null;
    _infoInstance = null;

    stickyEl.innerHTML = '';
    bannerEl = null;
    tabsEl = null;
    stickySlotEl = null;
    searchEl = null;
    infoEl = null;
    infoInnerEl = null;

    parent.classList.remove(
      `${block}--with-banner`,
      `${block}--with-tabs`,
      `${block}--with-search`,
      `${block}--with-info`,
    );

    if (_stickyConfig.banner) {
      const bannerCfg = _stickyConfig.banner;
      bannerEl = el('div', `${block}__banner`, stickyEl);
      // Host the BannerAlert in a child element so the slot wrapper stays
      // free of arvo-bnr-alert classes -- mirrors the React render shape.
      const bannerHostEl = document.createElement('div');
      bannerEl.appendChild(bannerHostEl);
      _bannerInstance = ArvoBannerAlert.initialize(bannerHostEl, {
        type: bannerCfg.type,
        title: bannerCfg.title ?? null,
        message: bannerCfg.message,
        isCompact: bannerCfg.isCompact,
        isDismissible: bannerCfg.isDismissible ?? false,
        button: bannerCfg.button ?? null,
        link: bannerCfg.link ?? null,
        onDismiss: bannerCfg.onDismiss,
      });

      parent.classList.add(`${block}--with-banner`);
    }

    if (_stickyConfig.tabs && _stickyConfig.tabs.length > 0) {
      tabsEl = document.createElement('div');
      tabsEl.className = `${block}__tabs`;
      stickyEl.appendChild(tabsEl);

      const tabsCfg = _stickyConfig.tabs;
      const initialId = _selectedTabId ?? tabsCfg.find((t) => !t.isDisabled)?.id ?? null;
      _selectedTabId = initialId;

      _tabstripInstance = new ArvoTabstrip(tabsEl, {
        variant: 'primary',
        size: 'sm',
        isFullWidth: true,
        tabs: tabsCfg,
        selectedId: initialId,
        onSelect: (detail: { id: string; index: number }) => {
          _selectedTabId = detail.id;
          parent.dispatchEvent(
            new CustomEvent('tab-select', { bubbles: true, detail: { id: detail.id } }),
          );
          options.onTabSelect?.(detail.id);
        },
      });

      parent.classList.add(`${block}--with-tabs`);
    }

    if (_stickyConfig.slot) {
      stickySlotEl = el('div', `${block}__sticky-slot`, stickyEl);
      stickySlotEl.appendChild(_stickyConfig.slot);
    }

    if (_stickyConfig.search) {
      // `stickyHeader.search` is a discriminated union on `variant`:
      //   - `true`                                -> mount ArvoSearch (defaults)
      //   - `{ variant?: 'search' }`              -> mount ArvoSearch
      //   - `{ variant: 'advance-search' }`       -> mount ArvoAdvanceSearch
      // Both primitives expose `value(query)` for the shell's imperative
      // `search()` bridge and mount into the same `__search` container so
      // the ArrowDown -> first-item keyboard chain works uniformly.
      const searchCfg: ArvoPanelSearchConfig =
        typeof _stickyConfig.search === 'object' ? _stickyConfig.search : {};
      const searchContainerEl = document.createElement('div');
      searchContainerEl.className = `${block}__search`;
      stickyEl.appendChild(searchContainerEl);
      searchEl = searchContainerEl;

      const searchHostEl = document.createElement('div');
      searchContainerEl.appendChild(searchHostEl);

      const handleSearchChange = (value: string): void => {
        _query = value;
        renderItems();
        updateInfoText();
        const matched = _items.length > 0 ? getFilteredItems().length : null;
        parent.dispatchEvent(
          new CustomEvent('search', {
            bubbles: true,
            detail: { value, matchedCount: matched },
          }),
        );
        options.onSearchChange?.(value, matched);
      };
      const handleSearchClear = (): void => {
        _query = '';
        renderItems();
        updateInfoText();
        parent.dispatchEvent(
          new CustomEvent('search', {
            bubbles: true,
            detail: { value: '', matchedCount: _items.length || null },
          }),
        );
        options.onSearchChange?.('', _items.length || null);
      };

      if (searchCfg.variant === 'advance-search') {
        const bag =
          (searchCfg.advanceSearchProps as Partial<ArvoAdvanceSearchOptions> | undefined) ??
          undefined;
        _searchInstance = new ArvoAdvanceSearch(searchHostEl, {
          ...(bag ?? {}),
          variant: bag?.variant ?? 'filterBy',
          value: _query,
          placeholder: searchCfg.placeholder ?? 'Search',
          shortcut: searchCfg.shortcut ?? null,
          isFullWidth: true,
          onChange: handleSearchChange,
          onClear: handleSearchClear,
        });
      } else {
        _searchInstance = new ArvoSearch(searchHostEl, {
          variant: 'filter',
          value: _query,
          placeholder: searchCfg.placeholder ?? 'Search',
          shortcut: searchCfg.shortcut ?? null,
          isFullWidth: true,
          counter: searchCfg.showCounter ? computeCounter() : null,
          onChange: handleSearchChange,
          onClear: handleSearchClear,
        });
      }

      // ArrowDown from search jumps to the first list item, mirroring the
      // HybridPopover/ArrowUp-from-item-back-to-search pairing.
      searchHostEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key !== 'ArrowDown' || !listEl) return;
        const firstItem = listEl.querySelector<HTMLElement>(`.${block}__item`);
        if (firstItem) {
          e.preventDefault();
          firstItem.focus();
          _tabRoving?.setActiveItem(0);
        }
      });

      parent.classList.add(`${block}--with-search`);
    }

    if (_stickyConfig.info) {
      infoEl = el('div', `${block}__info`, stickyEl);
      // Render the public ArvoMessageAlert primitive inside the {block}__info
      // wrapper. The wrapper stays parent-block-scoped; the inner BEM
      // (.arvo-msg-alert .arvo-msg-alert--{type} .arvo-msg-alert__body
      // .arvo-msg-alert__ico .arvo-msg-alert__msg) is the shared msg-alert
      // pattern, identical to what React's <ArvoMessageAlert> emits. Roles
      // (error/warning/block -> alert, info/success/neutral -> status) are
      // auto-resolved by ArvoMessageAlert -- panel-shell does not override.
      const { type, message } = resolveInfoConfig();
      _infoInstance = ArvoMessageAlert.initialize(document.createElement('div'), {
        type,
        message,
      });
      infoInnerEl = _infoInstance.el;
      infoEl.appendChild(infoInnerEl);
      parent.classList.add(`${block}--with-info`);
      // Apply the initial visibility gate (showWhen / empty-message).
      updateInfoText();
    }
  }

  function computeCounter(): { current: number; total: number } | null {
    if (_items.length === 0) return null;
    return { current: getFilteredItems().length, total: _items.length };
  }

  function getFilteredItems(): T[] {
    if (!_items.length) return [];
    if (!_query) return _items;
    return runItemFilter(_items, _query, {
      keys: options.filterKeys,
      getItemSearchText: options.getItemSearchText,
    });
  }

  // -----------------------------------------------------------------------
  // Body / list / empty
  // -----------------------------------------------------------------------

  function renderItems(): void {
    if (!listEl) return;

    listEl.innerHTML = '';
    const filtered = getFilteredItems();

    if (_items.length === 0) {
      showEmpty('no-data');
      return;
    }

    if (filtered.length === 0 && _query) {
      showEmpty('no-results');
      return;
    }

    hideEmpty();

    for (const item of filtered) {
      // Read the optional default-item fields off the item structurally --
      // each field is optional and absent on plain ListItemBase consumers,
      // so the cast doesn't widen the public option contract.
      const def = item as unknown as ArvoPanelDefaultItem;
      const classes = [`${block}__item`];
      if (def.isActive) classes.push('active');
      if (def.isDisabled) classes.push('is-disabled');
      const row = el('div', classes.join(' '), listEl);
      row.setAttribute('data-item-id', getItemId(item));
      row.setAttribute('tabindex', '-1');
      row.setAttribute('role', 'option');
      if (def.isDisabled) row.setAttribute('aria-disabled', 'true');

      if (options.renderItem) {
        options.renderItem(item, row);
      } else {
        renderDefaultItem(def, row, block);
      }

      row.addEventListener('click', () => {
        if (_isDisabled || def.isDisabled) return;
        parent.dispatchEvent(
          new CustomEvent('item-activate', {
            bubbles: true,
            detail: { id: getItemId(item), item },
          }),
        );
        options.onItemActivate?.(getItemId(item), item);
      });

      row.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !_isDisabled && !def.isDisabled) {
          e.preventDefault();
          row.click();
        }
        if (e.key === 'ArrowUp') {
          const items = listEl!.querySelectorAll<HTMLElement>(`.${block}__item`);
          const idx = Array.from(items).indexOf(row);
          if (idx === 0 && _searchInstance) {
            e.preventDefault();
            _searchInstance.focus();
          }
        }
      });
    }

    setupTabRoving();
  }

  function setupTabRoving(): void {
    if (!listEl) return;
    _tabRoving?.deactivate();

    const items = Array.from(listEl.querySelectorAll<HTMLElement>(`.${block}__item`));
    if (items.length === 0) return;

    _tabRoving = createTabRoving();
    _tabRoving.activate({
      container: listEl,
      items,
      orientation: 'vertical',
      wrap: true,
    });
  }

  function showEmpty(state: 'no-data' | 'no-results'): void {
    if (!emptyEl) return;
    emptyEl.style.display = '';
    if (listEl) listEl.style.display = 'none';
    parent.classList.remove('no-data', 'no-results');
    parent.classList.add(state);
    syncClearSearchVisibility(state);
  }

  function hideEmpty(): void {
    if (!emptyEl) return;
    emptyEl.style.display = 'none';
    if (listEl) listEl.style.display = '';
    parent.classList.remove('no-data', 'no-results');
    syncClearSearchVisibility(null);
  }

  function buildEmptyContent(): void {
    if (!emptyEl) return;
    emptyEl.innerHTML = '';

    const illusEl = el('div', `${block}__empty-illus`, emptyEl);
    illusEl.setAttribute('aria-hidden', 'true');

    el('div', `${block}__empty-title`, emptyEl);
    el('div', `${block}__empty-msg`, emptyEl);

    const actionContainer = el('div', `${block}__empty-action`, emptyEl);
    actionContainer.style.display = 'none';

    // Compose ArvoButton for the Clear Search action.
    const clearBtnEl = document.createElement('button');
    actionContainer.appendChild(clearBtnEl);
    _clearSearchInstance = new ArvoButton(clearBtnEl, {
      size: 'sm',
      variant: 'outline',
      label: 'Clear search',
      onClick: () => {
        if (_searchInstance) {
          _searchInstance.value('');
          _searchInstance.focus();
        }
        _query = '';
        renderItems();
        updateInfoText();
      },
    });
  }

  function syncClearSearchVisibility(state: 'no-data' | 'no-results' | null): void {
    if (!emptyEl) return;
    const titleNode = emptyEl.querySelector(`.${block}__empty-title`) as HTMLElement | null;
    const msgNode = emptyEl.querySelector(`.${block}__empty-msg`) as HTMLElement | null;
    const actionNode = emptyEl.querySelector(`.${block}__empty-action`) as HTMLElement | null;

    if (state === 'no-data') {
      if (titleNode) titleNode.textContent = 'No data';
      if (msgNode) msgNode.textContent = 'There are no items to display.';
      if (actionNode) actionNode.style.display = 'none';
    } else if (state === 'no-results') {
      if (titleNode) titleNode.textContent = 'No results found';
      if (msgNode) msgNode.textContent = 'Try adjusting your search terms.';
      if (actionNode) actionNode.style.display = '';
    } else {
      if (titleNode) titleNode.textContent = '';
      if (msgNode) msgNode.textContent = '';
      if (actionNode) actionNode.style.display = 'none';
    }
  }

  // Resolve the type + message that should populate the ArvoMessageAlert
  // inside the `__info` slot. Type defaults to 'info' (matches the Figma
  // "24 matching results" styling). Message resolves either from the live
  // match count (when showMatchCount + items present) or from the static
  // config message; falls back to empty when neither applies.
  function resolveInfoConfig(): { type: ArvoMessageAlertType; message: string } {
    const infoCfg = _stickyConfig && _stickyConfig.info ? _stickyConfig.info : null;
    if (!infoCfg) return { type: 'info', message: '' };
    const type = (infoCfg.type ?? 'info') as ArvoMessageAlertType;
    let message = '';
    if (infoCfg.showMatchCount && _items.length > 0) {
      const filtered = getFilteredItems();
      message = formatMatchCountMessage(filtered.length, infoCfg.matchCountTemplate);
    } else if (infoCfg.message) {
      message = infoCfg.message;
    }
    return { type, message };
  }

  function updateInfoText(): void {
    if (!infoEl || !_stickyConfig || !_stickyConfig.info) return;

    const { type, message } = resolveInfoConfig();

    // Visibility gate: `showWhen: 'filtered'` only surfaces the row while a
    // search query is active; an empty message always hides the row.
    const gatedHidden = _stickyConfig.info.showWhen === 'filtered' && !_query;
    infoEl.style.display = gatedHidden || !message ? 'none' : '';

    if (_infoInstance) {
      // ArvoMessageAlert.type() swaps the modifier class AND re-resolves the
      // live-region role in lockstep (since we don't pass an explicit role at
      // construction). When `message` resolves to empty (no static message +
      // no match-count path active) we leave the alert in place with an empty
      // `__msg`; the icon still renders, mirroring the shared pattern.
      _infoInstance.type(type);
      _infoInstance.message(message);
    }
  }

  // -----------------------------------------------------------------------
  // Footer
  // -----------------------------------------------------------------------

  function destroyFooterActions(): void {
    for (const entry of _footerActionInstances) {
      try { entry.instance?.destroy(); } catch { /* ignore */ }
      entry.wrapper.remove();
    }
    _footerActionInstances.length = 0;
  }

  function renderFooterActions(): void {
    if (!footerActionsEl || !_actions) return;
    destroyFooterActions();

    // Clamp to the overlay-family shared max (3) so PanelShell consumers
    // (SidePanel, Drawer, Panel) match the cap enforced on Popover,
    // HybridPopover, Window, and AlertDialog. Excess actions trigger a
    // single dev warning.
    const footerActions = clampFooterActions(_actions, {
      componentName: `panel-shell (${block})`,
    });

    for (const action of footerActions) {
      const btnEl = document.createElement('button');
      btnEl.setAttribute('data-action-id', action.id);
      if (action.isIconOnly) btnEl.setAttribute('data-icon-only', 'true');
      footerActionsEl.appendChild(btnEl);

      // ArvoButton does not accept a tooltip prop (per the design system
      // tooltip standard); consumer-supplied `action.tooltip` on a footer
      // action is ignored here -- wrap the action with ArvoTooltip if a
      // tooltip is actually needed.
      const inst = new ArvoButton(btnEl, {
        size: action.size ?? 'md',
        variant: action.variant ?? 'secondary',
        label: action.label,
        icon: action.icon,
        isDisabled: action.isDisabled,
        isLoading: action.isLoading,
        onClick: (e) => {
          if (_isDisabled || action.isDisabled) return;
          action.onClick?.(e);
        },
      });

      _footerActionInstances.push({ id: action.id, wrapper: btnEl, instance: inst });
    }
  }

  // -----------------------------------------------------------------------
  // Public instance
  // -----------------------------------------------------------------------

  const instance: PanelShellInstance<T> = {
    hdrEl,
    bodyEl,
    listEl,
    searchEl,
    stickyEl,
    footerEl,

    setItems(items: T[]): void {
      _items = items;
      ensureItemsInfrastructure();
      renderItems();
      updateInfoText();
    },

    setContent(content: PanelContent): void {
      _content = content;
      if (content == null) {
        if (contentEl) renderPanelContent(contentEl, null);
        return;
      }
      renderContentSlot();
    },

    setInfo(config: ArvoPanelInfoConfig | false): void {
      // The `__info` row lives inside the sticky region; without a sticky
      // region there is nothing to attach it to.
      if (!_stickyConfig) return;
      _stickyConfig = { ..._stickyConfig, info: config };

      if (!config) {
        if (infoEl) infoEl.style.display = 'none';
        return;
      }

      // Build the slot in place when it does not exist yet (one-time);
      // otherwise update text + visibility in place so search focus is
      // preserved across per-keystroke updates.
      if (!infoEl) {
        buildStickyContent();
        return;
      }
      updateInfoText();
    },

    setStickyHeader(cfg: ArvoPanelStickyHeaderConfig | false): void {
      _stickyConfig = cfg;

      if (!cfg) {
        try { _tabstripInstance?.destroy(); } catch { /* ignore */ }
        try { _searchInstance?.destroy(); } catch { /* ignore */ }
        try { _bannerInstance?.destroy(); } catch { /* ignore */ }
        try { _infoInstance?.destroy(); } catch { /* ignore */ }
        _tabstripInstance = null;
        _searchInstance = null;
        _bannerInstance = null;
        _infoInstance = null;
        if (stickyEl) {
          stickyEl.remove();
          stickyEl = null;
        }
        infoEl = null;
        infoInnerEl = null;
        parent.classList.remove(
          `${block}--with-banner`,
          `${block}--with-tabs`,
          `${block}--with-search`,
          `${block}--with-info`,
        );
        return;
      }

      if (!stickyEl) {
        stickyEl = document.createElement('div');
        stickyEl.className = `${block}__sticky`;
        if (bodyEl) {
          parent.insertBefore(stickyEl, bodyEl);
        } else {
          parent.appendChild(stickyEl);
        }
      }

      buildStickyContent();
    },

    setHeaderActions(actions: ArvoPanelHeaderAction[]): void {
      _headerActions = actions;
      renderHeaderActions();
      const validCount = actions.filter((a) => validateHeaderAction(a)).length;
      warnActionCap(validCount + pinnableCount + closableCount);
    },

    setActions(actions: ArvoPanelAction[] | false): void {
      _actions = actions;
      if (!actions || actions.length === 0) {
        destroyFooterActions();
        destroyFooterFit();
        if (footerEl) {
          footerEl.remove();
          footerEl = null;
          footerActionsEl = null;
        }
        return;
      }

      if (!footerEl) {
        footerEl = el('div', `${block}__footer`, parent);
        footerActionsEl = el('div', `${block}__footer-actions`, footerEl);
      }
      renderFooterActions();
      attachFooterFit();
    },

    updateAction(id: string, patch: Partial<ArvoPanelHeaderAction | ArvoPanelAction>): void {
      const hdrIdx = _headerActions.findIndex((a) => a.id === id);
      if (hdrIdx >= 0) {
        _headerActions[hdrIdx] = { ..._headerActions[hdrIdx], ...patch } as ArvoPanelHeaderAction;
        renderHeaderActions();
        return;
      }

      if (_actions) {
        const ftrIdx = _actions.findIndex((a) => a.id === id);
        if (ftrIdx >= 0) {
          _actions[ftrIdx] = { ..._actions[ftrIdx], ...patch } as ArvoPanelAction;
          renderFooterActions();
          // Label/icon mutations can change a button's intrinsic width;
          // remeasure so the equal-column basis tracks the widest label.
          _footerFit?.measure();
        }
      }
    },

    search(query?: string): string | void {
      if (query === undefined) return _query;
      _query = query;
      _searchInstance?.value(query);
      renderItems();
      updateInfoText();
    },

    selectedTab(id?: string): string | null | void {
      if (id === undefined) return _selectedTabId;
      _selectedTabId = id;
      _tabstripInstance?.select(id);
      parent.dispatchEvent(
        new CustomEvent('tab-select', {
          bubbles: true,
          detail: { id: _selectedTabId },
        }),
      );
    },

    setTitle(title: string | null): void {
      _title = title;
      if (titleEl) {
        titleEl.textContent = title ?? '';
      }
    },

    loading(state?: boolean): boolean | void {
      if (state === undefined) return _isLoading;
      _isLoading = state;

      parent.classList.toggle('loading', state);
      parent.setAttribute('aria-busy', String(state));

      if (skeletonEl) {
        skeletonEl.style.display = state ? '' : 'none';
      }
      if (listEl) {
        listEl.style.display = state ? 'none' : '';
      }
      if (emptyEl) {
        emptyEl.style.display = state ? 'none' : '';
      }
      if (contentEl) {
        contentEl.style.display = state ? 'none' : '';
      }
    },

    disabled(state?: boolean): boolean | void {
      if (state === undefined) return _isDisabled;
      _isDisabled = state;
      parent.classList.toggle('is-disabled', state);
      if (state) {
        parent.setAttribute('aria-disabled', 'true');
      } else {
        parent.removeAttribute('aria-disabled');
      }
    },

    focus(target?: 'first' | 'title' | 'search' | 'list'): void {
      const effectiveTarget = target ?? 'first';

      if (effectiveTarget === 'search' && _searchInstance) {
        _searchInstance.focus();
        return;
      }

      if (effectiveTarget === 'title' && titleEl) {
        titleEl.setAttribute('tabindex', '-1');
        titleEl.focus();
        return;
      }

      if (effectiveTarget === 'list' && listEl) {
        const firstItem = listEl.querySelector<HTMLElement>(`.${block}__item`);
        if (firstItem) {
          firstItem.focus();
          _tabRoving?.setActiveItem(0);
        }
        return;
      }

      // 'first': try search -> first body focusable -> title
      if (_searchInstance) { _searchInstance.focus(); return; }
      if (bodyEl) {
        const focusable = bodyEl.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable) { focusable.focus(); return; }
      }
      if (titleEl) {
        titleEl.setAttribute('tabindex', '-1');
        titleEl.focus();
      }
    },

    setPinSlot(slotEl: HTMLElement | null): void {
      if (_pinSlot && _pinSlot.parentNode) {
        _pinSlot.remove();
      }
      _pinSlot = slotEl;
      insertPinSlot();
    },

    setTitleLeading(leadingEl: HTMLElement | null): void {
      if (_titleLeading && _titleLeading.parentNode) {
        _titleLeading.remove();
      }
      _titleLeading = leadingEl;
      if (titleLeadingHostEl && _titleLeading) {
        titleLeadingHostEl.appendChild(_titleLeading);
      }
    },

    setTitleTrailing(trailingEl: HTMLElement | null): void {
      if (_titleTrailing && _titleTrailing.parentNode) {
        _titleTrailing.remove();
      }
      _titleTrailing = trailingEl;
      if (titleTrailingHostEl && _titleTrailing) {
        titleTrailingHostEl.appendChild(_titleTrailing);
      }
    },

    getElement(): HTMLElement {
      return parent;
    },

    destroy(): void {
      if (_destroyed) return;
      _destroyed = true;
      _tabRoving?.deactivate();
      _tabRoving = null;
      try { _infoInstance?.destroy(); } catch { /* ignore */ }
      try { _backInstance?.destroy(); } catch { /* ignore */ }
      try { _closeInstance?.destroy(); } catch { /* ignore */ }
      try { _searchInstance?.destroy(); } catch { /* ignore */ }
      try { _tabstripInstance?.destroy(); } catch { /* ignore */ }
      try { _clearSearchInstance?.destroy(); } catch { /* ignore */ }
      try { _bannerInstance?.destroy(); } catch { /* ignore */ }
      _infoInstance = null;
      _backInstance = null;
      _closeInstance = null;
      _searchInstance = null;
      _tabstripInstance = null;
      _clearSearchInstance = null;
      _bannerInstance = null;
      // The ArvoMessageAlert root is owned by infoEl, which is wiped by
      // `parent.innerHTML = ''` below. Just null the cached reference.
      infoInnerEl = null;
      destroyHeaderActions();
      destroyFooterActions();
      destroyFooterFit();
      parent.innerHTML = '';
    },
  };

  return instance;
}
