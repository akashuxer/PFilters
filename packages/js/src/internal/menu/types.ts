/**
 * Shared types for the internal JS menu-content primitives consumed by
 * `ArvoContextMenu` (today) and slated for `ArvoActionMenu` adoption in a
 * follow-up convergence pass.
 *
 * Mirrors `packages/react/src/internal/menu/types.ts` exactly so React + JS
 * stay structurally parallel (the drift reviewer enforces this).
 */

import type { ListGroup } from '@arvo/core';

/**
 * Status indicator config shared with ArvoActionMenu. A semantic key maps
 * to the matching `arvo-menu-item--status-*` modifier class; an explicit
 * `{ color }` object sets `--arvo-menu-item-status-color` inline.
 */
export type MenuItemStatus =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | { color: string };

/** Fields shared by every non-separator menu row. */
interface ContextMenuRowBase {
  id: string;
  label: string;
  secondaryLabel?: string;
  icon?: string;
  avatar?: string;
  shortcut?: string;
  value?: string;
  status?: MenuItemStatus;
  href?: string;
  target?: '_self' | '_blank';
  isDisabled?: boolean;
}

export interface ContextMenuItemNode<TContext = unknown> extends ContextMenuRowBase {
  kind?: 'item';
  destructive?: boolean;
  isSelected?: boolean;
  submenu?: ContextMenuItem<TContext>[];
  onSelect?: (context: TContext) => void | boolean;
}

export interface ContextMenuCheckboxItem<TContext = unknown> extends ContextMenuRowBase {
  kind: 'checkbox';
  checked: boolean;
  onChange?: (checked: boolean, context: TContext) => void;
}

export interface ContextMenuRadioItem<TContext = unknown> extends ContextMenuRowBase {
  kind: 'radio';
  checked: boolean;
  radioGroup: string;
  onChange?: (context: TContext) => void;
}

export interface ContextMenuSeparator {
  kind: 'separator';
  id: string;
}

export type ContextMenuItem<TContext = unknown> =
  | ContextMenuItemNode<TContext>
  | ContextMenuCheckboxItem<TContext>
  | ContextMenuRadioItem<TContext>
  | ContextMenuSeparator;

export type ContextMenuItemGroup<TContext = unknown> = ListGroup<
  ContextMenuItem<TContext> & { label: string }
> & {
  items: ContextMenuItem<TContext>[];
};

export type ContextMenuItems<TContext = unknown> =
  | ContextMenuItem<TContext>[]
  | ContextMenuItemGroup<TContext>[];

export function isContextMenuGrouped<TContext>(
  items: ContextMenuItems<TContext>,
): items is ContextMenuItemGroup<TContext>[] {
  return (
    items.length > 0 &&
    typeof (items as ContextMenuItemGroup<TContext>[])[0] === 'object' &&
    Array.isArray((items as ContextMenuItemGroup<TContext>[])[0]?.items)
  );
}

export function flattenContextMenuItems<TContext>(
  items: ContextMenuItems<TContext>,
): ContextMenuItem<TContext>[] {
  if (isContextMenuGrouped(items)) {
    return items.flatMap((g) => g.items);
  }
  return items;
}

export function isContextMenuFocusable<TContext>(
  item: ContextMenuItem<TContext>,
): boolean {
  if (item.kind === 'separator') return false;
  return !item.isDisabled;
}

/**
 * True when the row should display the `.active` selection visual:
 * regular item with `isSelected: true`, OR checkbox / radio with
 * `checked: true`. Per spec section 4.5 the 2 px left-border is the
 * ONLY selection indicator.
 */
export function isContextMenuSelected<TContext>(
  item: ContextMenuItem<TContext>,
): boolean {
  if (item.kind === 'separator') return false;
  if (item.kind === 'checkbox' || item.kind === 'radio') return !!item.checked;
  return !!item.isSelected;
}
