import { MenuItem } from '../types';
import { isCustomItem } from './labelDisplay';

// The APIs products come in from, by WAND API source system number. The UI always shows a
// source's name and ID label from here (or from the item), never a vendor name typed into a component.
export interface ProductSource {
  id: number;
  // Shown in the UI ("Webtrition")
  name: string;
  // What the source calls its item ID ("MRN")
  idLabel: string;
}

export const SOURCE_SYSTEMS: Record<number, ProductSource> = {
  1: { id: 1, name: 'Webtrition', idLabel: 'MRN' },
};

// The source system the product sync loads from today (see services/menuDataLoader.ts)
export const DEFAULT_SOURCE_SYSTEM = 1;

// When a source system isn't listed above
const UNKNOWN = (id: number): ProductSource => ({ id, name: 'Source', idLabel: 'ID' });

export function sourceSystem(id: number = DEFAULT_SOURCE_SYSTEM): ProductSource {
  return SOURCE_SYSTEMS[id] ?? UNKNOWN(id);
}

// The source a product is linked to, or null when it isn't linked (custom products)
export function productSource(item: MenuItem): ProductSource | null {
  if (isCustomItem(item)) return null;
  return sourceSystem(item.sourceSystem ?? DEFAULT_SOURCE_SYSTEM);
}
