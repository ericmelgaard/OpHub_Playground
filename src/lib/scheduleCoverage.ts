import { Device, DeviceWeekSchedule } from '../types';

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

// Mon–Sun in JS day-of-week numbers.
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

// A slot is one label's daypart on one day. Only dayparts a label actually has a
// page for count, so a label without Late Night never reports a Late Night gap.
export function getWeekCoverage(devices: Device[], schedules: DeviceWeekSchedule[]): DayCoverage[] {
  const scheduleByDevice = new Map(schedules.map(s => [s.deviceId, s]));

  return WEEK_DAYS.map(dayOfWeek => {
    let gaps = 0;
    let totalSlots = 0;
    for (const device of devices) {
      const dayparts = new Set(device.pages.map(p => p.daypart));
      const filled = new Set(
        (scheduleByDevice.get(device.id)?.items ?? [])
          .filter(i => i.dayOfWeek === dayOfWeek)
          .map(i => i.daypart),
      );
      for (const daypart of dayparts) {
        totalSlots++;
        if (!filled.has(daypart)) gaps++;
      }
    }
    const status: DayCoverageStatus =
      gaps === 0 ? 'complete' : gaps === totalSlots ? 'empty' : 'partial';
    return { dayOfWeek, status, gaps, totalSlots };
  });
}
