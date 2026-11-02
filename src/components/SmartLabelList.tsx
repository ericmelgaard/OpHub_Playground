import React, { useMemo } from 'react';
import { Device, LabelSize, Placement, DeviceWeekSchedule } from '../types';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, Wifi, WifiOff, BatteryFull, Battery, BatteryMedium,
  BatteryLow, ChevronRight, Calendar, Tag,
} from 'lucide-react';
import { DAY_ABBR } from '../lib/availability';
import { SyncStatus, PendingPill } from './SyncStatus';
import { daypartColor } from '../lib/daypartColors';
import { filterLabels } from '../lib/labelFilter';
import { ReviewedTag } from './ReviewedTag';

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
  // When given, days whose items differ from the Default Week are marked as overrides.
  defaultSchedules?: DeviceWeekSchedule[];
  // Day the schedule is editing; ringed in each row's week strip
  selectedDay?: number | 'every-day';
  // Labels opened this session (for the selected week, day and daypart)
  reviewedIds?: Set<string>;
  // The label you last opened, so you can find your place on return
  lastOpenedId?: string | null;
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
  if (level >= 50) return 'text-emerald-500';
  if (level >= 25) return 'text-amber-500';
  return 'text-red-500';
};

const getWifiColor = (strength: number) => {
  if (strength >= 3) return 'text-emerald-500';
  if (strength > 0) return 'text-amber-500';
  return 'text-red-500';
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
  defaultSchedules,
  selectedDay,
  reviewedIds,
  lastOpenedId,
}: SmartLabelListProps) {
  const filteredDevices = useMemo(
    () => filterLabels(devices, searchValue, selectedPlacements),
    [devices, searchValue, selectedPlacements],
  );

  const scheduleByDevice = useMemo(() => {
    const map = new Map<string, DeviceWeekSchedule>();
    weekSchedules.forEach(s => map.set(s.deviceId, s));
    return map;
  }, [weekSchedules]);

  const defaultByDevice = useMemo(() => {
    const map = new Map<string, DeviceWeekSchedule>();
    defaultSchedules?.forEach(s => map.set(s.deviceId, s));
    return map;
  }, [defaultSchedules]);

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
          defaultSchedule={defaultSchedules ? defaultByDevice.get(device.id) : undefined}
          compareToDefault={!!defaultSchedules}
          selectedWeekStart={selectedWeekStart}
          selectedDay={selectedDay}
          reviewed={reviewedIds?.has(device.id) ?? false}
          lastOpened={device.id === lastOpenedId}
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
  defaultSchedule?: DeviceWeekSchedule;
  compareToDefault: boolean;
  selectedWeekStart: string | null;
  selectedDay?: number | 'every-day';
  reviewed: boolean;
  lastOpened: boolean;
}

type DayState = 'default' | 'override' | 'missing';

function mrnsFor(schedule: DeviceWeekSchedule | undefined, daypart: string, dow: number): string {
  return (schedule?.items ?? [])
    .filter(i => i.daypart === daypart && i.dayOfWeek === dow)
    .map(i => i.menuItemMrn)
    .sort()
    .join(',');
}

function LabelRow({ device, daypart, onClick, schedule, defaultSchedule, compareToDefault, selectedWeekStart, selectedDay, reviewed, lastOpened }: LabelRowProps) {
  const BattIcon = getBatteryIcon(device.status.batteryLevel);
  const page = device.pages.find(p => p.daypart === daypart);
  const items = page?.assignedItems ?? [];
  const isEmpty = items.length === 0;
  const dpColor = daypartColor(daypart).solid;

  const dayStates = useMemo(() => {
    const states = new Map<number, DayState>();
    for (let dow = 0; dow < 7; dow++) {
      const mrns = mrnsFor(schedule, daypart, dow);
      if (!mrns) states.set(dow, 'missing');
      else if (compareToDefault && mrns !== mrnsFor(defaultSchedule, daypart, dow)) states.set(dow, 'override');
      else states.set(dow, 'default');
    }
    return states;
  }, [schedule, defaultSchedule, compareToDefault, daypart]);

  const isFutureWeek = selectedWeekStart !== null;

  return (
    <div
      onClick={onClick}
      data-label-id={device.id}
      className={`group grid grid-cols-1 lg:grid-cols-[2fr_1fr_180px_2fr_200px_40px] gap-3 items-center px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-sm transition-all cursor-pointer ${
        lastOpened ? 'ring-2 ring-sky-400 dark:ring-sky-500' : ''
      }`}
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
          {reviewed && <div className="mt-1"><ReviewedTag /></div>}
        </div>
      </div>

      {/* Location (desktop) */}
      <span className="hidden lg:block text-sm text-gray-600 dark:text-gray-400 truncate">{device.location}</span>

      {/* Status indicators */}
      <div className="hidden lg:flex flex-col items-start gap-1">
        <div className="flex items-center gap-3">
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
        <div className="flex flex-wrap items-center gap-1">
          <SyncStatus deviceId={device.id} compact />
          <PendingPill deviceId={device.id} />
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
          dayStates={dayStates}
          isFutureWeek={isFutureWeek}
          hasSchedule={!!schedule}
          selectedDay={selectedDay}
        />
      </div>

      {/* Chevron */}
      <div className="hidden lg:flex justify-end">
        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-sky-500 transition-colors" />
      </div>
    </div>
  );
}

const dayStateStyles: Record<DayState, { className: string; title: string }> = {
  default: {
    className: 'bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600',
    title: 'Scheduled',
  },
  override: {
    className: 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700',
    title: 'Differs from Default Week',
  },
  missing: {
    className: 'bg-transparent text-amber-600 dark:text-amber-400 border border-dashed border-amber-400 dark:border-amber-600',
    title: 'No items',
  },
};

function DayStrip({
  dayStates,
  isFutureWeek,
  hasSchedule,
  selectedDay,
}: {
  dayStates: Map<number, DayState>;
  isFutureWeek: boolean;
  hasSchedule: boolean;
  selectedDay?: number | 'every-day';
}) {
  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();
  // The day being edited when one is picked; otherwise today, in the current week only
  const highlighted = selectedDay === 'every-day' ? null
    : selectedDay !== undefined ? selectedDay
    : isFutureWeek ? null : today;

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
        const style = dayStateStyles[dayStates.get(dow) ?? 'missing'];
        const isHighlighted = dow === highlighted;

        return (
          <div
            key={dow}
            className={`
              w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold transition-colors
              ${isHighlighted ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-800' : ''}
              ${style.className}
            `}
            title={`${DAY_ABBR[dow]} - ${style.title}`}
          >
            {labels[idx]}
          </div>
        );
      })}
    </div>
  );
}
