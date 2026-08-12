import React, { useMemo, useState } from 'react';
import { Device, LabelSize, Placement } from '../types';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wifi, WifiOff, BatteryFull, Battery, BatteryMedium, BatteryLow } from 'lucide-react';

interface SmartLabelGridProps {
  loading: boolean;
  error: string | null;
  devices: Device[];
  onDeviceSelect: (device: Device, daypart: string) => void;
  searchValue: string;
  placements: Placement[];
  selectedDaypart: string;
  selectedPlacements: string[];
}

const labelSizeConfig: Record<LabelSize, { label: string; aspectClass: string; fontSize: string; capacity: number }> = {
  '2-inch': { label: '2"', aspectClass: 'aspect-[3/2]', fontSize: 'text-sm', capacity: 1 },
  '3-inch': { label: '3"', aspectClass: 'aspect-[4/3]', fontSize: 'text-sm', capacity: 1 },
  '4-inch': { label: '4"', aspectClass: 'aspect-[3/2]', fontSize: 'text-base', capacity: 1 },
  '7-inch': { label: '7"', aspectClass: 'aspect-[4/3]', fontSize: 'text-sm', capacity: 4 },
  '11-inch': { label: '11"', aspectClass: 'aspect-[5/3]', fontSize: 'text-sm', capacity: 8 },
};

const getBatteryIcon = (level: number) => {
  if (level >= 75) return BatteryFull;
  if (level >= 50) return Battery;
  if (level >= 25) return BatteryMedium;
  return BatteryLow;
};

const getBatteryColor = (level: number) => {
  if (level >= 50) return 'text-green-500 dark:text-green-400';
  if (level >= 25) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
};

const getWifiColor = (strength: number) => {
  if (strength >= 3) return 'text-green-500 dark:text-green-400';
  if (strength > 0) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
};

const daypartStyles: Record<string, { border: string; accent: string }> = {
  'Breakfast': { border: 'border-amber-300 dark:border-amber-700', accent: 'bg-amber-400' },
  'Lunch': { border: 'border-emerald-300 dark:border-emerald-700', accent: 'bg-emerald-400' },
  'Dinner': { border: 'border-blue-300 dark:border-blue-700', accent: 'bg-blue-400' },
  'Late Night': { border: 'border-violet-300 dark:border-violet-700', accent: 'bg-violet-400' },
  'All Day': { border: 'border-gray-300 dark:border-gray-600', accent: 'bg-gray-400' },
};

const getDaypartStyle = (daypart: string) => daypartStyles[daypart] || daypartStyles['All Day'];

const formatPrice = (price: string) => {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return `$${num.toFixed(2)}`;
};

export function SmartLabelGrid({
  loading,
  error,
  devices,
  onDeviceSelect,
  searchValue,
  placements,
  selectedDaypart,
  selectedPlacements,
}: SmartLabelGridProps) {
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto"></div>
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
        <AlertTriangle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {searchValue || selectedPlacements.length > 0 ? 'No labels match your filters' : 'No labels available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Label grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDevices.map(device => (
          <LabelCard
            key={device.id}
            device={device}
            daypart={selectedDaypart}
            onClick={() => onDeviceSelect(device, selectedDaypart)}
            highlight={searchValue.trim() !== ''}
          />
        ))}
      </div>
    </div>
  );
}

interface LabelCardProps {
  device: Device;
  daypart: string;
  onClick: () => void;
  highlight: boolean;
}

function LabelCard({ device, daypart, onClick, highlight }: LabelCardProps) {
  const config = labelSizeConfig[device.labelSize];
  const BatteryIcon = getBatteryIcon(device.status.batteryLevel);
  const dpStyle = getDaypartStyle(daypart);

  const page = device.pages.find(p => p.daypart === daypart);
  const items = page?.assignedItems ?? [];
  const isEmpty = items.length === 0;

  return (
    <div
      onClick={onClick}
      className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden ${highlight ? 'ring-1 ring-sky-200 dark:ring-sky-800' : ''}`}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 truncate">{device.name}</span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex-shrink-0">{config.label}</Badge>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {device.status.wifiStrength > 0 ? (
            <Wifi className={`h-3.5 w-3.5 ${getWifiColor(device.status.wifiStrength)}`} />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
          )}
          <BatteryIcon className={`h-3.5 w-3.5 ${getBatteryColor(device.status.batteryLevel)}`} />
        </div>
      </div>

      {/* ESL visual */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900/50">
        <div
          className={`relative w-full ${config.aspectClass} rounded-lg border-2 ${isEmpty ? 'border-amber-400 dark:border-amber-600' : dpStyle.border} bg-white dark:bg-gray-100 overflow-hidden flex flex-col`}
        >
          {/* Daypart accent bar */}
          <div className={`h-1.5 ${isEmpty ? 'bg-amber-400' : dpStyle.accent} flex-shrink-0`} />

          {isEmpty ? (
            <EmptyLabelState daypart={daypart} />
          ) : (
            <LabelFace size={device.labelSize} items={items} fontSize={config.fontSize} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.location}</p>
      </div>
    </div>
  );
}

function EmptyLabelState({ daypart }: { daypart: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
      <AlertTriangle className="h-6 w-6 text-amber-500" />
      <p className="text-xs font-medium text-amber-600 dark:text-amber-500 text-center">No items assigned</p>
      <p className="text-[10px] text-amber-500 dark:text-amber-600">{daypart}</p>
    </div>
  );
}

function LabelFace({ size, items, fontSize }: { size: LabelSize; items: Device['pages'][0]['assignedItems']; fontSize: string }) {
  if (size === '2-inch' || size === '3-inch') {
    const item = items[0];
    return (
      <div className="flex-1 flex flex-col justify-center px-3 py-1.5">
        <p className={`font-bold text-gray-900 ${fontSize} leading-tight truncate`}>{item.name}</p>
        <p className="text-lg font-bold text-gray-900 mt-0.5">{formatPrice(item.price)}</p>
      </div>
    );
  }

  if (size === '4-inch') {
    const item = items[0];
    return (
      <div className="flex-1 flex flex-col px-3 py-2">
        <p className="font-bold text-gray-900 text-base leading-tight truncate">{item.name}</p>
        {item.description && (
          <p className="text-[10px] text-gray-600 leading-tight mt-1 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-xs text-gray-500">{item.calories} cal</span>
          <span className="text-lg font-bold text-gray-900">{formatPrice(item.price)}</span>
        </div>
      </div>
    );
  }

  // 7-inch and 11-inch: multi-item list
  return (
    <div className="flex-1 flex flex-col px-2.5 py-1.5 overflow-hidden">
      {items.slice(0, labelSizeConfig[size].capacity).map((item, idx) => (
        <div key={item.id} className={`flex items-center justify-between py-0.5 ${idx > 0 ? 'border-t border-gray-200' : ''}`}>
          <span className="text-xs font-medium text-gray-900 truncate flex-1 mr-2 leading-tight">{item.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] text-gray-400">{item.calories}</span>
            <span className="text-xs font-bold text-gray-900">{formatPrice(item.price)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
