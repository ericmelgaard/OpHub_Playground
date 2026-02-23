import React, { useState } from 'react';
import {
  Clock,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  MonitorPlay,
  Check,
} from 'lucide-react';
import { Device, DevicePage } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DeviceHeaderProps {
  device: Device;
  onClose: () => void;
  onForcePage?: (pageId: string | null) => void;
}

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

const getBatteryIcon = (level: number) => {
  if (level >= 75) return BatteryFull;
  if (level >= 50) return Battery;
  if (level >= 25) return BatteryMedium;
  return BatteryLow;
};

const formatScheduleTime = (page: DevicePage) => {
  if (!page.schedule || page.daypart === 'Custom') return null;
  return `${page.schedule.startTime} - ${page.schedule.endTime}`;
};

export function DeviceHeader({
  device,
  onClose,
  onForcePage,
}: DeviceHeaderProps) {
  const [showForcePageModal, setShowForcePageModal] = useState(false);

  const currentPage = device.pages.find(
    (p) => p.id === (device.status.forcedPage || device.status.currentPage)
  );

  const isPageForced = !!device.status.forcedPage;

  const handleForcePage = (pageId: string | null) => {
    if (!onForcePage) return;
    onForcePage(pageId);
    setShowForcePageModal(false);
  };

  return (
    <div className="flex flex-col mb-6">
      {/* Device name and status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div className="flex flex-col gap-2 sm:gap-3">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate pr-20 sm:pr-0">
            {device.name}
          </h3>
          <Badge variant="secondary" className="w-fit flex items-center gap-2">
            {device.status.wifiStrength > 0 ? (
              <Wifi
                className={`h-4 w-4 ${
                  device.status.wifiStrength > 2
                    ? 'text-green-500'
                    : 'text-yellow-500'
                }`}
              />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            {React.createElement(getBatteryIcon(device.status.batteryLevel), {
              className: `h-4 w-4 ${
                device.status.batteryLevel > 20
                  ? 'text-green-500'
                  : 'text-red-500'
              }`,
            })}
          </Badge>
        </div>

        <Button
          variant="outline"
          onClick={onClose}
          className="absolute top-6 right-6 sm:static flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/70"
        >
          <Check className="h-4 w-4 mr-2" />
          Done
        </Button>
      </div>

      {/* Current page status and controls */}
      {currentPage && (
        <div className="flex items-center gap-4">
          <Card
            className={`flex-1 ${isPageForced ? 'ring-2' : ''} ${getDaypartBg(
              currentPage.daypart
            )} ${
              isPageForced
                ? `ring-${
                    getDaypartColor(currentPage.daypart).split('-')[1]
                  }-500`
                : ''
            }`}
          >
            <CardContent
              className={`flex-1 flex items-center justify-between px-4 py-3 rounded-lg ${getDaypartBg(
                currentPage.daypart
              )} ${
                isPageForced
                  ? `ring-2 ring-${
                      getDaypartColor(currentPage.daypart).split('-')[1]
                    }-500`
                  : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <Clock
                  className={`h-5 w-5 ${getDaypartColor(currentPage.daypart)}`}
                />
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-medium ${getDaypartColor(
                      currentPage.daypart
                    )}`}
                  >
                    {isPageForced ? 'Forced Page' : 'Current Page'}
                  </span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {currentPage.daypart} - Page{' '}
                    {currentPage.name.split(' ')[1]}
                  </span>
                  {isPageForced && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Will revert at next scheduled page change
                    </span>
                  )}
                </div>
              </div>

              {onForcePage && (
                <Button
                  // variant={isPageForced ? 'destructive' : 'default'}
                  onClick={() => setShowForcePageModal(true)}
                  // className="flex items-center gap-2"
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors ${
                    isPageForced
                      ? `bg-${
                          getDaypartColor(currentPage.daypart).split('-')[1]
                        }-600 hover:bg-${
                          getDaypartColor(currentPage.daypart).split('-')[1]
                        }-700 text-white`
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <MonitorPlay className="text-white h-4 w-4" />
                  <span className="hidden sm:inline text-white">
                    Change Page
                  </span>
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="hidden md:block text-sm text-gray-500 dark:text-gray-400 text-right">
            <div>Last updated</div>
            <div className="font-medium">
              {new Date(device.status.lastUpdated).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Force Page Modal */}
      {showForcePageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full bg-white dark:bg-gray-800">
            <CardContent className="p-6 space-y-2">
              {device.pages.map((page) => {
                const isCurrentForced = device.status.forcedPage === page.id;
                const daypartColor = getDaypartColor(page.daypart);
                const daypartBg = getDaypartBg(page.daypart);

                return (
                  <Button
                    key={page.id}
                    variant="ghost"
                    onClick={() => handleForcePage(page.id)}
                    className={`w-full justify-between h-auto p-3 ${
                      isCurrentForced
                        ? `${daypartBg} ring-2 ring-${
                            daypartColor.split('-')[1]
                          }-500 dark:ring-${daypartColor.split('-')[1]}-400`
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${daypartColor}`} />
                      <span
                        className={`text-sm font-medium ${
                          isCurrentForced
                            ? daypartColor
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {page.daypart} - Page {page.name.split(' ')[1]}
                      </span>
                    </div>
                    {formatScheduleTime(page) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatScheduleTime(page)}
                        {page.schedule && (
                          <span className="ml-2">(Scheduled)</span>
                        )}
                      </div>
                    )}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
