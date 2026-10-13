import type { ListItemBase, ListGroup } from '@arvo/core';
import {
  attachTitleTruncationTooltip,
  type TitleTruncationHandle,
} from '@arvo/utils';
import { ArvoCheckbox } from '../components/Checkbox/Checkbox';

// ---------------------------------------------------------------------------
// Shared option-row renderer (vanilla JS).
//
// The single source of `role="listbox"` option-row DOM for the inline
// `ArvoListbox` and the floating `ArvoOptionList` (and, through OptionList,
// for Select / MultiSelect / Combobox). Parameterized by BEM `block` so each
// component keeps its own namespace while the DOM-building logic lives in one
// place. Twin of `packages/react/src/internal/option-list-render.tsx`.
//
// Variant + selection-mode support:
// - `variant: 'standard' | 'rich'` -- rich rows render the avatar (or icon)
//   inside `__avatar` / `__ico`, then a `__txt` wrapper containing `__lbl`
//   and an optional `__secondary` (10px). Standard rows render the icon
//   (if any) followed by the bare label.
// - `selectionMode: 'single' | 'multiple'` -- multi-select rows emit a
//   leading `__check` slot hosting an ArvoCheckbox instance whose checked
//   state mirrors the row's selection. Callers pass a checkbox sink so
//   they can destroy() the instances on rebuild.
//
// Internal module: not exported from the public package barrel.
// ---------------------------------------------------------------------------

export interface OptionRowItem extends ListItemBase {
  value: unknown;
}

export type OptionRowVariant = 'standard' | 'rich';
export type OptionRowSelectionMode = 'single' | 'multiple';

export function isGroupedOptions<T extends ListItemBase>(
  items: T[] | ListGroup<T>[],
): items is ListGroup<T>[] {
  return items.length > 0 && 'items' in items[0];
}

export function flattenOptions<T extends ListItemBase>(
  items: T[] | ListGroup<T>[],
): T[] {
  if (isGroupedOptions(items)) {
    const result: T[] = [];
    for (const group of items) {
      for (const item of group.items) result.push(item);
    }
    return result;
  }
  return items as T[];
}

export interface OptionRowConfig<T extends OptionRowItem> {
  /** BEM block, e.g. `arvo-listbox` or `arvo-opt-list`. */
  block: string;
  /** Returns the DOM id for the option at the given flat index. */
  optionId: (flatIndex: number) => string;
  isSelected: (value: unknown) => boolean;
  highlightedIndex: number;
  /** Visual layout variant. Defaults to `'standard'`. */
  variant?: OptionRowVariant;
  /** Selection mode. Drives the leading checkbox slot. Defaults to `'single'`. */
  selectionMode?: OptionRowSelectionMode;
  /** Emit a `data-index` attribute (click delegation). Default true. */
  emitDataIndex?: boolean;
  /** Custom label rendering into the label span. Default sets textContent. */
  renderLabel?: (item: T, lblEl: HTMLElement) => void;
  /**
   * Callback invoked for every ArvoCheckbox instance created while building
   * multi-select rows. Callers should track instances and `destroy()` them
   * on rebuild + on component teardown.
   */
  onCheckbox?: (cb: ArvoCheckbox) => void;
  /**
   * Callback invoked for every truncation-tooltip handle created while
   * building rows (one per row that has a non-empty label). Callers
   * should track the handles and `destroy()` them on rebuild + on
   * component teardown so the internal ResizeObservers don't leak to
   * detached label nodes.
   */
  onTruncationHandle?: (handle: TitleTruncationHandle) => void;
}

export function createOptionRow<T extends OptionRowItem>(
  item: T,
  flatIndex: number,
  cfg: OptionRowConfig<T>,
): HTMLDivElement {
  const { block } = cfg;
  const variant: OptionRowVariant = cfg.variant ?? 'standard';
  const selectionMode: OptionRowSelectionMode = cfg.selectionMode ?? 'single';
  const isMultiple = selectionMode === 'multiple';
  const isRich = variant === 'rich';

  const el = document.createElement('div');
  const selected = cfg.isSelected(item.value);
  const highlighted = flatIndex === cfg.highlightedIndex;

  // In multi-select the checkbox is the sole selection indicator; the
  // single-select `.active` left-border indicator is suppressed so the row
  // stays visually neutral (the checkbox alone communicates state).
  el.className = [
    `${block}__opt`,
    item.isDisabled && 'is-disabled',
    highlighted && 'highlighted',
    selected && !isMultiple && 'active',
  ]
    .filter(Boolean)
    .join(' ');

  el.setAttribute('role', 'option');
  el.setAttribute('id', cfg.optionId(flatIndex));
  el.setAttribute('aria-selected', String(selected));
  if (cfg.emitDataIndex !== false) {
    el.setAttribute('data-index', String(flatIndex));
  }
  if (item.isDisabled) {
    el.setAttribute('aria-disabled', 'true');
  }

  if (isMultiple) {
    const checkSlot = document.createElement('span');
    checkSlot.className = `${block}__opt__check`;
    checkSlot.setAttribute('aria-hidden', 'true');
    const ctrlEl = document.createElement('span');
    checkSlot.appendChild(ctrlEl);
    const cb = ArvoCheckbox.initialize(ctrlEl, {
      size: 'sm',
      isChecked: selected,
      isDisabled: item.isDisabled === true,
    });
    cfg.onCheckbox?.(cb);
    el.appendChild(checkSlot);
  }

  const showAvatar = isRich && !!item.avatar;
  const showIcon = !!item.icon && !showAvatar;
  const showSecondary = isRich && !!item.secondaryLabel;

  if (showAvatar) {
    const av = document.createElement('img');
    av.className = `${block}__opt__avatar`;
    av.src = item.avatar as string;
    av.setAttribute('alt', '');
    av.setAttribute('aria-hidden', 'true');
    el.appendChild(av);
  } else if (showIcon) {
    const ico = document.createElement('span');
    ico.className = `${block}__opt__ico o9con o9con-${item.icon}`;
    ico.setAttribute('aria-hidden', 'true');
    el.appendChild(ico);
  }

  const writeLabel = (lblEl: HTMLElement): void => {
    if (cfg.renderLabel) {
      cfg.renderLabel(item, lblEl);
    } else {
      lblEl.textContent = item.label;
    }
  };

  let lblEl: HTMLElement | null = null;
  if (isRich) {
    const txt = document.createElement('span');
    txt.className = `${block}__opt__txt`;
    const lbl = document.createElement('span');
    lbl.className = `${block}__opt__lbl`;
    writeLabel(lbl);
    txt.appendChild(lbl);
    lblEl = lbl;
    if (showSecondary) {
      const sec = document.createElement('span');
      sec.className = `${block}__opt__secondary`;
      sec.textContent = item.secondaryLabel ?? '';
      txt.appendChild(sec);
    }
    el.appendChild(txt);
  } else {
    const lbl = document.createElement('span');
    lbl.className = `${block}__opt__lbl`;
    writeLabel(lbl);
    el.appendChild(lbl);
    lblEl = lbl;
  }

  // Wire the shared truncation tooltip (visual-only -- the label text is
  // already part of the option's accessible name). Skip rows without a
  // label string (rare: custom `renderLabel` may set no textContent).
  if (lblEl && item.label && cfg.onTruncationHandle) {
    const handle = attachTitleTruncationTooltip({
      triggerElement: el,
      element: lblEl,
      content: item.label,
      placement: 'top-center',
    });
    cfg.onTruncationHandle(handle);
  }

  return el;
}

export interface OptionListBodyConfig<T extends OptionRowItem>
  extends OptionRowConfig<T> {
  /** The (already filtered) items to render. */
  filteredItems: T[] | ListGroup<T>[];
  /** Group header id prefix, e.g. `${id}-grp`. */
  groupIdPrefix: string;
  hasGroupDividers?: boolean;
}

/**
 * Builds the flat-or-grouped option rows into `listEl` and returns the flat
 * array of option elements (for arrow-nav wiring). The caller owns the
 * `role="listbox"` container, the search field, and empty/loading states.
 */
export function renderOptionListBody<T extends OptionRowItem>(
  listEl: HTMLElement,
  cfg: OptionListBodyConfig<T>,
): HTMLElement[] {
  const { block, filteredItems, groupIdPrefix, hasGroupDividers = true } = cfg;
  const optionEls: HTMLElement[] = [];

  if (isGroupedOptions(filteredItems)) {
    let flatIdx = 0;
    filteredItems.forEach((group, groupIdx) => {
      if (groupIdx > 0 && hasGroupDividers) {
        const divider = document.createElement('hr');
        divider.className = `${block}__divider`;
        divider.setAttribute('role', 'separator');
        listEl.appendChild(divider);
      }

      const groupEl = document.createElement('div');
      groupEl.className = `${block}__grp`;
      groupEl.setAttribute('role', 'group');

      if (group.label) {
        const grpHdrId = `${groupIdPrefix}-${groupIdx}`;
        groupEl.setAttribute('aria-labelledby', grpHdrId);
        const header = document.createElement('div');
        header.id = grpHdrId;
        header.className = `${block}__grp-hdr`;
        header.textContent = group.label;
        groupEl.appendChild(header);
      }

      for (const item of group.items) {
        const optEl = createOptionRow(item, flatIdx, cfg);
        groupEl.appendChild(optEl);
        optionEls.push(optEl);
        flatIdx++;
      }

      listEl.appendChild(groupEl);
    });
  } else {
    (filteredItems as T[]).forEach((item, idx) => {
      const optEl = createOptionRow(item, idx, cfg);
      listEl.appendChild(optEl);
      optionEls.push(optEl);
    });
  }

  return optionEls;
}
