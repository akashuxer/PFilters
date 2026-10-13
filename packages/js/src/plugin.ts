import { ArvoButton, type ArvoButtonOptions } from './components/Button';
import { ArvoIconButton, type ArvoIconButtonOptions } from './components/IconButton';
import { ArvoToggleButton, type ArvoToggleButtonOptions } from './components/ToggleButton';
import { ArvoTextbox, type ArvoTextboxOptions } from './components/Textbox';
import { ArvoTextarea, type ArvoTextareaOptions } from './components/Textarea';
import { ArvoNumberInput, type ArvoNumberInputOptions } from './components/NumberInput';
import { ArvoRadio, type ArvoRadioOptions } from './components/Radio';
import { ArvoCheckbox, type ArvoCheckboxOptions } from './components/Checkbox';
import { ArvoCheckboxGroup, type ArvoCheckboxGroupOptions } from './components/CheckboxGroup';
import { ArvoRadioGroup, type ArvoRadioGroupOptions } from './components/RadioGroup';
import { ArvoSwitch, type ArvoSwitchOptions } from './components/Switch';
import { ArvoPopover, type ArvoPopoverOptions } from './components/Popover';
import { ArvoHybridPopover, type ArvoHybridPopoverOptions } from './components/HybridPopover';
import { ArvoButtonGroup, type ArvoButtonGroupOptions } from './components/ButtonGroup';
import { ArvoFabButton, type ArvoFabButtonOptions } from './components/FabButton';
import { ArvoLink, type ArvoLinkOptions } from './components/Link';
import { ArvoButtonLink, type ArvoButtonLinkOptions } from './components/ButtonLink';
import { ArvoDisclosureButton, type ArvoDisclosureButtonOptions } from './components/DisclosureButton';
import { ArvoIconButtonLink, type ArvoIconButtonLinkOptions } from './components/IconButtonLink';
import { ArvoTabstrip, type ArvoTabstripOptions } from './components/Tabstrip';
import { ArvoBreadcrumb, type ArvoBreadcrumbOptions } from './components/Breadcrumb';
import { ArvoNav, type ArvoNavOptions } from './components/Nav';
import { ArvoAvatar, type ArvoAvatarOptions } from './components/Avatar';
import { ArvoAvatarGroup, type ArvoAvatarGroupOptions } from './components/AvatarGroup';
import { ArvoBadge, type ArvoBadgeOptions } from './components/Badge';
import { ArvoChip, type ArvoChipOptions } from './components/Chip';
import { ArvoChipList, type ArvoChipListOptions } from './components/ChipList';
import { ArvoBannerAlert, type ArvoBannerAlertOptions } from './components/BannerAlert';
import { ArvoMessageAlert, type ArvoMessageAlertOptions } from './components/MessageAlert';
import { ArvoMessageThread, type ArvoMessageThreadOptions } from './components/MessageThread';
import { ArvoStat, type ArvoStatOptions } from './components/Stat';
import { ArvoStatus, type ArvoStatusOptions } from './components/Status';
import { ArvoRating, type ArvoRatingOptions } from './components/Rating';
import { ArvoLoader, type ArvoLoaderOptions } from './components/Loader';
import { ArvoMeter, type ArvoMeterOptions } from './components/Meter';
import { ArvoProgress, type ArvoProgressOptions } from './components/Progress';
import { ArvoFormLabel, type ArvoFormLabelOptions } from './components/FormLabel';
import { ArvoActionMenu, type ArvoActionMenuOptions } from './components/ActionMenu';
import { ArvoContextMenu, type ArvoContextMenuOptions } from './components/ContextMenu';
import { ArvoSearch, type ArvoSearchOptions } from './components/Search';
import {
  ArvoAdvanceSearch,
  type ArvoAdvanceSearchOptions,
} from './components/AdvanceSearch';
import { ArvoSelect, type ArvoSelectOptions } from './components/Select';
import { ArvoCombobox, type ArvoComboboxOptions } from './components/Combobox';
import { ArvoMultiSelect, type ArvoMultiSelectOptions } from './components/MultiSelect';
import { ArvoDropdownButton, type ArvoDropdownButtonOptions } from './components/DropdownButton';
import { ArvoSplitButton, type ArvoSplitButtonOptions } from './components/SplitButton';
import { ArvoSplitIconButton, type ArvoSplitIconButtonOptions } from './components/SplitIconButton';
import { ArvoDropdownIconButton, type ArvoDropdownIconButtonOptions } from './components/DropdownIconButton';
import { ArvoListbox, type ArvoListboxOptions } from './components/Listbox';
import { ArvoOptionList, type ArvoOptionListOptions } from './components/OptionList';
import { ArvoList, type ArvoListOptions } from './components/List';
import { ArvoAlertDialog, type ArvoAlertDialogOptions } from './components/AlertDialog';
import { ArvoSidePanel, type ArvoSidePanelOptions } from './components/SidePanel';
import { ArvoDrawer, type ArvoDrawerOptions } from './components/Drawer';
import { ArvoWindow, type ArvoWindowOptions } from './components/Window';
import { ArvoDatePicker, type ArvoDatePickerOptions } from './components/DatePicker';
import { ArvoTimePicker, type ArvoTimePickerOptions } from './components/TimePicker';
import {
  ArvoTimePickerDropdown,
  type ArvoTimePickerDropdownOptions,
} from './components/TimePickerDropdown';
import {
  ArvoCalendarDropdown,
  type ArvoCalendarDropdownOptions,
} from './components/CalendarDropdown';
import {
  ArvoDateTimeDropdown,
  type ArvoDateTimeDropdownOptions,
} from './components/DateTimeDropdown';
import {
  ArvoCalendarRangeDropdown,
  type ArvoCalendarRangeDropdownOptions,
} from './components/CalendarRangeDropdown';
import { ArvoDateTimePicker, type ArvoDateTimePickerOptions } from './components/DateTimePicker';
import { ArvoDateRangePicker, type ArvoDateRangePickerOptions } from './components/DateRangePicker';
import { ArvoTreeView, type ArvoTreeViewOptions } from './components/TreeView';
import { ArvoDropdownTree, type ArvoDropdownTreeOptions } from './components/DropdownTree';
import { ArvoContextHelp, type ArvoContextHelpOptions } from './components/ContextHelp';
import { ArvoAccordion, type ArvoAccordionOptions } from './components/Accordion';
import { ArvoTooltip, type ArvoTooltipOptions } from './components/Tooltip';
import { ArvoRichTooltip, type ArvoRichTooltipOptions } from './components/RichTooltip';
import { ArvoSplitter, type ArvoSplitterOptions } from './components/Splitter';
import { ArvoPanel, type ArvoPanelOptions } from './components/Panel';
import { ArvoNavPanel, type ArvoNavPanelOptions } from './components/NavPanel';
import { ArvoFilterPanel, type ArvoFilterPanelOptions } from './components/FilterPanel';
import { setupOverlayPlugin } from './setup';
import {
  setupTooltipContainerPlugin,
  type ArvoTooltipContainerOptions,
} from './setup/tooltip-container-setup';

// ---------------------------------------------------------------------------
// jQuery type augmentation for component plugins
// ---------------------------------------------------------------------------

declare global {
  interface JQuery {
    arvoButton(options?: ArvoButtonOptions): JQuery;
    arvoIconButton(options?: ArvoIconButtonOptions): JQuery;
    arvoToggleButton(options?: ArvoToggleButtonOptions): JQuery;
    arvoTextbox(options?: ArvoTextboxOptions): JQuery;
    arvoTextarea(options?: ArvoTextareaOptions): JQuery;
    arvoNumberInput(options?: ArvoNumberInputOptions): JQuery;
    arvoRadio(options?: ArvoRadioOptions): JQuery;
    arvoCheckbox(options?: ArvoCheckboxOptions): JQuery;
    arvoCheckboxGroup(options?: ArvoCheckboxGroupOptions): JQuery;
    arvoRadioGroup(options?: ArvoRadioGroupOptions): JQuery;
    arvoSwitch(options?: ArvoSwitchOptions): JQuery;
    arvoPopover(options?: ArvoPopoverOptions): JQuery;
    arvoHybridPopover(options?: ArvoHybridPopoverOptions): JQuery;
    arvoButtonGroup(options?: ArvoButtonGroupOptions): JQuery;
    arvoFabButton(options?: ArvoFabButtonOptions): JQuery;
    arvoLink(options?: ArvoLinkOptions): JQuery;
    arvoButtonLink(options?: ArvoButtonLinkOptions): JQuery;
    arvoDisclosureButton(options?: ArvoDisclosureButtonOptions): JQuery;
    arvoIconButtonLink(options?: ArvoIconButtonLinkOptions): JQuery;
    arvoTabstrip(options?: ArvoTabstripOptions): JQuery;
    arvoBreadcrumb(options?: ArvoBreadcrumbOptions): JQuery;
    arvoNav(options?: ArvoNavOptions): JQuery;
    arvoAvatar(options?: ArvoAvatarOptions): JQuery;
    arvoAvatarGroup(options?: ArvoAvatarGroupOptions): JQuery;
    arvoBadge(options?: ArvoBadgeOptions): JQuery;
    arvoChip(options?: ArvoChipOptions): JQuery;
    arvoChipList(options?: ArvoChipListOptions): JQuery;
    arvoBannerAlert(options?: ArvoBannerAlertOptions): JQuery;
    arvoMessageAlert(options?: ArvoMessageAlertOptions): JQuery;
    arvoMessageThread(options?: ArvoMessageThreadOptions): JQuery;
    arvoStat(options?: ArvoStatOptions): JQuery;
    arvoStatus(options?: ArvoStatusOptions): JQuery;
    arvoRating(options?: ArvoRatingOptions): JQuery;
    arvoLoader(options?: ArvoLoaderOptions): JQuery;
    arvoMeter(options?: ArvoMeterOptions): JQuery;
    arvoProgress(options?: ArvoProgressOptions): JQuery;
    arvoFormLabel(options?: ArvoFormLabelOptions): JQuery;
    arvoActionMenu(options?: ArvoActionMenuOptions): JQuery;
    arvoContextMenu(options?: ArvoContextMenuOptions): JQuery;
    arvoSearch(options?: ArvoSearchOptions): JQuery;
    arvoAdvanceSearch(options?: ArvoAdvanceSearchOptions): JQuery;
    arvoSelect(options?: ArvoSelectOptions): JQuery;
    arvoCombobox(options?: ArvoComboboxOptions): JQuery;
    arvoMultiSelect(options?: ArvoMultiSelectOptions): JQuery;
    arvoDropdownButton(options?: ArvoDropdownButtonOptions): JQuery;
    arvoSplitButton(options?: ArvoSplitButtonOptions): JQuery;
    arvoSplitIconButton(options?: ArvoSplitIconButtonOptions): JQuery;
    arvoDropdownIconButton(options?: ArvoDropdownIconButtonOptions): JQuery;
    arvoListbox(options?: ArvoListboxOptions): JQuery;
    arvoOptionList(options?: ArvoOptionListOptions): JQuery;
    arvoList(options?: ArvoListOptions): JQuery;
    arvoAlertDialog(options?: ArvoAlertDialogOptions): JQuery;
    arvoSidePanel(options?: ArvoSidePanelOptions): JQuery;
    arvoDrawer(options?: ArvoDrawerOptions): JQuery;
    arvoWindow(options?: ArvoWindowOptions): JQuery;
    arvoDatePicker(options?: ArvoDatePickerOptions): JQuery;
    arvoTimePicker(options?: ArvoTimePickerOptions): JQuery;
    arvoTimePickerDropdown(options?: ArvoTimePickerDropdownOptions): JQuery;
    arvoCalendarDropdown(options?: ArvoCalendarDropdownOptions): JQuery;
    arvoDateTimeDropdown(options?: ArvoDateTimeDropdownOptions): JQuery;
    arvoCalendarRangeDropdown(options?: ArvoCalendarRangeDropdownOptions): JQuery;
    arvoDateTimePicker(options?: ArvoDateTimePickerOptions): JQuery;
    arvoDateRangePicker(options?: ArvoDateRangePickerOptions): JQuery;
    arvoTreeView(options?: ArvoTreeViewOptions): JQuery;
    arvoDropdownTree(options?: ArvoDropdownTreeOptions): JQuery;
    arvoContextHelp(options?: ArvoContextHelpOptions): JQuery;
    arvoAccordion(options?: ArvoAccordionOptions): JQuery;
    arvoTooltip(options?: ArvoTooltipOptions): JQuery;
    arvoRichTooltip(options?: ArvoRichTooltipOptions): JQuery;
    arvoSplitter(options?: ArvoSplitterOptions): JQuery;
    arvoPanel(options?: ArvoPanelOptions): JQuery;
    arvoNavPanel(options?: ArvoNavPanelOptions): JQuery;
    arvoFilterPanel(options?: ArvoFilterPanelOptions): JQuery;
    // ArvoTooltipContainer is a jQuery-only delegation adapter for consumer
    // codebases that manage tooltips at container level (Kendo interop).
    // It is intentionally NOT descriptor-driven and has no React counterpart.
    arvoTooltipContainer(options?: ArvoTooltipContainerOptions): JQuery;
  }
}

// ---------------------------------------------------------------------------
// Component registry
// ---------------------------------------------------------------------------

interface ComponentEntry {
  Class: { new (el: HTMLElement, opts?: Record<string, unknown>): unknown };
  dataKey: string;
}

const ALL_COMPONENTS: Record<string, ComponentEntry> = {
  arvoButton: { Class: ArvoButton as unknown as ComponentEntry['Class'], dataKey: 'arvoButton' },
  arvoIconButton: { Class: ArvoIconButton as unknown as ComponentEntry['Class'], dataKey: 'arvoIconButton' },
  arvoToggleButton: { Class: ArvoToggleButton as unknown as ComponentEntry['Class'], dataKey: 'arvoToggleButton' },
  arvoTextbox: { Class: ArvoTextbox as unknown as ComponentEntry['Class'], dataKey: 'arvoTextbox' },
  arvoTextarea: { Class: ArvoTextarea as unknown as ComponentEntry['Class'], dataKey: 'arvoTextarea' },
  arvoNumberInput: { Class: ArvoNumberInput as unknown as ComponentEntry['Class'], dataKey: 'arvoNumberInput' },
  arvoRadio: { Class: ArvoRadio as unknown as ComponentEntry['Class'], dataKey: 'arvoRadio' },
  arvoCheckbox: { Class: ArvoCheckbox as unknown as ComponentEntry['Class'], dataKey: 'arvoCheckbox' },
  arvoCheckboxGroup: { Class: ArvoCheckboxGroup as unknown as ComponentEntry['Class'], dataKey: 'arvoCheckboxGroup' },
  arvoRadioGroup: { Class: ArvoRadioGroup as unknown as ComponentEntry['Class'], dataKey: 'arvoRadioGroup' },
  arvoSwitch: { Class: ArvoSwitch as unknown as ComponentEntry['Class'], dataKey: 'arvoSwitch' },
  arvoPopover: { Class: ArvoPopover as unknown as ComponentEntry['Class'], dataKey: 'arvoPopover' },
  arvoHybridPopover: { Class: ArvoHybridPopover as unknown as ComponentEntry['Class'], dataKey: 'arvoHybridPopover' },
  arvoButtonGroup: { Class: ArvoButtonGroup as unknown as ComponentEntry['Class'], dataKey: 'arvoButtonGroup' },
  arvoFabButton: { Class: ArvoFabButton as unknown as ComponentEntry['Class'], dataKey: 'arvoFabButton' },
  arvoLink: { Class: ArvoLink as unknown as ComponentEntry['Class'], dataKey: 'arvoLink' },
  arvoButtonLink: { Class: ArvoButtonLink as unknown as ComponentEntry['Class'], dataKey: 'arvoButtonLink' },
  arvoDisclosureButton: { Class: ArvoDisclosureButton as unknown as ComponentEntry['Class'], dataKey: 'arvoDisclosureButton' },
  arvoIconButtonLink: { Class: ArvoIconButtonLink as unknown as ComponentEntry['Class'], dataKey: 'arvoIconButtonLink' },
  arvoTabstrip: { Class: ArvoTabstrip as unknown as ComponentEntry['Class'], dataKey: 'arvoTabstrip' },
  arvoBreadcrumb: { Class: ArvoBreadcrumb as unknown as ComponentEntry['Class'], dataKey: 'arvoBreadcrumb' },
  arvoNav: { Class: ArvoNav as unknown as ComponentEntry['Class'], dataKey: 'arvoNav' },
  arvoAvatar: { Class: ArvoAvatar as unknown as ComponentEntry['Class'], dataKey: 'arvoAvatar' },
  arvoAvatarGroup: { Class: ArvoAvatarGroup as unknown as ComponentEntry['Class'], dataKey: 'arvoAvatarGroup' },
  arvoBadge: { Class: ArvoBadge as unknown as ComponentEntry['Class'], dataKey: 'arvoBadge' },
  arvoChip: { Class: ArvoChip as unknown as ComponentEntry['Class'], dataKey: 'arvoChip' },
  arvoChipList: { Class: ArvoChipList as unknown as ComponentEntry['Class'], dataKey: 'arvoChipList' },
  arvoBannerAlert: { Class: ArvoBannerAlert as unknown as ComponentEntry['Class'], dataKey: 'arvoBannerAlert' },
  arvoMessageAlert: { Class: ArvoMessageAlert as unknown as ComponentEntry['Class'], dataKey: 'arvoMessageAlert' },
  arvoMessageThread: { Class: ArvoMessageThread as unknown as ComponentEntry['Class'], dataKey: 'arvoMessageThread' },
  arvoStat: { Class: ArvoStat as unknown as ComponentEntry['Class'], dataKey: 'arvoStat' },
  arvoStatus: { Class: ArvoStatus as unknown as ComponentEntry['Class'], dataKey: 'arvoStatus' },
  arvoRating: { Class: ArvoRating as unknown as ComponentEntry['Class'], dataKey: 'arvoRating' },
  arvoLoader: { Class: ArvoLoader as unknown as ComponentEntry['Class'], dataKey: 'arvoLoader' },
  arvoMeter: { Class: ArvoMeter as unknown as ComponentEntry['Class'], dataKey: 'arvoMeter' },
  arvoProgress: { Class: ArvoProgress as unknown as ComponentEntry['Class'], dataKey: 'arvoProgress' },
  arvoFormLabel: { Class: ArvoFormLabel as unknown as ComponentEntry['Class'], dataKey: 'arvoFormLabel' },
  arvoActionMenu: { Class: ArvoActionMenu as unknown as ComponentEntry['Class'], dataKey: 'arvoActionMenu' },
  arvoContextMenu: { Class: ArvoContextMenu as unknown as ComponentEntry['Class'], dataKey: 'arvoContextMenu' },
  arvoSearch: { Class: ArvoSearch as unknown as ComponentEntry['Class'], dataKey: 'arvoSearch' },
  arvoAdvanceSearch: { Class: ArvoAdvanceSearch as unknown as ComponentEntry['Class'], dataKey: 'arvoAdvanceSearch' },
  arvoSelect: { Class: ArvoSelect as unknown as ComponentEntry['Class'], dataKey: 'arvoSelect' },
  arvoCombobox: { Class: ArvoCombobox as unknown as ComponentEntry['Class'], dataKey: 'arvoCombobox' },
  arvoMultiSelect: { Class: ArvoMultiSelect as unknown as ComponentEntry['Class'], dataKey: 'arvoMultiSelect' },
  arvoDropdownButton: { Class: ArvoDropdownButton as unknown as ComponentEntry['Class'], dataKey: 'arvoDropdownButton' },
  arvoSplitButton: { Class: ArvoSplitButton as unknown as ComponentEntry['Class'], dataKey: 'arvoSplitButton' },
  arvoSplitIconButton: { Class: ArvoSplitIconButton as unknown as ComponentEntry['Class'], dataKey: 'arvoSplitIconButton' },
  arvoDropdownIconButton: { Class: ArvoDropdownIconButton as unknown as ComponentEntry['Class'], dataKey: 'arvoDropdownIconButton' },
  arvoListbox: { Class: ArvoListbox as unknown as ComponentEntry['Class'], dataKey: 'arvoListbox' },
  arvoOptionList: { Class: ArvoOptionList as unknown as ComponentEntry['Class'], dataKey: 'arvoOptionList' },
  arvoList: { Class: ArvoList as unknown as ComponentEntry['Class'], dataKey: 'arvoList' },
  arvoAlertDialog: { Class: ArvoAlertDialog as unknown as ComponentEntry['Class'], dataKey: 'arvoAlertDialog' },
  arvoSidePanel: { Class: ArvoSidePanel as unknown as ComponentEntry['Class'], dataKey: 'arvoSidePanel' },
  arvoDrawer: { Class: ArvoDrawer as unknown as ComponentEntry['Class'], dataKey: 'arvoDrawer' },
  arvoWindow: { Class: ArvoWindow as unknown as ComponentEntry['Class'], dataKey: 'arvoWindow' },
  arvoDatePicker: { Class: ArvoDatePicker as unknown as ComponentEntry['Class'], dataKey: 'arvoDatePicker' },
  arvoTimePicker: { Class: ArvoTimePicker as unknown as ComponentEntry['Class'], dataKey: 'arvoTimePicker' },
  arvoTimePickerDropdown: { Class: ArvoTimePickerDropdown as unknown as ComponentEntry['Class'], dataKey: 'arvoTimePickerDropdown' },
  arvoCalendarDropdown: { Class: ArvoCalendarDropdown as unknown as ComponentEntry['Class'], dataKey: 'arvoCalendarDropdown' },
  arvoDateTimeDropdown: { Class: ArvoDateTimeDropdown as unknown as ComponentEntry['Class'], dataKey: 'arvoDateTimeDropdown' },
  arvoCalendarRangeDropdown: { Class: ArvoCalendarRangeDropdown as unknown as ComponentEntry['Class'], dataKey: 'arvoCalendarRangeDropdown' },
  arvoDateTimePicker: { Class: ArvoDateTimePicker as unknown as ComponentEntry['Class'], dataKey: 'arvoDateTimePicker' },
  arvoDateRangePicker: { Class: ArvoDateRangePicker as unknown as ComponentEntry['Class'], dataKey: 'arvoDateRangePicker' },
  arvoTreeView: { Class: ArvoTreeView as unknown as ComponentEntry['Class'], dataKey: 'arvoTreeView' },
  arvoDropdownTree: { Class: ArvoDropdownTree as unknown as ComponentEntry['Class'], dataKey: 'arvoDropdownTree' },
  arvoContextHelp: { Class: ArvoContextHelp as unknown as ComponentEntry['Class'], dataKey: 'arvoContextHelp' },
  arvoAccordion: { Class: ArvoAccordion as unknown as ComponentEntry['Class'], dataKey: 'arvoAccordion' },
  arvoTooltip: { Class: ArvoTooltip as unknown as ComponentEntry['Class'], dataKey: 'arvoTooltip' },
  arvoRichTooltip: { Class: ArvoRichTooltip as unknown as ComponentEntry['Class'], dataKey: 'arvoRichTooltip' },
  arvoSplitter: { Class: ArvoSplitter as unknown as ComponentEntry['Class'], dataKey: 'arvoSplitter' },
  arvoPanel: { Class: ArvoPanel as unknown as ComponentEntry['Class'], dataKey: 'arvoPanel' },
  arvoNavPanel: { Class: ArvoNavPanel as unknown as ComponentEntry['Class'], dataKey: 'arvoNavPanel' },
  arvoFilterPanel: { Class: ArvoFilterPanel as unknown as ComponentEntry['Class'], dataKey: 'arvoFilterPanel' },
};

// ---------------------------------------------------------------------------
// Plugin installer
// ---------------------------------------------------------------------------

/**
 * Registers `$.fn.arvo*` jQuery plugins on the provided jQuery instance.
 *
 * By default every component is registered. Pass a list of names to register
 * only the ones you need (tree-shaking won't help with jQuery plugins because
 * they are side-effectful, but this keeps the `$.fn` namespace clean):
 *
 * ```js
 * import { registerArvoPlugins } from '@arvo/js/plugin';
 * registerArvoPlugins($);                                // all components
 * registerArvoPlugins($, ['arvoButton', 'arvoTextbox']);      // selective
 * ```
 *
 * The overlay plugin (`$.fn.openOverlay`, `$.closeAllOverlays`, etc.) is
 * always registered because it is orthogonal to component selection.
 */
export function registerArvoPlugins(
  $: JQueryStatic,
  components?: (keyof typeof ALL_COMPONENTS)[],
): void {
  const entries = components
    ? components.map(name => [name, ALL_COMPONENTS[name]] as const).filter(([, e]) => e)
    : Object.entries(ALL_COMPONENTS);

  for (const [name, { Class, dataKey }] of entries) {
    ($.fn as unknown as Record<string, unknown>)[name] = function (
      this: JQuery,
      options?: Record<string, unknown>,
    ): JQuery {
      return this.each(function (this: HTMLElement) {
        if (!$.data(this, dataKey)) {
          $.data(this, dataKey, new Class(this, options) as unknown as object);
        }
      });
    };
  }

  setupOverlayPlugin($);

  // Container-level delegation adapter for tooltips (Kendo-interop escape
  // hatch). Always installed -- it is orthogonal to `components` selection
  // and has no React or descriptor-driven counterpart. See
  // `packages/js/src/setup/tooltip-container.ts` for the rationale.
  setupTooltipContainerPlugin($);
}
