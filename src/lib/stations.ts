import { MenuItem } from '../types';

// Station names repeat with different casing and spacing, so they're matched on a key.
export const stationKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export function itemStations(item: MenuItem): string[] {
  return item.mealStations?.length ? item.mealStations : [item.mealStation];
}

export function inStations(item: MenuItem, keys: Set<string>): boolean {
  return itemStations(item).some(s => keys.has(stationKey(s)));
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
): StationOption[] {
  const byKey = new Map<string, StationOption>();
  for (const item of items) {
    const counted = counts(item);
    for (const name of itemStations(item)) {
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
    .filter(i => !assignedIds.has(i.id) && servesDaypart(i, daypart) && inStations(i, keys))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
