// PanelBase is an INTERNAL primitive shared by ArvoPanel and the four
// specialized panels (ArvoNavPanel / ArvoFilterPanel). It is NOT
// re-exported from
// `packages/js/src/components/index.ts` or `packages/js/src/index.ts`.
// Application code MUST NOT import PanelBase directly.

export {
  createPanelBase,
  renderContentToElement,
  type PanelBaseInstance,
  type PanelBaseOptions,
  type PanelBaseType,
  type ArvoPanelRichHeaderConfig,
} from './PanelBase';
