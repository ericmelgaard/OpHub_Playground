import { DevicePage, MenuItem, ResolvedItem, Substitution, SubstitutionKey } from '../types';
import { resolveItemsForDay } from './substitutions';

export type DisplayToggleState = 'off' | 'auto' | 'on';

// Offered on this day (when one is picked) and in this page's daypart
export function isItemOfferedOn(item: MenuItem, daypart: string, day: number | null): boolean {
  if (day !== null) {
    const days = item.activeDays || [];
    if (days.length > 0 && !days.includes(day)) return false;
  }
  if (!daypart || daypart === 'All Day' || daypart === 'Custom') return true;
  const mps = item.activeMealPeriods || [];
  return mps.length === 0 || mps.includes(daypart);
}

// What the label actually shows for a page on a day: offered items in page order,
// minus those toggled Off, with On items first, cut to the label's capacity, and
// with that day's substitutions applied.
export function getShownItems(
  page: DevicePage,
  day: number | null,
  toggles: Record<number, DisplayToggleState> | undefined,
  substitutionMap: Map<SubstitutionKey, Substitution>,
): ResolvedItem[] {
  const toggleOf = (id: number) => toggles?.[id] ?? 'auto';
  const offered = page.itemOrder.filter(id => {
    const item = page.assignedItems.find(i => i.id === id);
    return !!item && item.isActive !== false && isItemOfferedOn(item, page.daypart, day) && toggleOf(id) !== 'off';
  });
  const ordered = [
    ...offered.filter(id => toggleOf(id) === 'on'),
    ...offered.filter(id => toggleOf(id) !== 'on'),
  ].slice(0, page.displayCapacity);
  return resolveItemsForDay(ordered, page.assignedItems, page.id, day, substitutionMap);
}
