import {
  ArvoAlertDialog,
  ArvoBadge,
  ArvoButton,
  ArvoDropdownIconButton,
  ArvoIconButton,
  ArvoTabstrip,
  ArvoToast,
  ArvoTooltip,
  type HybridPopoverInlineConfig,
} from '@arvo/js';
import type { BasicInlineNode, ListGroup } from '@arvo/core';
import type { MenuItemData } from '@arvo/js';
import { SmartInput } from './SmartInput';

type CombineMode = 'AND' | 'OR';
type TitleFontWeight = 'Regular' | 'Semibold' | 'Bold';
type FiltersTabId = 'general' | 'measure-picklist';
type ColorCode = 'Red' | 'Blue' | 'Green' | 'Pink';

const COLOR_CODES: readonly ColorCode[] = ['Red', 'Blue', 'Green', 'Pink'];

export interface FiltersOpts {
  container: HTMLElement;
}

export class Filters {
  private _opts: FiltersOpts;
  private _root: HTMLElement;
  private _headerEl: HTMLElement;
  private _menuWrapEl: HTMLElement;
  private _menuHost: HTMLButtonElement;
  private _readmeHost: HTMLButtonElement;
  private _warningResetHost: HTMLButtonElement;
  private _readmePanel: HTMLElement;
  private _readmeInst: ArvoIconButton | null = null;
  private _bodyEl: HTMLElement;
  private _tabHost: HTMLElement;
  private _generalContentEl: HTMLElement;
  private _picklistSectionEl: HTMLElement;
  private _measureSectionEl: HTMLElement;
  private _expressionEl: HTMLElement;
  private _toastActionsEl: HTMLElement;
  private _includeBlockedHost: HTMLButtonElement;
  private _excludeBlockedHost: HTMLButtonElement;
  private _smartInput: SmartInput | null = null;
  private _picklistInput: SmartInput | null = null;
  private _picklistTableRows: Array<{
    element: HTMLTableRowElement;
    colors: readonly ColorCode[];
  }> = [];
  private _picklistTableEmptyRow: HTMLTableRowElement | null = null;
  private _measureInputs: SmartInput[] = [];
  private _measureLabels: string[] = [];
  private _tabstripInst: ReturnType<typeof ArvoTabstrip.initialize> | null = null;
  private _menuInst: ArvoDropdownIconButton | null = null;
  private _combineDialog: ArvoAlertDialog | null = null;
  private _includeBlockedButton: ArvoButton | null = null;
  private _excludeBlockedButton: ArvoButton | null = null;
  private _warningToast: ArvoToast | null = null;
  private _menuObserver: MutationObserver | null = null;
  private _submenuTooltips: ArvoTooltip[] = [];
  private _menuBadges: ArvoBadge[] = [];
  private _tooltipFrame: number | null = null;
  private _menuTweakTimer: number | null = null;
  private _combineMode: CombineMode = 'AND';
  private _activeTab: FiltersTabId = /#\/filters\/measurepicklist(?:\/|$)/i.test(window.location.hash)
    ? 'measure-picklist'
    : 'general';
  private _titleFontWeight: TitleFontWeight = 'Semibold';
  private _autoApply = true;
  private _nextPrevNav = true;
  private _showTitle = true;
  private _autoWrap = false;

  constructor(opts: FiltersOpts) {
    this._opts = opts;
    this._root = document.createElement('section');
    this._root.className = 'arvo-pg-filters';
    this._root.dataset.titleFontWeight = this._titleFontWeight.toLowerCase();
    this._root.setAttribute('aria-label', 'Filters workspace');

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-pg-filters__body';

    this._tabHost = document.createElement('div');
    this._tabHost.className = 'arvo-pg-filters__tabstrip';

    this._headerEl = document.createElement('header');
    this._headerEl.className = 'arvo-pg-filters__header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'arvo-pg-filters__title-wrap';

    const title = document.createElement('h1');
    title.className = 'arvo-pg-filters__title';
    title.textContent = 'Filter Menu';
    titleWrap.appendChild(title);

    this._headerEl.appendChild(titleWrap);

    this._menuWrapEl = document.createElement('div');
    this._menuWrapEl.className = 'arvo-pg-filters__menu-wrap';
    this._menuHost = document.createElement('button');
    this._menuHost.type = 'button';
    this._menuHost.className = 'arvo-pg-filters__menu-host';
    this._menuWrapEl.appendChild(this._menuHost);
    this._headerEl.appendChild(this._menuWrapEl);
    this._readmeHost = document.createElement('button');
    this._readmeHost.type = 'button';
    this._readmeHost.className = 'arvo-pg-filters__readme-host';
    this._headerEl.appendChild(this._readmeHost);
    this._warningResetHost = document.createElement('button');
    this._warningResetHost.type = 'button';
    this._warningResetHost.className = 'arvo-pg-filters__warning-reset';
    this._warningResetHost.textContent = 'Reset warning';
    this._warningResetHost.title = 'Show the filter combination warning again';
    this._warningResetHost.addEventListener('click', () => this._resetCombineWarning());

    this._toastActionsEl = document.createElement('div');
    this._toastActionsEl.className = 'arvo-pg-filters__toast-actions';
    this._includeBlockedHost = document.createElement('button');
    this._includeBlockedHost.type = 'button';
    this._excludeBlockedHost = document.createElement('button');
    this._excludeBlockedHost.type = 'button';
    this._toastActionsEl.append(this._includeBlockedHost, this._excludeBlockedHost);

    const headerActions = document.createElement('div');
    headerActions.className = 'arvo-pg-filters__header-actions';
    headerActions.append(this._toastActionsEl, this._warningResetHost);
    this._headerEl.appendChild(headerActions);

    this._readmePanel = document.createElement('aside');
    this._readmePanel.className = 'arvo-pg-filters__readme-panel';
    this._readmePanel.hidden = true;
    this._readmePanel.setAttribute('aria-label', 'Measure Filter README');
    this._readmePanel.innerHTML = `
      <div class="arvo-pg-filters__readme-header">
        <h2>Measure Filter Scenarios</h2>
        <button type="button" class="arvo-pg-filters__readme-close" aria-label="Close README">&times;</button>
      </div>
      <div class="arvo-pg-filters__readme-text">Loading Measure Filter README...</div>
    `;
    this._readmePanel.querySelector('.arvo-pg-filters__readme-close')?.addEventListener('click', () => this._toggleReadme(false));

    this._measureSectionEl = document.createElement('section');
    this._measureSectionEl.className = 'arvo-pg-filters__measure-section';
    this._measureSectionEl.innerHTML = `
      <div class="arvo-pg-filters__measure-title">Measure Filter:</div>
      <div class="arvo-pg-filters__expression" aria-live="polite">
        <span class="arvo-pg-filters__expression-label">Expression:</span>
        <span class="arvo-pg-filters__expression-value"></span>
      </div>
      <div class="arvo-pg-filters__measure-grid" aria-label="Measure input types"></div>
    `;
    this._expressionEl = this._measureSectionEl.querySelector('.arvo-pg-filters__expression-value') as HTMLElement;
    const measureGrid = this._measureSectionEl.querySelector('.arvo-pg-filters__measure-grid') as HTMLDivElement;
    const riskValueItems = [
      { id: 'critical-value', label: 'Critical (Red)', value: 'Critical' },
      { id: 'high-value', label: 'High (Orange)', value: 'High' },
      { id: 'medium-value', label: 'Medium (Amber)', value: 'Medium' },
      { id: 'low-value', label: 'Low (Light Green)', value: 'Low' },
      { id: 'no-risk-value', label: 'No Risk (Green)', value: 'No Risk' },
    ];
    const riskMeasureItems = [
      { id: 'critical', label: 'Critical (Red)', value: 'Critical' },
      { id: 'high', label: 'High (Orange)', value: 'High' },
      { id: 'medium', label: 'Medium (Amber)', value: 'Medium' },
      { id: 'low', label: 'Low (Light Green)', value: 'Low' },
      { id: 'no-risk', label: 'No Risk (Green)', value: 'No Risk' },
    ];
    const measureLabels = [
      {
        label: 'Actual DOS',
        dataType: 'integer' as const,
        measureItems: [
          { id: 'revenue', label: 'Revenue (Number)', value: 'Revenue' },
          { id: 'target-revenue', label: 'Target Revenue (Number)', value: 'Target Revenue' },
          { id: 'forecast-revenue', label: 'Forecast Revenue (Number)', value: 'Forecast Revenue' },
          { id: 'safety-stock', label: 'Safety Stock (Number)', value: 'Safety Stock' },
        ],
      },
      {
        label: 'Order Date',
        dataType: 'datetime' as const,
        measureItems: [
          { id: 'shipment-date', label: 'Shipment Date', value: 'Shipment Date' },
          { id: 'requested-delivery-date', label: 'Requested Delivery Date', value: 'Requested Delivery Date' },
          { id: 'production-start-date', label: 'Production Start Date', value: 'Production Start Date' },
          { id: 'last-updated-date', label: 'Last Updated Date', value: 'Last Updated Date' },
        ],
      },
      {
        label: 'Is Delayed',
        dataType: 'boolean' as const,
        measureItems: [
          { id: 'is-constrained', label: 'Is Constrained', value: 'Is Constrained' },
          { id: 'is-approved', label: 'Is Approved', value: 'Is Approved' },
          { id: 'is-promotional', label: 'Is Promotional', value: 'Is Promotional' },
        ],
      },
      {
        label: 'Risk',
        dataType: 'picklist' as const,
        valueItems: riskValueItems,
        measureItems: riskMeasureItems,
      },
      {
        label: 'Customer',
        dataType: 'string' as const,
        measureItems: [
          { id: 'product', label: 'Product', value: 'Product' },
          { id: 'supplier', label: 'Supplier', value: 'Supplier' },
          { id: 'planner', label: 'Planner', value: 'Planner' },
          { id: 'region', label: 'Region', value: 'Region' },
        ],
      },
    ];
    for (const item of measureLabels) {
      const host = document.createElement('div');
      host.className = 'arvo-pg-filters__measure-item';
      measureGrid.appendChild(host);
      this._measureInputs.push(new SmartInput({
        container: host,
        label: item.label,
        dataType: item.dataType,
        measureItems: item.measureItems,
        valueItems: 'valueItems' in item ? item.valueItems : undefined,
        onExpressionChange: (expression) => {
          this._updateExpression(expression);
        },
      }));
      this._measureLabels.push(item.label);
    }

    this._generalContentEl = document.createElement('div');
    this._generalContentEl.className = 'arvo-pg-filters__general-content';
    this._generalContentEl.id = 'arvo-pg-filters-general';
    this._generalContentEl.append(this._headerEl, this._measureSectionEl);

    this._picklistSectionEl = document.createElement('section');
    this._picklistSectionEl.className = 'arvo-pg-filters__picklist-section';
    this._picklistSectionEl.id = 'arvo-pg-filters-measure-picklist';
    this._picklistSectionEl.hidden = true;
    const picklistHost = document.createElement('div');
    picklistHost.className = 'arvo-pg-filters__measure-item';
    this._picklistSectionEl.append(picklistHost);
    const colorCodeItems = COLOR_CODES.map(color => ({
      id: `color-code-${color.toLowerCase()}`,
      label: color,
      value: color,
    }));
    this._picklistInput = new SmartInput({
      container: picklistHost,
      label: 'Color Code',
      dataType: 'picklist',
      enableMultipleValueBuilder: true,
      measureItems: colorCodeItems,
      valueItems: colorCodeItems,
      onExpressionChange: expression => this._updateColorCodeTable(expression),
    });
    this._picklistSectionEl.append(this._createColorCodeTable());
    this._updateColorCodeTable('');

    // Rebuild the body children as a single set so hot reloads cannot leave
    // an older README panel behind in the normal document flow.
    this._bodyEl.replaceChildren(
      this._tabHost,
      this._generalContentEl,
      this._picklistSectionEl,
      this._readmePanel,
    );
    this._root.append(this._bodyEl);
    opts.container.appendChild(this._root);

    this._mountTabs();
    this._setActiveTab(this._activeTab);
    this._mountReadmeButton();
    this._mountMenu();
    this._mountBlockedToastActions();
  }

  private _mountTabs(): void {
    this._tabstripInst?.destroy();
    this._tabstripInst = ArvoTabstrip.initialize(this._tabHost, {
      tabs: [
        { id: 'general', label: 'General' },
        { id: 'measure-picklist', label: 'Measure Picklist' },
      ],
      size: 'lg',
      hasTabstripBorder: true,
      selectedId: this._activeTab,
      onSelect: (item) => this._setActiveTab(item.id as FiltersTabId),
    });
  }

  private _createColorCodeTable(): HTMLElement {
    const products: Array<{
      salesDomain: string;
      productName: string;
      colors: readonly ColorCode[];
    }> = [
      { salesDomain: 'Fashion Apparel', productName: 'Crewneck T-Shirt', colors: ['Red'] },
      { salesDomain: 'Fashion Apparel', productName: 'Denim Jeans', colors: ['Blue'] },
      { salesDomain: 'Fashion Apparel', productName: 'Pullover Hoodie', colors: ['Green'] },
      { salesDomain: 'Consumer Electronics', productName: 'Flagship Smartphone', colors: ['Red', 'Green'] },
      { salesDomain: 'Consumer Electronics', productName: 'Ultra-Slim Laptop', colors: ['Red', 'Blue'] },
      { salesDomain: 'Consumer Electronics', productName: 'Wireless Headphones', colors: ['Blue', 'Green'] },
      { salesDomain: 'Paints & Finishes', productName: 'Interior Wall Paint', colors: ['Red', 'Blue', 'Green'] },
      { salesDomain: 'Paints & Finishes', productName: 'Exterior Acrylic Paint', colors: ['Red', 'Blue', 'Green'] },
      { salesDomain: 'Paints & Finishes', productName: 'Wood Finish Stain', colors: ['Pink'] },
    ];

    const wrap = document.createElement('div');
    wrap.className = 'arvo-pg-filters__picklist-table-wrap';

    const table = document.createElement('table');
    table.className = 'arvo-pg-filters__picklist-table';
    table.setAttribute('aria-label', 'Products by Color Code');

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Sales Domain', 'Product Name', 'Color Code']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      headRow.append(cell);
    }
    head.append(headRow);

    const body = document.createElement('tbody');
    for (const product of products) {
      const row = document.createElement('tr');
      for (const value of [product.salesDomain, product.productName, product.colors.join(', ')]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      this._picklistTableRows.push({ element: row, colors: product.colors });
      body.append(row);
    }

    const emptyRow = document.createElement('tr');
    emptyRow.className = 'arvo-pg-filters__picklist-table-empty';
    emptyRow.hidden = true;
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 3;
    emptyCell.textContent = 'No products match the selected Color Code.';
    emptyRow.append(emptyCell);
    body.append(emptyRow);
    this._picklistTableEmptyRow = emptyRow;

    table.append(head, body);
    wrap.append(table);
    return wrap;
  }

  private _updateColorCodeTable(expression: string): void {
    const normalized = expression.trim();
    const splitValues = (value: string): string[] => value
      .replace(/^\(|\)$/g, '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    const normalizeStored = (values: readonly ColorCode[]): string => values.join(',').toLowerCase();
    const matches = (colors: readonly ColorCode[], operator: string, rawValue: string): boolean => {
      const values = [...new Set(splitValues(rawValue).map(value => value.toLowerCase()))];
      const stored = normalizeStored(colors);
      const has = (value: string) => colors.some(color => color.toLowerCase() === value);
      switch (operator.toLowerCase()) {
        case '=':
          return stored === rawValue.replace(/\s*,\s*/g, ',').toLowerCase();
        case '!=':
          return stored !== rawValue.replace(/\s*,\s*/g, ',').toLowerCase();
        case 'contains all':
          if (!colors.length) return false;
          return values.every(has);
        case 'not contains all':
          if (!colors.length) return false;
          return !values.every(has);
        case 'contains any':
          if (!colors.length) return false;
          return values.some(has);
        case 'not contains any':
          if (!colors.length) return false;
          return !values.some(has);
        case 'null':
          return colors.length === 0;
        case '!null':
          return colors.length > 0;
        case 'wildcard':
        case ':': {
          const pattern = rawValue.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`, 'i').test(stored);
        }
        default:
          return true;
      }
    };

    const matchesExpression = (colors: readonly ColorCode[]): boolean => {
      if (!normalized) return true;
      const expressionText = normalized.replace(/^=\s*(?=(?:Not Contains All|Not Contains Any|Contains All|Contains Any|Wildcard)\b)/i, '');
      const functionMatch = expressionText.match(/^(Not Contains All|Not Contains Any|Contains All|Contains Any|Wildcard)\s*\((.*)\)$/i);
      if (functionMatch) return matches(colors, functionMatch[1], functionMatch[2]);

      const clauses = expressionText.split(/\s+(AND|OR)\s+/i);
      if (clauses.length > 1) {
        const results: boolean[] = [];
        const connectors: string[] = [];
        for (let index = 0; index < clauses.length; index += 1) {
          if (index % 2 === 0) {
            const clause = clauses[index].trim();
            const match = clause.match(/^(Not Contains All|Not Contains Any|Contains All|Contains Any|Wildcard|:|!=|=|Null|!Null)\s*(?:\((.*)\)|(.*))$/i);
            results.push(match ? matches(colors, match[1], match[2] ?? match[3] ?? '') : true);
          } else {
            connectors.push(clauses[index].toUpperCase());
          }
        }
        return results.slice(1).reduce((result, value, index) =>
          connectors[index] === 'AND' ? result && value : result || value, results[0] ?? true);
      }

      const match = expressionText.match(/^(Not Contains All|Not Contains Any|Contains All|Contains Any|Wildcard|:|!=|=|Null|!Null)\s*(?:\((.*)\)|(.*))$/i);
      return match ? matches(colors, match[1], match[2] ?? match[3] ?? '') : true;
    };
    let visibleRowCount = 0;

    for (const row of this._picklistTableRows) {
      const isVisible = matchesExpression(row.colors);
      row.element.hidden = !isVisible;
      if (isVisible) visibleRowCount += 1;
    }

    if (this._picklistTableEmptyRow) {
      this._picklistTableEmptyRow.hidden = visibleRowCount !== 0;
    }
  }

  private _setActiveTab(tabId: FiltersTabId): void {
    this._activeTab = tabId;
    const isGeneral = tabId === 'general';
    this._generalContentEl.hidden = !isGeneral;
    this._picklistSectionEl.hidden = isGeneral;
    if (!isGeneral) this._toggleReadme(false);
  }

  private _mountBlockedToastActions(): void {
    this._warningToast ??= ArvoToast.initialize(document.body, {
      position: 'bottom-right',
    });

    this._includeBlockedButton?.destroy();
    this._excludeBlockedButton?.destroy();
    this._includeBlockedButton = ArvoButton.initialize(this._includeBlockedHost, {
      variant: 'secondary',
      size: 'md',
      label: 'Include Blocked',
      onClick: () => this._showBlockedToast('include'),
    });
    this._excludeBlockedButton = ArvoButton.initialize(this._excludeBlockedHost, {
      variant: 'secondary',
      size: 'md',
      label: 'Exclude Blocked',
      onClick: () => this._showBlockedToast('exclude'),
    });
  }

  private _showBlockedToast(mode: 'include' | 'exclude'): void {
    const isExclude = mode === 'exclude';
    const message: BasicInlineNode[] = isExclude
      ? [
          { type: 'text', value: 'Some members are included. Use ' },
          { type: 'strong', children: [{ type: 'text', value: 'Click' }] },
          { type: 'text', value: ' to deselect them, or clear selections in ' },
          { type: 'strong', children: [{ type: 'text', value: 'Version Name' }] },
          { type: 'text', value: ' before excluding members.' },
        ]
      : [
          { type: 'text', value: 'Some members are excluded. Use ' },
          { type: 'strong', children: [{ type: 'text', value: 'Alt + Click' }] },
          { type: 'text', value: ' to deselect them, or clear selections in ' },
          { type: 'strong', children: [{ type: 'text', value: 'Data Stream' }] },
          { type: 'text', value: ' before including members.' },
        ];

    this._warningToast?.show({
      type: 'warning',
      title: `${isExclude ? 'Exclude not allowed in Version Name' : 'Include not allowed in Data Stream'}`,
      message,
    });

    // The shared Arvo toast is 300px wide by default. Scope this demo's
    // readability treatment to the toast created by the Filters playground.
    document
      .querySelector<HTMLElement>('.arvo-toast-container > .arvo-toast')
      ?.classList.add('arvo-pg-filters__warning-toast');
  }

  private _mountReadmeButton(): void {
    this._readmeInst?.destroy();
    this._readmeInst = ArvoIconButton.initialize(this._readmeHost, {
      variant: 'tertiary',
      size: 'md',
      icon: 'book',
      tooltip: 'Open Measure Filter README',
      onClick: () => this._toggleReadme(),
    });
  }

  private _resetCombineWarning(): void {
    try {
      window.localStorage.removeItem('arvo-pg:filters:combine-mode-warning-dismissed-v2');
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }

  private _toggleReadme(force?: boolean): void {
    const open = force ?? this._readmePanel.hidden;
    this._readmePanel.hidden = !open;
    this._bodyEl.classList.toggle('arvo-pg-filters__body--readme-open', open);
    if (open) {
      const text = this._readmePanel.querySelector('.arvo-pg-filters__readme-text');
      if (text && text.textContent?.startsWith('Loading')) {
        void fetch('/MEASURE_FILTER_README.md')
          .then((response) => response.ok ? response.text() : Promise.reject(new Error('README unavailable')))
          .then((content) => { text.innerHTML = this._formatReadme(content); })
          .catch(() => { text.textContent = 'The Measure Filter README could not be loaded.'; });
      }
    }
  }

  private _formatReadme(markdown: string): string {
    const escape = (value: string): string => value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    return escape(markdown)
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/^[-*] (.+)$/gm, '• $1')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<h|<ul|<p|$)(.+)$/gm, '<p>$1</p>');
  }

  private _updateExpression(expression: string): void {
    const expressions = this._measureInputs
      .map((input, index) => {
        const value = input.expression();
        if (!value) return '';
        const label = this._measureLabels[index] ?? '';
        const withLabel = label && !value.startsWith(label) ? `${label} ${value}` : value;
        if (/^(?:Risk|Customer)\s+(?:In|Contains|!Contains|StartsWith|!StartsWith|EndsWith|!EndsWith|Wildcard)\s*\(/i.test(withLabel)) {
          const match = withLabel.match(/^(.*?\s)(In|Contains|!Contains|StartsWith|!StartsWith|EndsWith|!EndsWith|Wildcard)\s*\((.*)\)$/i);
          if (match) {
            const quotedValues = match[3]
              .split(/\s*,\s*/)
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => /^\".*\"$/.test(item) ? item : `\"${item}\"`)
              .join(', ');
            return `${match[1]}${match[2]}(${quotedValues})`;
          }
        }
        if (/^(?:Risk|Customer)\s+(=|!=)\s+[^\"]+$/i.test(withLabel)) {
          const match = withLabel.match(/^(.*?\s)(=|!=)\s+(.+)$/);
          if (match) return `${match[1]}${match[2]} \"${match[3].trim()}\"`;
        }
        if (/^(?:Actual DOS|Order Date)\s+(=|!=)\s+.+,.+/i.test(withLabel)) {
          const match = withLabel.match(/^(.*?\s)(=|!=)\s+(.+)$/);
          if (match) {
            const values = match[3].split(',').map((item) => item.trim()).filter(Boolean);
            const connector = match[2] === '!=' ? ' AND ' : ' OR ';
            return `${match[1]}${values.map((item) => `${match[2]} ${item}`).join(connector)}`;
          }
        }
        return withLabel;
      })
      .filter(Boolean);
    this._expressionEl.textContent = expressions
      .map((value) => /\s(?:AND|OR)\s/i.test(value) || /,\s*/.test(value) ? `(${value})` : value)
      .join(` ${this._combineMode} `);
  }

  destroy(): void {
    this._menuObserver?.disconnect();
    this._menuObserver = null;
    if (this._tooltipFrame != null) {
      cancelAnimationFrame(this._tooltipFrame);
      this._tooltipFrame = null;
    }
    if (this._menuTweakTimer != null) {
      clearTimeout(this._menuTweakTimer);
      this._menuTweakTimer = null;
    }
    this._destroySubmenuTooltips();
    this._destroyMenuBadges();
    this._readmeInst?.destroy();
    this._readmeInst = null;
    this._includeBlockedButton?.destroy();
    this._includeBlockedButton = null;
    this._excludeBlockedButton?.destroy();
    this._excludeBlockedButton = null;
    this._warningToast?.destroy();
    this._warningToast = null;
    this._menuInst?.destroy();
    this._menuInst = null;
    this._tabstripInst?.destroy();
    this._tabstripInst = null;
    this._combineDialog?.close('destroy');
    this._combineDialog = null;
    this._smartInput?.destroy();
    this._smartInput = null;
    this._picklistInput?.destroy();
    this._picklistInput = null;
    for (const input of this._measureInputs) input.destroy();
    this._measureInputs = [];
    this._measureLabels = [];
    this._root.remove();
  }

  private _mountMenu(): void {
    this._destroyMenuBadges();
    this._menuInst?.destroy();
    this._menuInst = ArvoDropdownIconButton.initialize(this._menuHost, {
      icon: 'ellipsis-v',
      tooltip: 'Filter options',
      variant: 'tertiary',
      size: 'md',
      isCompact: true,
      placement: 'bottom-end',
      hasGroupDividers: true,
      closeOnSelect: true,
      menuProps: {
        submenuTrigger: 'hover',
        menuWidth: '320px',
        submenuWidth: null,
      },
      items: this._buildMenuItems(),
      onSelect: (item) => this._handleSelect(item),
    });
    this._bindMenuTweaks();
  }

  private _buildMenuItems(): ListGroup<MenuItemData>[] {
    return [
      {
        id: 'filter-actions',
        items: [
          {
            id: 'manage-filters',
            label: 'Manage filters',
            shortcut: 'Shift+M',
            inlineHybridPopover: this._buildManagePopover(),
          },
          {
            id: 'title-font-weight',
            label: 'Title font weight',
            value: this._titleFontWeight,
            submenu: [
              { id: 'title-font-weight-regular', label: 'Regular', active: this._titleFontWeight === 'Regular' },
              { id: 'title-font-weight-semibold', label: 'Semibold', active: this._titleFontWeight === 'Semibold' },
              { id: 'title-font-weight-bold', label: 'Bold', active: this._titleFontWeight === 'Bold' },
            ],
          },
          {
            id: 'combine-measure-filters',
            label: 'Combine measure filters',
            value: this._combineMode,
            submenu: [
              {
                id: 'combine-and',
                label: 'AND condition',
                active: this._combineMode === 'AND',
              },
              {
                id: 'combine-or',
                label: 'OR condition',
                active: this._combineMode === 'OR',
              },
            ],
          },
        ],
      },
      {
        id: 'filter-toggles',
        items: [
          {
            id: 'auto-apply',
            label: 'Auto apply',
            shortcut: 'Shift+A',
            switch: {
              checked: this._autoApply,
              onChange: (checked) => { this._autoApply = checked; },
            },
          },
          {
            id: 'next-prev-nav',
            label: 'Next/previous navigation',
            shortcut: 'Shift+N',
            switch: {
              checked: this._nextPrevNav,
              onChange: (checked) => { this._nextPrevNav = checked; },
            },
          },
          {
            id: 'show-title',
            label: 'Show title',
            shortcut: 'Shift+D',
            switch: {
              checked: this._showTitle,
              onChange: (checked) => { this._showTitle = checked; },
            },
          },
          {
            id: 'auto-wrap',
            label: 'Auto wrap',
            shortcut: 'Shift+W',
            switch: {
              checked: this._autoWrap,
              onChange: (checked) => { this._autoWrap = checked; },
            },
          },
        ],
      },
    ];
  }

  private _handleSelect(item: MenuItemData): false | void {
    if (item.id === 'title-font-weight-regular' || item.id === 'title-font-weight-semibold' || item.id === 'title-font-weight-bold') {
      const nextWeight: TitleFontWeight = item.id === 'title-font-weight-regular'
        ? 'Regular'
        : item.id === 'title-font-weight-semibold'
          ? 'Semibold'
          : 'Bold';
      this._setTitleFontWeight(nextWeight);
      return;
    }

    if (item.id === 'combine-and' || item.id === 'combine-or') {
      const nextMode: CombineMode = item.id === 'combine-and' ? 'AND' : 'OR';
      if (nextMode === this._combineMode) return;
      this._confirmCombineMode(nextMode);
      return;
    }
    return false;
  }

  private _setTitleFontWeight(weight: TitleFontWeight): void {
    this._titleFontWeight = weight;
    this._root.dataset.titleFontWeight = weight.toLowerCase();
    this._mountMenu();
  }

  private _confirmCombineMode(nextMode: CombineMode): void {
    // Version the preference so older test sessions cannot silently suppress
    // the warning after the confirmation behavior changes.
    const preferenceKey = 'arvo-pg:filters:combine-mode-warning-dismissed-v2';
    let skipWarning = false;
    try {
      skipWarning = window.localStorage.getItem(preferenceKey) === '1';
    } catch {
      // Storage may be unavailable in an embedded/private preview.
    }

    const applyMode = () => {
      this._combineMode = nextMode;
      this._updateExpression('');
      this._mountMenu();
    };

    if (skipWarning) {
      applyMode();
      return;
    }

    const message: BasicInlineNode[] = this._combineMode === 'AND'
      ? [
        { type: 'text', value: 'Your measure filters currently require all conditions to be met. ' },
        { type: 'strong', children: [{ type: 'text', value: 'Changing to OR' }] },
        { type: 'text', value: ' will allow results that meet any condition. The results may change based on this condition.' },
      ]
      : [
        { type: 'text', value: 'Your measure filters currently allow results that meet any condition. ' },
        { type: 'strong', children: [{ type: 'text', value: 'Changing to AND' }] },
        { type: 'text', value: ' will require all conditions to be met. The results may change based on this condition.' },
      ];

    this._combineDialog?.close('replaced');
    this._combineDialog = ArvoAlertDialog.initialize({
      variant: 'warning',
      title: nextMode === 'OR' ? 'Change to OR?' : 'Change to AND?',
      message,
      dontShowAgain: {
        label: "Don't show this again",
        onChange: (checked) => {
          try {
            if (checked) {
              window.localStorage.setItem(preferenceKey, '1');
            } else {
              window.localStorage.removeItem(preferenceKey);
            }
          } catch {
            // Ignore unavailable storage; the current confirmation still works.
          }
        },
      },
      primaryAction: {
        label: 'Change',
        onClick: () => applyMode(),
      },
      secondaryAction: { label: 'Cancel' },
      hasBackdrop: true,
      isClosable: true,
    });
    this._combineDialog.open();
  }

  private _buildManagePopover(): HybridPopoverInlineConfig {
    return {
      title: 'Filter Menu',
      variant: 'multi' as const,
      items: [],
      hasBackButton: false,
    };
  }

  private _bindMenuTweaks(): void {
    this._menuObserver?.disconnect();
    this._menuObserver = new MutationObserver((mutations) => {
      const shouldReapply = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) =>
          node instanceof HTMLElement &&
          (node.classList.contains('arvo-action-menu') ||
            node.querySelector?.('.arvo-action-menu')),
        ),
      );
      if (shouldReapply) {
        this._queueMenuTweaks();
      }
    });
    this._menuObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    this._queueMenuTweaks();
  }

  private _queueMenuTweaks(): void {
    if (this._tooltipFrame != null) cancelAnimationFrame(this._tooltipFrame);
    if (this._menuTweakTimer != null) clearTimeout(this._menuTweakTimer);
    this._tooltipFrame = requestAnimationFrame(() => {
      this._tooltipFrame = null;
      this._applyMenuTweaks();
      this._menuTweakTimer = window.setTimeout(() => {
        this._menuTweakTimer = null;
        this._applyMenuTweaks();
      }, 80);
    });
  }

  private _applyMenuTweaks(): void {
    const menus = Array.from(document.querySelectorAll<HTMLElement>('.arvo-action-menu'));
    this._destroySubmenuTooltips();
    this._destroyMenuBadges();

    const combineRow = menus
      .flatMap((menu) => Array.from(menu.querySelectorAll<HTMLElement>('.arvo-menu-item')))
      .find((row) => row.querySelector('.arvo-menu-item__lbl')?.textContent?.trim().startsWith('Combine measure filters'));
    const combineLabel = combineRow?.querySelector<HTMLElement>('.arvo-menu-item__lbl');
    if (combineLabel) {
      combineLabel.querySelector('.arvo-pg-filters__menu-badge')?.remove();
      const badgeHost = document.createElement('span');
      badgeHost.className = 'arvo-pg-filters__menu-badge';
      combineLabel.appendChild(badgeHost);
      this._menuBadges.push(ArvoBadge.initialize(badgeHost, {
        variant: 'label',
        size: 'sm',
        appearance: 'primary',
        colorMode: 'semantic',
        semanticType: 'positive',
        message: 'NEW',
        hasBadgeIcon: false,
      }));
    }

    const submenu = menus.find((menu) =>
      menu.querySelector('.arvo-menu-item__lbl')?.textContent?.includes('All conditions (AND)'),
    );
    const manageRow = menus
      .flatMap((menu) => Array.from(menu.querySelectorAll<HTMLElement>('.arvo-menu-item')))
      .find((row) => row.querySelector('.arvo-menu-item__lbl')?.textContent?.trim() === 'Manage filters');
    if (manageRow) {
      const trailing = manageRow.querySelector<HTMLElement>('.arvo-menu-item__trailing');
      if (trailing && !trailing.querySelector('.o9con-angle-right')) {
        const icon = document.createElement('span');
        icon.className = 'arvo-menu-item__submenu o9con o9con-angle-right';
        icon.setAttribute('aria-hidden', 'true');
        icon.style.pointerEvents = 'none';
        trailing.appendChild(icon);
      }
    }

    if (!submenu) return;

    const rows = Array.from(submenu.querySelectorAll<HTMLElement>('.arvo-menu-item'));
    for (const row of rows) {
      const id = row.getAttribute('data-index');
      const tooltip =
        id === '0'
          ? 'Controls how multiple measure filter conditions are combined. Choose AND to require all conditions.'
          : id === '1'
            ? 'Controls how multiple measure filter conditions are combined. Choose OR to require at least one condition.'
            : '';
      if (!tooltip) continue;
      this._submenuTooltips.push(ArvoTooltip.initialize(row, { content: tooltip, placement: 'right-center' }));
    }
  }

  private _destroySubmenuTooltips(): void {
    for (const tip of this._submenuTooltips) tip.destroy();
    this._submenuTooltips = [];
  }

  private _destroyMenuBadges(): void {
    for (const badge of this._menuBadges) badge.destroy();
    this._menuBadges = [];
  }

}
