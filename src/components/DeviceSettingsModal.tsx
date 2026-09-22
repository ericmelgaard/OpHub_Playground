import React, { useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  Clock,
  Plus,
  AlertTriangle,
  Search,
  Calendar,
} from 'lucide-react';
import { Device, MenuItem, DevicePage as DevicePageType } from '../types';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isItemActiveForDaypart, DAY_ABBR } from '../lib/availability';
import { QuickAddModal } from './QuickAddModal';
import type { DisplayToggle } from './InlineItemPicker';

interface DeviceSettingsModalProps {
  showDeviceSettingsModal: boolean;
  selectedDeviceSettings: Device | null;
  setShowDeviceSettingsModal: (show: boolean) => void;
  setSelectedDeviceSettings: (device: Device | null) => void;
  removeItemFromDevice: (itemId: number, deviceId: string, pageId: string) => void;
  reorderItems: (deviceId: string, pageId: string, startIndex: number, endIndex: number) => void;
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
  onCreateMenuItem?: (item: { name: string; price: string; mealPeriod: string; mealStation: string }) => Promise<MenuItem | null>;
}

const getDaypartColor = (daypart: string) => {
  switch (daypart) {
    case 'Breakfast': return 'text-yellow-600 dark:text-yellow-400';
    case 'Lunch': return 'text-green-600 dark:text-green-400';
    case 'Dinner': return 'text-blue-600 dark:text-blue-400';
    case 'Late Night': return 'text-purple-600 dark:text-purple-400';
    case 'Custom': return 'text-gray-600 dark:text-gray-400';
    default: return 'text-sky-600 dark:text-sky-400';
  }
};

const getDaypartBg = (daypart: string) => {
  switch (daypart) {
    case 'Breakfast': return 'bg-yellow-50 dark:bg-yellow-900/20';
    case 'Lunch': return 'bg-green-50 dark:bg-green-900/20';
    case 'Dinner': return 'bg-blue-50 dark:bg-blue-900/20';
    case 'Late Night': return 'bg-purple-50 dark:bg-purple-900/20';
    case 'Custom': return 'bg-gray-50 dark:bg-gray-900/20';
    default: return 'bg-sky-50 dark:bg-sky-900/20';
  }
};

const getDisplayedItems = (page: DevicePageType): MenuItem[] => {
  return page.itemOrder
    .map((id) => page.assignedItems.find((item) => item.id === id))
    .filter((item): item is MenuItem => {
      if (!item) return false;
      if (item.isActive === false) return false;
      return isItemActiveForDaypart(item, page.daypart);
    })
    .slice(0, page.displayCapacity);
};

const hasWarning = (page: DevicePageType) => getDisplayedItems(page).length === 0;

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function DeviceSettingsModal({
  showDeviceSettingsModal,
  selectedDeviceSettings,
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
  onCreateMenuItem,
}: DeviceSettingsModalProps) {
  const [internalDaypart, setInternalDaypart] = useState<string | null>(selectedDaypart);
  const [selectedDay, setSelectedDay] = useState<number | 'every-day'>(() => new Date().getDay());
  const [searchValue, setSearchValue] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<number>>(new Set());

  useEffect(() => { setInternalDaypart(selectedDaypart); }, [selectedDaypart]);

  const activeDaypart = internalDaypart ?? selectedDaypart;

  useEffect(() => {
    if (selectedDeviceSettings) {
      const warnings = selectedDeviceSettings.pages.filter(p => hasWarning(p));
      setNotifications(warnings.length);
    }
  }, [selectedDeviceSettings, setNotifications]);

  const mealPeriods = useMemo(
    () => Array.from(new Set(menuItems.map(i => i.mealPeriod).filter(Boolean))),
    [menuItems]
  );
  const stations = useMemo(
    () => Array.from(new Set(menuItems.map(i => i.mealStation).filter(Boolean))),
    [menuItems]
  );

  const [stationFilter, setStationFilter] = useState('all');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showNotAvailable, setShowNotAvailable] = useState(false);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !selectedDeviceSettings) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (destination.droppableId === 'trash-zone') {
      if (source.droppableId.startsWith('avail-')) return;
      const pageId = source.droppableId.split('|')[1] || source.droppableId;
      const itemId = parseInt(result.draggableId, 10);
      if (onInlineRemoveItems && itemId) {
        onInlineRemoveItems(selectedDeviceSettings, [itemId], pageId);
      } else {
        removeItemFromDevice(itemId, selectedDeviceSettings.id, pageId);
      }
      return;
    }

    if (source.droppableId === 'available-items' && destination.droppableId.startsWith('page|')) {
      const pageId = destination.droppableId.split('|')[1];
      const itemId = parseInt(result.draggableId.replace('avail-', ''), 10);
      const item = menuItems.find(i => i.id === itemId);
      if (item && onInlineAddItems) {
        onInlineAddItems(selectedDeviceSettings, [item], pageId);
        setRecentlyAddedIds(new Set([itemId]));
        setTimeout(() => setRecentlyAddedIds(new Set()), 2000);
      }
      return;
    }

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

    if (source.droppableId === destination.droppableId && source.droppableId.startsWith('page|')) {
      const pageId = source.droppableId.split('|')[1];
      reorderItems(selectedDeviceSettings.id, pageId, source.index, destination.index);
      return;
    }

    reorderItems(selectedDeviceSettings.id, source.droppableId, source.index, destination.index);
  }, [selectedDeviceSettings, reorderItems, menuItems, onInlineAddItems, onInlineRemoveItems, removeItemFromDevice]);

  if (!showDeviceSettingsModal || !selectedDeviceSettings) return null;

  const device = selectedDeviceSettings;
  const dayNum = selectedDay === 'every-day' ? null : selectedDay;
  const currentPage = activeDaypart ? device.pages.find(p => p.daypart === activeDaypart) : null;
  const pagesToShow = activeDaypart ? device.pages.filter(p => p.daypart === activeDaypart) : device.pages;

  // Available items computation
  const assignedIds = new Set(currentPage?.assignedItems.map(i => i.id) ?? []);
  const { availableItems, notAvailableItems } = useMemo(() => {
    if (!currentPage) return { availableItems: [], notAvailableItems: [] };
    const filtered = menuItems.filter(item => {
      if (assignedIds.has(item.id)) return false;
      if (searchValue.trim()) {
        const q = searchValue.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !(item.description?.toLowerCase().includes(q) ?? false)) return false;
      }
      if (stationFilter !== 'all' && item.mealStation !== stationFilter) return false;
      if (dayNum !== null) {
        const days = item.activeDays || [];
        if (days.length > 0 && !days.includes(dayNum)) return false;
      }
      return true;
    });
    const avail: MenuItem[] = [];
    const notAvail: MenuItem[] = [];
    for (const item of filtered) {
      const days = item.activeDays || [];
      const dayOk = dayNum === null || days.length === 0 || days.includes(dayNum);
      if (activeDaypart && activeDaypart !== 'All Day' && activeDaypart !== 'Custom') {
        const mps = item.activeMealPeriods || [];
        const mpOk = mps.length === 0 || mps.includes(activeDaypart);
        if (dayOk && mpOk) avail.push(item);
        else if (dayOk && !mpOk) notAvail.push(item);
        else notAvail.push(item);
      } else {
        if (dayOk) avail.push(item);
        else notAvail.push(item);
      }
    }
    avail.sort((a, b) => a.name.localeCompare(b.name));
    notAvail.sort((a, b) => a.name.localeCompare(b.name));
    return { availableItems: avail, notAvailableItems: notAvail };
  }, [menuItems, assignedIds, searchValue, stationFilter, dayNum, activeDaypart, currentPage]);

  const handleQuickAdd = async (data: { name: string; price: string; mealPeriod: string; mealStation: string }) => {
    if (!onCreateMenuItem) return;
    try {
      const item = await onCreateMenuItem(data);
      if (item && currentPage && onInlineAddItems) {
        onInlineAddItems(device, [item], currentPage.id);
        setRecentlyAddedIds(new Set([item.id]));
        setTimeout(() => setRecentlyAddedIds(new Set()), 2000);
      }
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  const showingCount = currentPage ? currentPage.assignedItems.filter(item => {
    const t = itemDisplayToggles[currentPage.id]?.[item.id] ?? 'auto';
    return t === 'on' || (t === 'auto' && getDisplayedItems(currentPage).some(d => d.id === item.id));
  }).length : 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {header}
      </div>

      {/* Filter bar: daypart selector + day selector + more filters */}
      <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {/* Daypart selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin flex-shrink-0">
          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mr-1" />
          <button
            onClick={() => { setInternalDaypart(null); onSelectedDaypartChange?.(null); }}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex-shrink-0 ${
              activeDaypart === null
                ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >All</button>
          {device.pages.map(page => (
            <button
              key={page.id}
              onClick={() => { setInternalDaypart(page.daypart); onSelectedDaypartChange?.(page.daypart); }}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex-shrink-0 ${
                activeDaypart === page.daypart
                  ? `${getDaypartBg(page.daypart)} ${getDaypartColor(page.daypart)} border-current`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >{page.daypart}</button>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

        {/* Day selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin flex-shrink-0">
          <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mr-1" />
          {DAY_OPTIONS.map(d => {
            const isSel = selectedDay === d.value;
            const isToday = d.value === new Date().getDay();
            return (
              <button
                key={d.value}
                onClick={() => setSelectedDay(d.value)}
                className={`relative px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex-shrink-0 min-w-[44px] ${
                  isSel ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                  : isToday ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {d.label}
                {isToday && !isSel && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-sky-500" />}
              </button>
            );
          })}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 flex-shrink-0 mx-1" />
          <button
            onClick={() => setSelectedDay('every-day')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex-shrink-0 whitespace-nowrap ${
              selectedDay === 'every-day'
                ? 'bg-gray-600 text-white border-gray-600 shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >Every Day</button>
        </div>

        {/* More Filters button */}
        <button
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex-shrink-0 whitespace-nowrap ${
            showMoreFilters || stationFilter !== 'all'
              ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 text-sky-600 dark:text-sky-400'
              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          More Filters
          {stationFilter !== 'all' && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold text-white rounded-full bg-sky-500">1</span>
          )}
        </button>
      </div>

      {/* More Filters expandable */}
      {showMoreFilters && (
        <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Station:</span>
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
          >
            <option value="all">All Stations</option>
            {stations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {currentPage ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4 sm:px-6">
              {/* Left: Assigned items */}
              <div className="flex flex-col min-h-0">
                <div className={`px-4 py-3 rounded-t-lg border-b dark:border-gray-700 ${getDaypartBg(currentPage.daypart)} flex-shrink-0`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${getDaypartColor(currentPage.daypart)}`} />
                      <h4 className={`text-sm font-semibold ${getDaypartColor(currentPage.daypart)}`}>{currentPage.daypart}</h4>
                    </div>
                    <Badge variant="secondary">Page {currentPage.name.split(' ')[1]}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {showingCount} of {currentPage.displayCapacity} showing · {currentPage.assignedItems.length} assigned
                    </span>
                    {currentPage.schedule && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {currentPage.schedule.startTime} - {currentPage.schedule.endTime}
                      </div>
                    )}
                  </div>
                  {hasWarning(currentPage) && (
                    <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs">
                        {currentPage.assignedItems.length === 0 ? 'No items assigned' : 'No active items in display range'}
                      </span>
                    </div>
                  )}
                </div>

                <Droppable droppableId={`page|${currentPage.id}`}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto scrollbar-thin p-3 min-h-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-b-lg transition-colors duration-200 ${
                        snapshot.isDraggingOver ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-500 dark:ring-sky-400 ring-inset' : ''
                      }`}
                    >
                      <div className="space-y-2">
                        {currentPage.itemOrder.map((itemId, index) => {
                          const item = currentPage.assignedItems.find(i => i.id === itemId);
                          if (!item) return null;
                          const isDisplayed = getDisplayedItems(currentPage).some(d => d.id === item.id);
                          const isRecentlyAdded = recentlyAddedIds?.has(item.id) || recentlyAddedItemIds?.has(item.id);
                          const toggleState = itemDisplayToggles[currentPage.id]?.[item.id] ?? 'auto';

                          return (
                            <Draggable key={`${item.id}`} draggableId={`${item.id}`} index={index}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  className={`relative select-none transition-all duration-200 ${
                                    snap.isDragging ? 'shadow-lg z-10' : ''
                                  } ${isRecentlyAdded ? 'animate-in fade-in slide-in-from-right-4 duration-300' : ''}`}
                                >
                                  <Card className={`flex items-center justify-between p-3 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 group ${
                                    snap.isDragging ? 'ring-2 ring-sky-500 dark:ring-sky-400 shadow-xl' : ''
                                  } ${
                                    isRecentlyAdded ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                    : toggleState === 'on' ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                    : toggleState === 'off' ? 'border-gray-200 dark:border-gray-700 opacity-60'
                                    : isDisplayed ? 'border-sky-300 dark:border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                                    : ''
                                  }`}>
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div {...prov.dragHandleProps} className="touch-none p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 cursor-grab active:cursor-grabbing">
                                        <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500 cursor-move" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className={`text-sm font-medium truncate ${
                                          toggleState === 'off' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'
                                        }`}>{item.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                          ${item.price}
                                          {isRecentlyAdded && <span className="text-green-600 dark:text-green-400 text-[10px] font-medium">New</span>}
                                        </div>
                                      </div>
                                    </div>
                                    {onToggleItemDisplay && (
                                      <ThreeStageToggle
                                        state={toggleState}
                                        onChange={(newState) => onToggleItemDisplay(device, currentPage.id, item.id, newState)}
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
                      {currentPage.assignedItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed dark:border-gray-700 rounded-lg gap-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400">No items assigned yet</p>
                          <p className="text-xs text-gray-400">Drag items from the right panel</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Droppable>
              </div>

              {/* Right: Available items */}
              <div className="flex flex-col min-h-0">
                <div className="flex flex-col bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 h-full overflow-hidden">
                  {/* Header with search + quick add */}
                  <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Plus className="h-4 w-4 text-sky-500" />Available Items
                      </h4>
                      {onCreateMenuItem && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQuickAdd(true)}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 h-7 border-sky-300 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20"
                        >
                          <Plus className="h-3.5 w-3.5" />Quick Add
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                  </div>

                  {/* Available items list */}
                  <Droppable droppableId="available-items">
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.droppableProps}
                        className={`flex-1 overflow-y-auto scrollbar-thin min-h-0 transition-colors ${
                          snap.isDraggingOver ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-400 ring-inset' : ''
                        }`}
                      >
                        {availableItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-20 text-xs text-gray-400 gap-1">
                            <span>No items available</span>
                            {assignedIds.size > 0 && <span className="text-[10px]">Drag assigned items here to unassign</span>}
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {availableItems.map((item, idx) => (
                              <Draggable key={`avail-${item.id}`} draggableId={`avail-${item.id}`} index={idx}>
                                {(p, s) => (
                                  <div
                                    ref={p.innerRef}
                                    {...p.draggableProps}
                                    {...p.dragHandleProps}
                                    className={`flex items-center gap-2 px-3 py-2.5 transition-colors cursor-grab active:cursor-grabbing ${
                                      s.isDragging ? 'shadow-lg ring-2 ring-sky-500 bg-white dark:bg-gray-800 z-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{item.name}</p>
                                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-0.5">
                                        <span className="flex-shrink-0">{item.mealStation}</span>
                                        {item.isGrouped && item.occurrenceCount && (
                                          <span className="text-sky-500 font-medium flex-shrink-0">{item.occurrenceCount}x</span>
                                        )}
                                      </div>
                                      <DayPills activeDays={item.activeDays} selectedDay={selectedDay} />
                                    </div>
                                    <span className="text-xs font-semibold flex-shrink-0 text-gray-700 dark:text-gray-300 ml-2">${item.price}</span>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                        )}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* Not available items */}
                  {selectedDay !== 'every-day' && notAvailableItems.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <button
                        onClick={() => setShowNotAvailable(!showNotAvailable)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-150 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                          {showNotAvailable ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          Not available {selectedDay === 'every-day' ? '' : DAY_ABBR[selectedDay as number]}
                          <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold text-white rounded-full bg-gray-400">
                            {notAvailableItems.length}
                          </span>
                        </div>
                      </button>
                      {showNotAvailable && (
                        <div className="max-h-[200px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-700/50">
                          {notAvailableItems.map(item => (
                            <div key={`not-avail-${item.id}`} className="flex items-center gap-2 px-3 py-2 opacity-60 hover:opacity-100 transition-opacity">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate text-gray-700 dark:text-gray-300">{item.name}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-0.5">
                                  <span className="flex-shrink-0">{item.mealStation}</span>
                                </div>
                                <DayPills activeDays={item.activeDays} selectedDay={selectedDay} />
                              </div>
                              <button
                                onClick={() => {
                                  if (currentPage && onInlineAddItems) {
                                    onInlineAddItems(device, [item], currentPage.id);
                                    setRecentlyAddedIds(new Set([item.id]));
                                    setTimeout(() => setRecentlyAddedIds(new Set()), 2000);
                                  }
                                }}
                                className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 px-2 py-1 rounded transition-colors"
                              >Add anyway</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trash zone */}
                  <Droppable droppableId="trash-zone">
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.droppableProps}
                        className={`flex items-center justify-center gap-2 py-3 border-t flex-shrink-0 transition-all duration-200 ${
                          snap.isDraggingOver ? 'bg-red-50 dark:bg-red-900/30 border-t-2 border-red-500' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Trash2 className={`h-4 w-4 transition-colors ${snap.isDraggingOver ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
                        <span className={`text-xs font-medium transition-colors ${snap.isDraggingOver ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {snap.isDraggingOver ? 'Drop to remove' : 'Drag here to remove'}
                        </span>
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            </div>
          </DragDropContext>
        ) : (
          /* All dayparts grid view */
          <div className="overflow-y-auto scrollbar-thin p-4 sm:px-6 h-full">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagesToShow.map(page => {
                  const displayed = getDisplayedItems(page);
                  const warn = hasWarning(page);
                  return (
                    <Card key={page.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                      <div className={`px-4 py-3 border-b dark:border-gray-700 ${getDaypartBg(page.daypart)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Clock className={`h-4 w-4 ${getDaypartColor(page.daypart)}`} />
                            <h4 className={`text-sm font-medium ${getDaypartColor(page.daypart)}`}>{page.daypart}</h4>
                          </div>
                          <Badge variant="secondary">Page {page.name.split(' ')[1]}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{displayed.length} of {page.displayCapacity} showing</span>
                          {page.schedule && <div className="text-xs text-gray-500 dark:text-gray-400">{page.schedule.startTime} - {page.schedule.endTime}</div>}
                        </div>
                        {warn && (
                          <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs">{page.assignedItems.length === 0 ? 'No items assigned' : 'No active items'}</span>
                          </div>
                        )}
                      </div>
                      <Droppable droppableId={`page|${page.id}`}>
                        {(prov, snap) => (
                          <CardContent
                            ref={prov.innerRef}
                            {...prov.droppableProps}
                            className={`p-3 min-h-[120px] transition-colors duration-200 ${snap.isDraggingOver ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-500 dark:ring-sky-400 ring-inset' : ''}`}
                          >
                            <div className="space-y-1.5">
                              {page.itemOrder.slice(0, page.displayCapacity).map((itemId, idx) => {
                                const item = page.assignedItems.find(i => i.id === itemId);
                                if (!item) return null;
                                return (
                                  <Draggable key={`${item.id}`} draggableId={`${item.id}`} index={idx}>
                                    {(p, s) => (
                                      <div ref={p.innerRef} {...p.draggableProps} className={`select-none ${s.isDragging ? 'shadow-lg z-10' : ''}`}>
                                        <Card className={`flex items-center gap-2 p-2.5 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 ${
                                          s.isDragging ? 'ring-2 ring-sky-500 dark:ring-sky-400 shadow-xl' : 'border-sky-200 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/20'
                                        }`}>
                                          <div {...p.dragHandleProps} className="touch-none p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 cursor-grab active:cursor-grabbing">
                                            <GripVertical className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                          </div>
                                          <span className="text-xs font-medium text-gray-900 dark:text-white truncate flex-1">{item.name}</span>
                                          <button onClick={() => {
                                            if (onInlineRemoveItems) onInlineRemoveItems(device, [item.id], page.id);
                                            else removeItemFromDevice(item.id, device.id, page.id);
                                          }} className="text-red-500 hover:text-red-600 flex-shrink-0">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </Card>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                            </div>
                            {prov.placeholder}
                            {page.assignedItems.length === 0 && (
                              <div className="flex items-center justify-center h-[100px] border-2 border-dashed dark:border-gray-700 rounded-lg">
                                <p className="text-xs text-gray-400">Drag items here</p>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Droppable>
                    </Card>
                  );
                })}
              </div>

              {/* Available items in all-view */}
              {menuItems.length > 0 && (
                <div className="mt-4">
                  <Droppable droppableId="available-items">
                    {(prov) => (
                      <div ref={prov.innerRef} {...prov.droppableProps} className="bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Plus className="h-4 w-4 text-sky-500" />
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Available Items</h4>
                          <span className="text-xs text-gray-400">{availableItems.length}</span>
                          {onCreateMenuItem && (
                            <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)} className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 h-7 border-sky-300 text-sky-600 dark:text-sky-400">
                              <Plus className="h-3.5 w-3.5" />Quick Add
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                          {availableItems.slice(0, 20).map(item => (
                            <Draggable key={`avail-${item.id}`} draggableId={`avail-${item.id}`} index={availableItems.indexOf(item)}>
                              {(p, s) => (
                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={`flex-shrink-0 px-3 py-2 rounded-md border cursor-grab active:cursor-grabbing transition-all ${
                                  s.isDragging ? 'shadow-lg ring-2 ring-sky-500 bg-white dark:bg-gray-800 z-50' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-sky-300 text-gray-700 dark:text-gray-300'
                                }`}>
                                  <div className="text-xs font-medium truncate max-w-[120px]">{item.name}</div>
                                  <div className="mt-1"><DayPills activeDays={item.activeDays} selectedDay={selectedDay} /></div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {prov.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </DragDropContext>
          </div>
        )}
      </div>

      {/* Quick Add modal */}
      <QuickAddModal
        show={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSave={handleQuickAdd}
        defaultMealPeriod={activeDaypart || ''}
        defaultMealStation={stationFilter !== 'all' ? stationFilter : ''}
        availableMealPeriods={mealPeriods}
        availableStations={stations}
      />
    </div>
  );
}

function DayPills({ activeDays, selectedDay }: { activeDays?: number[]; selectedDay: number | 'every-day' }) {
  const days = activeDays || [];
  const today = new Date().getDay();

  if (days.length === 0) {
    return <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Every day</span>;
  }

  return (
    <div className="flex gap-0.5 flex-wrap">
      {DAY_OPTIONS.map(d => {
        const isActive = days.includes(d.value);
        const isSel = selectedDay !== 'every-day' && selectedDay === d.value;
        const isToday = d.value === today;
        return (
          <span
            key={d.value}
            className={`text-[9px] font-semibold px-1 py-0.5 rounded leading-none ${
              isActive
                ? isSel
                  ? 'bg-sky-500 text-white'
                  : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700/50 text-gray-300 dark:text-gray-600'
            }`}
            title={`${d.label}${isActive ? ' - Active' : ' - Inactive'}${isToday ? ' (Today)' : ''}`}
          >
            {d.label[0]}
          </span>
        );
      })}
    </div>
  );
}

function ThreeStageToggle({ state, onChange }: { state: DisplayToggle; onChange: (s: DisplayToggle) => void }) {
  const states: { value: DisplayToggle; label: string; activeClass: string }[] = [
    { value: 'off', label: 'Off', activeClass: 'bg-gray-400 text-white' },
    { value: 'auto', label: 'Auto', activeClass: 'bg-sky-500 text-white' },
    { value: 'on', label: 'On', activeClass: 'bg-green-500 text-white' },
  ];
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 flex-shrink-0">
      {states.map(s => (
        <button
          key={s.value}
          onClick={(e) => { e.stopPropagation(); onChange(s.value); }}
          className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${
            state === s.value ? s.activeClass : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >{s.label}</button>
      ))}
    </div>
  );
}
