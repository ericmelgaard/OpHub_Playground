import React, { useEffect, useState } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Clock,
  MapPin,
  Monitor,
  Sparkles,
  Tv,
  Users,
  Tag,
  ImageOff,
} from 'lucide-react';
import { Device, DeviceGroup, Brand } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SaveButton } from './SaveButton';
import { deviceName } from '../lib/deviceName';

import core22Image from '@/assets/images/devices/core2.2_2.png';
import { levelIconColor } from '@/lib/levelColors';
import { daypartColor } from '@/lib/daypartColors';

interface DeviceConfigPageProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
  // Pages with Auto Fill on and the stations they draw from
  autoFillSummary: { daypart: string; stations: string[] }[];
  deviceGroup?: DeviceGroup | null;
  groupBrands?: Brand[];
  // Saves the label's name (blank = show the device ID)
  onRename?: (name: string) => Promise<void>;
}

const getBatteryIcon = (level: number) => {
  if (level >= 75) return BatteryFull;
  if (level >= 50) return Battery;
  if (level >= 25) return BatteryMedium;
  return BatteryLow;
};

const getBatteryColor = (level: number) => {
  if (level > 50) return 'text-emerald-500';
  if (level > 20) return 'text-amber-500';
  return 'text-red-500';
};

const getWifiLabel = (strength: number) => {
  if (strength === 0) return 'Disconnected';
  if (strength <= 1) return 'Weak';
  if (strength <= 2) return 'Fair';
  if (strength <= 3) return 'Good';
  return 'Excellent';
};

const getWifiColor = (strength: number) => {
  if (strength === 0) return 'text-red-500';
  if (strength <= 2) return 'text-amber-500';
  return 'text-emerald-500';
};

const formatLastUpdated = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return date.toLocaleDateString();
};

const getDeviceImage = (_labelSize: string) => {
  return core22Image;
};

export function DeviceConfigPage({
  device,
  isOpen,
  onClose,
  autoFillSummary,
  deviceGroup,
  groupBrands,
  onRename,
}: DeviceConfigPageProps) {
  const savedName = device.displayName?.trim() ?? '';
  const [name, setName] = useState(savedName);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => { setName(savedName); setSaveError(null); }, [savedName, device.id, isOpen]);
  const nameChanged = name.trim() !== savedName;

  const saveName = async () => {
    if (!onRename || !nameChanged) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onRename(name.trim());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "The name didn't save.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentPage = device.pages.find(
    (p) => p.id === (device.status.forcedPage || device.status.currentPage)
  );

  const batteryLevel = device.status.batteryLevel;
  const wifiStrength = device.status.wifiStrength;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0 -ml-2 h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
            Device Configuration
          </h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Device Info */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  <img
                    src={getDeviceImage(device.labelSize)}
                    alt={`${device.labelSize} device`}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {deviceName(device)}
                  </h3>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">Device ID {device.name}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${levelIconColor('placement')}`} />
                      <span className="truncate">{device.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Monitor className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{device.labelSize} display</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{device.pages.length} pages</Badge>
                    <Badge variant="secondary" className="text-xs">{device.assignedItems.length} items</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Name */}
          {onRename && (
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
              <CardContent className="p-5">
                <form
                  id="label-name-form"
                  onSubmit={e => { e.preventDefault(); saveName(); }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <Label htmlFor="label-name" className="text-sm font-semibold text-gray-900 dark:text-white">Name</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="label-name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={device.name}
                      maxLength={60}
                      className="flex-1 h-9"
                    />
                    <SaveButton
                      form="label-name-form"
                      count={nameChanged ? 1 : 0}
                      saving={saving}
                      onSave={saveName}
                      onDiscard={() => { setName(savedName); setSaveError(null); }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    What people call this label, like "Grill Station - 1". Leave it blank to use the device ID.
                  </p>
                  {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
                </form>
              </CardContent>
            </Card>
          )}

          {/* Group & Brands */}
          {deviceGroup && (
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-brand" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Group</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{deviceGroup.name}</p>
                {deviceGroup.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{deviceGroup.description}</p>
                )}
                {groupBrands && groupBrands.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Allowed Brands</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {groupBrands.map((b) => (
                        <div key={b.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          {b.logoFilename ? (
                            <img
                              src={`${b.logoBaseUrl}${b.logoFilename}`}
                              alt=""
                              className="h-3.5 w-3.5 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : null}
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{b.displayName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Device Health */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <CardContent className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Device Health</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Wifi */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className={`mt-0.5 ${getWifiColor(wifiStrength)}`}>
                    {wifiStrength > 0 ? (
                      <Wifi className="h-5 w-5" />
                    ) : (
                      <WifiOff className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Wi-Fi</p>
                    <p className={`text-sm font-semibold ${getWifiColor(wifiStrength)}`}>
                      {getWifiLabel(wifiStrength)}
                    </p>
                  </div>
                </div>

                {/* Battery */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className={`mt-0.5 ${getBatteryColor(batteryLevel)}`}>
                    {React.createElement(getBatteryIcon(batteryLevel), {
                      className: 'h-5 w-5',
                    })}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Battery</p>
                    <p className={`text-sm font-semibold ${getBatteryColor(batteryLevel)}`}>
                      {batteryLevel}%
                    </p>
                  </div>
                </div>

                {/* Current Page */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="mt-0.5 text-gray-400 dark:text-gray-500">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Page</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {currentPage ? currentPage.daypart : 'None'}
                    </p>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="mt-0.5 text-gray-400 dark:text-gray-500">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Update</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatLastUpdated(device.status.lastUpdated)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live View */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <CardContent className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Live View</h4>
              <div className="flex flex-col items-center justify-center py-10 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600">
                <Tv className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Coming soon</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Preview what this device is currently showing
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Auto Fill */}
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 flex-shrink-0 ${autoFillSummary.length > 0 ? 'text-teal-500' : 'text-gray-400 dark:text-gray-500'}`} />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Auto Fill</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                Adds a station’s items to a page. Set it per page from Auto Fill above Available Items.
              </p>
              {autoFillSummary.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {autoFillSummary.map(s => (
                    <li key={s.daypart} className="flex items-start gap-2 text-xs">
                      <span className={`font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${daypartColor(s.daypart).chip}`}>
                        {s.daypart}
                      </span>
                      <span className="text-teal-700 dark:text-teal-300 pt-0.5">{s.stations.join(' · ')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Off on every page</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
