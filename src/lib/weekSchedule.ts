import { DeviceScheduleItem, DeviceWeekSchedule, MenuItem } from '../types';

// Weeks run Sunday to Saturday. Every week calculation and every list of days uses these,
// so the week start lives in one place.
export const WEEK_STARTS_ON = 0; // JS day number: 0 = Sunday

// The days of a week in display order, as JS day numbers (Sun, Mon … Sat)
export const WEEK_ORDER = Array.from({ length: 7 }, (_, i) => (WEEK_STARTS_ON + i) % 7);

// Position of a JS day number within the week (0 = first day)
export const dayIndexInWeek = (day: number) => (day - WEEK_STARTS_ON + 7) % 7;

// First day of the week containing `date`, at midnight local time
export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - dayIndexInWeek(start.getDay()));
  start.setHours(0, 0, 0, 0);
  return start;
}

// First day of the week at the given offset from the current week
export function getWeekStartDate(weekOffset: number): Date {
  const start = startOfWeek(new Date());
  start.setDate(start.getDate() + weekOffset * 7);
  return start;
}

export function getWeekEndDate(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

// YYYY-MM-DD in local time (toISOString would shift to UTC and can land on the day before)
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function getWeekStartString(weekOffset: number): string {
  return localDate(getWeekStartDate(weekOffset));
}

// Whole-week difference between two week-start ISO date strings (targetWeek - sourceWeek).
export function weeksBetween(sourceWeekStart: string, targetWeekStart: string): number {
  const src = new Date(sourceWeekStart + 'T00:00:00');
  const tgt = new Date(targetWeekStart + 'T00:00:00');
  return Math.round((tgt.getTime() - src.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export type WeekState = 'default' | 'override' | 'recurring';

// Determines how a week should be labelled, given the set of persisted week rows.
export function getWeekState(
  targetWeekStart: string,
  overrideWeekStarts: Set<string>,
  recurringSchedules: DeviceWeekSchedule[],
): WeekState {
  if (overrideWeekStarts.has(targetWeekStart)) {
    const isRecurringSource = recurringSchedules.some(s => s.weekStart === targetWeekStart);
    return isRecurringSource ? 'recurring' : 'override';
  }
  if (findRecurringMatch(targetWeekStart, recurringSchedules).length > 0) {
    return 'recurring';
  }
  return 'default';
}

// Recurring rows whose pattern lands on the target week (future occurrences only).
function findRecurringMatch(
  targetWeekStart: string,
  recurringSchedules: DeviceWeekSchedule[],
): DeviceWeekSchedule[] {
  return recurringSchedules.filter(s => {
    if (!s.weekStart || !s.recurrenceWeeks || s.recurrenceWeeks <= 0) return false;
    const diff = weeksBetween(s.weekStart, targetWeekStart);
    return diff > 0 && diff % s.recurrenceWeeks === 0;
  });
}

// Resolves the effective schedules for a week: explicit override, else the most
// recent matching recurring pattern, else the device's default week.
export function resolveWeekSchedules(
  targetWeekStart: string,
  overrides: DeviceWeekSchedule[],
  defaults: DeviceWeekSchedule[],
  recurringSchedules: DeviceWeekSchedule[],
  deviceIds: string[],
): DeviceWeekSchedule[] {
  const overrideByDevice = new Map(overrides.map(s => [s.deviceId, s]));
  const defaultByDevice = new Map(defaults.map(s => [s.deviceId, s]));

  const recurringMatches = findRecurringMatch(targetWeekStart, recurringSchedules)
    .sort((a, b) => (a.weekStart! < b.weekStart! ? 1 : -1)); // most recent first
  const recurringByDevice = new Map<string, DeviceWeekSchedule>();
  for (const s of recurringMatches) {
    if (!recurringByDevice.has(s.deviceId)) recurringByDevice.set(s.deviceId, s);
  }

  const resolved: DeviceWeekSchedule[] = [];
  for (const deviceId of deviceIds) {
    const source =
      overrideByDevice.get(deviceId) ??
      recurringByDevice.get(deviceId) ??
      defaultByDevice.get(deviceId);
    if (!source) continue;
    resolved.push({ ...source, deviceId, weekStart: targetWeekStart });
  }
  return resolved;
}

export type ScheduleSource = 'override' | 'recurring' | 'default';

// Which schedule one label runs in the target week, with the same precedence as
// resolveWeekSchedules. `overrides` are the target week's override rows.
export function getScheduleSource(
  targetWeekStart: string,
  deviceId: string,
  overrides: DeviceWeekSchedule[],
  recurringSchedules: DeviceWeekSchedule[],
): ScheduleSource {
  // A recurring pattern's first week is stored as that week's own row
  const own = overrides.find(s => s.deviceId === deviceId);
  if (own) return own.isRecurring ? 'recurring' : 'override';
  if (findRecurringMatch(targetWeekStart, recurringSchedules).some(s => s.deviceId === deviceId)) return 'recurring';
  return 'default';
}

// "Oct 5 – 11", or "Sep 28 – Oct 4" across a month boundary
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = getWeekEndDate(start);
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()} – ${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The day being edited: "Tue, Nov 3" inside a dated week, "Tue" otherwise
export function formatEditingDay(day: number | 'every-day', weekStart: string | null): string {
  if (day === 'every-day') return 'Every day';
  if (!weekStart) return DAY_SHORT[day];
  const date = new Date(weekStart + 'T00:00:00');
  date.setDate(date.getDate() + dayIndexInWeek(day));
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Days Webtrition's menu serves the product in a week (offset from this week). Custom products
// have none: their days come only from the labels they're scheduled on.
export function menuDaysInWeek(item: MenuItem, weekOffset: number): number[] {
  if (item.mrn.startsWith('CUSTOM-')) return [];
  if (!item.dates || item.dates.length === 0) return item.activeDays || [];
  const start = getWeekStartDate(weekOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const from = localDate(start);
  const to = localDate(end);
  const days = new Set<number>();
  for (const d of item.dates) {
    if (d >= from && d <= to) days.add(new Date(d + 'T12:00:00').getDay());
  }
  return [...days].sort();
}

// Where a product is used on labels in a week: days, dayparts and stations (a label's placement).
// Custom products get all three only from here; they aren't set on the product.
export interface LabelUse {
  days: Set<number>;
  dayparts: Set<string>;
  stations: Set<string>;
}

// `daysFor` gives the days an item on a label page actually shows (after its day settings);
// without it, the days it has schedule rows for.
export function labelUseByMrn(
  schedules: DeviceWeekSchedule[],
  stationOf: (deviceId: string) => string | undefined,
  daysFor?: (schedule: DeviceWeekSchedule, daypart: string, mrn: string, rowDays: number[]) => number[],
): Map<string, LabelUse> {
  const byMrn = new Map<string, LabelUse>();
  for (const s of schedules) {
    const station = stationOf(s.deviceId);
    const groups = new Map<string, { daypart: string; mrn: string; days: number[] }>();
    for (const i of (s.items ?? []) as DeviceScheduleItem[]) {
      const key = `${i.daypart}|${i.menuItemMrn}`;
      const g = groups.get(key) ?? { daypart: i.daypart, mrn: i.menuItemMrn, days: [] };
      g.days.push(i.dayOfWeek);
      groups.set(key, g);
    }
    for (const g of groups.values()) {
      const days = daysFor ? daysFor(s, g.daypart, g.mrn, g.days) : g.days;
      if (days.length === 0) continue;
      let use = byMrn.get(g.mrn);
      if (!use) { use = { days: new Set(), dayparts: new Set(), stations: new Set() }; byMrn.set(g.mrn, use); }
      days.forEach(d => use!.days.add(d));
      if (g.daypart) use.dayparts.add(g.daypart);
      if (station) use.stations.add(station);
    }
  }
  return byMrn;
}

const DAYPART_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Late Night', 'All Day'];

// Dayparts in serving order
export const sortDayparts = (dayparts: Iterable<string>) =>
  [...dayparts].sort((a, b) => (DAYPART_ORDER.indexOf(a) + 1 || 99) - (DAYPART_ORDER.indexOf(b) + 1 || 99));
