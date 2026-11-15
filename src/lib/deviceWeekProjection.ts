import { Device, MenuItem, DeviceWeekSchedule } from '../types';
import type { LabelDayOverrides } from './labelDisplay';

// Builds a device whose page items reflect a resolved week schedule.
// Weeks are the source of truth: each page's assignedItems/itemOrder come from
// the schedule items for that daypart. Pages with no scheduled items are emptied.
export function projectScheduleOntoDevice(
  device: Device,
  schedule: DeviceWeekSchedule | undefined,
  menuItems: MenuItem[],
): Device {
  const projected: Device = JSON.parse(JSON.stringify(device));

  const byMrn = new Map<string, MenuItem>();
  for (const item of menuItems) {
    if (item.mrn && !byMrn.has(item.mrn)) byMrn.set(item.mrn, item);
  }

  // Ordered, de-duplicated MRNs per daypart from the schedule.
  const mrnsByDaypart = new Map<string, string[]>();
  // Daypart|MRN → the source daypart the item follows there (when not the page's own)
  const follows = new Map<string, string>();
  const sorted = [...(schedule?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const si of sorted) {
    const list = mrnsByDaypart.get(si.daypart) ?? [];
    if (!list.includes(si.menuItemMrn)) list.push(si.menuItemMrn);
    if (si.followsDaypart) follows.set(`${si.daypart}|${si.menuItemMrn}`, si.followsDaypart);
    mrnsByDaypart.set(si.daypart, list);
  }

  const usedItems = new Map<number, MenuItem>();
  for (const page of projected.pages) {
    const mrns = mrnsByDaypart.get(page.daypart) ?? [];
    const items = mrns
      .map(mrn => byMrn.get(mrn))
      .filter((i): i is MenuItem => Boolean(i));
    page.assignedItems = items.map(i => {
      const copy: MenuItem = JSON.parse(JSON.stringify(i));
      const f = follows.get(`${page.daypart}|${i.mrn}`);
      if (f) copy.followsDaypart = f;
      return copy;
    });
    page.itemOrder = items.map(i => i.id);
    for (const i of items) usedItems.set(i.id, i);
  }

  projected.assignedItems = Array.from(usedItems.values()).map(i => JSON.parse(JSON.stringify(i)));
  return projected;
}

// The schedule's stored day settings as the label page's toggles (page id -> item id -> day)
export function scheduleDayToggles(device: Device, schedule: DeviceWeekSchedule | undefined): LabelDayOverrides {
  const out: LabelDayOverrides = {};
  for (const s of schedule?.daySettings ?? []) {
    const page = device.pages.find(p => p.daypart === s.daypart);
    const item = page?.assignedItems.find(i => i.mrn === s.menuItemMrn);
    if (!page || !item) continue;
    const pageOverrides = out[page.id] ?? (out[page.id] = {});
    const itemOverrides = pageOverrides[item.id] ?? (pageOverrides[item.id] = {});
    itemOverrides[s.dayOfWeek] = s.state;
  }
  return out;
}
