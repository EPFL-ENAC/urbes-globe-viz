import type { InjectionKey } from "vue";

// Lets a description component (e.g. the WRF domains map) open another
// sub-viz of the same project. ProjectDetailView provides it. Outside that
// page nothing is provided, so the component must handle `undefined`.
export interface SubVizNav {
  open: (subVizId: string) => void;
}

export const subVizNavKey: InjectionKey<SubVizNav> = Symbol("subVizNav");
