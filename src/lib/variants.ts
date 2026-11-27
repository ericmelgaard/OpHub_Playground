import { MenuItem, PlacedVariant, ProductVariant, VariantField } from '../types';
import { stationKey } from './stations';

// Products and variants (menu platform spec v2.6 §6, F8, D60, D64). Each portion of a source recipe is
// its own product (MRN + portion; sizes of one MRN are linked for display only). Each meal station +
// daypart a product is served at is a variant with its own name and price. A label item names the
// variant it stands for; logic picks it whenever it can, so people rarely have to.

export const variantKey = (stationId: number, mealPeriodId: number) => `${stationId}|${mealPeriodId}`;

// The product's variants in one daypart (by meal period name)
export const variantsIn = (item: MenuItem, daypart: string): ProductVariant[] =>
  (item.variants ?? []).filter(v => v.daypart === daypart);

// Dayparts the product is served in, in the order its variants come
export const variantDayparts = (item: MenuItem): string[] =>
  [...new Set((item.variants ?? []).map(v => v.daypart))];

// A variant matches on its station and any of its meal periods (two with the same name are one variant)
export const findVariant = (item: MenuItem, placed: Pick<PlacedVariant, 'stationId' | 'mealPeriodId'>) =>
  item.variants?.find(v => v.stationId === placed.stationId &&
    (v.mealPeriodId === placed.mealPeriodId || v.mealPeriodIds?.includes(placed.mealPeriodId)));

export const placed = (v: ProductVariant, choice: PlacedVariant['choice']): PlacedVariant => ({
  stationId: v.stationId,
  mealPeriodId: v.mealPeriodId,
  choice,
});

// What adding the product to a daypart page means (F8):
// - none: no variants (custom products, or no source station): it's added as the product
// - inferred: one station serves it in that daypart, or the station filter narrows it to one, so
//   it's chosen (the filter is a visible choice, so that holds from another daypart too)
// - choose: a person picks (several stations, or added from another daypart, where nothing is assumed)
export type VariantPick =
  | { kind: 'none' }
  | { kind: 'inferred'; variant: PlacedVariant }
  | { kind: 'choose'; reason: 'station' | 'other-daypart' };

export function pickVariant(item: MenuItem, daypart: string, fromOtherDaypart = false, stationKeys?: Set<string>): VariantPick {
  const all = variantsIn(item, daypart);
  if (all.length === 0) return { kind: 'none' };
  // Stations picked in Available Items' filter narrow the choice
  const filtered = stationKeys?.size ? all.filter(v => stationKeys.has(stationKey(v.station))) : [];
  if (filtered.length === 1) return { kind: 'inferred', variant: placed(filtered[0], 'inferred') };
  const options = filtered.length > 1 ? filtered : all;
  if (fromOtherDaypart) return { kind: 'choose', reason: 'other-daypart' };
  if (options.length > 1) return { kind: 'choose', reason: 'station' };
  return { kind: 'inferred', variant: placed(options[0], 'inferred') };
}

// A label item's variant on its page, and whether someone needs to pick the station:
// - its stored variant, if it still exists
// - else (older items, before variants) the only variant that fits its daypart
// action 'station': it's unclear which station, or Auto Fill picked among several
export interface VariantStatus {
  variant?: ProductVariant;
  action: 'station' | null;
}

export function variantStatus(item: MenuItem, pageDaypart: string): VariantStatus {
  if (!item.variants?.length) return { action: null };
  const stored = item.variant ? findVariant(item, item.variant) : undefined;
  if (stored) return { variant: stored, action: item.variant!.choice === 'review' ? 'station' : null };
  const options = variantsIn(item, item.followsDaypart || pageDaypart);
  if (options.length === 1) return { variant: options[0], action: null };
  return { action: options.length > 1 ? 'station' : null };
}

// "flame - core options · Lunch"
export const variantLabel = (v: ProductVariant, withDaypart = true) =>
  withDaypart ? `${v.station} · ${v.daypart}` : v.station;

// Values of a variant that differ from the product's own name and price (what the source sends there)
export function variantDifferences(item: MenuItem, v: ProductVariant): ('name' | 'price')[] {
  const productName = (item.source?.name ?? item.name).trim().toLowerCase();
  const productPrice = parseFloat(item.source?.price ?? item.price);
  const out: ('name' | 'price')[] = [];
  if (v.name && v.name.trim().toLowerCase() !== productName) out.push('name');
  if (!Number.isNaN(productPrice) && parseFloat(v.price) !== productPrice) out.push('price');
  return out;
}

// Where a variant's value comes from:
// - variant: set here for this variant (variant local value)
// - station: the source sends its own value at this station and daypart
// - product: the product's value (its local value, else the source's), shared by every variant
export type ValueFrom = 'variant' | 'station' | 'product';
export interface VariantValue { value: string; from: ValueFrom }
export type VariantValues = Record<VariantField, VariantValue>;

// A variant's values, layered: product source → the station's own (source) → product local value
// (edited for all variants) → variant local value
export function variantValues(item: MenuItem, v: ProductVariant): VariantValues {
  const local = v.local ?? {};
  const own = variantDifferences(item, v);
  const productSet = (f: 'name' | 'price' | 'description') => item.localFields?.includes(f) ?? false;
  const pick = (field: VariantField, product: string, station?: string): VariantValue =>
    local[field] !== undefined ? { value: local[field]!, from: 'variant' }
      : station !== undefined && !productSet(field as 'name') ? { value: station, from: 'station' }
      : { value: product, from: 'product' };
  return {
    name: pick('name', item.name.trim(), own.includes('name') ? v.name : undefined),
    price: pick('price', item.price || '0.00', own.includes('price') ? v.price : undefined),
    portion: pick('portion', item.size || item.portion || ''),
    description: pick('description', item.enticingDescription || item.description || ''),
  };
}

// The variant a product card or row stands for, and the one its sheet opens on: the one whose
// source name and price the card shows (the latest the source sent), else the first
export function defaultVariant(item: MenuItem): ProductVariant | undefined {
  const variants = item.variants ?? [];
  const name = (item.source?.name ?? item.name).trim().toLowerCase();
  const price = parseFloat(item.source?.price ?? item.price);
  return variants.find(v => v.name.trim().toLowerCase() === name && parseFloat(v.price) === price)
    ?? variants.find(v => parseFloat(v.price) === price)
    ?? variants[0];
}

// The price a product card or row shows: its default variant's (with any value set here)
export function cardPrice(item: MenuItem): string {
  const v = defaultVariant(item);
  return (parseFloat(v ? variantValues(item, v).price.value : item.price) || 0).toFixed(2);
}

// How many values a variant has set here
export const variantLocalCount = (v: ProductVariant) => Object.keys(v.local ?? {}).length;

// Weekdays a variant is served on (from the dates the source served it there), optionally in one week
export function variantDays(v: ProductVariant, weekStart?: string): number[] {
  let dates = v.dates;
  if (weekStart) {
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates = dates.filter(d => d >= iso(start) && d <= iso(end));
  }
  return [...new Set(dates.map(d => new Date(`${d}T00:00:00`).getDay()))].sort();
}

// The variant a page item stands for, when it names one that still exists
export const placedVariantOf = (item: MenuItem): ProductVariant | undefined =>
  item.variant ? findVariant(item, item.variant) : undefined;

// A hint before adding that a choice follows ("2 stations"), or null when it's picked for you
export function choiceHint(item: MenuItem, daypart: string, fromOtherDaypart = false, stationKeys?: Set<string>): string | null {
  const pick = pickVariant(item, daypart, fromOtherDaypart, stationKeys);
  if (pick.kind !== 'choose') return null;
  const all = variantsIn(item, daypart);
  const filtered = stationKeys?.size ? all.filter(v => stationKeys.has(stationKey(v.station))) : [];
  const n = (filtered.length > 1 ? filtered : all).length;
  return n > 1 ? `${n} stations` : 'Pick the station';
}

// The size this product is, shown only when its recipe comes in more than one ("1 lb")
export const sizeOf = (item: MenuItem): string | null =>
  (item.sizes?.length ?? 0) > 1 && item.size ? item.size : null;
