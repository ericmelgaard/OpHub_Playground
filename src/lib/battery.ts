import { BatteryFull, BatteryLow, BatteryWarning, LucideIcon } from 'lucide-react';
import { Device } from '../types';

// The devices report battery as Good / Weak / Dead only, so that's all the app shows (no percent).
export type BatteryState = 'good' | 'weak' | 'dead';

export const BATTERY: Record<BatteryState, { label: string; icon: LucideIcon; color: string }> = {
  good: { label: 'Good', icon: BatteryFull, color: 'text-emerald-500' },
  weak: { label: 'Weak', icon: BatteryLow, color: 'text-amber-500' },
  dead: { label: 'Dead', icon: BatteryWarning, color: 'text-red-500' },
};

// The device's reported state; the demo data only has a level, so it's mapped the same way
export function batteryState(device: Pick<Device, 'status'>): BatteryState {
  if (device.status.battery) return device.status.battery;
  const level = device.status.batteryLevel;
  if (level >= 35) return 'good';
  if (level > 5) return 'weak';
  return 'dead';
}

export function batteryOf(device: Pick<Device, 'status'>) {
  return BATTERY[batteryState(device)];
}
