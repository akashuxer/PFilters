export interface MenuSearchConfig {
  placeholder?: string;
  errorMsg?: string;
  minChars?: number;
  searchMode?: 'input' | 'submit';
  isClearable?: boolean;
  counter?: boolean;
  shortcut?: string;
  className?: string;
  onFilter?: (query: string, matchCount: number) => void;
  onClear?: () => void;
}

export type MenuSearchProp = boolean | MenuSearchConfig;

const MENU_SEARCH_DEFAULTS: MenuSearchConfig = {
  placeholder: 'Search',
  isClearable: true,
  searchMode: 'input',
  minChars: 0,
};

export function normalizeSearch(
  prop: MenuSearchProp | undefined,
  defaults: Partial<MenuSearchConfig> = {},
): MenuSearchConfig | null {
  if (!prop) return null;
  const base = { ...MENU_SEARCH_DEFAULTS, ...defaults };
  if (prop === true) return base;
  return { ...base, ...prop };
}
