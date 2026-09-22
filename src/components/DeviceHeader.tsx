import React from 'react';
import {
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Check,
  Clock,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { Device } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DeviceHeaderProps {
  device: Device;
  onClose: () => void;
  onForcePage?: (pageId: string | null) => void;
  autoFillEnabled?: boolean;
  onAutoFillToggle?: () => void;
}

const getBatteryIcon = (level: number) => {
  if (level >= 75) return BatteryFull;
  if (level >= 50) return Battery;
  if (level >= 25) return BatteryMedium;
  return BatteryLow;
};

const formatLastUpdated = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
};

export function DeviceHeader({ device, onClose, autoFillEnabled, onAutoFillToggle }: DeviceHeaderProps) {
  const currentPage = device.pages.find(
    (p) => p.id === (device.status.forcedPage || device.status.currentPage)
  );

  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Left: back + name + status meta */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="sm:hidden flex-shrink-0 -ml-2 text-gray-600 dark:text-gray-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
            {device.name}
          </h3>
          <div className="flex sm:hidden items-center gap-2 mt-0.5">
            {device.status.wifiStrength > 0 ? (
              <Wifi className={`h-3 w-3 ${device.status.wifiStrength > 2 ? 'text-green-500' : 'text-yellow-500'}`} />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            {React.createElement(getBatteryIcon(device.status.batteryLevel), {
              className: `h-3 w-3 ${device.status.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`,
            })}
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{device.status.batteryLevel}%</span>
            {currentPage && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                {currentPage.daypart}
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="flex items-center gap-1.5 py-0.5">
            {device.status.wifiStrength > 0 ? (
              <Wifi className={`h-3 w-3 ${device.status.wifiStrength > 2 ? 'text-green-500' : 'text-yellow-500'}`} />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1.5 py-0.5">
            {React.createElement(getBatteryIcon(device.status.batteryLevel), {
              className: `h-3 w-3 ${device.status.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`,
            })}
            <span className="text-[10px]">{device.status.batteryLevel}%</span>
          </Badge>
          {currentPage && (
            <Badge variant="secondary" className="flex items-center gap-1.5 py-0.5">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-[10px]">{currentPage.daypart}</span>
            </Badge>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
            Updated {formatLastUpdated(device.status.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Right: Auto Fill toggle + Done */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onAutoFillToggle && (
          <button
            onClick={onAutoFillToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${
              autoFillEnabled
                ? 'bg-teal-50 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 shadow-sm shadow-teal-100 dark:shadow-teal-900/20'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-teal-300 hover:text-teal-600 dark:hover:text-teal-400'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 transition-colors ${autoFillEnabled ? 'text-teal-500' : ''}`} />
            <span className="hidden sm:inline">Auto Fill</span>
            {autoFillEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            )}
          </button>
        )}
        <Button
          variant="outline"
          onClick={onClose}
          className="flex items-center gap-2 px-3 sm:px-4 py-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/40 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
        >
          <Check className="h-4 w-4" />
          <span className="hidden sm:inline">Done</span>
        </Button>
      </div>
    </div>
  );
}
