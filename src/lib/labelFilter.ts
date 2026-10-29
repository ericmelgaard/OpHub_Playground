import { Device } from '../types';

// The labels shown on Smart Labels, in display order. Shared by the grid, the list,
// and the label editor's previous/next so they always walk the same list.
export function filterLabels(devices: Device[], searchValue: string, placementIds: string[]): Device[] {
  let result = devices;

  if (placementIds.length > 0) {
    result = result.filter(d => d.placementId && placementIds.includes(d.placementId));
  }

  if (searchValue.trim()) {
    const q = searchValue.toLowerCase();
    result = result.filter(d => {
      if (d.name.toLowerCase().includes(q) || d.location.toLowerCase().includes(q)) return true;
      return d.pages.some(p => p.assignedItems.some(item => item.name.toLowerCase().includes(q)));
    });
  }

  return result;
}
