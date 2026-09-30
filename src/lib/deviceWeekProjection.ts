import { Device, MenuItem, DeviceWeekSchedule } from '../types';

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
  const sorted = [...(schedule?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const si of sorted) {
    const list = mrnsByDaypart.get(si.daypart) ?? [];
    if (!list.includes(si.menuItemMrn)) list.push(si.menuItemMrn);
    mrnsByDaypart.set(si.daypart, list);
  }

  const usedItems = new Map<number, MenuItem>();
  for (const page of projected.pages) {
    const mrns = mrnsByDaypart.get(page.daypart) ?? [];
    const items = mrns
      .map(mrn => byMrn.get(mrn))
      .filter((i): i is MenuItem => Boolean(i));
    page.assignedItems = items.map(i => JSON.parse(JSON.stringify(i)));
    page.itemOrder = items.map(i => i.id);
    for (const i of items) usedItems.set(i.id, i);
  }

  projected.assignedItems = Array.from(usedItems.values()).map(i => JSON.parse(JSON.stringify(i)));
  return projected;
}
