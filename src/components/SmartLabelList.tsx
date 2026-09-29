import React, { useMemo } from 'react';
import { Device, LabelSize, Placement, DeviceWeekSchedule } from '../types';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, Wifi, WifiOff, BatteryFull, Battery, BatteryMedium,
  BatteryLow, ChevronRight, Calendar, Tag,
} from 'lucide-react';
import { DAY_ABBR } from '../lib/availability';

interface SmartLabelListProps {
  loading: boolean;
  error: string | null;
  devices: Device[];
  onDeviceSelect: (device: Device, daypart: string) => void;
  searchValue: string;
  placements: Placement[];
  selectedDaypart: string;
  selectedPlacements: string[];
  selectedWeekStart: string | null;
  weekSchedules: DeviceWeekSchedule[];
}

const labelSizeLabels: Record<LabelSize, string> = {
  '2-inch': '2"', '3-inch': '3"', '4-inch': '4"', '7-inch': '7"', '11-inch': '11"',
};

const getBatteryIcon = (level: number) => {
  if (level >= 75) return BatteryFull;
  if (level >= 50) return Battery;
  if (level >= 25) return BatteryMedium;
  return BatteryLow;
};

const getBatteryColor = (level: number) => {
  if (level >= 50) return 'text-green-500';
  if (level >= 25) return 'text-yellow-500';
  return 'text-red-500';
};

const getWifiColor = (strength: number) => {
  if (strength >= 3) return 'text-green-500';
  if (strength > 0) return 'text-yellow-500';
  return 'text-red-500';
};

const daypartColors: Record<string, string> = {
  'Breakfast': 'bg-amber-500',
  'Lunch': 'bg-emerald-500',
  'Dinner': 'bg-blue-500',
  'Late Night': 'bg-violet-500',
};

export function SmartLabelList({
  loading,
  error,
  devices,
  onDeviceSelect,
  searchValue,
  placements,
  selectedDaypart,
  selectedPlacements,
  selectedWeekStart,
  weekSchedules,
}: SmartLabelListProps) {
  const filteredDevices = useMemo(() => {
    let result = devices;
    if (selectedPlacements.length > 0) {
      result = result.filter(d => d.placementId && selectedPlacements.includes(d.placementId));
    }
    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      result = result.filter(d => {
        if (d.name.toLowerCase().includes(q) || d.location.toLowerCase().includes(q)) return true;
        return d.pages.some(p => p.assignedItems.some(item => item.name.toLowerCase().includes(q)));
      });
    }
    return result;
  }, [devices, searchValue, selectedPlacements]);

  const scheduleByDevice = useMemo(() => {
    const map = new Map<string, DeviceWeekSchedule>();
    weekSchedules.forEach(s => map.set(s.deviceId, s));
    return map;
  }, [weekSchedules]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading labels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (filteredDevices.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {searchValue || selectedPlacements.length > 0 ? 'No labels match your filters' : 'No labels available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className="hidden lg:grid grid-cols-[2fr_1fr_180px_2fr_200px_40px] gap-3 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
        <span>Label</span>
        <span>Location</span>
        <span>Status</span>
        <span>{selectedDaypart} Items</span>
        <span>Week Schedule</span>
        <span />
      </div>

      {filteredDevices.map(device => (
        <LabelRow
          key={device.id}
          device={device}
          daypart={selectedDaypart}
          onClick={() => onDeviceSelect(device, selectedDaypart)}
          schedule={scheduleByDevice.get(device.id)}
          selectedWeekStart={selectedWeekStart}
        />
      ))}
    </div>
  );
}

interface LabelRowProps {
  device: Device;
  daypart: string;
  onClick: () => void;
  schedule?: DeviceWeekSchedule;
  selectedWeekStart: string | null;
}

function LabelRow({ device, daypart, onClick, schedule, selectedWeekStart }: LabelRowProps) {
  const BattIcon = getBatteryIcon(device.status.batteryLevel);
  const page = device.pages.find(p => p.daypart === daypart);
  const items = page?.assignedItems ?? [];
  const isEmpty = items.length === 0;
  const dpColor = daypartColors[daypart] || 'bg-gray-500';

  const scheduledDays = useMemo(() => {
    if (!schedule?.items) return new Set<number>();
    return new Set(
      schedule.items
        .filter(i => i.daypart === daypart)
        .map(i => i.dayOfWeek)
    );
  }, [schedule, daypart]);

  const isFutureWeek = selectedWeekStart !== null;

  return (
    <div
      onClick={onClick}
      className="group grid grid-cols-1 lg:grid-cols-[2fr_1fr_180px_2fr_200px_40px] gap-3 items-center px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sm transition-all cursor-pointer"
    >
      {/* Label name + size */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${isEmpty ? 'bg-amber-400' : dpColor}`} />
        <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{device.name}</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex-shrink-0">{labelSizeLabels[device.labelSize]}</Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate lg:hidden">{device.location}</p>
        </div>
      </div>

      {/* Location (desktop) */}
      <span className="hidden lg:block text-sm text-gray-600 dark:text-gray-400 truncate">{device.location}</span>

      {/* Status indicators */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-1">
          {device.status.wifiStrength > 0 ? (
            <Wifi className={`h-3.5 w-3.5 ${getWifiColor(device.status.wifiStrength)}`} />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className="text-xs text-gray-500">{device.status.wifiStrength > 0 ? 'Online' : 'Offline'}</span>
        </div>
        <div className="flex items-center gap-1">
          <BattIcon className={`h-3.5 w-3.5 ${getBatteryColor(device.status.batteryLevel)}`} />
          <span className="text-xs text-gray-500">{device.status.batteryLevel}%</span>
        </div>
      </div>

      {/* Current daypart items */}
      <div className="min-w-0">
        {isEmpty ? (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-amber-600 dark:text-amber-400">No items assigned</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.slice(0, 3).map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="text-gray-900 dark:text-gray-100 truncate">{item.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">${parseFloat(item.price).toFixed(2)}</span>
              </div>
            ))}
            {items.length > 3 && (
              <span className="text-xs text-gray-400">+{items.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Week schedule day strip */}
      <div className="hidden lg:block">
        <DayStrip
          scheduledDays={scheduledDays}
          isFutureWeek={isFutureWeek}
          hasSchedule={!!schedule}
        />
      </div>

      {/* Chevron */}
      <div className="hidden lg:flex justify-end">
        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-sky-500 transition-colors" />
      </div>
    </div>
  );
}

function DayStrip({
  scheduledDays,
  isFutureWeek,
  hasSchedule,
}: {
  scheduledDays: Set<number>;
  isFutureWeek: boolean;
  hasSchedule: boolean;
}) {
  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();

  if (!isFutureWeek && !hasSchedule) {
    return (
      <div className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 mr-1" />
        <span className="text-xs text-gray-400 dark:text-gray-500">No schedule</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {days.map((dow, idx) => {
        const isScheduled = scheduledDays.has(dow);
        const isToday = !isFutureWeek && dow === today;

        return (
          <div
            key={dow}
            className={`
              w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold transition-colors
              ${isToday ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-gray-800' : ''}
              ${isScheduled
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : isFutureWeek || hasSchedule
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }
            `}
            title={`${DAY_ABBR[dow]}${isScheduled ? ' - Scheduled' : ' - No items'}`}
          >
            {labels[idx]}
          </div>
        );
      })}
    </div>
  );
}
