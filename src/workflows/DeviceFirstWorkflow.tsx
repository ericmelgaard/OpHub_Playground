import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { daypartColor } from '../lib/daypartColors';
import { Device, MenuItem, Substitution, DeviceGroup, Brand, PlacedVariant } from '../types';
import { buildSubstitutionMap } from '../lib/substitutions';
import { formatWeekRange, formatEditingDay } from '../lib/weekSchedule';
import { DeviceSettingsModal } from '../components/DeviceSettingsModal';
import { DeviceHeader } from '../components/DeviceHeader';
import { DeviceConfigPage } from '../components/DeviceConfigPage';
import type { DisplayToggle } from '../components/DayToggle';
import { useModalHistory } from '../hooks/useModalHistory';
import { api } from '../services/api';
import { MergeMode, getDraft, getAppliedLocalState, saveDraft, useHasDraft } from '../lib/pendingChanges';
import { DAY_ABBR } from '../lib/availability';
import { AutoFillPage, autoFillCandidates, inStations, stationKey } from '../lib/stations';
import { placed } from '../lib/variants';
import { LabelDayOverrides, WEEK_DAYS, type ItemDayOverrides } from '../lib/labelDisplay';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

interface DeviceFirstWorkflowProps {
  devices: Device[];
  menuItems: MenuItem[];
  preSelectedDevice: Device;
  preSelectedDaypart?: string | null;
  // Prefills the Available Items search, e.g. with a product chosen on Products
  initialItemSearch?: string;
  // First day (Sunday, YYYY-MM-DD) of the week being edited, if any
  weekStart?: string | null;
  weekContextLabel?: string;
  // Shown after the week banner, e.g. when edits there don't push to the label yet
  weekContextNote?: string;
  // Label + week being edited; pending edits are kept under it until applied or discarded
  draftKey: string;
  // Edits kept on this page only (day On / Off, substitutions, auto-fill) that still change the label
  onLocalChange?: (deviceId: string, change: LocalChange) => void;
  // An item's day settings changed on a page (stored with the week when applied)
  onItemDaysChange?: (deviceId: string, pageId: string, itemId: number, change: LocalChange) => void;
  // Day settings stored for this label and week (none for a label opened outside a week)
  storedToggles?: LabelDayOverrides;
  // Set when day On / Off can't be used here (the Default Week), with the reason
  dayOverridesLocked?: string;
  onAddItems: (device: Device, items: MenuItem[], pageId: string, note?: string) => void;
  // Sets which variant an item on a page stands for (a pending change)
  onSetItemVariant?: (device: Device, pageId: string, item: MenuItem, variant: PlacedVariant, followsDaypart: string | null) => void;
  // Opened from a product's sheet: Available Items starts filtered to its station and daypart
  initialFilters?: { station: string; daypart: string } | null;
  onRemoveItem: (itemId: number, deviceId: string, pageId: string) => void;
  onReorderItems: (deviceId: string, pageId: string, itemOrder: number[]) => void;
  onClose: () => void;
  // Saves the label's name (device settings)
  onRenameDevice?: (deviceId: string, name: string) => Promise<void>;
  setNotifications: (count: number) => void;
  onCreateMenuItem?: (item: { name: string; price: string; mealPeriod: string; mealStation: string }) => Promise<MenuItem | null>;
  // Shared day and daypart: the label opens on them and changes here carry to the next label
  initialDay?: number | 'every-day';
  onDayChange?: (day: number | 'every-day') => void;
  onDaypartChange?: (daypart: string | null) => void;
  // Step through the labels on Smart Labels without going back to the list
  labelNav?: LabelNav;
  animateIn?: boolean;
}

export interface LocalChange {
  summary: string;
  mergeKey: string;
  mode: MergeMode;
  daypart?: string;
  // Day of week the change applies to; none means every day
  day?: number;
}

const displayToggleSummary = (toggle: DisplayToggle, name: string) =>
  toggle === 'on' ? `Turned on ${name}` : toggle === 'off' ? `Turned off ${name}` : `Set ${name} to auto`;

export interface LabelNav {
  index: number;
  total: number;
  prevName?: string;
  nextName?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

export function DeviceFirstWorkflow({
  devices,
  menuItems,
  preSelectedDevice,
  preSelectedDaypart = null,
  initialItemSearch = '',
  weekStart = null,
  weekContextLabel,
  weekContextNote,
  draftKey,
  onLocalChange,
  onItemDaysChange,
  storedToggles,
  dayOverridesLocked,
  onAddItems,
  onSetItemVariant,
  initialFilters,
  onRemoveItem,
  onReorderItems,
  onClose,
  onRenameDevice,
  setNotifications,
  onCreateMenuItem,
  initialDay,
  onDayChange,
  onDaypartChange,
  labelNav,
  animateIn = true,
}: DeviceFirstWorkflowProps) {
  const [showDeviceSettingsModal, setShowDeviceSettingsModal] = useState(true);
  const [showConfigPage, setShowConfigPage] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(preSelectedDevice || null);
  // Reopening a label with pending changes shows them again
  const [optimisticDevice, setOptimisticDevice] = useState<Device | null>(
    () => {
      const d = clone(getDraft(draftKey)?.device ?? preSelectedDevice);
      // A saved draft keeps its items, but the name is always the current one
      return d && preSelectedDevice ? { ...d, displayName: preSelectedDevice.displayName } : d;
    }
  );
  const [selectedDaypart, setSelectedDaypartState] = useState<string | null>(preSelectedDaypart);
  const setSelectedDaypart = useCallback((daypart: string | null) => {
    setSelectedDaypartState(daypart);
    onDaypartChange?.(daypart);
  }, [onDaypartChange]);
  const [editingDay, setEditingDay] = useState<number | 'every-day'>(() => initialDay ?? new Date().getDay());
  const handleDayChange = useCallback((day: number | 'every-day') => {
    setEditingDay(day);
    onDayChange?.(day);
  }, [onDayChange]);
  const [recentlyAddedItemIds, setRecentlyAddedItemIds] = useState<Set<number>>(new Set());
  const localStateFor = (key: string) => getDraft(key) ?? getAppliedLocalState(key);
  // Day settings: pending ones, else what's stored for the week, else applied this session
  const togglesFor = (key: string) => getDraft(key)?.toggles ?? storedToggles ?? getAppliedLocalState(key)?.toggles ?? {};
  const [itemDisplayToggles, setItemDisplayToggles] = useState<LabelDayOverrides>(() => togglesFor(draftKey));
  const [substitutions, setSubstitutions] = useState<Substitution[]>(() => localStateFor(draftKey)?.substitutions ?? []);
  const [autoFill, setAutoFill] = useState<Record<string, AutoFillPage>>(() => localStateFor(draftKey)?.autoFill ?? {});
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);

  // Stepping to another label (previous / next) swaps the label in place, so the
  // page stays open and Back still closes it in one press.
  const shownDraftKey = useRef(draftKey);
  useEffect(() => {
    if (shownDraftKey.current === draftKey) return;
    shownDraftKey.current = draftKey;
    const draft = getDraft(draftKey);
    const local = localStateFor(draftKey);
    setSelectedDevice(clone(preSelectedDevice));
    setOptimisticDevice(clone(draft?.device ?? preSelectedDevice));
    setShowConfigPage(false);
    setShowDeviceSettingsModal(true);
    setRecentlyAddedItemIds(new Set());
    setItemDisplayToggles(togglesFor(draftKey));
    setSubstitutions(local?.substitutions ?? []);
    setAutoFill(local?.autoFill ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, preSelectedDevice]);

  // Keep the working copy with the pending changes, so it comes back after
  // stepping to another label or returning to the grid
  const hasDraft = useHasDraft(draftKey);
  useEffect(() => {
    // Right after stepping, state still holds the previous label until the reset lands
    if (!optimisticDevice || !hasDraft || !draftKey.startsWith(`${optimisticDevice.id}|`)) return;
    saveDraft(draftKey, {
      device: optimisticDevice,
      toggles: itemDisplayToggles,
      substitutions,
      autoFill,
    });
  }, [draftKey, hasDraft, optimisticDevice, itemDisplayToggles, substitutions, autoFill]);

  // With nothing pending (none yet, applied, or discarded) the page shows the label as stored
  useEffect(() => {
    if (hasDraft || shownDraftKey.current !== draftKey) return;
    const local = getAppliedLocalState(draftKey);
    setSelectedDevice(clone(preSelectedDevice));
    setOptimisticDevice(clone(preSelectedDevice));
    setItemDisplayToggles(storedToggles ?? local?.toggles ?? {});
    setSubstitutions(local?.substitutions ?? []);
    setAutoFill(local?.autoFill ?? {});
  }, [hasDraft, draftKey, preSelectedDevice, storedToggles]);

  useEffect(() => {
    Promise.all([api.getDeviceGroups(), api.getBrands()]).then(([g, b]) => {
      setDeviceGroups(g);
      setAllBrands(b);
    });
  }, []);

  const deviceGroup = useMemo(() => {
    if (!optimisticDevice) return null;
    return deviceGroups.find(g => g.members?.some(m => m.deviceId === optimisticDevice.id)) || null;
  }, [optimisticDevice, deviceGroups]);

  const groupBrands = useMemo(() => {
    if (!deviceGroup) return [];
    const brandIds = new Set(deviceGroup.brands?.map(b => b.brandId) || []);
    return allBrands.filter(b => brandIds.has(b.id));
  }, [deviceGroup, allBrands]);

  const substitutionMap = useMemo(() => buildSubstitutionMap(substitutions), [substitutions]);

  const itemName = useCallback(
    (id: number) => menuItems.find(i => i.id === id)?.name ?? 'item',
    [menuItems],
  );
  const pageDaypart = useCallback(
    (pageId: string) => optimisticDevice?.pages.find(p => p.id === pageId)?.daypart,
    [optimisticDevice],
  );

  const handleAddSubstitution = useCallback((sub: Omit<Substitution, 'id' | 'createdAt'>) => {
    setSubstitutions(prev => [
      ...prev.filter(s =>
        !(s.pageId === sub.pageId && s.originalItemId === sub.originalItemId && s.dayOfWeek === sub.dayOfWeek)
      ),
      { ...sub, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ]);
    if (optimisticDevice) onLocalChange?.(optimisticDevice.id, {
      summary: `Swapped ${itemName(sub.originalItemId)} for ${sub.substituteItem.name} · ${DAY_ABBR[sub.dayOfWeek]}`,
      mergeKey: `sub|${sub.pageId}|${sub.originalItemId}|${sub.dayOfWeek}`,
      mode: 'replace',
      daypart: pageDaypart(sub.pageId),
      day: sub.dayOfWeek,
    });
  }, [optimisticDevice, onLocalChange, itemName, pageDaypart]);

  const handleRemoveSubstitution = useCallback((id: string) => {
    const sub = substitutions.find(s => s.id === id);
    setSubstitutions(prev => prev.filter(s => s.id !== id));
    if (optimisticDevice && sub) onLocalChange?.(optimisticDevice.id, {
      summary: `Removed swap for ${itemName(sub.originalItemId)} · ${DAY_ABBR[sub.dayOfWeek]}`,
      mergeKey: `sub|${sub.pageId}|${sub.originalItemId}|${sub.dayOfWeek}`,
      mode: 'toggle',
      daypart: pageDaypart(sub.pageId),
      day: sub.dayOfWeek,
    });
  }, [optimisticDevice, onLocalChange, substitutions, itemName, pageDaypart]);


  const handleCloseModals = () => {
    setShowDeviceSettingsModal(false);
    setShowConfigPage(false);
    setSelectedDevice(null);
    setOptimisticDevice(null);
    onClose();
  };

  const handleInlineAddItems = async (_device: Device, items: MenuItem[], pageId: string, note?: string) => {
    if (!optimisticDevice || items.length === 0) return;

    const updatedDevice: Device = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updatedDevice.pages.find(p => p.id === pageId);
    if (!page) return;

    const newItems = items.filter(item =>
      !page.assignedItems.some(existing => existing.id === item.id)
    );

    newItems.forEach(item => {
      page.assignedItems.push(item);
      page.itemOrder.push(item.id);
      if (!updatedDevice.assignedItems.some(i => i.id === item.id)) {
        updatedDevice.assignedItems.push(item);
      }
    });

    setOptimisticDevice(updatedDevice);
    setRecentlyAddedItemIds(new Set(newItems.map(i => i.id)));

    try {
      if (newItems.length > 0) await onAddItems(selectedDevice!, newItems, pageId, note);
      setSelectedDevice(updatedDevice);
    } catch (err) {
      console.error('Error adding items inline:', err);
      const currentDevice = devices.find(d => d.id === selectedDevice!.id);
      if (currentDevice) {
        const clone = JSON.parse(JSON.stringify(currentDevice));
        setOptimisticDevice(clone);
        setSelectedDevice(clone);
      }
    } finally {
      setTimeout(() => setRecentlyAddedItemIds(new Set()), 2000);
    }
  };

  const handleInlineRemoveItems = async (device: Device, itemIds: number[], pageId: string) => {
    if (!optimisticDevice || itemIds.length === 0) return;

    const updatedDevice: Device = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updatedDevice.pages.find(p => p.id === pageId);
    if (!page) return;

    itemIds.forEach(itemId => {
      page.assignedItems = page.assignedItems.filter((i: MenuItem) => i.id !== itemId);
      page.itemOrder = page.itemOrder.filter((id: number) => id !== itemId);
    });

    const isItemUsedInOtherPages = (itemId: number) =>
      updatedDevice.pages.some(p => p.id !== pageId && p.assignedItems.some((i: MenuItem) => i.id === itemId));

    itemIds.forEach(itemId => {
      if (!isItemUsedInOtherPages(itemId)) {
        updatedDevice.assignedItems = updatedDevice.assignedItems.filter((i: MenuItem) => i.id !== itemId);
      }
    });

    setOptimisticDevice(updatedDevice);

    try {
      for (const itemId of itemIds) {
        await onRemoveItem(itemId, device.id, pageId);
      }
      setSelectedDevice(updatedDevice);
    } catch (err) {
      console.error('Error removing items inline:', err);
      const currentDevice = devices.find(d => d.id === device.id);
      if (currentDevice) {
        const clone = JSON.parse(JSON.stringify(currentDevice));
        setOptimisticDevice(clone);
        setSelectedDevice(clone);
      }
    }
  };

  // Auto Fill a page from stations: adds their items for the page's daypart and removes
  // items it added from stations no longer picked. One update, so adds and removes don't race.
  const handleSetAutoFill = (pageId: string, stations: string[]) => {
    if (!optimisticDevice) return;
    const updatedDevice: Device = clone(optimisticDevice);
    const page = updatedDevice.pages.find(p => p.id === pageId);
    if (!page) return;

    const keys = new Set(stations.map(stationKey));
    const assigned = new Set(page.assignedItems.map(i => i.id));
    const previous = autoFill[pageId]?.itemIds.filter(id => assigned.has(id)) ?? [];
    const toRemove = previous.filter(id => {
      const item = page.assignedItems.find(i => i.id === id);
      return !item || !inStations(item, keys);
    });
    // Each item names its variant: the picked station's, chosen by logic. When more than one picked
    // station serves it, the first in the list is used and marked for review (menu platform spec F8)
    const toAdd = autoFillCandidates(menuItems, stations, page.daypart, assigned).map(item => {
      const fits = (item.variants ?? []).filter(v =>
        v.daypart === page.daypart && keys.has(stationKey(v.station)));
      if (fits.length === 0) return item;
      return { ...item, variant: placed(fits[0], fits.length > 1 ? 'review' : 'inferred') };
    });

    page.assignedItems = page.assignedItems.filter(i => !toRemove.includes(i.id));
    page.itemOrder = page.itemOrder.filter(id => !toRemove.includes(id));
    for (const item of toAdd) {
      page.assignedItems.push(item);
      page.itemOrder.push(item.id);
    }
    updatedDevice.assignedItems = [
      ...updatedDevice.assignedItems.filter(i =>
        !toRemove.includes(i.id) || updatedDevice.pages.some(p => p.assignedItems.some(a => a.id === i.id))),
      ...toAdd.filter(i => !updatedDevice.assignedItems.some(a => a.id === i.id)),
    ];

    setOptimisticDevice(updatedDevice);
    setRecentlyAddedItemIds(new Set(toAdd.map(i => i.id)));
    setTimeout(() => setRecentlyAddedItemIds(new Set()), 2000);
    setAutoFill(prev => {
      const next = { ...prev };
      if (stations.length === 0) delete next[pageId];
      else next[pageId] = {
        stations,
        itemIds: [...previous.filter(id => !toRemove.includes(id)), ...toAdd.map(i => i.id)],
      };
      return next;
    });

    for (const id of toRemove) onRemoveItem(id, optimisticDevice.id, pageId);
    if (toAdd.length > 0) onAddItems(optimisticDevice, toAdd, pageId);
    onLocalChange?.(optimisticDevice.id, {
      summary: stations.length > 0 ? `Auto Fill from ${stations.join(', ')}` : 'Turned off Auto Fill',
      mergeKey: `autofill|${pageId}`,
      mode: stations.length > 0 ? 'replace' : 'toggle',
      daypart: page.daypart,
    });
  };

  // Day settings are stored with the week when there is one; otherwise kept like other page-only edits
  const queueItemDays = (deviceId: string, pageId: string, itemId: number, change: LocalChange) => {
    if (onItemDaysChange) onItemDaysChange(deviceId, pageId, itemId, change);
    else onLocalChange?.(deviceId, change);
  };

  // On / Off / Auto for one day of the week being edited, or every day at once
  const handleToggleItemDisplay = (device: Device, pageId: string, itemId: number, day: number | 'every-day', toggle: DisplayToggle) => {
    setItemDisplayToggles(prev => {
      const pageOverrides = { ...(prev[pageId] || {}) };
      const itemOverrides = { ...(pageOverrides[itemId] || {}) };
      for (const d of day === 'every-day' ? WEEK_DAYS : [day]) {
        if (toggle === 'auto') delete itemOverrides[d];
        else itemOverrides[d] = toggle;
      }
      if (Object.keys(itemOverrides).length === 0) delete pageOverrides[itemId];
      else pageOverrides[itemId] = itemOverrides;
      return { ...prev, [pageId]: pageOverrides };
    });
    queueItemDays(device.id, pageId, itemId, {
      summary: `${displayToggleSummary(toggle, itemName(itemId))} · ${day === 'every-day' ? 'every day' : DAY_ABBR[day]}`,
      mergeKey: `day|${pageId}|${itemId}|${day}`,
      mode: 'replace',
      daypart: pageDaypart(pageId),
      day: day === 'every-day' ? undefined : day,
    });
  };

  // Names the variant (station + daypart, portion) an item on a page stands for
  const handleSetItemVariant = (device: Device, pageId: string, itemId: number, variant: PlacedVariant, followsDaypart: string | null) => {
    if (!optimisticDevice || !onSetItemVariant) return;
    const updated: Device = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updated.pages.find(p => p.id === pageId);
    const item = page?.assignedItems.find(i => i.id === itemId);
    if (!page || !item) return;
    item.variant = variant;
    item.followsDaypart = followsDaypart;
    setOptimisticDevice(updated);
    onSetItemVariant(device, pageId, item, variant, followsDaypart);
  };

  // Sets an item's whole week on a page at once (used when it's added for one day). With
  // `queue` false it only sets the working copy: the add itself carries the days.
  const handleSetItemDays = (device: Device, pageId: string, itemId: number, days: ItemDayOverrides, summary: string, queue = true) => {
    setItemDisplayToggles(prev => {
      const pageOverrides = { ...(prev[pageId] || {}) };
      if (Object.keys(days).length === 0) delete pageOverrides[itemId];
      else pageOverrides[itemId] = { ...days };
      return { ...prev, [pageId]: pageOverrides };
    });
    if (!queue) return;
    queueItemDays(device.id, pageId, itemId, {
      summary,
      mergeKey: `days|${pageId}|${itemId}`,
      mode: 'replace',
      daypart: pageDaypart(pageId),
    });
  };

  const handleReorderItems = async (deviceId: string, pageId: string, startIndex: number, endIndex: number) => {
    if (!optimisticDevice) return;

    const updatedDevice: Device = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updatedDevice.pages.find(p => p.id === pageId);
    if (!page) return;

    const [removed] = page.itemOrder.splice(startIndex, 1);
    page.itemOrder.splice(endIndex, 0, removed);

    setOptimisticDevice(updatedDevice);

    try {
      await onReorderItems(deviceId, pageId, [...page.itemOrder]);
      setSelectedDevice(updatedDevice);
    } catch (err) {
      console.error('Error reordering items:', err);
      const currentDevice = devices.find(d => d.id === deviceId);
      if (currentDevice) {
        const currentDeviceClone = JSON.parse(JSON.stringify(currentDevice));
        setOptimisticDevice(currentDeviceClone);
        setSelectedDevice(currentDeviceClone);
      }
    }
  };

  const handleOpenConfig = () => {
    setShowConfigPage(true);
  };

  const handleCloseConfig = () => {
    setShowConfigPage(false);
  };

  const settingsModalState = { id: 'device-settings', isOpen: showDeviceSettingsModal };
  const configPageState = { id: 'device-config', isOpen: showConfigPage };

  // The device page is the entry point (labels are picked on the Smart Labels
  // grid or the label picker), so Back closes it.
  useModalHistory(settingsModalState, handleCloseModals, true);
  useModalHistory(configPageState, handleCloseConfig);

  return (
    <>
      <DeviceSettingsModal
        key={preSelectedDevice.id}
        showDeviceSettingsModal={showDeviceSettingsModal}
        initialItemSearch={initialItemSearch}
        weekStart={weekStart}
        initialDay={editingDay}
        onSelectedDayChange={handleDayChange}
        animateIn={animateIn}
        selectedDeviceSettings={optimisticDevice}
        setShowDeviceSettingsModal={setShowDeviceSettingsModal}
        setSelectedDeviceSettings={setOptimisticDevice}
        removeItemFromDevice={onRemoveItem}
        reorderItems={handleReorderItems}
        header={optimisticDevice && (
          <>
            {weekContextLabel && (
              <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 border-b border-sky-100 dark:border-sky-800/50 text-sky-700 dark:text-sky-300 text-sm">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  Editing <span className="font-semibold">{weekContextLabel}</span>
                  {weekStart && <span className="font-medium"> · {formatWeekRange(weekStart)}</span>}
                  {' '}— items come from this week’s schedule
                  {weekContextNote && <span className="text-sky-600/80 dark:text-sky-400/80"> · {weekContextNote}</span>}
                  <span className="inline-flex items-center gap-1.5 ml-1.5 align-middle">
                    · <span className="font-semibold">{formatEditingDay(editingDay, weekStart)}</span>
                    {selectedDaypart && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${daypartColor(selectedDaypart).chip}`}>
                        {selectedDaypart}
                      </span>
                    )}
                  </span>
                </span>
                {labelNav && (
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={labelNav.onPrev}
                      disabled={!labelNav.onPrev}
                      aria-label="Previous label"
                      className="h-7 w-7 flex items-center justify-center rounded-lg border border-sky-200 dark:border-sky-800 bg-white dark:bg-gray-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-semibold tabular-nums whitespace-nowrap">{labelNav.index + 1} of {labelNav.total}</span>
                    <button
                      onClick={labelNav.onNext}
                      disabled={!labelNav.onNext}
                      aria-label="Next label"
                      className="h-7 w-7 flex items-center justify-center rounded-lg border border-sky-200 dark:border-sky-800 bg-white dark:bg-gray-800 hover:bg-sky-100 dark:hover:bg-sky-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
            )}
            <DeviceHeader
              device={optimisticDevice}
              onClose={handleCloseModals}
              onOpenConfig={handleOpenConfig}
            />
          </>
        )}
        setNotifications={setNotifications}
        selectedDaypart={selectedDaypart}
        onSelectedDaypartChange={setSelectedDaypart}
        menuItems={menuItems}
        onInlineAddItems={handleInlineAddItems}
        onInlineRemoveItems={handleInlineRemoveItems}
        onToggleItemDisplay={handleToggleItemDisplay}
        onSetItemDays={handleSetItemDays}
        onSetItemVariant={onSetItemVariant ? handleSetItemVariant : undefined}
        initialFilters={initialFilters}
        dayOverridesLocked={dayOverridesLocked}
        itemDisplayToggles={itemDisplayToggles}
        recentlyAddedItemIds={recentlyAddedItemIds}
        onCreateMenuItem={onCreateMenuItem}
        substitutionMap={substitutionMap}
        onAddSubstitution={handleAddSubstitution}
        onRemoveSubstitution={handleRemoveSubstitution}
        autoFill={autoFill}
        onSetAutoFill={handleSetAutoFill}
      />

      {optimisticDevice && (
        <DeviceConfigPage
          device={optimisticDevice}
          isOpen={showConfigPage}
          onClose={handleCloseConfig}
          autoFillSummary={optimisticDevice.pages
            .filter(p => autoFill[p.id]?.stations.length)
            .map(p => ({ daypart: p.daypart, stations: autoFill[p.id].stations }))}
          deviceGroup={deviceGroup}
          groupBrands={groupBrands}
          onRename={onRenameDevice && (async (name) => {
            await onRenameDevice(optimisticDevice.id, name);
            setOptimisticDevice(d => d && { ...d, displayName: name || null });
          })}
        />
      )}

    </>
  );
}
