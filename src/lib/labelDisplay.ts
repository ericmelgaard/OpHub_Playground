import { DevicePage, MenuItem, ResolvedItem, Substitution, SubstitutionKey } from '../types';
import { resolveItemsForDay } from './substitutions';
import { plainText } from './richText';

export type DisplayToggleState = 'off' | 'auto' | 'on';

// A label's per-day availability overrides for the week being edited. On adds the
// day for this label, Off removes it; no entry is Auto (follow the product).
// Stored as pageId → itemId → day → state.
export type DayState = 'on' | 'off';
export type ItemDayOverrides = Partial<Record<number, DayState>>;
export type PageDayOverrides = Record<number, ItemDayOverrides>;
export type LabelDayOverrides = Record<string, PageDayOverrides>;

export const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

// Products created in the app have no imported days of their own.
// (Internal: today this also means "not linked to a source item". Never show "CUSTOM-".)
export const isCustomItem = (item: MenuItem) => item.mrn.startsWith('CUSTOM-');

// Every product is a WAND item with its own ID; that ID is the one people see first.
// Items brought in from a source are linked to the source item (Webtrition's MRN today) for
// their values. Linking itself isn't built yet; this only shows the IDs that way.
export const wandId = (item: MenuItem) => String(Math.abs(item.id));
export const linkedSourceId = (item: MenuItem): string | null => (isCustomItem(item) ? null : item.mrn);
// Matches an ID search against the WAND ID or the linked source ID
export const matchesItemId = (item: MenuItem, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || wandId(item).startsWith(q) || !!linkedSourceId(item)?.toLowerCase().startsWith(q);
};

// The name a label shows, as plain text: the display name when set, else the product name.
// The display name can carry bold/italic/line breaks; render those with <LabelName>.
export const labelName = (item: MenuItem) => plainText(item.displayName).replace(/\s+/g, ' ').trim() || item.name.trim();

function servesDaypart(item: MenuItem, daypart: string): boolean {
  if (!daypart || daypart === 'All Day' || daypart === 'Custom') return true;
  const mps = item.activeMealPeriods || [];
  return mps.length === 0 || mps.includes(daypart);
}

// The source daypart an item on a page follows: the one it was added from, else the page's
export const followedDaypart = (item: MenuItem, pageDaypart: string) => item.followsDaypart || pageDaypart;

// Has days to follow on this page (Auto): linked to a source and offered in the daypart it
// follows. Custom products and products from another daypart added without a link are Off / On.
export const followsSource = (item: MenuItem, pageDaypart: string) =>
  !isCustomItem(item) && (!!item.followsDaypart || servesDaypart(item, pageDaypart));

// Base availability: the product is offered this weekday in this daypart, by the source.
// Days are per meal period: a product on Lunch Mon–Fri and Breakfast Sat is on a Lunch page
// Mon–Fri only. An item following another daypart (followsDaypart) uses that daypart's days;
// if the source stops sending that daypart it has none. Products with no availability data
// count as every day, except custom products and products whose only history is stale, which
// have no days until a label turns one on.
export function isBaseOffered(item: MenuItem, daypart: string, day: number): boolean {
  const days = item.activeDays || [];
  const perDaypart = item.daysByDaypart && Object.keys(item.daysByDaypart).length > 0 ? item.daysByDaypart : null;
  // Following a daypart the source sends: its days. One it no longer sends: no days (Not
  // available). One set here as a local daypart (not from the source): every day the source offers it.
  if (item.followsDaypart && perDaypart) {
    const followed = perDaypart[item.followsDaypart];
    if (followed) return followed.includes(day);
    if (!item.activeMealPeriods?.includes(item.followsDaypart)) return false;
    return days.includes(day);
  }
  const dp = followedDaypart(item, daypart);
  if (days.length === 0) {
    if (isCustomItem(item) || item.hasAvailability) return false;
    return servesDaypart(item, dp);
  }
  if (!servesDaypart(item, dp)) return false;
  // A daypart the source sends has its own days; All Day / Custom pages and dayparts set here
  // (not by the source) use every day the source offers it
  const own = dp === 'All Day' || dp === 'Custom' ? undefined : perDaypart?.[dp];
  return (own ?? days).includes(day);
}

// Offered on this label that day, after its override
export function isOfferedOnDay(item: MenuItem, daypart: string, day: number, overrides?: ItemDayOverrides): boolean {
  const o = overrides?.[day];
  return o ? o === 'on' : isBaseOffered(item, daypart, day);
}

export function offeredDays(item: MenuItem, daypart: string, overrides?: ItemDayOverrides): number[] {
  return WEEK_DAYS.filter(d => isOfferedOnDay(item, daypart, d, overrides));
}

// On all 7 days: part of the everyday menu
export function isOfferedEveryDay(item: MenuItem, daypart: string, overrides?: ItemDayOverrides): boolean {
  return WEEK_DAYS.every(d => isOfferedOnDay(item, daypart, d, overrides));
}

// Offered on this day, or with no day picked (Every day), on every day of the week.
// Every day previews the everyday menu; items on some days only show when their day is picked.
export function isItemOfferedOn(item: MenuItem, daypart: string, day: number | null, overrides?: ItemDayOverrides): boolean {
  return day === null
    ? isOfferedEveryDay(item, daypart, overrides)
    : isOfferedOnDay(item, daypart, day, overrides);
}

// The toggle for one day, or for the whole week (Mixed when days differ)
// Items not linked to a source have no days to follow, so they have no Auto: a day without
// an override is Off.
export function toggleFor(overrides: ItemDayOverrides | undefined, day: number | null, linked = true): DisplayToggleState | 'mixed' {
  const unset: DisplayToggleState = linked ? 'auto' : 'off';
  if (day !== null) return overrides?.[day] ?? unset;
  const states = new Set(WEEK_DAYS.map(d => overrides?.[d] ?? unset));
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
