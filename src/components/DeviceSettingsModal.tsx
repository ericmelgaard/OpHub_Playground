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
  ArrowLeftRight,
} from 'lucide-react';
import { Device, MenuItem, DevicePage as DevicePageType, Substitution, SubstitutionKey, SubstitutionContext, ResolvedItem } from '../types';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isItemActiveForDaypart, DAY_ABBR } from '../lib/availability';
import { resolveItemsForDay, hasSubstitutionOnAnyDay } from '../lib/substitutions';
import { QuickAddModal } from './QuickAddModal';
import { ItemActionSheet } from './ItemActionSheet';
import { SubstitutionFlow } from './SubstitutionFlow';
import { PageActionBar } from './PageActionBar';
import type { DisplayToggle } from './InlineItemPicker';
import { LabelAnchor } from './LabelAnchor';
import { getShownItems } from '../lib/labelDisplay';
import { daypartColor } from '../lib/daypartColors';

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
  substitutions?: Substitution[];
  substitutionMap?: Map<SubstitutionKey, Substitution>;
  onAddSubstitution?: (sub: Omit<Substitution, 'id' | 'createdAt'>) => void;
  onRemoveSubstitution?: (id: string) => void;
  autoFillEnabled?: boolean;
  autoFillItemIds?: Set<number>;
  autoFillPages?: Map<string, MenuItem[]>;
  // Starting text for the Available Items search
  initialItemSearch?: string;
  // Monday (YYYY-MM-DD) of the week being edited, for the day strip's dates
  weekStart?: string | null;
}

const getDaypartColor = (daypart: string) => daypartColor(daypart).text;

const getDaypartBg = (daypart: string) => daypartColor(daypart).softBg;

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
  initialItemSearch = '',
  weekStart = null,
  menuItems = [],
  onInlineAddItems,
  onInlineRemoveItems,
  onToggleItemDisplay,
  recentlyAddedItemIds,
  itemDisplayToggles = {},
  onCreateMenuItem,
  substitutions = [],
  substitutionMap = new Map(),
  onAddSubstitution,
  onRemoveSubstitution,
  autoFillEnabled = false,
  autoFillItemIds = new Set(),
  autoFillPages = new Map(),
}: DeviceSettingsModalProps) {
  const [internalDaypart, setInternalDaypart] = useState<string | null>(selectedDaypart);
  const [selectedDay, setSelectedDay] = useState<number | 'every-day'>(() => new Date().getDay());
  const [searchValue, setSearchValue] = useState(initialItemSearch);
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
  // Open when arriving with a search, so a product not offered today still shows
  const [showNotAvailable, setShowNotAvailable] = useState(!!initialItemSearch);
  const [showNotAvailableAssigned, setShowNotAvailableAssigned] = useState(false);
  const [confirmClearPage, setConfirmClearPage] = useState(false);
  const [actionSheetState, setActionSheetState] = useState<{
    isOpen: boolean;
    resolvedItem: ResolvedItem | null;
    anchorRect: DOMRect | null;
  }>({ isOpen: false, resolvedItem: null, anchorRect: null });
  const [substitutionContext, setSubstitutionContext] = useState<SubstitutionContext | null>(null);

  const handleClearPage = () => {
    if (!currentPage || !device) return;
    const allIds = currentPage.assignedItems.map(i => i.id);
    if (allIds.length === 0) return;
    if (onInlineRemoveItems) {
      onInlineRemoveItems(device, allIds, currentPage.id);
    } else {
      allIds.forEach(id => removeItemFromDevice(id, device.id, currentPage.id));
    }
    setConfirmClearPage(false);
  };

  const handleItemTap = (resolved: ResolvedItem, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActionSheetState({ isOpen: true, resolvedItem: resolved, anchorRect: rect });
  };

  const handleStartSubstitution = () => {
    if (!actionSheetState.resolvedItem || !currentPage || selectedDay === 'every-day') return;
    setSubstitutionContext({
      originalItem: actionSheetState.resolvedItem.originalItem || actionSheetState.resolvedItem.item,
      pageId: currentPage.id,
      dayOfWeek: selectedDay as number,
      deviceId: device?.id || '',
    });
    setActionSheetState({ isOpen: false, resolvedItem: null, anchorRect: null });
  };

  const handleEndSubstitution = () => {
    if (!actionSheetState.resolvedItem?.substitution || !onRemoveSubstitution) return;
    onRemoveSubstitution(actionSheetState.resolvedItem.substitution.id);
    setActionSheetState({ isOpen: false, resolvedItem: null, anchorRect: null });
  };

  const handleSubstitutionComplete = (substituteItem: MenuItem) => {
    if (!substitutionContext || !onAddSubstitution) return;
    onAddSubstitution({
      pageId: substitutionContext.pageId,
      originalItemId: substitutionContext.originalItem.id,
      substituteItem,
      dayOfWeek: substitutionContext.dayOfWeek,
    });
    setSubstitutionContext(null);
  };

  const handleActionRemove = () => {
    if (!actionSheetState.resolvedItem || !currentPage || !device) return;
    const itemId = actionSheetState.resolvedItem.originalItemId;
    if (onInlineRemoveItems) onInlineRemoveItems(device, [itemId], currentPage.id);
    else removeItemFromDevice(itemId, device.id, currentPage.id);
    setActionSheetState({ isOpen: false, resolvedItem: null, anchorRect: null });
  };

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

  const handleQuickAdd = async (data: { name: string; price: string; mealPeriod: string; mealStation: string; activeDays?: number[] }) => {
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

  // Same rule the label preview uses, so the list, counts and preview agree
  const shownIds = new Set(
    currentPage
      ? getShownItems(currentPage, dayNum, itemDisplayToggles[currentPage.id], substitutionMap).map(r => r.originalItemId)
      : [],
  );
  const showingCount = shownIds.size;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {header}
      </div>

      {/* Main content area: the label as an anchor, then the page and products */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row">
        <LabelAnchor
          device={device}
          activeDaypart={activeDaypart}
          onSelectDaypart={(d) => { setInternalDaypart(d); onSelectedDaypartChange?.(d); }}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          toggles={itemDisplayToggles}
          substitutionMap={substitutionMap}
          weekStart={weekStart}
          highlightItemId={actionSheetState.isOpen ? actionSheetState.resolvedItem?.originalItemId : null}
          onItemTap={handleItemTap}
        />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        {currentPage ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4 sm:px-6">
              {/* Left: Assigned items */}
              <div className="flex flex-col min-h-0">
                <div className={`px-4 py-3 rounded-t-lg border-b dark:border-gray-700 ${getDaypartBg(currentPage.daypart)} flex-shrink-0`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Clock className={`h-4 w-4 flex-shrink-0 ${getDaypartColor(currentPage.daypart)}`} />
                    <h4 className={`text-base font-semibold ${getDaypartColor(currentPage.daypart)}`}>{currentPage.daypart}</h4>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Page {currentPage.name.split(' ')[1]}
                      {currentPage.schedule && <> · {currentPage.schedule.startTime} – {currentPage.schedule.endTime}</>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 pl-6 text-xs">
                    <span className="font-medium text-sky-700 dark:text-sky-300">
                      {showingCount} of {currentPage.displayCapacity} showing
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{currentPage.assignedItems.length} assigned</span>
                  </div>
                  {showingCount === 0 && (
                    <div className="mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs">
                        {currentPage.assignedItems.length === 0 ? 'No items assigned' : 'Nothing showing on the label'}
                      </span>
                    </div>
                  )}
                </div>

                {(() => {
                  const isFilteringByDay = selectedDay !== 'every-day';
                  const activeOrderIds: number[] = [];
                  const inactiveAssignedItems: MenuItem[] = [];
                  for (const itemId of currentPage.itemOrder) {
                    const item = currentPage.assignedItems.find(i => i.id === itemId);
                    if (!item) continue;
                    if (isFilteringByDay) {
                      const days = item.activeDays || [];
                      const dayOk = days.length === 0 || days.includes(selectedDay as number);
                      const mps = item.activeMealPeriods || [];
                      const mpOk = !activeDaypart || activeDaypart === 'All Day' || activeDaypart === 'Custom' || mps.length === 0 || mps.includes(activeDaypart);
                      if (dayOk && mpOk) {
                        activeOrderIds.push(itemId);
                      } else {
                        inactiveAssignedItems.push(item);
                      }
                    } else {
                      activeOrderIds.push(itemId);
                    }
                  }

                  const resolvedItems = resolveItemsForDay(
                    activeOrderIds,
                    currentPage.assignedItems,
                    currentPage.id,
                    selectedDay === 'every-day' ? null : selectedDay,
                    substitutionMap,
                  );

                  return (
                    <div className="flex flex-col min-h-0 flex-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-b-lg overflow-hidden">
                      <Droppable droppableId={`page|${currentPage.id}`}>
                        {(provided, snapshot) => (
                          <CardContent
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto scrollbar-thin p-3 min-h-0 transition-colors duration-200 ${
                              snapshot.isDraggingOver ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-500 dark:ring-sky-400 ring-inset' : ''
                            }`}
                          >
                            <div className="space-y-2">
                              {resolvedItems.map((resolved, index) => {
                                const originalId = resolved.originalItemId;
                                const item = resolved.item;
                                const isDisplayed = shownIds.has(originalId);
                                const isTapped = actionSheetState.isOpen && actionSheetState.resolvedItem?.originalItemId === originalId;
                                const isRecentlyAdded = recentlyAddedIds?.has(originalId) || recentlyAddedItemIds?.has(originalId);
                                const toggleState = itemDisplayToggles[currentPage.id]?.[originalId] ?? 'auto';
                                const hasSub = !resolved.isSubstituted && selectedDay === 'every-day' && hasSubstitutionOnAnyDay(currentPage.id, originalId, substitutionMap);

                                return (
                                  <Draggable key={`slot-${originalId}`} draggableId={`${originalId}`} index={index}>
                                    {(prov, snap) => (
                                      <div
                                        ref={prov.innerRef}
                                        {...prov.draggableProps}
                                        onClick={(e) => handleItemTap(resolved, e)}
                                        className={`relative select-none transition-all duration-200 cursor-pointer rounded-md ${
                                          snap.isDragging ? 'shadow-lg z-10' : ''
                                        } ${isTapped ? 'ring-2 ring-sky-500' : ''} ${isRecentlyAdded ? 'animate-in fade-in slide-in-from-right-4 duration-300' : ''}`}
                                      >
                                        {resolved.isSubstituted ? (
                                          <Card className={`flex items-center justify-between p-3 rounded-md border-l-4 border-l-amber-400 dark:border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 group ${
                                            snap.isDragging ? 'ring-2 ring-amber-500 shadow-xl' : ''
                                          }`}>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <div {...prov.dragHandleProps} className="touch-none p-1 rounded transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30 flex-shrink-0 cursor-grab active:cursor-grabbing">
                                                <GripVertical className="h-4 w-4 text-amber-400 dark:text-amber-500 cursor-move" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-sm font-medium truncate text-gray-900 dark:text-white">{item.name}</span>
                                                  <span className="inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0">
                                                    <ArrowLeftRight className="h-2.5 w-2.5" />
                                                    Sub
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                  ${item.price}
                                                  <span className="text-[10px] text-amber-600 dark:text-amber-400">replaces {resolved.originalItem?.name}</span>
                                                  <RowStatus toggle={toggleState} showing={isDisplayed} />
                                                </div>
                                              </div>
                                            </div>
                                            {onToggleItemDisplay && (
                                              <ThreeStageToggle
                                                state={toggleState}
                                                onChange={(newState) => onToggleItemDisplay(device, currentPage.id, originalId, newState)}
                                              />
                                            )}
                                          </Card>
                                        ) : (
                                          <Card className={`flex items-center justify-between p-3 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 group ${
                                            snap.isDragging ? 'ring-2 ring-sky-500 dark:ring-sky-400 shadow-xl' : ''
                                          } ${
                                            isRecentlyAdded ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                            : toggleState === 'on' ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                                            : toggleState === 'off' ? 'border-gray-200 dark:border-gray-700 opacity-60'
                                            : isDisplayed ? 'border-sky-300 dark:border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                                            : ''
                                          }`}>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <div {...prov.dragHandleProps} className="touch-none p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0 cursor-grab active:cursor-grabbing">
                                                <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500 cursor-move" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                  <span className={`text-sm font-medium truncate ${
                                                    toggleState === 'off' ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'
                                                  }`}>{item.name}</span>
                                                  {hasSub && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Has substitution on another day" />}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                  ${item.price}
                                                  {isRecentlyAdded && <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">New</span>}
                                                  <RowStatus toggle={toggleState} showing={isDisplayed} />
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
                                        )}
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
                            {activeOrderIds.length === 0 && currentPage.assignedItems.length > 0 && inactiveAssignedItems.length > 0 && (
                              <div className="flex flex-col items-center justify-center h-[120px] border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-lg gap-1 bg-amber-50/50 dark:bg-amber-900/10">
                                <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">No items available for this day</p>
                                <p className="text-[10px] text-gray-400">All {inactiveAssignedItems.length} assigned items are hidden below</p>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Droppable>

                      {/* Auto-filled items */}
                      {autoFillEnabled && (() => {
                        const pageAutoItems = autoFillPages.get(currentPage.id) || [];
                        if (pageAutoItems.length === 0) return null;
                        return (
                          <div className="border-t border-dashed border-teal-300 dark:border-teal-700 flex-shrink-0">
                            <div className="px-3 py-2 bg-teal-50/60 dark:bg-teal-900/10 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">Auto Fill</span>
                              <span className="text-[10px] text-teal-500/70 dark:text-teal-400/50">{pageAutoItems.length} item{pageAutoItems.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-1.5 p-2 bg-teal-50/30 dark:bg-teal-900/5">
                              {pageAutoItems.map(item => (
                                <div
                                  key={`auto-${item.id}`}
                                  className="flex items-center justify-between p-2.5 rounded-md border border-dashed border-teal-200 dark:border-teal-800 bg-white/60 dark:bg-gray-800/40"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-5 flex justify-center flex-shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate text-teal-800 dark:text-teal-200">{item.name}</p>
                                      <p className="text-xs text-teal-500/70 dark:text-teal-400/50">${item.price} &middot; {item.mealStation}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {isFilteringByDay && inactiveAssignedItems.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                          <button
                            onClick={() => setShowNotAvailableAssigned(!showNotAvailableAssigned)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                              {showNotAvailableAssigned ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              Not available {DAY_ABBR[selectedDay as number]}
                              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold text-white rounded-full bg-gray-400 dark:bg-gray-600">
                                {inactiveAssignedItems.length}
                              </span>
                            </div>
                          </button>
                          {showNotAvailableAssigned && (
                            <div className="max-h-[200px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20">
                              {inactiveAssignedItems.map(item => (
                                <div key={`inactive-assigned-${item.id}`} className="flex items-center gap-2 px-3 py-2.5 opacity-60">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate text-gray-600 dark:text-gray-400">{item.name}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-0.5">
                                      <span className="flex-shrink-0">${item.price}</span>
                                      <span className="flex-shrink-0">{item.mealStation}</span>
                                    </div>
                                    <DayPills activeDays={item.activeDays} selectedDay={selectedDay} />
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (onInlineRemoveItems) onInlineRemoveItems(device, [item.id], currentPage.id);
                                      else removeItemFromDevice(item.id, device.id, currentPage.id);
                                    }}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                                    title="Remove from page"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <PageActionBar
                        onQuickAdd={() => setShowQuickAdd(true)}
                        onClearPage={() => setConfirmClearPage(true)}
                        hasItems={currentPage.assignedItems.length > 0}
                        canQuickAdd={!!onCreateMenuItem}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Right: Available items */}
              <div className="flex flex-col min-h-0">
                <div className="flex flex-col bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 h-full overflow-hidden">
                  {/* Header with search + quick add */}
                  <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Plus className="h-4 w-4 text-sky-500" />Available Items
                      </h4>
                      <span className="text-xs text-gray-400">{availableItems.length}</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search products..."
                        aria-label="Search products"
                        className="w-full h-10 pl-8 pr-3 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    {/* Filters already applied from the page and day you're on */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {selectedDay !== 'every-day' && (
                        <span className={filterChipClass(true)} title="Only products offered on the selected day">
                          Offered {DAY_ABBR[selectedDay]}
                        </span>
                      )}
                      {currentPage.daypart !== 'All Day' && currentPage.daypart !== 'Custom' && (
                        <span className={filterChipClass(true)} title="Only products served in this daypart">
                          {currentPage.daypart}
                        </span>
                      )}
                      <label className={`${filterChipClass(stationFilter !== 'all')} relative pr-6 max-w-[11rem]`}>
                        <span className="sr-only">Filter by station</span>
                        <select
                          value={stationFilter}
                          onChange={(e) => setStationFilter(e.target.value)}
                          className="w-full appearance-none bg-transparent outline-none cursor-pointer truncate"
                        >
                          <option value="all">Station: All</option>
                          {stations.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                      </label>
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
                                    {onInlineAddItems && (
                                      // Tap to add, for touch; dragging still works
                                      <button
                                        onClick={() => {
                                          onInlineAddItems(device, [item], currentPage.id);
                                          setRecentlyAddedIds(new Set([item.id]));
                                          setTimeout(() => setRecentlyAddedIds(new Set()), 2000);
                                        }}
                                        aria-label={`Add ${item.name} to ${currentPage.daypart}`}
                                        className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                                      >
                                        <Plus className="h-5 w-5" />
                                      </button>
                                    )}
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
                      {/* Auto-fill items in grid view */}
                      {autoFillEnabled && (() => {
                        const pageAutoItems = autoFillPages.get(page.id) || [];
                        if (pageAutoItems.length === 0) return null;
                        return (
                          <div className="border-t border-dashed border-teal-300 dark:border-teal-700 px-3 py-2 bg-teal-50/40 dark:bg-teal-900/10 space-y-1">
                            {pageAutoItems.slice(0, 3).map(item => (
                              <div key={`auto-grid-${item.id}`} className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-dashed border-teal-200 dark:border-teal-800 bg-white/50 dark:bg-gray-800/30">
                                <span className="w-1 h-1 rounded-full bg-teal-400 flex-shrink-0" />
                                <span className="text-[10px] font-medium text-teal-700 dark:text-teal-300 truncate">{item.name}</span>
                              </div>
                            ))}
                            {pageAutoItems.length > 3 && (
                              <p className="text-[9px] text-teal-500/60 text-center">+{pageAutoItems.length - 3} more</p>
                            )}
                          </div>
                        );
                      })()}
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
      </div>

      {/* Clear Page confirmation modal */}
      {confirmClearPage && currentPage && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={() => setConfirmClearPage(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center p-6 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-7 w-7 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Clear this page?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This will remove all {currentPage.assignedItems.length} item{currentPage.assignedItems.length !== 1 ? 's' : ''} from {currentPage.daypart}. You can re-add them anytime.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmClearPage(false)}
                  className="flex-1 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.98] transition-all min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearPage}
                  className="flex-1 py-3 text-sm font-semibold text-white rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all min-h-[48px]"
                >
                  Clear Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add modal */}
      <QuickAddModal
        show={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSave={handleQuickAdd}
        defaultMealPeriod={activeDaypart || ''}
        defaultMealStation={stationFilter !== 'all' ? stationFilter : ''}
        availableMealPeriods={mealPeriods}
        availableStations={stations}
        selectedDay={selectedDay}
        menuItems={menuItems}
      />

      {/* Item Action Sheet */}
      {actionSheetState.isOpen && actionSheetState.resolvedItem && (
        <ItemActionSheet
          resolvedItem={actionSheetState.resolvedItem}
          anchorRect={actionSheetState.anchorRect}
          isOpen={actionSheetState.isOpen}
          onClose={() => setActionSheetState({ isOpen: false, resolvedItem: null, anchorRect: null })}
          onSubstitute={handleStartSubstitution}
          onEndSubstitution={handleEndSubstitution}
          onRemove={handleActionRemove}
          canSubstitute={selectedDay !== 'every-day' && !!onAddSubstitution}
        />
      )}

      {/* Substitution Flow */}
      {substitutionContext && (
        <SubstitutionFlow
          isOpen={!!substitutionContext}
          context={substitutionContext}
          menuItems={menuItems}
          assignedItemIds={assignedIds}
          onComplete={handleSubstitutionComplete}
          onClose={() => setSubstitutionContext(null)}
          onCreateMenuItem={onCreateMenuItem}
          availableMealPeriods={mealPeriods}
          availableStations={stations}
        />
      )}
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
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
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
    { value: 'on', label: 'On', activeClass: 'bg-emerald-500 text-white' },
  ];
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 flex-shrink-0">
      {states.map(s => (
        <button
          key={s.value}
          onClick={(e) => { e.stopPropagation(); onChange(s.value); }}
          className={`min-w-[40px] h-9 px-2 text-xs font-semibold rounded transition-all ${
            state === s.value ? s.activeClass : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >{s.label}</button>
      ))}
    </div>
  );
}

// Whether a page item is on the label, and why not when it isn't
function RowStatus({ toggle, showing }: { toggle: DisplayToggle; showing: boolean }) {
  if (toggle === 'off') return <span className="text-[11px] text-gray-400 dark:text-gray-500">Hidden</span>;
  if (showing) {
    return <span className="text-[11px] text-sky-600 dark:text-sky-300">{toggle === 'on' ? 'Always shown' : 'Showing on label'}</span>;
  }
  return <span className="text-[11px] text-amber-600 dark:text-amber-300">Waiting · label is full</span>;
}

const filterChipClass = (active: boolean) =>
  `inline-flex items-center h-8 px-3 rounded-full border text-xs ${
    active
      ? 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-200'
      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
  }`;
