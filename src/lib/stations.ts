import { MenuItem } from '../types';

// Station names repeat with different casing and spacing, so they're matched on a key.
export const stationKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

// The stations a product is served at. With a daypart, only where it's served in that daypart
// (its variants: station + daypart), so the breakfast grill doesn't list what it serves at Lunch.
export function itemStations(item: MenuItem, daypart?: string | null): string[] {
  if (daypart && item.variants?.length) return [...new Set(item.variants.filter(v => v.daypart === daypart).map(v => v.station))];
  return item.mealStations?.length ? item.mealStations : [item.mealStation];
}

export function inStations(item: MenuItem, keys: Set<string>, daypart?: string | null): boolean {
  return itemStations(item, daypart).some(s => keys.has(stationKey(s)));
}

// Served in this daypart on at least one day of the week
export function servesDaypart(item: MenuItem, daypart: string): boolean {
  if (daypart === 'All Day' || daypart === 'Custom') return true;
  const mps = item.activeMealPeriods || [];
  return mps.length === 0 || mps.includes(daypart);
}

export interface StationOption {
  key: string;
  name: string;
  count: number;
}

// One option per distinct station with how many items pass `counts`, sorted by name.
// Stations with nothing to count are left out unless they're in `keep`.
export function stationOptions(
  items: MenuItem[],
  counts: (item: MenuItem) => boolean,
  keep: string[] = [],
  // Only stations serving it in this daypart (see itemStations)
  daypart?: string | null,
): StationOption[] {
  const byKey = new Map<string, StationOption>();
  for (const item of items) {
    const counted = counts(item);
    for (const name of itemStations(item, daypart)) {
      const key = stationKey(name);
      if (!key) continue;
      const option = byKey.get(key) ?? { key, name: name.trim(), count: 0 };
      if (counted) option.count++;
      byKey.set(key, option);
    }
  }
  const keepKeys = new Set(keep.map(stationKey));
  return [...byKey.values()]
    .filter(o => o.count > 0 || keepKeys.has(o.key))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

// Auto Fill for one page: the stations it draws from and the items it added
export interface AutoFillPage {
  stations: string[];
  itemIds: number[];
}

// Items Auto Fill would add to a page: from the stations, served in its daypart, not already on it
export function autoFillCandidates(
  items: MenuItem[],
  stations: string[],
  daypart: string,
  assignedIds: Set<number>,
): MenuItem[] {
  const keys = new Set(stations.map(stationKey));
  return items
    .filter(i => !assignedIds.has(i.id) && servesDaypart(i, daypart) && inStations(i, keys, daypart))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

// Older custom products with no dayparts stored are offered at each one; shown as this.
// (Not a daypart, and not the label page's "All dayparts" view.)
export const ALL_DAYPARTS = 'Every daypart';

// The dayparts a product may be offered at; empty (older custom products) means every daypart
export function productDayparts(item: MenuItem): string[] {
  return item.mealPeriods?.length ? item.mealPeriods : item.mealPeriod ? [item.mealPeriod] : [];
}
