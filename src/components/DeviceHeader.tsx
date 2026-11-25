import React from 'react';
import { Wifi, WifiOff, Clock, X, Settings } from 'lucide-react';
import { Device } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SyncStatus } from './SyncStatus';
import { PendingChangesButton } from './PendingChanges';
import { deviceName } from '../lib/deviceName';
import { batteryOf } from '../lib/battery';

interface DeviceHeaderProps {
  device: Device;
  onClose: () => void;
  onOpenConfig: () => void;
}


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

export function DeviceHeader({ device, onClose, onOpenConfig }: DeviceHeaderProps) {
  const currentPage = device.pages.find(
    (p) => p.id === (device.status.forcedPage || device.status.currentPage)
  );

  return (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Left: X close + name + status meta */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="flex-shrink-0 -ml-2 h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
            {deviceName(device)}
          </h3>
          <div className="flex sm:hidden items-center gap-2 mt-0.5">
            {device.status.wifiStrength > 0 ? (
              <Wifi className={`h-3 w-3 ${device.status.wifiStrength > 2 ? 'text-emerald-500' : 'text-amber-500'}`} />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            {React.createElement(batteryOf(device).icon, { className: `h-3 w-3 ${batteryOf(device).color}` })}
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{batteryOf(device).label}</span>
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
              <Wifi className={`h-3 w-3 ${device.status.wifiStrength > 2 ? 'text-emerald-500' : 'text-amber-500'}`} />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1.5 py-0.5">
            {React.createElement(batteryOf(device).icon, { className: `h-3 w-3 ${batteryOf(device).color}` })}
            <span className="text-[10px]">{batteryOf(device).label}</span>
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

      {/* Right: sync status + pending changes + gear button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <SyncStatus deviceId={device.id} size="md" showActions />
        <span data-guide="save"><PendingChangesButton deviceId={device.id} /></span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenConfig}
          data-guide="label-settings"
          aria-label="Label settings"
          className="h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
