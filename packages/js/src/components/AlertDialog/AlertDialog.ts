/**
 * ArvoAlertDialog -- vanilla JS implementation.
 *
 * Standalone modal confirmation dialog. Unlike Popover, AlertDialog is NOT
 * anchored to a trigger element -- it builds its own DOM, appends to a
 * container on open(), and removes itself on close(). Composes ArvoButton,
 * ArvoIconButton, ArvoCheckbox, and ArvoTextbox for inner interactive elements.
 *
 * See descriptors/alert-dialog.json and the React parity reference at
 * packages/react/src/components/AlertDialog/AlertDialog.tsx.
 *
 * Runs on the OverlaySurface engine in modal mode with a picker-silent
 * dismissal pattern.
 */

import {
  createOverlaySurface,
  renderInlineContentToDOM,
  resolveOverlayInitialFocus,
  type ArvoInitialFocusTarget,
  type BasicInlineContent,
  type OverlaySurface,
} from '@arvo/core';
import {
  attachOverlayFooterFit,
  type OverlayFooterFitHandle,
} from '@arvo/utils';
import { ArvoButton } from '../Button/Button';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoCheckbox } from '../Checkbox/Checkbox';
import { ArvoTextbox } from '../Textbox/Textbox';
import { ArvoTextarea } from '../Textarea/Textarea';
import { ArvoCombobox } from '../Combobox/Combobox';
import { ArvoSelect } from '../Select/Select';
import {
  ArvoBannerAlert,
  type ArvoBannerAlertOptions,
} from '../BannerAlert/BannerAlert';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoAlertDialogVariant =
  | 'warning'
  | 'info'
  | 'positive'
  | 'negative'
  | 'block';

export type ArvoAlertDialogCloseReason =
  | 'primary'
  | 'secondary'
  | 'close-button'
  | 'escape'
  | 'backdrop'
  | 'programmatic';

export interface ArvoAlertDialogAction {
  label: string;
  icon?: string;
  onClick?: (e: Event) => void | false;
  isDisabled?: boolean;
  isLoading?: boolean;
  closeOnClick?: boolean;
}

interface ConfirmInputBase<TValue> {
  label?: string;
  placeholder?: string;
  expectedValue?: TValue;
  /**
   * Inner-input size. Defaults to `'lg'` so the input matches the
   * comfortable form factor used inside the dialog body. Pass `'sm'`
   * for compact layouts. (All form inputs in @arvo/js / @arvo/react
   * expose only `'sm'` and `'lg'`; there is no `'md'` in the input
   * size scale.)
   */
  size?: 'sm' | 'lg';
  validate?: (value: TValue) => true | false | string;
  onChange?: (value: TValue) => void;
}

export interface ArvoAlertDialogConfirmInputOptionItem {
  id: string;
  label: string;
  value?: string;
}

export interface ArvoAlertDialogConfirmInputTextbox
  extends ConfirmInputBase<string> {
  type?: 'textbox';
  maxLength?: number;
}

export interface ArvoAlertDialogConfirmInputTextarea
  extends ConfirmInputBase<string> {
  type: 'textarea';
  maxLength?: number;
  rows?: number;
}

export interface ArvoAlertDialogConfirmInputCombobox
  extends ConfirmInputBase<string> {
  type: 'combobox';
  options: ArvoAlertDialogConfirmInputOptionItem[];
}

export interface ArvoAlertDialogConfirmInputSelect
  extends ConfirmInputBase<string> {
  type: 'select';
  options: ArvoAlertDialogConfirmInputOptionItem[];
}

export interface ArvoAlertDialogConfirmInputMultiSelect
  extends Omit<ConfirmInputBase<string[]>, 'expectedValue' | 'validate' | 'onChange'> {
  type: 'multi-select';
  options: ArvoAlertDialogConfirmInputOptionItem[];
  expectedValues?: string[];
  validate?: (value: string[]) => true | false | string;
  onChange?: (value: string[]) => void;
}

export type ArvoAlertDialogConfirmInput =
  | ArvoAlertDialogConfirmInputTextbox
  | ArvoAlertDialogConfirmInputTextarea
  | ArvoAlertDialogConfirmInputCombobox
  | ArvoAlertDialogConfirmInputSelect
  | ArvoAlertDialogConfirmInputMultiSelect;

export interface ArvoAlertDialogDontShow {
  label?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

export interface ArvoAlertDialogOptions {
  variant?: ArvoAlertDialogVariant;
  title: string;
  /**
   * Body message. Plain string OR a `BasicInlineContent` array
   * (`InlineNode[]`) from `@arvo/core/inline-content`.
   */
  message?: BasicInlineContent;
  content?: string | HTMLElement | ((container: HTMLElement) => void);
  /**
   * Optional ArvoBannerAlert config rendered between header and body.
   * The dialog instantiates the banner internally; consumers do not
   * construct DOM.
   */
  bannerAlert?: ArvoBannerAlertOptions;
  hasDangerAction?: boolean;
  primaryAction?: ArvoAlertDialogAction;
  secondaryAction?: ArvoAlertDialogAction | null;
  hasSecondaryBtn?: boolean;
  /**
   * Whether the primary button is rendered. Defaults to `true`. Only
   * honored when `variant: 'warning'`.
   */
  hasPrimaryBtn?: boolean;
  isClosable?: boolean;
  hasBackdrop?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  confirmInput?: ArvoAlertDialogConfirmInput | null;
  dontShowAgain?: ArvoAlertDialogDontShow | boolean | null;
  isLoading?: boolean;
  isDisabled?: boolean;
  container?: HTMLElement | string | null;
  initialFocus?: ArvoInitialFocusTarget | null;
  onOpen?: () => void | false;
  onClose?: (detail: { reason: ArvoAlertDialogCloseReason | string }) => void | false;
  onConfirmInputChange?: (value: string | string[]) => void;
  onDontShowAgainChange?: (checked: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ResolvedOptions {
  variant: ArvoAlertDialogVariant;
  title: string;
  message: BasicInlineContent | null;
  content:
    | string
    | HTMLElement
    | ((container: HTMLElement) => void)
    | null;
  bannerAlert: ArvoBannerAlertOptions | null;
  hasDangerAction: boolean;
  primaryAction: ArvoAlertDialogAction;
  secondaryAction: ArvoAlertDialogAction | null;
  hasSecondaryBtn: boolean;
  hasPrimaryBtn: boolean;
  isClosable: boolean;
  hasBackdrop: boolean;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  confirmInput: ArvoAlertDialogConfirmInput | null;
  dontShowAgain: ArvoAlertDialogDontShow | null;
  isLoading: boolean;
  isDisabled: boolean;
  container: HTMLElement | string | null;
  initialFocus: ArvoInitialFocusTarget;
  onOpen: (() => void | false) | null;
  onClose:
    | ((detail: { reason: ArvoAlertDialogCloseReason | string }) => void | false)
    | null;
  onConfirmInputChange: ((value: string | string[]) => void) | null;
  onDontShowAgainChange: ((checked: boolean) => void) | null;
}

const DEFAULT_PRIMARY: ArvoAlertDialogAction = { label: 'OK' };
const DEFAULT_SECONDARY: ArvoAlertDialogAction = { label: 'Cancel' };

function normalizeDontShow(
  v: ArvoAlertDialogDontShow | boolean | null | undefined,
): ArvoAlertDialogDontShow | null {
  if (v == null || v === false) return null;
  if (v === true) return {};
  return v;
}

function renderContentInto(
  container: HTMLElement,
  content: string | HTMLElement | ((el: HTMLElement) => void),
): void {
  container.textContent = '';
  if (typeof content === 'string') {
    container.innerHTML = content;
  } else if (typeof content === 'function') {
    content(container);
  } else if (content instanceof Node) {
    container.appendChild(content);
  }
}

let _idCounter = 0;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoAlertDialog {
  private _options: ResolvedOptions;

  // DOM tree
  private _rootEl: HTMLDivElement | null = null;
  private _panelEl: HTMLDivElement | null = null;
  private _headerEl: HTMLDivElement | null = null;
  private _icoEl: HTMLSpanElement | null = null;
  private _titleEl: HTMLParagraphElement | null = null;
  private _bodyEl: HTMLDivElement | null = null;
  private _msgEl: HTMLParagraphElement | null = null;
  private _confirmInputWrapEl: HTMLDivElement | null = null;
  private _footerEl: HTMLDivElement | null = null;
  private _dontShowEl: HTMLDivElement | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _primaryBtnEl: HTMLButtonElement | null = null;
  private _secondaryBtnEl: HTMLButtonElement | null = null;
  private _footerFit: OverlayFooterFitHandle | null = null;

  // Inner component instances
  private _closeBtnInstance: ArvoIconButton | null = null;
  private _primaryBtnInstance: ArvoButton | null = null;
  private _secondaryBtnInstance: ArvoButton | null = null;
  private _dontShowInstance: ArvoCheckbox | null = null;
  private _confirmInputInstance: ArvoTextbox | null = null;

  // Lifecycle state
  private _surface: OverlaySurface | null = null;
  private _isOpen = false;
  private _confirmValue = '';
  private _confirmValues: string[] = [];
  private _confirmErrorEl: HTMLParagraphElement | null = null;
  private _confirmInputAltInstance: ArvoTextarea | ArvoCombobox | ArvoSelect | null = null;
  private _bannerEl: HTMLDivElement | null = null;
  private _bannerInstance: ArvoBannerAlert | null = null;
  private _dontShowChecked = false;
  private _dialogId: string;
  private _titleId: string;
  private _bodyId: string;

  // Two-path close split (picker-silent pattern): when true the programmatic
  // path already dispatched `alert-dlg:close` and vetoed via onClose. The
  // engine's onClose callback early-returns to avoid double-dispatch.
  private _closingProgrammatically = false;

  // Bound Escape listener (managed separately from engine because the hub's
  // isDismissable ties Escape to autoCloseOnOutsideClick -- we need
  // independent closeOnEscape + closeOnBackdrop control, matching React hook).
  private _boundHandleKeyDown: (e: KeyboardEvent) => void;

  static initialize(options: ArvoAlertDialogOptions): ArvoAlertDialog {
    return new ArvoAlertDialog(options);
  }

  constructor(options: ArvoAlertDialogOptions) {
    const uid = ++_idCounter;
    this._dialogId = `arvo-alert-dlg-${uid}`;
    this._titleId = `arvo-alert-dlg-title-${uid}`;
    this._bodyId = `arvo-alert-dlg-body-${uid}`;

    this._options = this._resolveOptions(options);
    this._dontShowChecked = this._options.dontShowAgain?.defaultChecked ?? false;

    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    this._render();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    if (this._isOpen) return;
    if (this._options.onOpen?.() === false) return;
    if (!this._rootEl || !this._panelEl) return;

    this._isOpen = true;

    const container = this._resolveContainer();
    container.appendChild(this._rootEl);
    this._rootEl.classList.add('open');

    // Build the engine surface lazily on first open (or rebuild if destroyed).
    if (!this._surface) {
      this._surface = createOverlaySurface({
        id: this._dialogId,
        surface: this._panelEl,
        // Pin the outer host's stacking context to the panel's hub-assigned
        // z-index so consumer-level zIndexBase tuning (overlayHub.configure)
        // lifts the WHOLE dialog above sibling overlays -- not just the
        // inner panel inside a wrapper trapped at the SCSS fallback layer.
        surfaceRoot: this._rootEl,
        type: 'modal',
        priority: 10,
        trigger: null,
        position: false,
        focus: {
          mode: 'trap',
          initialFocus: this._options.initialFocus === 'none'
            ? 'none'
            : () => this._resolveInitialFocus(),
          returnFocus: true,
        },
        mask: this._options.hasBackdrop !== false
          ? {
              className: 'arvo-alert-dlg__overlay-mask',
              closeOnClick: this._options.closeOnBackdrop,
              onOutside: () => { void this._surface?.close(); },
            }
          : undefined,
        managesOwnBackdrop: true,
        transition: 'scale',
        transitionDuration: 150,
        closeOnOutside: this._options.closeOnBackdrop,
        triggerAria: false,
        onClose: () => this._handleEngineClose(),
      });
    }

    void this._surface.open();

    // Escape listener (separate from engine -- hub ties Escape to
    // autoCloseOnOutsideClick which we set to false).
    if (this._options.closeOnEscape) {
      document.addEventListener('keydown', this._boundHandleKeyDown, true);
    }

    this._dispatchEvent('alert-dlg:open', {});
  }

  close(reason: ArvoAlertDialogCloseReason | string = 'programmatic'): void {
    if (!this._isOpen) return;
    if (this._options.onClose?.({ reason }) === false) return;

    this._isOpen = false;
    document.removeEventListener('keydown', this._boundHandleKeyDown, true);

    this._dispatchEvent('alert-dlg:close', { reason });

    // Reset confirm state so a re-open starts clean (parity with React).
    this._confirmValue = '';
    this._confirmValues = [];
    if (this._confirmInputInstance) {
      this._confirmInputInstance.value('');
    }

    // Signal the engine onClose callback to skip (programmatic path owns state).
    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;

    // The engine exit-transition removes `open` from the panel; remove the
    // root wrapper from DOM after the transition window.
    const root = this._rootEl;
    window.setTimeout(() => {
      root?.classList.remove('open');
      if (root && root.parentNode) {
        root.parentNode.removeChild(root);
      }
    }, 160);
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  title(): string;
  title(value: string): void;
  title(value?: string): string | void {
    if (value === undefined) {
      return this._options.title;
    }
    this._options.title = value;
    if (this._titleEl) this._titleEl.textContent = value;
  }

  message(): BasicInlineContent;
  message(value: BasicInlineContent): void;
  message(value?: BasicInlineContent): BasicInlineContent | void {
    if (value === undefined) {
      return this._options.message ?? '';
    }
    this._options.message = value;
    if (!this._bodyEl) return;
    if (!this._msgEl) {
      this._msgEl = document.createElement('p');
      this._msgEl.className = 'arvo-alert-dlg__msg';
      if (this._confirmInputWrapEl) {
        this._bodyEl.insertBefore(this._msgEl, this._confirmInputWrapEl);
      } else {
        this._bodyEl.insertBefore(this._msgEl, this._bodyEl.firstChild);
      }
    }
    while (this._msgEl.firstChild) this._msgEl.removeChild(this._msgEl.firstChild);
    if (typeof value === 'string') {
      this._msgEl.textContent = value;
    } else {
      this._msgEl.appendChild(
        renderInlineContentToDOM(value, { profile: 'basic-inline' }),
      );
    }
  }

  renderContent(
    content: string | HTMLElement | ((container: HTMLElement) => void),
  ): void {
    this._options.content = content;
    if (!this._bodyEl) return;
    this._msgEl?.remove();
    this._msgEl = null;

    const fragment = document.createDocumentFragment();
    const scratch = document.createElement('div');
    renderContentInto(scratch, content);
    while (scratch.firstChild) {
      fragment.appendChild(scratch.firstChild);
    }
    if (this._confirmInputWrapEl) {
      this._bodyEl.insertBefore(fragment, this._confirmInputWrapEl);
    } else {
      this._bodyEl.textContent = '';
      this._bodyEl.appendChild(fragment);
    }
  }

  setVariant(variant: ArvoAlertDialogVariant): void {
    if (variant === this._options.variant) return;
    this._rootEl?.classList.remove(`arvo-alert-dlg--${this._options.variant}`);
    this._rootEl?.classList.add(`arvo-alert-dlg--${variant}`);
    this._options.variant = variant;
  }

  setActions(actions: {
    primary?: Partial<ArvoAlertDialogAction>;
    secondary?: Partial<ArvoAlertDialogAction> | null;
  }): void {
    if (actions.primary) {
      this._options.primaryAction = {
        ...this._options.primaryAction,
        ...actions.primary,
      };
      this._applyActionToButton(
        this._primaryBtnInstance,
        actions.primary,
        true,
      );
    }
    if (actions.secondary !== undefined) {
      if (actions.secondary === null) {
        this._options.secondaryAction = null;
        if (this._secondaryBtnInstance) {
          this._secondaryBtnInstance.disabled(true);
        }
      } else {
        this._options.secondaryAction = {
          ...(this._options.secondaryAction ?? DEFAULT_SECONDARY),
          ...actions.secondary,
        };
        this._applyActionToButton(
          this._secondaryBtnInstance,
          actions.secondary,
          false,
        );
      }
    }
    // Label/icon mutations can change a button's intrinsic width; remeasure
    // so the equal-column basis tracks the widest label.
    if (
      actions.primary?.label !== undefined ||
      actions.primary?.icon !== undefined ||
      (actions.secondary &&
        typeof actions.secondary === 'object' &&
        ('label' in actions.secondary || 'icon' in actions.secondary))
    ) {
      this._footerFit?.measure();
    }
  }

  setLoading(loading: boolean): void {
    if (this._options.isLoading === loading) return;
    this._options.isLoading = loading;
    this._rootEl?.classList.toggle('loading', loading);
    if (this._panelEl) {
      if (loading) this._panelEl.setAttribute('aria-busy', 'true');
      else this._panelEl.removeAttribute('aria-busy');
    }
    this._refreshButtonDisabledStates();
    this._closeBtnInstance?.disabled(loading || this._options.isDisabled);
    this._dontShowInstance?.disabled(loading || this._options.isDisabled);
  }

  confirmValue(): string {
    return this._confirmValue;
  }

  dontShowAgainChecked(): boolean;
  dontShowAgainChecked(value: boolean): void;
  dontShowAgainChecked(value?: boolean): boolean | void {
    if (value === undefined) {
      return this._dontShowChecked;
    }
    this._dontShowChecked = value;
    if (this._dontShowInstance) {
      this._dontShowInstance.toggle(value);
    }
  }

  destroy(): void {
    // Destroy the engine surface first (deactivates trap, hides mask, unregisters hub).
    this._surface?.destroy();
    this._surface = null;

    if (this._isOpen) {
      this._isOpen = false;
      document.removeEventListener('keydown', this._boundHandleKeyDown, true);
    }

    this._closeBtnInstance?.destroy();
    this._primaryBtnInstance?.destroy();
    this._secondaryBtnInstance?.destroy();
    this._dontShowInstance?.destroy();
    this._confirmInputInstance?.destroy();
    this._confirmInputAltInstance?.destroy?.();
    this._bannerInstance?.destroy();
    this._footerFit?.destroy();
    this._footerFit = null;
    this._closeBtnInstance = null;
    this._primaryBtnInstance = null;
    this._secondaryBtnInstance = null;
    this._primaryBtnEl = null;
    this._secondaryBtnEl = null;
    this._dontShowInstance = null;
    this._confirmInputInstance = null;
    this._confirmInputAltInstance = null;
    this._bannerInstance = null;

    if (this._rootEl && this._rootEl.parentNode) {
      this._rootEl.parentNode.removeChild(this._rootEl);
    }

    this._rootEl = null;
    this._panelEl = null;
    this._headerEl = null;
    this._icoEl = null;
    this._titleEl = null;
    this._bodyEl = null;
    this._msgEl = null;
    this._confirmInputWrapEl = null;
    this._footerEl = null;
    this._dontShowEl = null;
    this._actionsEl = null;
  }

  // ---------------------------------------------------------------------------
  // Two-path close: engine callback (picker-silent pattern)
  // ---------------------------------------------------------------------------

  private _handleEngineClose(): void {
    if (this._closingProgrammatically) {
      // Programmatic close already dispatched `alert-dlg:close` and handled
      // state; the engine confirms by calling onClose -- nothing else needed.
      return;
    }
    // Engine-driven path (Escape via own listener / backdrop via mask onOutside):
    // SILENT -- no event dispatch, no user onClose callback. Matches React.
    this._isOpen = false;
    document.removeEventListener('keydown', this._boundHandleKeyDown, true);

    // Reset confirm state on engine-driven close as well.
    this._confirmValue = '';
    this._confirmValues = [];
    if (this._confirmInputInstance) {
      this._confirmInputInstance.value('');
    }

    // Remove the root from DOM after exit transition.
    const root = this._rootEl;
    window.setTimeout(() => {
      root?.classList.remove('open');
      if (root && root.parentNode) {
        root.parentNode.removeChild(root);
      }
    }, 160);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private _render(): void {
    const o = this._options;

    // Root
    this._rootEl = document.createElement('div');
    this._rootEl.className = this._buildRootClasses();

    // Panel
    this._panelEl = document.createElement('div');
    this._panelEl.id = this._dialogId;
    this._panelEl.className = 'arvo-alert-dlg__panel';
    this._panelEl.setAttribute('role', 'alertdialog');
    this._panelEl.setAttribute('aria-modal', 'true');
    this._panelEl.setAttribute('aria-labelledby', this._titleId);
    this._panelEl.setAttribute('aria-describedby', this._bodyId);
    if (o.isLoading) this._panelEl.setAttribute('aria-busy', 'true');
    this._panelEl.tabIndex = -1;

    this._renderHeader();
    this._renderBanner();
    this._renderBody();
    this._renderFooter();

    if (this._headerEl) this._panelEl.appendChild(this._headerEl);
    if (this._bannerEl) this._panelEl.appendChild(this._bannerEl);
    if (this._bodyEl) this._panelEl.appendChild(this._bodyEl);
    if (this._footerEl) this._panelEl.appendChild(this._footerEl);

    this._rootEl.appendChild(this._panelEl);
  }

  private _renderBanner(): void {
    const o = this._options;
    if (!o.bannerAlert) return;
    this._bannerEl = document.createElement('div');
    this._bannerEl.className = 'arvo-alert-dlg__banner';
    const host = document.createElement('div');
    this._bannerEl.appendChild(host);
    this._bannerInstance = ArvoBannerAlert.initialize(host, o.bannerAlert);
  }

  private _renderHeader(): void {
    const o = this._options;
    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-alert-dlg__header';

    this._icoEl = document.createElement('span');
    this._icoEl.className = 'arvo-alert-dlg__ico o9con';
    this._icoEl.setAttribute('aria-hidden', 'true');
    this._headerEl.appendChild(this._icoEl);

    this._titleEl = document.createElement('p');
    this._titleEl.id = this._titleId;
    this._titleEl.className = 'arvo-alert-dlg__title';
    this._titleEl.textContent = o.title;
    this._headerEl.appendChild(this._titleEl);

    if (o.isClosable) {
      const wrap = document.createElement('span');
      wrap.className = 'arvo-alert-dlg__close-btn';
      const btnEl = document.createElement('button') as HTMLButtonElement;
      this._closeBtnInstance = ArvoIconButton.initialize(btnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'close',
        tooltip: 'Close',
        isDisabled: o.isLoading || o.isDisabled,
        onClick: () => this.close('close-button'),
      });
      btnEl.setAttribute('aria-label', 'Close dialog');
      wrap.appendChild(btnEl);
      this._headerEl.appendChild(wrap);
    }
  }

  private _renderBody(): void {
    const o = this._options;
    this._bodyEl = document.createElement('div');
    this._bodyEl.id = this._bodyId;
    this._bodyEl.className = 'arvo-alert-dlg__body';

    if (o.content !== null && o.content !== undefined) {
      const scratch = document.createElement('div');
      renderContentInto(scratch, o.content);
      while (scratch.firstChild) {
        this._bodyEl.appendChild(scratch.firstChild);
      }
    } else if (o.message != null) {
      this._msgEl = document.createElement('p');
      this._msgEl.className = 'arvo-alert-dlg__msg';
      if (typeof o.message === 'string') {
        this._msgEl.textContent = o.message;
      } else {
        this._msgEl.appendChild(
          renderInlineContentToDOM(o.message, { profile: 'basic-inline' }),
        );
      }
      this._bodyEl.appendChild(this._msgEl);
    }

    if (o.confirmInput) {
      this._confirmInputWrapEl = document.createElement('div');
      this._confirmInputWrapEl.className = 'arvo-alert-dlg__confirm-input';
      this._renderConfirmInput(this._confirmInputWrapEl, o.confirmInput);
      this._bodyEl.appendChild(this._confirmInputWrapEl);
    }
  }

  private _renderConfirmInput(
    wrap: HTMLDivElement,
    ci: ArvoAlertDialogConfirmInput,
  ): void {
    const o = this._options;
    const isDisabled = o.isLoading || o.isDisabled;
    const inputType = ci.type ?? 'textbox';
    const inputSize: 'sm' | 'lg' = (ci as { size?: 'sm' | 'lg' }).size ?? 'lg';

    if (inputType === 'textbox') {
      const tbEl = document.createElement('div');
      this._confirmInputInstance = ArvoTextbox.initialize(tbEl, {
        size: inputSize,
        isFullWidth: true,
        label: ci.label,
        placeholder: ci.placeholder,
        maxLength: (ci as ArvoAlertDialogConfirmInputTextbox).maxLength ?? null,
        value: '',
        isDisabled,
        onInput: (e: Event) =>
          this._handleConfirmInput(
            (e.target as HTMLInputElement | null)?.value ?? '',
          ),
        onKeyDown: (e: KeyboardEvent) => this._handleConfirmKeyDown(e),
      });
      wrap.appendChild(tbEl);
    } else if (inputType === 'textarea') {
      const taEl = document.createElement('div');
      const taOpts = ci as ArvoAlertDialogConfirmInputTextarea;
      this._confirmInputAltInstance = ArvoTextarea.initialize(taEl, {
        size: inputSize,
        isFullWidth: true,
        label: ci.label,
        placeholder: ci.placeholder,
        maxLength: taOpts.maxLength ?? null,
        rows: taOpts.rows,
        value: '',
        isDisabled,
        onInput: (e: Event) =>
          this._handleConfirmInput(
            (e.target as HTMLTextAreaElement | null)?.value ?? '',
          ),
      });
      wrap.appendChild(taEl);
      const textareaEl = taEl.querySelector<HTMLTextAreaElement>('textarea');
      textareaEl?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          this._handleConfirmKeyDown(e);
        }
      });
    } else if (inputType === 'combobox' || inputType === 'multi-select') {
      if (
        inputType === 'multi-select' &&
        typeof process !== 'undefined' &&
        process.env?.NODE_ENV !== 'production' &&
        typeof console !== 'undefined' &&
        typeof console.warn === 'function'
      ) {
        console.warn(
          '[ArvoAlertDialog] confirmInput type "multi-select" is pending until ArvoMultiSelect ships; falling back to combobox single-select.',
        );
      }
      const cbEl = document.createElement('div');
      const items = (
        ci as
          | ArvoAlertDialogConfirmInputCombobox
          | ArvoAlertDialogConfirmInputMultiSelect
      ).options.map((o) => ({ id: o.id, label: o.label, value: o.value ?? o.id }));
      this._confirmInputAltInstance = ArvoCombobox.initialize(cbEl, {
        size: inputSize,
        isFullWidth: true,
        label: ci.label,
        placeholder: ci.placeholder,
        items,
        isDisabled,
        onChange: (item) => {
          const next = item ? String(item.value ?? item.id) : '';
          if (inputType === 'multi-select') {
            this._handleMultiConfirmInput(next ? [next] : []);
          } else {
            this._handleConfirmInput(next);
          }
        },
      });
      wrap.appendChild(cbEl);
    } else if (inputType === 'select') {
      const selEl = document.createElement('div');
      const items = (ci as ArvoAlertDialogConfirmInputSelect).options.map(
        (o) => ({ id: o.id, label: o.label, value: o.value ?? o.id }),
      );
      this._confirmInputAltInstance = ArvoSelect.initialize(selEl, {
        size: inputSize,
        isFullWidth: true,
        label: ci.label,
        placeholder: ci.placeholder,
        items,
        isDisabled,
        onChange: (item) => {
          this._handleConfirmInput(item ? String(item.value ?? item.id) : '');
        },
      });
      wrap.appendChild(selEl);
    }

    this._confirmErrorEl = document.createElement('p');
    this._confirmErrorEl.className = 'arvo-alert-dlg__confirm-error';
    this._confirmErrorEl.setAttribute('role', 'alert');
    this._confirmErrorEl.style.display = 'none';
    wrap.appendChild(this._confirmErrorEl);
  }

  private _handleMultiConfirmInput(next: string[]): void {
    this._confirmValues = next;
    const ci = this._options.confirmInput;
    if (ci?.type === 'multi-select') {
      ci.onChange?.(next);
    }
    this._options.onConfirmInputChange?.(next);
    this._refreshConfirmError();
    this._refreshButtonDisabledStates();
  }

  private _refreshConfirmError(): void {
    if (!this._confirmErrorEl) return;
    const err = this._confirmValidationError();
    if (err) {
      this._confirmErrorEl.textContent = err;
      this._confirmErrorEl.style.display = '';
    } else {
      this._confirmErrorEl.textContent = '';
      this._confirmErrorEl.style.display = 'none';
    }
  }

  private _renderFooter(): void {
    const o = this._options;
    this._footerEl = document.createElement('div');
    this._footerEl.className = 'arvo-alert-dlg__footer';

    if (o.dontShowAgain) {
      this._dontShowEl = document.createElement('div');
      this._dontShowEl.className = 'arvo-alert-dlg__dont-show';
      const cbEl = document.createElement('span');
      const label = o.dontShowAgain.label ?? "Don't show this again";
      this._dontShowInstance = ArvoCheckbox.initialize(cbEl, {
        size: 'sm',
        label,
        isChecked: this._dontShowChecked,
        isDisabled: o.isLoading || o.isDisabled,
        onChange: (detail) => this._handleDontShowChange(detail.isChecked),
      });
      this._dontShowEl.appendChild(cbEl);
      this._footerEl.appendChild(this._dontShowEl);
    }

    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-alert-dlg__actions';

    const showSecondary = o.hasSecondaryBtn && o.secondaryAction !== null;
    if (showSecondary && o.secondaryAction) {
      const secEl = document.createElement('button') as HTMLButtonElement;
      this._secondaryBtnEl = secEl;
      this._secondaryBtnInstance = ArvoButton.initialize(secEl, {
        variant: 'secondary',
        size: 'md',
        label: o.secondaryAction.label,
        icon: o.secondaryAction.icon ?? null,
        isDisabled:
          o.isLoading ||
          o.isDisabled ||
          o.secondaryAction.isDisabled === true,
        isLoading: o.secondaryAction.isLoading === true,
        onClick: (e: Event) => this._handleSecondaryClick(e),
      });
      this._actionsEl.appendChild(secEl);
    }

    const primary = o.primaryAction;
    const primaryEl = document.createElement('button') as HTMLButtonElement;
    this._primaryBtnEl = primaryEl;
    this._primaryBtnInstance = ArvoButton.initialize(primaryEl, {
      variant: o.hasDangerAction ? 'danger' : 'primary',
      size: 'md',
      label: primary.label,
      icon: primary.icon ?? null,
      isDisabled: this._isPrimaryDisabled(),
      isLoading: primary.isLoading === true,
      onClick: (e: Event) => this._handlePrimaryClick(e),
    });
    this._actionsEl.appendChild(primaryEl);

    this._footerEl.appendChild(this._actionsEl);

    // Overlay-family shared rule: grow the equal-column flex basis
    // (--arvo-overlay-footer-btn-min) when labels would otherwise truncate
    // at the 112px floor. Paired with the `overlay-footer-actions-layout`
    // SCSS mixin (6px gap from `arvo-alert-dlg__actions`).
    this._footerFit?.destroy();
    this._footerFit = attachOverlayFooterFit(this._actionsEl, { gap: 6 });
  }

  // ---------------------------------------------------------------------------
  // Class string builder
  // ---------------------------------------------------------------------------

  private _buildRootClasses(): string {
    const {
      variant,
      hasDangerAction,
      isClosable,
      isLoading,
    } = this._options;
    return [
      'arvo-alert-dlg',
      `arvo-alert-dlg--${variant}`,
      hasDangerAction && 'arvo-alert-dlg--danger',
      isClosable && 'arvo-alert-dlg--closable',
      isLoading && 'loading',
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------

  private _handlePrimaryClick(e: Event): void {
    if (this._isPrimaryBlocked()) return;
    this._runAction(this._options.primaryAction, 'primary', e);
  }

  private _handleSecondaryClick(e: Event): void {
    const sec = this._options.secondaryAction;
    if (!sec) return;
    this._runAction(sec, 'secondary', e);
  }

  private _runAction(
    action: ArvoAlertDialogAction,
    reason: 'primary' | 'secondary',
    e: Event,
  ): void {
    const result = action.onClick?.(e);
    this._dispatchEvent('alert-dlg:action', {
      action: reason,
      confirmValue: this._options.confirmInput ? this._confirmValue : null,
      dontShowAgain: this._options.dontShowAgain ? this._dontShowChecked : null,
    });
    if (result === false) return;
    if (action.closeOnClick !== false) {
      this.close(reason);
    }
  }

  private _handleConfirmInput(value: string): void {
    this._confirmValue = value;
    const ci = this._options.confirmInput;
    if (ci && ci.type !== 'multi-select') {
      ci.onChange?.(value);
    }
    this._options.onConfirmInputChange?.(value);
    this._refreshConfirmError();
    this._refreshButtonDisabledStates();
  }

  private _handleConfirmKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    if (this._isPrimaryBlocked()) return;
    e.preventDefault();
    this._runAction(this._options.primaryAction, 'primary', e);
  }

  private _handleDontShowChange(checked: boolean): void {
    this._dontShowChecked = checked;
    this._options.dontShowAgain?.onChange?.(checked);
    this._options.onDontShowAgainChange?.(checked);
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    if (!this._isOpen) return;
    e.stopPropagation();
    // Engine-driven Escape: directly close the surface (silent path).
    void this._surface?.close();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _resolveOptions(o: ArvoAlertDialogOptions): ResolvedOptions {
    if (
      o.hasPrimaryBtn === false &&
      o.variant !== 'warning' &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production' &&
      typeof console !== 'undefined' &&
      typeof console.warn === 'function'
    ) {
      console.warn(
        '[ArvoAlertDialog] `hasPrimaryBtn: false` is only honored when `variant: "warning"`. The primary button will be rendered.',
      );
    }
    return {
      variant: o.variant ?? 'warning',
      title: o.title,
      message: o.message ?? null,
      content: o.content ?? null,
      bannerAlert: o.bannerAlert ?? null,
      hasDangerAction: o.hasDangerAction ?? false,
      primaryAction: o.primaryAction ?? DEFAULT_PRIMARY,
      secondaryAction:
        o.secondaryAction === null
          ? null
          : o.secondaryAction ?? DEFAULT_SECONDARY,
      hasSecondaryBtn: o.hasSecondaryBtn ?? true,
      hasPrimaryBtn: o.hasPrimaryBtn ?? true,
      isClosable: o.isClosable ?? false,
      hasBackdrop: o.hasBackdrop ?? true,
      closeOnBackdrop: o.closeOnBackdrop ?? false,
      closeOnEscape: o.closeOnEscape ?? true,
      confirmInput: o.confirmInput ?? null,
      dontShowAgain: normalizeDontShow(o.dontShowAgain),
      isLoading: o.isLoading ?? false,
      isDisabled: o.isDisabled ?? false,
      container: o.container ?? null,
      initialFocus: o.initialFocus ?? 'auto',
      onOpen: o.onOpen ?? null,
      onClose: o.onClose ?? null,
      onConfirmInputChange: o.onConfirmInputChange ?? null,
      onDontShowAgainChange: o.onDontShowAgainChange ?? null,
    };
  }

  private _resolveInitialFocus(): HTMLElement | null {
    const target = this._options.initialFocus;
    if (target !== 'auto') {
      return resolveOverlayInitialFocus({
        initialFocus: target,
        root: this._panelEl,
        body: this._bodyEl,
        footer: this._footerEl,
        header: this._headerEl,
      });
    }

    const variant = this._options.variant;
    const preferSecondary =
      variant === 'warning' || variant === 'negative' || variant === 'block';
    if (preferSecondary) {
      return this._secondaryBtnEl ?? this._primaryBtnEl ?? resolveOverlayInitialFocus({
        initialFocus: 'auto',
        root: this._panelEl,
        body: this._bodyEl,
        footer: this._footerEl,
        header: this._headerEl,
      });
    }
    return this._primaryBtnEl ?? this._secondaryBtnEl ?? resolveOverlayInitialFocus({
      initialFocus: 'auto',
      root: this._panelEl,
      body: this._bodyEl,
      footer: this._footerEl,
      header: this._headerEl,
    });
  }

  private _resolveContainer(): HTMLElement {
    const c = this._options.container;
    if (!c) return document.body;
    if (typeof c === 'string') {
      return document.querySelector<HTMLElement>(c) ?? document.body;
    }
    return c;
  }

  private _isPrimaryDisabledByConfirm(): boolean {
    const ci = this._options.confirmInput;
    if (!ci) return false;
    if (ci.type === 'multi-select') {
      const expected = ci.expectedValues;
      if (expected) {
        const actual = this._confirmValues;
        const sameLen = actual.length === expected.length;
        const sameSet = sameLen && expected.every((v) => actual.includes(v));
        if (!sameSet) return true;
      }
      const r = ci.validate?.(this._confirmValues);
      if (r === false || typeof r === 'string') return true;
      return false;
    }
    const expected = ci.expectedValue;
    if (expected != null && this._confirmValue !== expected) return true;
    const r = ci.validate?.(this._confirmValue);
    if (r === false || typeof r === 'string') return true;
    return false;
  }

  private _confirmValidationError(): string | null {
    const ci = this._options.confirmInput;
    if (!ci) return null;
    if (ci.type === 'multi-select') {
      const r = ci.validate?.(this._confirmValues);
      return typeof r === 'string' ? r : null;
    }
    const r = ci.validate?.(this._confirmValue);
    return typeof r === 'string' ? r : null;
  }

  private _isPrimaryDisabled(): boolean {
    const o = this._options;
    return (
      o.isLoading ||
      o.isDisabled ||
      o.primaryAction.isDisabled === true ||
      this._isPrimaryDisabledByConfirm()
    );
  }

  private _isPrimaryBlocked(): boolean {
    return this._isPrimaryDisabled();
  }

  private _refreshButtonDisabledStates(): void {
    const o = this._options;
    this._primaryBtnInstance?.disabled(this._isPrimaryDisabled());
    if (this._secondaryBtnInstance) {
      const sec = o.secondaryAction;
      this._secondaryBtnInstance.disabled(
        o.isLoading || o.isDisabled || sec?.isDisabled === true,
      );
    }
  }

  private _applyActionToButton(
    btn: ArvoButton | null,
    next: Partial<ArvoAlertDialogAction>,
    isPrimary: boolean,
  ): void {
    if (!btn) return;
    if (next.label !== undefined) btn.setLabel(next.label);
    if (next.icon !== undefined) btn.setIcon(next.icon ?? null);
    if (next.isLoading !== undefined) btn.setLoading(next.isLoading);
    if (next.isDisabled !== undefined || next.isLoading !== undefined) {
      if (isPrimary) {
        btn.disabled(this._isPrimaryDisabled());
      } else {
        const o = this._options;
        const sec = o.secondaryAction;
        btn.disabled(
          o.isLoading || o.isDisabled || sec?.isDisabled === true,
        );
      }
    }
  }

  private _dispatchEvent(
    eventName: string,
    detail: Record<string, unknown> = {},
  ): void {
    this._panelEl?.dispatchEvent(
      new CustomEvent(eventName, {
        bubbles: true,
        cancelable: false,
        detail,
      }),
    );
  }
}

export default ArvoAlertDialog;
