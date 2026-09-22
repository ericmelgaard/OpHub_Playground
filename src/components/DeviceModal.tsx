import React, { useState, useMemo } from 'react';
import {
  X,
  Laptop,
  Clock,
  Settings,
  MapPin,
  ChevronRight,
  Search,
  Building2,
  Store,
  Filter,
  AlertTriangle,
  Nfc,
} from 'lucide-react';
import { Device, MenuItem, Placement } from '../types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DeviceModalProps {
  showDeviceModal: boolean;
  deviceSearchValue: string;
  setDeviceSearchValue: (value: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  filteredDevices: Device[];
  locations: string[];
  mode: 'manage' | 'assign';
  onDeviceSelect: (device: Device, pageId?: string) => void;
  selectedItems: MenuItem[];
  onClose: () => void;
  placements: Placement[];
}

const findPlacement = (
  id: string,
  placements: Placement[]
): Placement | null => {
  for (const placement of placements) {
    if (placement.id === id) return placement;
    const found = findPlacement(id, placement.children);
    if (found) return found;
  }
  return null;
};

const getDevicesUnderPlacement = (placement: Placement): Device[] => {
  const devices = [...placement.devices];
  placement.children.forEach((child) => {
    devices.push(...getDevicesUnderPlacement(child));
  });
  return devices;
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
    case 'Custom':
      return 'text-gray-600 dark:text-gray-400';
    default:
      return 'text-indigo-600 dark:text-indigo-400';
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
    case 'Custom':
      return 'bg-gray-50 dark:bg-gray-900/20';
    default:
      return 'bg-indigo-50 dark:bg-indigo-900/20';
  }
};

export function DeviceModal({
  showDeviceModal,
  deviceSearchValue,
  setDeviceSearchValue,
  selectedLocation,
  setSelectedLocation,
  filteredDevices,
  locations,
  mode,
  onDeviceSelect,
  selectedItems,
  onClose,
  placements,
}: DeviceModalProps) {
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(
    null
  );
  const [expandedPlacements, setExpandedPlacements] = useState<Set<string>>(
    new Set()
  );
  const [showPlacementFilter, setShowPlacementFilter] = useState(false);
  const [showNfcScanner, setShowNfcScanner] = useState(false);

  const warningCount = useMemo(() => {
    let count = 0;

    filteredDevices.forEach((device) => {
      device.pages.forEach((page) => {
        const displayedItems = page.assignedItems.slice(
          0,
          page.displayCapacity
        );
        if (
          displayedItems.length === 0 ||
          !displayedItems.some((item) => item.isActive !== false)
        ) {
          count++;
          return; // Only count one warning per device
        }
      });
    });

    return count;
  }, [filteredDevices]);

  const handleDeviceClick = (device: Device) => {
    onDeviceSelect(device);
  };

  const handleScanNfc = () => {
    setShowNfcScanner(true);
    // This will be implemented when the NFC API is available
    console.log('NFC scanning will be implemented when API is available');
  };

  const togglePlacementExpanded = (id: string) => {
    setExpandedPlacements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderPlacement = (placement: Placement, level = 0) => {
    const isExpanded = expandedPlacements.has(placement.id);
    const isSelected = selectedPlacement === placement.id;
    const hasDevices = placement.devices.length > 0;
    const hasChildren = placement.children.length > 0;

    return (
      <div key={placement.id} className="space-y-1">
        <Button
          variant={isSelected ? 'secondary' : 'ghost'}
          onClick={() => {
            if (hasChildren) {
              togglePlacementExpanded(placement.id);
            }
            if (hasDevices) {
              setSelectedPlacement(placement.id);
            }
          }}
          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
            isSelected
              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          <div className="flex items-center gap-2">
            {placement.devices.length > 0 ? (
              <Laptop className="h-4 w-4" />
            ) : (
              <Store className="h-4 w-4" />
            )}
            <span>{placement.name}</span>
            {placement.devices.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {placement.devices.length}
              </Badge>
            )}
          </div>
          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </Button>

        {isExpanded && placement.children.length > 0 && (
          <div className="space-y-1">
            {placement.children.map((child) =>
              renderPlacement(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const displayedDevices = useMemo(() => {
    let devices = selectedPlacement
      ? findPlacement(selectedPlacement, placements)?.devices || []
      : filteredDevices;

    if (deviceSearchValue.trim()) {
      const searchTerm = deviceSearchValue.toLowerCase();
      devices = devices.filter(
        (device) =>
          device.name.toLowerCase().includes(searchTerm) ||
          device.location.toLowerCase().includes(searchTerm)
      );
    }

    return devices;
  }, [selectedPlacement, placements, filteredDevices, deviceSearchValue]);

  const currentPlacementName = useMemo(() => {
    if (!selectedPlacement) return 'All Locations';
    const placement = findPlacement(selectedPlacement, placements);
    return placement?.name || 'All Locations';
  }, [selectedPlacement, placements]);

  const hasPageWarning = (page: DevicePage) => {
    const displayedItems = page.assignedItems.slice(0, page.displayCapacity);
    return (
      displayedItems.length === 0 ||
      !displayedItems.some((item) => item.isActive !== false)
    );
  };

  if (!showDeviceModal) return null;

  const title =
    mode === 'manage' ? (
      <div className="flex items-center gap-2">
        <span>Select Device to Manage</span>
        {warningCount > 0 && (
          <div className="relative group">
            <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {warningCount}{' '}
                {warningCount === 1 ? 'device has' : 'devices have'} pages that
                need attention
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        )}
      </div>
    ) : (
      `Select Device to Add ${selectedItems.length} Item${
        selectedItems.length !== 1 ? 's' : ''
      }`
    );

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex-shrink-0 p-4 sm:p-6 border-b dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {mode === 'assign' && selectedItems.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select a device to continue
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
          <div className="hidden md:flex flex-col w-72 min-h-0 border-r dark:border-gray-700">
            <div className="p-4 border-b dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Placements
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
              {placements.map((placement) => renderPlacement(placement))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="md:hidden p-4 border-b dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowPlacementFilter(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {currentPlacementName}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-shrink-0 p-4 border-b dark:border-gray-700">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search devices..."
                  value={deviceSearchValue}
                  onChange={(e) => setDeviceSearchValue(e.target.value)}
                  // className="pl-10 pr-12"
                  className="w-full pl-10 pr-12 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleScanNfc}
                  // className="md:hidden absolute right-2 top-1.5"
                  className="md:hidden absolute right-2 top-1.5 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Scan NFC tag"
                >
                  <Nfc className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {displayedDevices.map((device) => (
                  <Card
                    key={device.id}
                    onClick={() => handleDeviceClick(device)}
                    // className="cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                    className="text-left border dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer bg-white dark:bg-gray-800"
                  >
                    <CardHeader className="p-4 border-b dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            hi {device.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {device.location}
                          </p>
                        </div>
                        <Laptop className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="secondary">
                          {device.assignedItems.length} total items
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
                      {device.pages.map((page) => {
                        const activeItems = page.assignedItems.slice(
                          0,
                          page.displayCapacity
                        ).length;
                        const showWarning = hasPageWarning(page);

                        return (
                          <div
                            key={page.id}
                            className={`px-4 py-2 ${getDaypartBg(
                              page.daypart
                            )}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock
                                  className={`h-4 w-4 ${getDaypartColor(
                                    page.daypart
                                  )}`}
                                />
                                <div>
                                  <span
                                    className={`text-sm font-medium ${getDaypartColor(
                                      page.daypart
                                    )}`}
                                  >
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
                                <Badge
                                  variant={
                                    activeItems > 0 ? 'info' : 'secondary'
                                  }
                                >
                                  {activeItems} of {page.displayCapacity}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Mobile Placement Filter */}
      <div
        className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity ${
          showPlacementFilter ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowPlacementFilter(false)}
      >
        <div
          className={`absolute inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-gray-900 transform transition-transform ${
            showPlacementFilter ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Placements
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPlacementFilter(false)}
              className="text-gray-500 dark:text-gray-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            <div className="space-y-1">
              {placements.map((placement) => renderPlacement(placement))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
