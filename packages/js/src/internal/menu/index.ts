/**
 * Internal JS menu-content primitives consumed by `ArvoContextMenu` and
 * slated for `ArvoActionMenu` adoption in a follow-up convergence pass. NOT
 * exported from the public package barrel.
 */

export {
  createMenuContent,
  type MenuContent,
  type MenuContentOptions,
  type MenuContentSelectInfo,
  type MenuSubmenuController,
} from './menu-content';

export type {
  ContextMenuItem,
  ContextMenuItemNode,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuItemGroup,
  ContextMenuItems,
  MenuItemStatus,
} from './types';

export {
  isContextMenuGrouped,
  flattenContextMenuItems,
  isContextMenuFocusable,
  isContextMenuSelected,
} from './types';
