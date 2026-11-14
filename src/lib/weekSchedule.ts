import { DeviceWeekSchedule, MenuItem } from '../types';

// Monday of the week at the given offset from the current week.
export function getWeekStartDate(weekOffset: number): Date {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  monday.setDate(monday.getDate() + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekEndDate(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function getWeekStartString(weekOffset: number): string {
  return getWeekStartDate(weekOffset).toISOString().split('T')[0];
}

// Whole-week difference between two Monday ISO date strings (targetWeek - sourceWeek).
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
  date.setDate(date.getDate() + ((day + 6) % 7));
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

// Days each product (by MRN) is scheduled on any label, from a week's resolved schedules
export function scheduledDaysByMrn(schedules: DeviceWeekSchedule[]): Map<string, Set<number>> {
  const byMrn = new Map<string, Set<number>>();
  for (const s of schedules) {
    for (const i of s.items ?? []) {
      if (!byMrn.has(i.menuItemMrn)) byMrn.set(i.menuItemMrn, new Set());
      byMrn.get(i.menuItemMrn)!.add(i.dayOfWeek);
    }
  }
  return byMrn;
}
