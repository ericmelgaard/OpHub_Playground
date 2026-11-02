import { DevicePage, MenuItem, ResolvedItem, Substitution, SubstitutionKey } from '../types';
import { resolveItemsForDay } from './substitutions';

export type DisplayToggleState = 'off' | 'auto' | 'on';

// A label's per-day availability overrides for the week being edited. On adds the
// day for this label, Off removes it; no entry is Auto (follow the product).
// Stored as pageId → itemId → day → state.
export type DayState = 'on' | 'off';
export type ItemDayOverrides = Partial<Record<number, DayState>>;
export type PageDayOverrides = Record<number, ItemDayOverrides>;
export type LabelDayOverrides = Record<string, PageDayOverrides>;

export const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

// Products created in the app have no imported days of their own
export const isCustomItem = (item: MenuItem) => item.mrn.startsWith('CUSTOM-');

function servesDaypart(item: MenuItem, daypart: string): boolean {
  if (!daypart || daypart === 'All Day' || daypart === 'Custom') return true;
  const mps = item.activeMealPeriods || [];
  return mps.length === 0 || mps.includes(daypart);
}

// Base availability: the product is offered this weekday in this daypart. Products with
// no availability data count as every day, except custom products and products whose
// only history is stale, which have no days until a label turns one on.
export function isBaseOffered(item: MenuItem, daypart: string, day: number): boolean {
  const days = item.activeDays || [];
  if (days.length === 0) {
    if (isCustomItem(item) || item.hasAvailability) return false;
  } else if (!days.includes(day)) {
    return false;
  }
  return servesDaypart(item, daypart);
}

// Offered on this label that day, after its override
export function isOfferedOnDay(item: MenuItem, daypart: string, day: number, overrides?: ItemDayOverrides): boolean {
  const o = overrides?.[day];
  return o ? o === 'on' : isBaseOffered(item, daypart, day);
}

export function offeredDays(item: MenuItem, daypart: string, overrides?: ItemDayOverrides): number[] {
  return WEEK_DAYS.filter(d => isOfferedOnDay(item, daypart, d, overrides));
}

// Offered on this day (or, with no day picked, on any day this week)
export function isItemOfferedOn(item: MenuItem, daypart: string, day: number | null, overrides?: ItemDayOverrides): boolean {
  return day === null
    ? offeredDays(item, daypart, overrides).length > 0
    : isOfferedOnDay(item, daypart, day, overrides);
}

// The toggle for one day, or for the whole week (Mixed when days differ)
export function toggleFor(overrides: ItemDayOverrides | undefined, day: number | null): DisplayToggleState | 'mixed' {
  if (day !== null) return overrides?.[day] ?? 'auto';
  const states = new Set(WEEK_DAYS.map(d => overrides?.[d] ?? 'auto'));
  return states.size === 1 ? [...states][0] : 'mixed';
}

// What the label actually shows for a page on a day: items offered that day in page
// order, cut to the label's capacity, with that day's substitutions applied.
export function getShownItems(
  page: DevicePage,
  day: number | null,
  overrides: PageDayOverrides | undefined,
  substitutionMap: Map<SubstitutionKey, Substitution>,
): ResolvedItem[] {
  const offered = page.itemOrder.filter(id => {
    const item = page.assignedItems.find(i => i.id === id);
    return !!item && item.isActive !== false && isItemOfferedOn(item, page.daypart, day, overrides?.[id]);
  });
  return resolveItemsForDay(offered.slice(0, page.displayCapacity), page.assignedItems, page.id, day, substitutionMap);
}
