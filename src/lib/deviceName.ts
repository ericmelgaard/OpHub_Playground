import { Device } from '../types';

// A label's name: the one people give it ("Grill Station - 1"), else its device ID ("ESL-SU-002").
// The device ID is always kept and shown after a given name; search, Scan and NFC match both.
export function deviceName(device: Pick<Device, 'name' | 'displayName'>): string {
  return device.displayName?.trim() || device.name;
}

// True when the label has a name of its own (so the device ID is shown beside it)
export function hasOwnName(device: Pick<Device, 'displayName'>): boolean {
  return !!device.displayName?.trim();
}

// Typed or scanned text matches the device's id, its device ID, or its name
export function matchesDevice(device: Device, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return device.id.toLowerCase() === q
    || device.name.toLowerCase() === q
    || device.displayName?.trim().toLowerCase() === q;
}
