/** Minimal visual contract for items rendered by list/menu SCSS mixins. */
export interface ListItemBase {
  id: string;
  label: string;
  secondaryLabel?: string;
  icon?: string;
  avatar?: string;
  isDisabled?: boolean;
}

/**
 * A named group of items. When `label` is omitted, no header row is rendered
 * for the group (useful for divider-only separation).
 */
export interface ListGroup<T extends ListItemBase = ListItemBase> {
  id: string;
  label?: string;
  items: T[];
}

export interface ListFilterOptions {
  query: string;
  keys?: Array<'label' | 'secondaryLabel'>;
  caseSensitive?: boolean;
  accentSensitive?: boolean;
}
