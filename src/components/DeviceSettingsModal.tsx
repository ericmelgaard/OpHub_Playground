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
  Sparkles,
} from 'lucide-react';
import { Device, MenuItem, DevicePage as DevicePageType, Substitution, SubstitutionKey, SubstitutionContext, ResolvedItem } from '../types';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isItemActiveForDaypart, DAY_ABBR } from '../lib/availability';
import { resolveItemsForDay, hasSubstitutionOnAnyDay } from '../lib/substitutions';
import { QuickAddModal } from './QuickAddModal';
import { ItemActionSheet } from './ItemActionSheet';
import { SubstitutionFlow } from './SubstitutionFlow';
import { PageActionBar } from './PageActionBar';
import type { DisplayToggle } from './InlineItemPicker';
import { ThreeStageToggle, SomeDaysTag } from './DayToggle';
import { AllDaypartsEditor } from './AllDaypartsEditor';
import { LabelAnchor } from './LabelAnchor';
import { getShownItems, isBaseOffered, isOfferedOnDay, isOfferedEveryDay, isCustomItem, offeredDays, toggleFor, labelName, followsSource, LabelDayOverrides, ItemDayOverrides } from '../lib/labelDisplay';
import { daypartColor } from '../lib/daypartColors';
import { AutoFillPage, autoFillCandidates, inStations, servesDaypart, stationKey, stationOptions } from '../lib/stations';
import { StationFilter, AutoFillPicker, DaypartFilter, type DaypartOption } from './StationPicker';
import { itemDayparts } from '../lib/productValues';
import { productDayparts } from '../lib/stations';
import { sortDayparts } from '../lib/weekSchedule';
import { plainText } from '../lib/richText';
import { LabelName } from './RichText';

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
  // On / Off / Auto for one day of the week, or every day at once
  onToggleItemDisplay?: (device: Device, pageId: string, itemId: number, day: number | 'every-day', toggle: DisplayToggle) => void;
  // Sets an item's whole week on a page (Off / On per day; missing days are Auto)
  onSetItemDays?: (device: Device, pageId: string, itemId: number, days: ItemDayOverrides, summary: string) => void;
  recentlyAddedItemIds?: Set<number>;
  itemDisplayToggles?: LabelDayOverrides;
  // Why day On / Off can't be used here (Default Week); toggles show but are disabled
  dayOverridesLocked?: string;
  onCreateMenuItem?: (item: { name: string; price: string; mealPeriod: string; mealStation: string }) => Promise<MenuItem | null>;
  substitutions?: Substitution[];
  substitutionMap?: Map<SubstitutionKey, Substitution>;
  onAddSubstitution?: (sub: Omit<Substitution, 'id' | 'createdAt'>) => void;
  onRemoveSubstitution?: (id: string) => void;
  // Auto Fill stations per page, and setting them (empty list turns it off)
  autoFill?: Record<string, AutoFillPage>;
  onSetAutoFill?: (pageId: string, stations: string[]) => void;
  // Starting text for the Available Items search
  initialItemSearch?: string;
  // Monday (YYYY-MM-DD) of the week being edited, for the day strip's dates
  weekStart?: string | null;
  // Day to start on (defaults to today); changes are reported back
  initialDay?: number | 'every-day';
  onSelectedDayChange?: (day: number | 'every-day') => void;
  // Off when stepping label to label, so the page doesn't slide in every time
  animateIn?: boolean;
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
  initialDay,
  onSelectedDayChange,
  animateIn = true,
  menuItems = [],
  onInlineAddItems,
  onInlineRemoveItems,
  onToggleItemDisplay,
  onSetItemDays,
  recentlyAddedItemIds,
  itemDisplayToggles = {},
  dayOverridesLocked,
  onCreateMenuItem,
  substitutions = [],
  substitutionMap = new Map(),
  onAddSubstitution,
  onRemoveSubstitution,
  autoFill = {},
  onSetAutoFill,
}: DeviceSettingsModalProps) {
  const [internalDaypart, setInternalDaypart] = useState<string | null>(selectedDaypart);
  const [selectedDay, setSelectedDayState] = useState<number | 'every-day'>(() => initialDay ?? new Date().getDay());
  const setSelectedDay = useCallback((day: number | 'every-day') => {
    setSelectedDayState(day);
    onSelectedDayChange?.(day);
  }, [onSelectedDayChange]);
  const [searchValue, setSearchValue] = useState(initialItemSearch);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<number>>(new Set());

  useEffect(() => { setInternalDaypart(selectedDaypart); }, [selectedDaypart]);

  // A label with one daypart has no All dayparts: it's always on that page
  const onlyDaypart = selectedDeviceSettings?.pages.length === 1 ? selectedDeviceSettings.pages[0].daypart : null;
  const activeDaypart = onlyDaypart ?? internalDaypart ?? selectedDaypart;

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
  // Every station name once (for Quick Add and substitutions)
  const stations = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const i of menuItems) if (i.mealStation && !byKey.has(stationKey(i.mealStation))) byKey.set(stationKey(i.mealStation), i.mealStation.trim());
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [menuItems]);

  // Station key, or null for all stations
  const [stationFilter, setStationFilter] = useState<string | null>(null);
  // Daypart whose products Available Items lists: null = the page's own, '' = all dayparts
  const [browseDaypart, setBrowseDaypart] = useState<string | null>(null);
  useEffect(() => { setBrowseDaypart(null); }, [activeDaypart]);
  // Every daypart in the product data (the source may use ones labels don't, like Brunch)
  const dataDayparts = useMemo(() => {
    const seen = new Set<string>();
    menuItems.forEach(i => productDayparts(i).forEach(p => seen.add(p)));
    return sortDayparts(seen);
  }, [menuItems]);
  // Open when arriving with a search, so a product not offered today still shows
  const [showNotAvailable, setShowNotAvailable] = useState(!!initialItemSearch);
  const [showNotAvailableAssigned, setShowNotAvailableAssigned] = useState(false);
  // Items turned Off while looking at this day stay in the list (struck through) so it can be
  // undone; anything else that's Off for the day goes under Not available
  const [justTurnedOff, setJustTurnedOff] = useState<Set<string>>(new Set());
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

  // One add path. Each item on a label has its own week (Off / Auto / On per day):
  // - Added in Every day: every day, following the product's days (Auto).
  // - Added on one day: that day only; the other six are Off. To follow the source all week,
  //   add it in Every day (or turn the other days back to Auto).
  // Added from another source daypart (the daypart picked in Available Items), the item follows
  // that daypart's days: a Brunch item on the Breakfast page is Auto on Brunch's days.
  // Custom products have no days to follow, so they're On, not Auto, for the days they're added
  // to (or Auto would leave them hidden). So are products from another daypart added from
  // All dayparts, which has no daypart to follow.
  // The Default Week can't hold day settings, so there it always follows the product.
  // Turn a day back on for an item already on the page: Auto when its source offers that day, else On
  const dayBackState = (item: MenuItem, daypart: string, day: number): DisplayToggle =>
    !isCustomItem(item) && isBaseOffered(item, daypart, day) ? 'auto' : 'on';

  const addToPage = (target: Device, product: MenuItem, pageId: string, fromDaypart?: string) => {
    if (!onInlineAddItems) return;
    const page = target.pages.find(p => p.id === pageId);
    // Already on the page (not showing this day): adding it here turns this day on
    const onPage = page?.assignedItems.find(i => i.id === product.id);
    if (page && onPage) {
      if (selectedDay === 'every-day' || dayOverridesLocked || !onToggleItemDisplay) return;
      onToggleItemDisplay(target, pageId, product.id, selectedDay, dayBackState(onPage, page.daypart, selectedDay));
      return;
    }
    const pageDaypart = page?.daypart ?? '';
    const item: MenuItem = fromDaypart && !isCustomItem(product) && fromDaypart !== pageDaypart
      ? { ...product, followsDaypart: fromDaypart }
      : product;
    onInlineAddItems(target, [item], pageId);
    if (dayOverridesLocked) return;
    const noDaysHere = (isCustomItem(item) && !(item.activeDays?.length)) || !followsSource(item, pageDaypart);
    const days: ItemDayOverrides = {};
    for (const d of [0, 1, 2, 3, 4, 5, 6]) {
      const added = selectedDay === 'every-day' || d === selectedDay;
      if (!added) days[d] = 'off';
      else if (noDaysHere) days[d] = 'on';
    }
    if (Object.keys(days).length === 0) return;
    const summary = selectedDay === 'every-day'
      ? `Turned on ${labelName(item)} · every day`
      : `${labelName(item)} on ${DAY_ABBR[selectedDay]} only`;
    if (onSetItemDays) onSetItemDays(target, pageId, item.id, days, summary);
    else if (onToggleItemDisplay) {
      for (const [d, state] of Object.entries(days)) onToggleItemDisplay(target, pageId, item.id, Number(d), state as DisplayToggle);
    }
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
        addToPage(selectedDeviceSettings, item, pageId, browseFollow);
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
  }, [selectedDeviceSettings, reorderItems, menuItems, onInlineAddItems, onInlineRemoveItems, removeItemFromDevice, addToPage]);

  if (!showDeviceSettingsModal || !selectedDeviceSettings) return null;

  const device = selectedDeviceSettings;
  const dayNum = selectedDay === 'every-day' ? null : selectedDay;
  useEffect(() => { setJustTurnedOff(new Set()); }, [selectedDay, activeDaypart, selectedDeviceSettings?.id]);
  const currentPage = activeDaypart ? device.pages.find(p => p.daypart === activeDaypart) : null;

  // Available items computation
  const assignedIds = new Set(currentPage?.assignedItems.map(i => i.id) ?? []);
  const pageAutoFill = currentPage ? autoFill[currentPage.id] : undefined;
  // Station filtering is off while the page auto-fills from stations
  const effectiveStationFilter = pageAutoFill ? null : stationFilter;

  // Daypart Available Items lists ('' = all); the page's own unless another one is picked
  // An All Day / Custom page takes products from any daypart, so its own list is all dayparts
  const pageBrowseDp = activeDaypart === 'All Day' || activeDaypart === 'Custom' ? '' : activeDaypart ?? '';
  const browseDp = browseDaypart ?? pageBrowseDp;
  // Adding while another source daypart is picked links the item to it (follows its days)
  const browseFollow = browseDp && browseDp !== pageBrowseDp ? browseDp : undefined;
  // Product offered on the selected day (any day this week in Every day) in a daypart ('' = any).
  // Custom products have no days of their own: they're available wherever their dayparts allow,
  // and adding one turns it On for the day being edited
  // A source daypart is browsed by its own days, as if the item followed it (All Day here means
  // products the source tags All Day, not "any daypart")
  const offeredIn = (item: MenuItem, dp: string): boolean => {
    if (isCustomItem(item)) {
      return dp === '' || (dp === 'All Day' || dp === 'Custom' ? itemDayparts(item).includes(dp) : servesDaypart(item, dp));
    }
    if ((dp === 'All Day' || dp === 'Custom') && !itemDayparts(item).includes(dp)) return false;
    const asFollowed = dp ? { ...item, followsDaypart: dp } : item;
    return dayNum === null ? offeredDays(asFollowed, dp).length > 0 : isBaseOffered(asFollowed, dp, dayNum);
  };
  const offeredHere = (item: MenuItem) => offeredIn(item, browseDp);
  const daypartFilterOptions: DaypartOption[] = currentPage
    ? [
        ...[...new Set([...dataDayparts, ...(browseDp ? [browseDp] : [])])].map(dp => ({
          value: dp, label: dp, count: menuItems.filter(i => !assignedIds.has(i.id) && offeredIn(i, dp)).length,
        })),
        { value: '', label: 'All dayparts', count: menuItems.filter(i => !assignedIds.has(i.id) && offeredIn(i, '')).length },
      ]
    : [];

  const stationFilterOptions = currentPage
    ? stationOptions(menuItems, i => !assignedIds.has(i.id) && offeredHere(i), stationFilter ? [stationFilter] : [])
    : [];
  const unfilteredAvailableCount = currentPage
    ? menuItems.filter(i => !assignedIds.has(i.id) && offeredHere(i)).length
    : 0;

  // Auto Fill counts what each station would add (any day) plus what it already added
  const autoFillIds = new Set(pageAutoFill?.itemIds.filter(id => assignedIds.has(id)) ?? []);
  const autoFillOptions = currentPage
    ? stationOptions(
        menuItems,
        i => servesDaypart(i, currentPage.daypart) && (!assignedIds.has(i.id) || autoFillIds.has(i.id)),
        pageAutoFill?.stations ?? [],
      )
    : [];
  const previewAutoFill = (keys: string[]) => {
    if (!currentPage) return { add: 0, remove: 0 };
    const keySet = new Set(keys);
    const add = autoFillCandidates(menuItems, keys, currentPage.daypart, assignedIds).length;
    const remove = currentPage.assignedItems.filter(i => autoFillIds.has(i.id) && !inStations(i, keySet)).length;
    return { add, remove };
  };

  const { availableItems, notAvailableItems } = useMemo(() => {
    if (!currentPage) return { availableItems: [], notAvailableItems: [] };
    const stationKeys = new Set(effectiveStationFilter ? [effectiveStationFilter] : []);
    const pageOverrides = itemDisplayToggles[currentPage.id];
    // On the page but not showing on this day: add it again to turn the day on
    const onPageOtherDays = (item: MenuItem) => {
      const copy = currentPage.assignedItems.find(i => i.id === item.id) ?? item;
      return dayNum !== null && !isOfferedOnDay(copy, currentPage.daypart, dayNum, pageOverrides?.[item.id]);
    };
    const filtered = menuItems.filter(item => {
      if (assignedIds.has(item.id) && !onPageOtherDays(item)) return false;
      if (searchValue.trim()) {
        const q = searchValue.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !plainText(item.description).toLowerCase().includes(q)) return false;
      }
      if (effectiveStationFilter && !inStations(item, stationKeys)) return false;
      return true;
    });
    // Up top or Not available is decided by the source (its days and dayparts), or for an item
    // without a source by its dayparts alone (a blank slate) — never by this week's label settings
    const avail: MenuItem[] = [];
    const notAvail: MenuItem[] = [];
    for (const item of filtered) {
      if (offeredHere(item)) avail.push(item);
      else notAvail.push(item);
    }
    avail.sort((a, b) => a.name.localeCompare(b.name));
    notAvail.sort((a, b) => a.name.localeCompare(b.name));
    return { availableItems: avail, notAvailableItems: notAvail };
  }, [menuItems, assignedIds, searchValue, effectiveStationFilter, dayNum, activeDaypart, currentPage, browseDp, itemDisplayToggles]);

  const handleQuickAdd = async (data: { name: string; price: string; mealPeriod: string; mealStation: string; activeDays?: number[] }) => {
    if (!onCreateMenuItem) return;
    try {
      const { activeDays: labelDays, ...product } = data;
      const item = await onCreateMenuItem(product);
      if (item && currentPage && onInlineAddItems) {
        onInlineAddItems(device, [item], currentPage.id);
        // A new product has no days of its own; the days picked turn it on for this week
        if (!dayOverridesLocked && onToggleItemDisplay) {
          for (const d of labelDays ?? []) onToggleItemDisplay(device, currentPage.id, item.id, d, 'on');
        }
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
    <div className={`absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 ${animateIn ? 'animate-in fade-in slide-in-from-bottom-4 duration-300' : ''}`}>
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
                  const pageOverrides = itemDisplayToggles[currentPage.id];
                  const activeOrderIds: number[] = [];
                  const inactiveAssignedItems: MenuItem[] = [];
                  for (const itemId of currentPage.itemOrder) {
                    const item = currentPage.assignedItems.find(i => i.id === itemId);
                    if (!item) continue;
                    // Off for the day goes under Not available, unless it was just turned off here
                    if (!isFilteringByDay
                      || isOfferedOnDay(item, currentPage.daypart, selectedDay, pageOverrides?.[itemId])
                      || (pageOverrides?.[itemId]?.[selectedDay] === 'off' && justTurnedOff.has(`${currentPage.id}|${itemId}`))) {
                      activeOrderIds.push(itemId);
                    } else {
                      inactiveAssignedItems.push(item);
                    }
                  }
                  const canToggle = !!onToggleItemDisplay && !dayOverridesLocked;
                  const setDay = (itemId: number, state: DisplayToggle) => {
                    if (state === 'off' && isFilteringByDay) {
                      setJustTurnedOff(prev => new Set(prev).add(`${currentPage.id}|${itemId}`));
                    }
                    onToggleItemDisplay?.(device, currentPage.id, itemId, selectedDay, state);
                  };

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
                                const itemOverrides = pageOverrides?.[originalId];
                                const baseItem = currentPage.assignedItems.find(i => i.id === originalId) ?? item;
                                // No days to follow on this page (not linked to a source, or from another
                                // daypart without a link): Off / On only
                                const linked = followsSource(baseItem, currentPage.daypart);
                                const toggleState = toggleFor(itemOverrides, dayNum, linked);
                                // In Every day, items on some days only aren't in the everyday preview
                                const someDays = dayNum === null && toggleState !== 'off'
                                  && !isOfferedEveryDay(baseItem, currentPage.daypart, itemOverrides);
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
                                                  <span className="text-sm font-medium truncate text-gray-900 dark:text-white"><LabelName item={item} /></span>
                                                  <span className="inline-flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0">
                                                    <ArrowLeftRight className="h-2.5 w-2.5" />
                                                    Sub
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                  ${item.price}
                                                  <span className="text-[10px] text-amber-600 dark:text-amber-400">replaces {resolved.originalItem && labelName(resolved.originalItem)}</span>
                                                  <RowStatus toggle={toggleState} showing={isDisplayed} day={dayNum} />
                                                </div>
                                              </div>
                                            </div>
                                            {onToggleItemDisplay && (
                                              <ThreeStageToggle
                                                state={toggleState}
                                                allowAuto={linked}
                                                disabledReason={dayOverridesLocked}
                                                onChange={(newState) => setDay(originalId, newState)}
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
                                                  }`}><LabelName item={item} /></span>
                                                  {hasSub && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Has substitution on another day" />}
                                                  {someDays && <SomeDaysTag />}
                                                  {baseItem.followsDaypart && (
                                                    <span
                                                      title={`Shows on the days its source offers it at ${baseItem.followsDaypart}`}
                                                      className="inline-flex items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                                                    >
                                                      Follows {baseItem.followsDaypart}
                                                    </span>
                                                  )}
                                                  {autoFillIds.has(originalId) && (
                                                    <span
                                                      title={`Added by Auto Fill from ${item.mealStation}`}
                                                      className="inline-flex items-center gap-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                                                    >
                                                      <Sparkles className="h-2.5 w-2.5" />
                                                      Auto
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                  ${item.price}
                                                  {isRecentlyAdded && <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">New</span>}
                                                  <RowStatus toggle={toggleState} showing={isDisplayed} day={dayNum} someDays={someDays} />
                                                </div>
                                                <div className="mt-1">
                                                  <DayPills item={baseItem} daypart={currentPage.daypart} overrides={itemOverrides} selectedDay={selectedDay} />
                                                </div>
                                              </div>
                                            </div>
                                            {onToggleItemDisplay && (
                                              <ThreeStageToggle
                                                state={toggleState}
                                                allowAuto={linked}
                                                disabledReason={dayOverridesLocked}
                                                onChange={(newState) => setDay(item.id, newState)}
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
                                    <DayPills item={item} daypart={currentPage.daypart} overrides={pageOverrides?.[item.id]} selectedDay={selectedDay} />
                                  </div>
                                  {canToggle && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setDay(item.id, 'on')}
                                      title={`Show ${item.name} on ${DAY_ABBR[selectedDay as number]} this week`}
                                      className="h-8 px-2.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex-shrink-0"
                                    >
                                      On {DAY_ABBR[selectedDay as number]}
                                    </Button>
                                  )}
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
                      {onSetAutoFill && (
                        <AutoFillPicker
                          key={currentPage.id}
                          options={autoFillOptions}
                          stations={pageAutoFill?.stations ?? []}
                          preview={previewAutoFill}
                          onApply={stations => onSetAutoFill(currentPage.id, stations)}
                        />
                      )}
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
                      <DaypartFilter
                        options={daypartFilterOptions}
                        value={browseDp}
                        pageValue={pageBrowseDp}
                        pageDaypart={currentPage.daypart}
                        onChange={v => setBrowseDaypart(v)}
                        triggerClassName={filterChipClass(true)}
                      />
                      <StationFilter
                        options={stationFilterOptions}
                        value={effectiveStationFilter}
                        onChange={setStationFilter}
                        totalCount={unfilteredAvailableCount}
                        triggerClassName={filterChipClass(!!effectiveStationFilter)}
                        disabled={!!pageAutoFill}
                        disabledReason="Station filter is off while Auto Fill is on for this page"
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
                                      {assignedIds.has(item.id) ? (
                                        <>
                                          <p className="text-[10px] text-sky-600 dark:text-sky-400 mb-0.5">On this page · add to show it {dayNum !== null ? DAY_ABBR[dayNum] : ''}</p>
                                          <DayPills item={currentPage.assignedItems.find(i => i.id === item.id) ?? item} daypart={currentPage.daypart} overrides={itemDisplayToggles[currentPage.id]?.[item.id]} selectedDay={selectedDay} />
                                        </>
                                      ) : (
                                        <DayPills item={item} daypart={browseDp} selectedDay={selectedDay} />
                                      )}
                                    </div>
                                    <span className="text-xs font-semibold flex-shrink-0 text-gray-700 dark:text-gray-300 ml-2">${item.price}</span>
                                    {onInlineAddItems && (
                                      // Tap to add, for touch; dragging still works
                                      <button
                                        onClick={() => {
                                          addToPage(device, item, currentPage.id, browseFollow);
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
                                  {assignedIds.has(item.id) && <span className="flex-shrink-0 text-sky-600 dark:text-sky-400">On this page</span>}
                                </div>
                                {assignedIds.has(item.id)
                                  ? <DayPills item={currentPage.assignedItems.find(i => i.id === item.id) ?? item} daypart={currentPage.daypart} overrides={itemDisplayToggles[currentPage.id]?.[item.id]} selectedDay={selectedDay} />
                                  : <DayPills item={item} daypart={browseDp} selectedDay={selectedDay} />}
                              </div>
                              <button
                                onClick={() => {
                                  if (currentPage && onInlineAddItems) {
                                    addToPage(device, item, currentPage.id, browseFollow);
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
          /* All dayparts: every item on the label for the day in scope; changes apply to each daypart it's on */
          <AllDaypartsEditor
            device={device}
            selectedDay={selectedDay}
            menuItems={menuItems}
            toggles={itemDisplayToggles}
            substitutionMap={substitutionMap}
            dayOverridesLocked={dayOverridesLocked}
            initialSearch={initialItemSearch}
            onAdd={onInlineAddItems ? (item, pageId) => addToPage(device, item, pageId) : undefined}
            onRemove={(itemId, pageId) => {
              if (onInlineRemoveItems) onInlineRemoveItems(device, [itemId], pageId);
              else removeItemFromDevice(itemId, device.id, pageId);
            }}
            onToggle={onToggleItemDisplay
              ? (pageId, itemId, toggle) => onToggleItemDisplay(device, pageId, itemId, selectedDay, toggle)
              : undefined}
            onEditDaypart={d => { setInternalDaypart(d); onSelectedDaypartChange?.(d); }}
          />
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
        defaultMealStation={stationFilterOptions.find(o => o.key === effectiveStationFilter)?.name ?? ''}
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

// The days a product is on this label this week. Days a label turned on are ringed;
// days it turned off are struck through.
function DayPills({ item, daypart, overrides, selectedDay }: {
  item: MenuItem;
  daypart: string;
  overrides?: ItemDayOverrides;
  selectedDay: number | 'every-day';
}) {
  const today = new Date().getDay();

  if (!overrides && (item.activeDays || []).length === 0 && !isCustomItem(item) && !item.hasAvailability) {
    return <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Every day</span>;
  }

  return (
    <div className="flex gap-0.5 flex-wrap">
      {DAY_OPTIONS.map(d => {
        const override = overrides?.[d.value];
        const isActive = isOfferedOnDay(item, daypart, d.value, overrides);
        const isSel = selectedDay !== 'every-day' && selectedDay === d.value;
        const isToday = d.value === today;
        return (
          <span
            key={d.value}
            className={`text-[9px] font-semibold px-1 py-0.5 rounded leading-none ${
              override === 'off'
                ? 'bg-red-50 dark:bg-red-900/30 text-red-400 dark:text-red-400 line-through'
                : isActive
                  ? isSel
                    ? 'bg-sky-500 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700/50 text-gray-300 dark:text-gray-600'
            } ${override === 'on' ? 'ring-1 ring-emerald-500' : ''}`}
            title={`${d.label}${
              override === 'on' ? ' · turned on for this label'
              : override === 'off' ? ' · turned off for this label'
              : isActive ? ' · available' : ' · not available'
            }${isToday ? ' (today)' : ''}`}
          >
            {d.label[0]}
          </span>
        );
      })}
    </div>
  );
}

// Whether a page item is on the label, and why not when it isn't
function RowStatus({ toggle, showing, day, someDays }: { toggle: DisplayToggle | 'mixed'; showing: boolean; day: number | null; someDays?: boolean }) {
  const when = day === null ? 'every day' : DAY_ABBR[day];
  if (toggle === 'off') return <span className="text-[11px] text-gray-400 dark:text-gray-500">Off {when}</span>;
  // Shown on its days; pick one to see it on the label
  if (someDays) return <span className="text-[11px] text-gray-500 dark:text-gray-400">Pick a day to see it</span>;
  if (toggle === 'mixed') {
    return <span className="text-[11px] text-amber-600 dark:text-amber-300">Some days changed</span>;
  }
  if (showing) {
    return <span className="text-[11px] text-sky-600 dark:text-sky-300">{toggle === 'on' ? `On ${when} · showing` : 'Showing on label'}</span>;
  }
  return <span className="text-[11px] text-amber-600 dark:text-amber-300">Waiting · label is full</span>;
}

const filterChipClass = (active: boolean) =>
  `inline-flex items-center h-8 px-3 rounded-full border text-xs ${
    active
      ? 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-200'
      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
  }`;

