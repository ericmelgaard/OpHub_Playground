import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { daypartColor } from '../lib/daypartColors';
import { Device, MenuItem, Substitution, DeviceGroup, Brand } from '../types';
import { buildSubstitutionMap } from '../lib/substitutions';
import { formatWeekRange, formatEditingDay } from '../lib/weekSchedule';
import { DeviceSettingsModal } from '../components/DeviceSettingsModal';
import { ItemSelectionModal } from '../components/ItemSelectionModal';
import { DeviceHeader } from '../components/DeviceHeader';
import { DeviceConfigPage } from '../components/DeviceConfigPage';
import { DisplayToggle } from '../components/InlineItemPicker';
import { useModalHistory } from '../hooks/useModalHistory';
import { api } from '../services/api';
import { MergeMode, getDraft, getAppliedLocalState, saveDraft, useHasDraft } from '../lib/pendingChanges';
import { DAY_ABBR } from '../lib/availability';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

interface DeviceFirstWorkflowProps {
  devices: Device[];
  menuItems: MenuItem[];
  preSelectedDevice: Device;
  preSelectedDaypart?: string | null;
  // Prefills the Available Items search, e.g. with a product chosen on Products
  initialItemSearch?: string;
  // Monday (YYYY-MM-DD) of the week being edited, if any
  weekStart?: string | null;
  weekContextLabel?: string;
  // Shown after the week banner, e.g. when edits there don't push to the label yet
  weekContextNote?: string;
  // Label + week being edited; pending edits are kept under it until applied or discarded
  draftKey: string;
  // Edits kept on this page only (display toggles, substitutions, auto-fill) that still change the label
  onLocalChange?: (deviceId: string, change: LocalChange) => void;
  onAddItems: (device: Device, items: MenuItem[], pageId: string) => void;
  onRemoveItem: (itemId: number, deviceId: string, pageId: string) => void;
  onReorderItems: (deviceId: string, pageId: string, itemOrder: number[]) => void;
  onClose: () => void;
  onForcePage?: (deviceId: string, pageId: string | null) => void;
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
  toggle === 'on' ? `Always show ${name}` : toggle === 'off' ? `Hid ${name}` : `Reset ${name} to auto`;

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
  onAddItems,
  onRemoveItem,
  onReorderItems,
  onClose,
  onForcePage,
  setNotifications,
  onCreateMenuItem,
  initialDay,
  onDayChange,
  onDaypartChange,
  labelNav,
  animateIn = true,
}: DeviceFirstWorkflowProps) {
  const [showDeviceSettingsModal, setShowDeviceSettingsModal] = useState(true);
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [showConfigPage, setShowConfigPage] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(preSelectedDevice || null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isAddingToPage, setIsAddingToPage] = useState<string | null>(null);
  const [lastAssignedPageId, setLastAssignedPageId] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  // Reopening a label with pending changes shows them again
  const [optimisticDevice, setOptimisticDevice] = useState<Device | null>(
    () => clone(getDraft(draftKey)?.device ?? preSelectedDevice)
  );
  const [itemSearchValue, setItemSearchValue] = useState('');
  const [selectedMealPeriod, setSelectedMealPeriod] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');
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
  const [itemDisplayToggles, setItemDisplayToggles] = useState<Record<string, Record<number, DisplayToggle>>>(
    () => localStateFor(draftKey)?.toggles ?? {}
  );
  const [substitutions, setSubstitutions] = useState<Substitution[]>(() => localStateFor(draftKey)?.substitutions ?? []);
  const [autoFillEnabled, setAutoFillEnabled] = useState(() => localStateFor(draftKey)?.autoFill ?? false);
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
    setShowItemSelectionModal(false);
    setShowConfigPage(false);
    setShowDeviceSettingsModal(true);
    setSelectedPageId(null);
    setIsAddingToPage(null);
    setLastAssignedPageId(null);
    setDuplicateCount(0);
    setRecentlyAddedItemIds(new Set());
    setItemDisplayToggles(local?.toggles ?? {});
    setSubstitutions(local?.substitutions ?? []);
    setAutoFillEnabled(local?.autoFill ?? false);
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
      autoFill: autoFillEnabled,
    });
  }, [draftKey, hasDraft, optimisticDevice, itemDisplayToggles, substitutions, autoFillEnabled]);

  // With nothing pending (none yet, applied, or discarded) the page shows the label as stored
  useEffect(() => {
    if (hasDraft || shownDraftKey.current !== draftKey) return;
    const local = getAppliedLocalState(draftKey);
    setSelectedDevice(clone(preSelectedDevice));
    setOptimisticDevice(clone(preSelectedDevice));
    setItemDisplayToggles(local?.toggles ?? {});
    setSubstitutions(local?.substitutions ?? []);
    setAutoFillEnabled(local?.autoFill ?? false);
  }, [hasDraft, draftKey, preSelectedDevice]);

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

  const autoFillItemIds = useMemo(() => {
    if (!autoFillEnabled || !optimisticDevice) return new Set<number>();
    const ids = new Set<number>();
    const daypartToMealPeriod: Record<string, string> = {
      'Breakfast': 'Breakfast',
      'Lunch': 'Lunch',
      'Dinner': 'Dinner',
      'Late Night': 'Late Night',
    };
    for (const page of optimisticDevice.pages) {
      const targetPeriod = daypartToMealPeriod[page.daypart];
      if (!targetPeriod) continue;
      const manualIds = new Set(page.assignedItems.map(i => i.id));
      const candidates = menuItems
        .filter(i => i.mealPeriod === targetPeriod && !manualIds.has(i.id))
        .slice(0, Math.max(0, page.displayCapacity - page.assignedItems.length));
      candidates.forEach(c => ids.add(c.id));
    }
    return ids;
  }, [autoFillEnabled, optimisticDevice, menuItems]);

  const autoFillPages = useMemo(() => {
    if (!autoFillEnabled || !optimisticDevice) return new Map<string, MenuItem[]>();
    const map = new Map<string, MenuItem[]>();
    const daypartToMealPeriod: Record<string, string> = {
      'Breakfast': 'Breakfast',
      'Lunch': 'Lunch',
      'Dinner': 'Dinner',
      'Late Night': 'Late Night',
    };
    for (const page of optimisticDevice.pages) {
      const targetPeriod = daypartToMealPeriod[page.daypart];
      if (!targetPeriod) continue;
      const manualIds = new Set(page.assignedItems.map(i => i.id));
      const candidates = menuItems
        .filter(i => i.mealPeriod === targetPeriod && !manualIds.has(i.id))
        .slice(0, Math.max(0, page.displayCapacity - page.assignedItems.length));
      if (candidates.length > 0) map.set(page.id, candidates);
    }
    return map;
  }, [autoFillEnabled, optimisticDevice, menuItems]);

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

  const mealPeriods = ['all', ...new Set(menuItems.map(item => item.mealPeriod))];
  const stations = ['all', ...new Set(menuItems.map(item => item.mealStation))];

  const handleCloseModals = () => {
    setShowDeviceSettingsModal(false);
    setShowItemSelectionModal(false);
    setShowConfigPage(false);
    setSelectedDevice(null);
    setOptimisticDevice(null);
    setSelectedPageId(null);
    setIsAddingToPage(null);
    setLastAssignedPageId(null);
    setDuplicateCount(0);
    onClose();
  };

  const handleAddItems = (device: Device, pageId: string) => {
    setSelectedDevice(device);
    setSelectedPageId(pageId);
    setShowItemSelectionModal(true);
  };

  const handleItemSelect = async (items: MenuItem[]) => {
    if (!selectedDevice || !selectedPageId || items.length === 0 || !optimisticDevice) return;

    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
    const page = updatedDevice.pages.find(p => p.id === selectedPageId);
    if (!page) return;

    const duplicateItems = items.filter(item => 
      page.assignedItems.some(existing => existing.id === item.id)
    );
    const newItems = items.filter(item => 
      !page.assignedItems.some(existing => existing.id === item.id)
    );

    setDuplicateCount(duplicateItems.length);

    newItems.forEach(item => {
      page.assignedItems.push(item);
      page.itemOrder.push(item.id);
    });

    newItems.forEach(item => {
      if (!updatedDevice.assignedItems.some(i => i.id === item.id)) {
        updatedDevice.assignedItems.push(item);
      }
    });

    setOptimisticDevice(updatedDevice);
    setIsAddingToPage(selectedPageId);
    setShowItemSelectionModal(false);
    setShowDeviceSettingsModal(true);

    try {
      if (newItems.length > 0) await onAddItems(selectedDevice, newItems, selectedPageId);
      setSelectedDevice(updatedDevice);
      setLastAssignedPageId(selectedPageId);
    } catch (err) {
      console.error('Error adding items:', err);
      const currentDevice = devices.find(d => d.id === selectedDevice.id);
      if (currentDevice) {
        const currentDeviceClone = JSON.parse(JSON.stringify(currentDevice));
        setOptimisticDevice(currentDeviceClone);
        setSelectedDevice(currentDeviceClone);
      }
    } finally {
      setIsAddingToPage(null);
      setTimeout(() => {
        setLastAssignedPageId(null);
        setDuplicateCount(0);
      }, 2000);
    }
  };

  const handleInlineAddItems = async (device: Device, items: MenuItem[], pageId: string) => {
    if (!optimisticDevice || items.length === 0) return;

    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
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
      if (newItems.length > 0) await onAddItems(selectedDevice!, newItems, pageId);
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

    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
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

  const handleToggleItemDisplay = (device: Device, pageId: string, itemId: number, toggle: DisplayToggle) => {
    setItemDisplayToggles(prev => {
      const pageToggles = { ...(prev[pageId] || {}) };
      if (toggle === 'auto') {
        delete pageToggles[itemId];
      } else {
        pageToggles[itemId] = toggle;
      }
      return { ...prev, [pageId]: pageToggles };
    });
    onLocalChange?.(device.id, {
      summary: displayToggleSummary(toggle, itemName(itemId)),
      mergeKey: `toggle|${pageId}|${itemId}`,
      mode: 'replace',
      daypart: pageDaypart(pageId),
    });
  };

  const handleForcePage = (pageId: string | null) => {
    if (!selectedDevice || !onForcePage) return;
    
    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
    updatedDevice.status.forcedPage = pageId;
    if (pageId) {
      updatedDevice.status.currentPage = pageId;
    }
    
    setOptimisticDevice(updatedDevice);
    onForcePage(selectedDevice.id, pageId);
  };

  const handleReorderItems = async (deviceId: string, pageId: string, startIndex: number, endIndex: number) => {
    if (!optimisticDevice) return;

    const updatedDevice = JSON.parse(JSON.stringify(optimisticDevice));
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
  const itemSelectionModalState = { id: 'item-selection', isOpen: showItemSelectionModal };
  const configPageState = { id: 'device-config', isOpen: showConfigPage };

  // The device page is the entry point (labels are picked on the Smart Labels
  // grid or the label picker), so Back closes it.
  useModalHistory(settingsModalState, handleCloseModals, true);
  useModalHistory(itemSelectionModalState, () => {
    setShowItemSelectionModal(false);
    setShowDeviceSettingsModal(true);
  });
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
        onAddItems={handleAddItems}
        onClose={handleCloseModals}
        isAddingToPage={isAddingToPage}
        lastAssignedPageId={lastAssignedPageId}
        duplicateCount={duplicateCount}
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
        itemDisplayToggles={itemDisplayToggles}
        recentlyAddedItemIds={recentlyAddedItemIds}
        onCreateMenuItem={onCreateMenuItem}
        substitutions={substitutions}
        substitutionMap={substitutionMap}
        onAddSubstitution={handleAddSubstitution}
        onRemoveSubstitution={handleRemoveSubstitution}
        autoFillEnabled={autoFillEnabled}
        autoFillItemIds={autoFillItemIds}
        autoFillPages={autoFillPages}
      />

      <ItemSelectionModal
        show={showItemSelectionModal}
        onClose={() => {
          setShowItemSelectionModal(false);
          setShowDeviceSettingsModal(true);
        }}
        menuItems={menuItems}
        selectedDevice={optimisticDevice}
        onItemSelect={handleItemSelect}
        searchValue={itemSearchValue}
        setSearchValue={setItemSearchValue}
        selectedMealPeriod={selectedMealPeriod}
        setSelectedMealPeriod={setSelectedMealPeriod}
        selectedStation={selectedStation}
        setSelectedStation={setSelectedStation}
        mealPeriods={mealPeriods}
        stations={stations}
        selectedPage={selectedPageId}
      />

      {optimisticDevice && (
        <DeviceConfigPage
          device={optimisticDevice}
          isOpen={showConfigPage}
          onClose={handleCloseConfig}
          autoFillEnabled={autoFillEnabled}
          onAutoFillToggle={() => {
            setAutoFillEnabled(prev => !prev);
            onLocalChange?.(optimisticDevice.id, {
              summary: autoFillEnabled ? 'Turned off Auto Fill' : 'Turned on Auto Fill',
              mergeKey: 'autofill',
              mode: 'toggle',
            });
          }}
          deviceGroup={deviceGroup}
          groupBrands={groupBrands}
        />
      )}

    </>
  );
}
