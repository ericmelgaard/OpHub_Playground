import React, { useState, useMemo } from 'react';
import { Device, Placement } from '../types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow, 
  BatteryMedium, 
  BatteryFull, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  Monitor,
  Check,
  Trash2,
  Power,
  PowerOff,
  Building2,
  Store,
  MoreVertical
} from 'lucide-react';

interface DeviceGridProps {
  loading: boolean;
  error: string | null;
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
  searchValue?: string;
  viewMode?: 'grid' | 'list';
  placements: Placement[];
}

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

const getDaypartColor = (daypart: string) => {
  switch (daypart) {
    case 'Breakfast':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'Lunch':
      return 'text-green-600 dark:text-green-400';
    case 'Dinner':
      return 'text-blue-600 dark:text-blue-400';
    case 'Late Night':
      return 'text-purple-600 dark:text-purple-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getDaypartBg = (daypart: string) => {
  switch (daypart) {
    case 'Breakfast':
      return 'bg-yellow-50 dark:bg-yellow-900/20';
    case 'Lunch':
      return 'bg-green-50 dark:bg-green-900/20';
    case 'Dinner':
      return 'bg-blue-50 dark:bg-blue-900/20';
    case 'Late Night':
      return 'bg-purple-50 dark:bg-purple-900/20';
    default:
      return 'bg-gray-50 dark:bg-gray-900/20';
  }
};

const hasPageWarning = (page: DevicePage) => {
  const displayedItems = page.assignedItems.slice(0, page.displayCapacity);
  return displayedItems.length === 0 || !displayedItems.some((item) => item.isActive !== false);
};

interface GroupedDevices {
  [placementId: string]: {
    placement: Placement;
    devices: Device[];
    path: string[];
  };
}

export function DeviceGrid({
  loading,
  error,
  devices,
  onDeviceSelect,
  searchValue = '',
  viewMode = 'grid',
  placements
}: DeviceGridProps) {
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null);

  const groupedDevices = useMemo(() => {
    const groups: GroupedDevices = {};
    
    const findPlacementPath = (id: string, placements: Placement[], path: string[] = []): string[] | null => {
      for (const placement of placements) {
        if (placement.id === id) {
          return [...path, placement.name];
        }
        const childPath = findPlacementPath(id, placement.children, [...path, placement.name]);
        if (childPath) return childPath;
      }
      return null;
    };

    devices.forEach(device => {
      if (!device.placementId) return;
      
      const findPlacement = (id: string, placements: Placement[]): Placement | null => {
        for (const placement of placements) {
          if (placement.id === id) return placement;
          const found = findPlacement(id, placement.children);
          if (found) return found;
        }
        return null;
      };

      const placement = findPlacement(device.placementId, placements);
      if (!placement) return;

      const path = findPlacementPath(device.placementId, placements) || [];

      if (!groups[device.placementId]) {
        groups[device.placementId] = {
          placement,
          devices: [],
          path
        };
      }
      groups[device.placementId].devices.push(device);
    });

    return groups;
  }, [devices, placements]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading devices...</p>
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

  const filteredDevices = devices.filter(device => {
    if (!searchValue.trim()) return true;
    return (
      device.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      device.location.toLowerCase().includes(searchValue.toLowerCase())
    );
  });

  if (filteredDevices.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {searchValue ? 'No devices match your search criteria' : 'No devices available'}
        </p>
      </div>
    );
  }

  const toggleDeviceSelection = (deviceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const renderDeviceCard = (device: Device) => {
    const warningCount = device.pages.filter(page => hasPageWarning(page)).length;
    const BatteryIcon = getBatteryIcon(device.status.batteryLevel);

    return (
      <Card
        key={device.id}
        onClick={() => onDeviceSelect(device)}
        className="text-left border dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-white dark:bg-gray-800"
      >
        <CardHeader className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {device.name}
                </h4>
                <div className="flex items-center gap-2">
                  {device.status.wifiStrength > 0 ? (
                    <Wifi className={`h-4 w-4 ${getWifiColor(device.status.wifiStrength)}`} />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500 dark:text-red-400" />
                  )}
                  <BatteryIcon className={`h-4 w-4 ${getBatteryColor(device.status.batteryLevel)}`} />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {device.location}
              </p>
            </div>
            <Monitor className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="secondary">
              {device.assignedItems.length} total items
            </Badge>
            {warningCount > 0 && (
              <Badge variant="warning" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
          {device.pages.map((page) => {
            const activeItems = page.assignedItems.slice(0, page.displayCapacity).length;
            const showWarning = hasPageWarning(page);

            return (
              <div
                key={page.id}
                className={`px-4 py-2 ${getDaypartBg(page.daypart)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${getDaypartColor(page.daypart)}`} />
                    <div>
                      <span className={`text-sm font-medium ${getDaypartColor(page.daypart)}`}>
                        {page.daypart}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        (Page {page.name.split(' ')[1]})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showWarning && (
                      <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    )}
                    <Badge variant={activeItems > 0 ? 'info' : 'secondary'}>
                      {activeItems} of {page.displayCapacity}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderDeviceList = (device: Device) => {
    const warningCount = device.pages.filter(page => hasPageWarning(page)).length;
    const BatteryIcon = getBatteryIcon(device.status.batteryLevel);
    const isSelected = selectedDevices.has(device.id);
    const currentPage = device.pages.find(p => p.id === device.status.currentPage);

    return (
      <div
        key={device.id}
        onClick={(e) => toggleDeviceSelection(device.id, e)}
        className={`px-4 py-2 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
          isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
        }`}
      >
        {/* Mobile View */}
        <div className="md:hidden flex items-center gap-3">
          <div
            className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-500 dark:bg-indigo-400'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {device.name}
              </h4>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {device.status.wifiStrength > 0 ? (
                  <Wifi className={`h-4 w-4 ${getWifiColor(device.status.wifiStrength)}`} />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500 dark:text-red-400" />
                )}
                <BatteryIcon className={`h-4 w-4 ${getBatteryColor(device.status.batteryLevel)}`} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {device.location}
              </span>
              {warningCount > 0 && (
                <Badge variant="warning" className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {warningCount}
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeviceSelect(device);
            }}
            className="flex-shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop View */}
        <div className="hidden md:flex items-center gap-4">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-500 dark:bg-indigo-400'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {device.name}
                  </h4>
                  {warningCount > 0 && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {warningCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {device.location}
                </p>
              </div>

              <div className="flex items-center gap-6 flex-shrink-0">
                {currentPage && (
                  <div className={`px-3 py-1 rounded-md ${getDaypartBg(currentPage.daypart)}`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${getDaypartColor(currentPage.daypart)}`} />
                      <span className={`text-sm font-medium ${getDaypartColor(currentPage.daypart)}`}>
                        {currentPage.daypart} - Page {currentPage.name.split(' ')[1]}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {device.status.wifiStrength > 0 ? (
                      <Wifi className={`h-4 w-4 ${getWifiColor(device.status.wifiStrength)}`} />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500 dark:text-red-400" />
                    )}
                    <span className="text-gray-500 dark:text-gray-400">
                      {device.status.wifiStrength * 20}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BatteryIcon className={`h-4 w-4 ${getBatteryColor(device.status.batteryLevel)}`} />
                    <span className="text-gray-500 dark:text-gray-400">
                      {device.status.batteryLevel}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {device.assignedItems.length} items
                  </Badge>
                  <Badge variant="secondary">
                    {device.pages.length} pages
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDeviceSelect(device);
            }}
            className="ml-4"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' && selectedDevices.size > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 py-2 px-4 flex items-center gap-4 sticky top-0 z-10">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedDevices.size} {selectedDevices.size === 1 ? 'device' : 'devices'} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="secondary" size="sm" className="text-green-600 dark:text-green-400">
              <Power className="h-4 w-4 mr-2" />
              Power On
            </Button>
            <Button variant="secondary" size="sm" className="text-amber-600 dark:text-amber-400">
              <PowerOff className="h-4 w-4 mr-2" />
              Power Off
            </Button>
          </div>
        </div>
      )}

      {Object.entries(groupedDevices).map(([placementId, { placement, devices: groupDevices, path }]) => {
        const filteredGroupDevices = groupDevices.filter(device => 
          device.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          device.location.toLowerCase().includes(searchValue.toLowerCase())
        );

        if (filteredGroupDevices.length === 0) return null;

        return (
          <div key={placementId} className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {placement.devices.length > 0 ? (
                    <Monitor className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <Store className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {placement.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {path.slice(0, -1).join(' / ')}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {filteredGroupDevices.length} {filteredGroupDevices.length === 1 ? 'device' : 'devices'}
                </Badge>
              </div>
            </div>

            {viewMode === 'list' ? (
              <Card>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredGroupDevices.map(renderDeviceList)}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredGroupDevices.map(renderDeviceCard)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}