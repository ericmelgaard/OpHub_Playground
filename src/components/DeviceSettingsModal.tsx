import React, { useState, useCallback, ReactNode, useEffect } from 'react';
import {
  X,
  GripVertical,
  Trash2,
  Clock,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { Device, MenuItem, DevicePage } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AddPageItemsButton } from './common/AddPageItemsButton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isItemActiveForDaypart } from '../lib/availability';

interface DeviceSettingsModalProps {
  showDeviceSettingsModal: boolean;
  selectedDeviceSettings: Device | null;
  setShowDeviceSettingsModal: (show: boolean) => void;
  setSelectedDeviceSettings: (device: Device | null) => void;
  removeItemFromDevice: (
    itemId: number,
    deviceId: string,
    pageId: string
  ) => void;
  reorderItems: (
    deviceId: string,
    pageId: string,
    startIndex: number,
    endIndex: number
  ) => void;
  onAddItems: (device: Device, pageId: string) => void;
  onClose: () => void;
  lastAssignedPageId?: string | null;
  isAddingToPage?: string | null;
  duplicateCount?: number;
  header?: ReactNode;
  setNotifications: (count: number) => void;
  selectedDaypart?: string | null;
  onSelectedDaypartChange?: (daypart: string | null) => void;
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

const getDisplayedItems = (page: DevicePage): MenuItem[] => {
  // Get active items in order, checking both the isActive flag and daypart compatibility
  const activeItems = page.itemOrder
    .map((id) => page.assignedItems.find((item) => item.id === id))
    .filter((item): item is MenuItem => {
      if (!item) return false;
      if (item.isActive === false) return false;

      // Check if item is active for this daypart
      const isActiveForDaypart = isItemActiveForDaypart(item, page.daypart);
      return isActiveForDaypart;
    });

  // Return only items within display capacity
  return activeItems.slice(0, page.displayCapacity);
};

const hasWarning = (page: DevicePage) => {
  const displayedItems = getDisplayedItems(page);
  return displayedItems.length === 0;
};

export function DeviceSettingsModal({
  showDeviceSettingsModal,
  selectedDeviceSettings,
  setShowDeviceSettingsModal,
  setSelectedDeviceSettings,
  removeItemFromDevice,
  reorderItems,
  onAddItems,
  onClose,
  isAddingToPage,
  lastAssignedPageId,
  duplicateCount,
  header,
  setNotifications,
  selectedDaypart = null,
  onSelectedDaypartChange,
}: DeviceSettingsModalProps) {
  const [internalDaypart, setInternalDaypart] = useState<string | null>(selectedDaypart);

  useEffect(() => {
    setInternalDaypart(selectedDaypart);
  }, [selectedDaypart]);

  const activeDaypart = internalDaypart ?? selectedDaypart;
  useEffect(() => {
    if (selectedDeviceSettings) {
      const pagesWithWarnings = selectedDeviceSettings.pages.filter((page) =>
        hasWarning(page)
      );
      setNotifications(pagesWithWarnings.length);
    }
  }, [selectedDeviceSettings, setNotifications]);

  const handleDragEnd = useCallback(
    (result: any) => {
      if (!result.destination || !selectedDeviceSettings) return;

      const { source, destination } = result;

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      reorderItems(
        selectedDeviceSettings.id,
        source.droppableId,
        source.index,
        destination.index
      );
    },
    [selectedDeviceSettings, reorderItems]
  );

  if (!showDeviceSettingsModal || !selectedDeviceSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-container">
      <Card className="bg-white dark:bg-gray-800 max-w-6xl w-full h-[90vh] flex flex-col modal-content">
        <CardHeader className="flex-shrink-0 modal-header">{header}</CardHeader>

        <CardContent className="flex-1 overflow-y-auto scrollbar-thin modal-body">
          {/* Daypart selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => { setInternalDaypart(null); onSelectedDaypartChange?.(null); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex-shrink-0 ${
                activeDaypart === null
                  ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >All</button>
            {selectedDeviceSettings.pages.map(page => (
              <button
                key={page.id}
                onClick={() => { setInternalDaypart(page.daypart); onSelectedDaypartChange?.(page.daypart); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex-shrink-0 ${
                  activeDaypart === page.daypart
                    ? `${getDaypartBg(page.daypart)} ${getDaypartColor(page.daypart)} border-current`
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Clock className="h-3.5 w-3.5 inline mr-1" />{page.daypart}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DragDropContext onDragEnd={handleDragEnd}>
              {selectedDeviceSettings.pages.filter(page => activeDaypart === null || page.daypart === activeDaypart).map((page) => {
                const displayedItems = getDisplayedItems(page);
                const isRecentlyUpdated = lastAssignedPageId === page.id;
                const showWarning = hasWarning(page);
                const warningMessage =
                  page.assignedItems.length === 0
                    ? 'No items assigned'
                    : 'No active items in display range';

                return (
                  <Card
                    key={page.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 transition-colors ${
                      isRecentlyUpdated
                        ? 'ring-2 ring-indigo-500 dark:ring-indigo-400'
                        : ''
                    }`}
                  >
                    <CardHeader
                      className={`px-4 py-3 rounded-t-lg border-b dark:border-gray-700 ${getDaypartBg(
                        page.daypart
                      )}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Clock
                            className={`h-4 w-4 ${getDaypartColor(
                              page.daypart
                            )}`}
                          />
                          <h4
                            className={`text-sm font-medium ${getDaypartColor(
                              page.daypart
                            )}`}
                          >
                            {page.daypart}
                          </h4>
                        </div>
                        <Badge variant="secondary">
                          Page {page.name.split(' ')[1]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {displayedItems.length} of {page.displayCapacity}{' '}
                          items showing
                        </span>
                        {page.schedule && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {page.schedule.startTime} - {page.schedule.endTime}
                          </div>
                        )}
                      </div>
                      {showWarning && (
                        <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">{warningMessage}</span>
                        </div>
                      )}
                    </CardHeader>

                    <Droppable droppableId={page.id}>
                      {(provided, snapshot) => (
                        <CardContent
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-4 min-h-[200px] transition-colors duration-200 ${
                            snapshot.isDraggingOver
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500 dark:ring-indigo-400 ring-inset rounded-lg'
                              : ''
                          }`}
                        >
                          <div className="space-y-2">
                            {page.itemOrder.map((itemId, index) => {
                              const item = page.assignedItems.find(
                                (i) => i.id === itemId
                              );
                              if (!item) return null;

                              const isDisplayed = displayedItems.some(
                                (displayedItem) => displayedItem.id === item.id
                              );

                              return (
                                <Draggable
                                  key={`${item.id}`}
                                  draggableId={`${item.id}`}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`relative select-none transition-shadow duration-200 ${
                                        snapshot.isDragging
                                          ? 'shadow-lg z-10'
                                          : 'hover:shadow-sm'
                                      }`}
                                    >
                                      <Card
                                        className={`flex items-center justify-between p-3 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 group ${
                                          snapshot.isDragging
                                            ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-xl'
                                            : ''
                                        } ${
                                          isDisplayed
                                            ? 'border-indigo-300 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50'
                                            : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            {...provided.dragHandleProps}
                                            className="touch-none p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                          >
                                            <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500 cursor-move" />
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                              {item.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              ${item.price}
                                              {index < page.displayCapacity && (
                                                <Badge
                                                  variant={
                                                    item.isActive !== false
                                                      ? 'info'
                                                      : 'destructive'
                                                  }
                                                  className="ml-2"
                                                >
                                                  {item.isActive !== false
                                                    ? isDisplayed
                                                      ? 'Currently showing'
                                                      : 'Active'
                                                    : 'Inactive'}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            removeItemFromDevice(
                                              item.id,
                                              selectedDeviceSettings.id,
                                              page.id
                                            )
                                          }
                                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </Card>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                          </div>
                          {provided.placeholder}

                          {page.assignedItems.length === 0 ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center h-[200px] border-2 border-dashed dark:border-gray-700 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  No items assigned
                                </p>
                              </div>
                              <AddPageItemsButton
                                onAddItems={() =>
                                  onAddItems(selectedDeviceSettings, page.id)
                                }
                                isLoading={isAddingToPage === page.id}
                                wasRecentlyAdded={
                                  lastAssignedPageId === page.id
                                }
                                duplicateCount={
                                  lastAssignedPageId === page.id
                                    ? duplicateCount
                                    : 0
                                }
                              />
                            </div>
                          ) : (
                            <AddPageItemsButton
                              onAddItems={() =>
                                onAddItems(selectedDeviceSettings, page.id)
                              }
                              className="mt-4"
                              isLoading={isAddingToPage === page.id}
                              wasRecentlyAdded={lastAssignedPageId === page.id}
                              duplicateCount={
                                lastAssignedPageId === page.id
                                  ? duplicateCount
                                  : 0
                              }
                            />
                          )}
                        </CardContent>
                      )}
                    </Droppable>
                  </Card>
                );
              })}
            </DragDropContext>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
