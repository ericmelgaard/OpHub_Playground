import { Device, DeviceWeekSchedule } from '../types';
import { WEEK_ORDER } from './weekSchedule';

export type DayCoverageStatus = 'complete' | 'partial' | 'empty';

export interface DayCoverage {
  dayOfWeek: number; // 0 = Sunday, matching DeviceScheduleItem.dayOfWeek
  status: DayCoverageStatus;
  gaps: number;        // label + daypart slots with no item
  totalSlots: number;  // label + daypart slots expected to have an item
}

function itemSignature(schedule: DeviceWeekSchedule | undefined): string {
  return (schedule?.items ?? [])
    .map(i => `${i.daypart}|${i.dayOfWeek}|${i.menuItemMrn}`)
    .sort()
    .join(',');
}

// How many labels show something different from their Default Week this week.
export function countLabelsDifferingFromDefault(
  effective: DeviceWeekSchedule[],
  defaults: DeviceWeekSchedule[],
): number {
  const defaultByDevice = new Map(defaults.map(s => [s.deviceId, s]));
  return effective.filter(s => itemSignature(s) !== itemSignature(defaultByDevice.get(s.deviceId))).length;
}

// The week in display order (Sun–Sat), in JS day-of-week numbers.
export const WEEK_DAYS = WEEK_ORDER;

// Whether a scheduled item actually shows on that page and day (its day On / Off settings, the
// source's days, the daypart it follows) — the label page's rule. Without it, any scheduled
// item counts as showing.
export type ShownOnDay = (schedule: DeviceWeekSchedule, daypart: string, mrn: string, dayOfWeek: number) => boolean;

export interface SlotGap {
  dayOfWeek: number;
  daypart: string;
}

// A slot is one label's daypart on one day. Only dayparts a label actually has a
// page for count, so a label without Late Night never reports a Late Night gap.
// Only the site's open days count (Site settings → Business days); closed days are never gaps.
// Returned in week order, in the label's page order within each day.
export function getDeviceGaps(
  device: Device,
  schedule: DeviceWeekSchedule | undefined,
  openDays: number[] = WEEK_DAYS,
  shownOnDay?: ShownOnDay,
): SlotGap[] {
  const dayparts = [...new Set(device.pages.map(p => p.daypart))];
  const filled = new Set((schedule?.items ?? [])
    .filter(i => !shownOnDay || shownOnDay(schedule!, i.daypart, i.menuItemMrn, i.dayOfWeek))
    .map(i => `${i.dayOfWeek}|${i.daypart}`));
  return WEEK_DAYS.filter(d => openDays.includes(d)).flatMap(dayOfWeek =>
    dayparts
      .filter(daypart => !filled.has(`${dayOfWeek}|${daypart}`))
      .map(daypart => ({ dayOfWeek, daypart })),
  );
}

export function getWeekCoverage(
  devices: Device[],
  schedules: DeviceWeekSchedule[],
  openDays: number[] = WEEK_DAYS,
  shownOnDay?: ShownOnDay,
): DayCoverage[] {
  const scheduleByDevice = new Map(schedules.map(s => [s.deviceId, s]));
  const gapsByDay = new Map<number, number>();
  let slotsPerDay = 0;
  for (const device of devices) {
    slotsPerDay += new Set(device.pages.map(p => p.daypart)).size;
    for (const gap of getDeviceGaps(device, scheduleByDevice.get(device.id), openDays, shownOnDay)) {
      gapsByDay.set(gap.dayOfWeek, (gapsByDay.get(gap.dayOfWeek) ?? 0) + 1);
    }
  }

  return WEEK_DAYS.map(dayOfWeek => {
    const gaps = gapsByDay.get(dayOfWeek) ?? 0;
    const status: DayCoverageStatus =
      gaps === 0 ? 'complete' : gaps === slotsPerDay ? 'empty' : 'partial';
    return { dayOfWeek, status, gaps, totalSlots: slotsPerDay };
  });
}
