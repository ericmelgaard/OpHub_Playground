import { DeviceWeekSchedule } from '../types';

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
