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
import { InlineItemPicker, DisplayToggle } from './InlineItemPicker';
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
  menuItems?: MenuItem[];
  onInlineAddItems?: (device: Device, items: MenuItem[], pageId: string) => void;
  onInlineRemoveItems?: (device: Device, itemIds: number[], pageId: string) => void;
  onToggleItemDisplay?: (device: Device, pageId: string, itemId: number, toggle: DisplayToggle) => void;
  recentlyAddedItemIds?: Set<number>;
  itemDisplayToggles?: Record<string, Record<number, DisplayToggle>>;
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
  menuItems = [],
  onInlineAddItems,
  onInlineRemoveItems,
  onToggleItemDisplay,
  recentlyAddedItemIds,
  itemDisplayToggles = {},
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

      // Drop onto trash zone → remove item
      if (destination.droppableId === 'trash-zone') {
        const sourceParts = source.droppableId.split('|');
        const pageId = sourceParts.length > 1 ? sourceParts[1] : source.droppableId;
        const itemId = parseInt(source.droppableId.startsWith('avail-') ? '' : result.draggableId, 10);
        if (onInlineRemoveItems && itemId) {
          onInlineRemoveItems(selectedDeviceSettings, [itemId], pageId);
        } else if (!source.droppableId.startsWith('avail-')) {
          removeItemFromDevice(itemId, selectedDeviceSettings.id, pageId);
        }
        return;
      }

      // Cross-list: available → assigned (add)
      if (source.droppableId === 'available-items' && destination.droppableId.startsWith('page|')) {
        const pageId = destination.droppableId.split('|')[1];
        const draggableId = result.draggableId.replace('avail-', '');
        const itemId = parseInt(draggableId, 10);
        const item = menuItems.find(i => i.id === itemId);
        if (item && onInlineAddItems) {
          onInlineAddItems(selectedDeviceSettings, [item], pageId);
        }
        return;
      }

      // Cross-list: assigned → available (remove)
      if (source.droppableId.startsWith('page|') && destination.droppableId === 'available-items') {
        const pageId = source.droppableId.split('|')[1];
        const itemId = parseInt(result.draggableId, 10);
        if (onInlineRemoveItems) {
          onInlineRemoveItems(selectedDeviceSettings, [itemId], pageId);
        } else {
          removeItemFromDevice(itemId, selectedDeviceSettings.id, pageId);
        }
        return;
      }

      // Same-list reorder within a page
      if (source.droppableId === destination.droppableId && source.droppableId.startsWith('page|')) {
        const pageId = source.droppableId.split('|')[1];
        reorderItems(selectedDeviceSettings.id, pageId, source.index, destination.index);
        return;
      }

      // Fallback: same-list reorder (legacy page IDs)
      reorderItems(
        selectedDeviceSettings.id,
        source.droppableId,
        source.index,
        destination.index
      );
    },
    [selectedDeviceSettings, reorderItems, menuItems, onInlineAddItems, onInlineRemoveItems, removeItemFromDevice]
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

          {activeDaypart !== null && menuItems.length > 0 && onInlineAddItems ? (
            <SplitPaneView
              device={selectedDeviceSettings}
              daypart={activeDaypart}
              menuItems={menuItems}
              onInlineAddItems={onInlineAddItems}
              removeItemFromDevice={removeItemFromDevice}
              reorderItems={reorderItems}
              handleDragEnd={handleDragEnd}
              recentlyAddedItemIds={recentlyAddedItemIds}
              isAddingToPage={isAddingToPage}
              lastAssignedPageId={lastAssignedPageId}
              duplicateCount={duplicateCount}
              onAddItems={onAddItems}
              onToggleItemDisplay={onToggleItemDisplay}
              itemDisplayToggles={itemDisplayToggles}
            />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SplitPaneViewProps {
  device: Device;
  daypart: string;
  menuItems: MenuItem[];
  onInlineAddItems: (device: Device, items: MenuItem[], pageId: string) => void;
  removeItemFromDevice: (itemId: number, deviceId: string, pageId: string) => void;
  reorderItems: (deviceId: string, pageId: string, startIndex: number, endIndex: number) => void;
  handleDragEnd: (result: any) => void;
  recentlyAddedItemIds?: Set<number>;
  isAddingToPage?: string | null;
  lastAssignedPageId?: string | null;
  duplicateCount?: number;
  onAddItems: (device: Device, pageId: string) => void;
  onToggleItemDisplay?: (device: Device, pageId: string, itemId: number, toggle: DisplayToggle) => void;
  itemDisplayToggles?: Record<string, Record<number, DisplayToggle>>;
}

function SplitPaneView({
  device,
  daypart,
  menuItems,
  onInlineAddItems,
  removeItemFromDevice,
  handleDragEnd,
  recentlyAddedItemIds,
  lastAssignedPageId,
  onToggleItemDisplay,
  itemDisplayToggles = {},
}: SplitPaneViewProps) {
  const page = device.pages.find(p => p.daypart === daypart);
  if (!page) return null;

  const pageDroppableId = `page|${page.id}`;
  const displayedItems = getDisplayedItems(page);
  const showWarning = hasWarning(page);
  const warningMessage = page.assignedItems.length === 0 ? 'No items assigned' : 'No active items in display range';

  const getToggleState = (itemId: number): DisplayToggle => {
    return itemDisplayToggles[page.id]?.[itemId] ?? 'auto';
  };

  const showingCount = page.assignedItems.filter(item => {
    const t = getToggleState(item.id);
    return t === 'on' || (t === 'auto' && displayedItems.some(d => d.id === item.id));
  }).length;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
        {/* Left: assigned items */}
        <div className="flex flex-col">
          <div className={`px-4 py-3 rounded-t-lg border-b dark:border-gray-700 ${getDaypartBg(page.daypart)}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${getDaypartColor(page.daypart)}`} />
                <h4 className={`text-sm font-medium ${getDaypartColor(page.daypart)}`}>{page.daypart}</h4>
              </div>
              <Badge variant="secondary">Page {page.name.split(' ')[1]}</Badge>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {showingCount} of {page.displayCapacity} showing · {page.assignedItems.length} assigned
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
          </div>

          <Droppable droppableId={pageDroppableId}>
            {(provided, snapshot) => (
              <CardContent
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 p-3 min-h-[300px] transition-colors duration-200 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-b-lg ${
                  snapshot.isDraggingOver
                    ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-500 dark:ring-sky-400 ring-inset'
                    : ''
                }`}
              >
                <div className="space-y-2">
                  {page.itemOrder.map((itemId, index) => {
                    const item = page.assignedItems.find(i => i.id === itemId);
                    if (!item) return null;
                    const isDisplayed = displayedItems.some(d => d.id === item.id);
                    const isRecentlyAdded = recentlyAddedItemIds?.has(item.id);
                    const toggleState = getToggleState(item.id);

                    return (
                      <Draggable key={`${item.id}`} draggableId={`${item.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative select-none transition-all duration-200 ${
                              snapshot.isDragging ? 'shadow-lg z-10' : ''
                            } ${isRecentlyAdded ? 'animate-in fade-in slide-in-from-right-4 duration-300' : ''}`}
                          >
                            <Card
                              className={`flex items-center justify-between p-3 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 group ${
                                snapshot.isDragging ? 'ring-2 ring-sky-500 dark:ring-sky-400 shadow-xl' : ''
                              } ${
                                isRecentlyAdded
                                  ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                  : toggleState === 'on'
                                    ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                    : toggleState === 'off'
                                      ? 'border-gray-200 dark:border-gray-700 opacity-60'
                                      : isDisplayed
                                        ? 'border-sky-300 dark:border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                                        : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div {...provided.dragHandleProps} className="touch-none p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500 cursor-move" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={`text-sm font-medium truncate ${
                                    toggleState === 'off'
                                      ? 'text-gray-400 dark:text-gray-500 line-through'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    ${item.price}
                                    {isRecentlyAdded && (
                                      <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">New</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Three-stage toggle: On / Auto / Off */}
                              {onToggleItemDisplay && (
                                <ThreeStageToggle
                                  state={toggleState}
                                  onChange={(newState) => onToggleItemDisplay(device, page.id, item.id, newState)}
                                />
                              )}
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </div>
                {provided.placeholder}

                {page.assignedItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed dark:border-gray-700 rounded-lg gap-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No items assigned yet</p>
                    <p className="text-xs text-gray-400">Drag items from the right panel</p>
                  </div>
                )}
              </CardContent>
            )}
          </Droppable>
        </div>

        {/* Right: inline item picker */}
        <div className="flex flex-col min-h-[400px]">
          <InlineItemPicker
            menuItems={menuItems}
            page={page}
            onAddItems={(items) => onInlineAddItems(device, items, page.id)}
            recentlyAddedIds={recentlyAddedItemIds}
          />
        </div>

        {/* Global trash drop zone */}
        <Droppable droppableId="trash-zone">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`col-span-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                snapshot.isDraggingOver
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30 scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              <Trash2
                className={`h-5 w-5 transition-colors ${
                  snapshot.isDraggingOver
                    ? 'text-red-500'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  snapshot.isDraggingOver
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {snapshot.isDraggingOver ? 'Drop to remove' : 'Drag here to remove'}
              </span>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}

function ThreeStageToggle({
  state,
  onChange,
}: {
  state: DisplayToggle;
  onChange: (state: DisplayToggle) => void;
}) {
  const states: { value: DisplayToggle; label: string; activeClass: string }[] = [
    { value: 'off', label: 'Off', activeClass: 'bg-gray-400 text-white' },
    { value: 'auto', label: 'Auto', activeClass: 'bg-sky-500 text-white' },
    { value: 'on', label: 'On', activeClass: 'bg-green-500 text-white' },
  ];

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 flex-shrink-0">
      {states.map((s) => (
        <button
          key={s.value}
          onClick={(e) => {
            e.stopPropagation();
            onChange(s.value);
          }}
          className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${
            state === s.value
              ? s.activeClass
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
