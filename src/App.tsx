import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Tag, Tv, Receipt, Database, Package, Layers, Globe, Activity, Building2, Building, Store as StoreIcon, Plus } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { MenuFilters } from './components/MenuFilters';
import { ensureWeekData, ensureCurrentAndNextWeek, WeekLoadStatus } from './services/menuDataLoader';
import { MenuItems } from './components/MenuItems';
import { SmartLabelGrid } from './components/SmartLabelGrid';
import { SmartLabelList } from './components/SmartLabelList';
import { WeekScheduleBar, getWeekStartString } from './components/WeekScheduleBar';
import { resolveWeekSchedules, getScheduleSource, ScheduleSource, formatWeekRange, formatEditingDay } from './lib/weekSchedule';
import { filterLabels } from './lib/labelFilter';
import { projectScheduleOntoDevice } from './lib/deviceWeekProjection';
import { getWeekCoverage, countLabelsDifferingFromDefault } from './lib/scheduleCoverage';
import { initLabelSync } from './lib/labelSync';
import { useProductRefresh, ProductRefreshButton, ProductRefreshSheet, RefreshAge } from './components/ProductRefresh';
import { DaypartSelector, orderedDayparts } from './components/DaypartSelector';
import { SmartLabelFilters } from './components/SmartLabelFilters';
import { Sidebar } from './components/Sidebar';
import { FilterSidebar } from './components/FilterSidebar';
import { CreateItemModal } from './components/CreateItemModal';
import { CreateRuleModal } from './components/CreateRuleModal';
import { DeviceFirstWorkflow, LabelNav, LocalChange } from './workflows/DeviceFirstWorkflow';
import { addPendingChange, hasPendingChanges, setAfterApply, usePendingSummary, PendingChange } from './lib/pendingChanges';
import { PendingChangesBar, PendingChangesSheet } from './components/PendingChanges';
import { LabelPickerSheet } from './components/LabelPickerSheet';
import { QuickActionBar, QuickActionType, QuickActionConfig } from './components/QuickActionBar';
import { CustomizeQuickActionsModal } from './components/CustomizeQuickActionsModal';
import { SettingsPage } from './components/SettingsPage';
import { GroupsPage } from './components/GroupsPage';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { LocationChangeOverlay } from './components/LocationChangeOverlay';
import { Theme, Channel, MenuItem, Device, Rule, FilterConfig, DeviceWeekSchedule } from './types';
import { api } from './services/api';
import { demoSecondaryDomains } from './services/mockData';
import { useNfc } from './hooks/useNfc';

function App() {
  // Theme state
  const [theme, setTheme] = useState<Theme>('system');

  // Add this effect to handle system theme detection
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        document.documentElement.classList.toggle('dark', e.matches);
      };

      // Set initial value
      handleChange(mediaQuery);

      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);

      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Navigation state
  const [notifications, setNotifications] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [selectedPage, setSelectedPage] = useState<'products' | 'devices' | 'channels'>('products');

  // Channel state
  const [channels] = useState<Channel[]>([
    { id: 'shelf-labels', name: 'Digital Shelf Labels', icon: Tag, items: [] },
    { id: 'digital-signage', name: 'Digital Signage', icon: Tv, items: [] },
    { id: 'order-confirmation', name: 'Order Confirmation', icon: Receipt, items: [] }
  ]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>('shelf-labels');

  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'tiles'>('grid');
  const [searchValue, setSearchValue] = useState('');
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickActionType>(() => {
    const saved = localStorage.getItem('selectedQuickAction');
    return (saved as QuickActionType) || 'products';
  });

  // Filter state
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

  // Cycle Week state (0 = This Week, 1 = Next Week, etc.)
  const [selectedCycleWeek, setSelectedCycleWeek] = useState<number>(0);
  const [weekTransition, setWeekTransition] = useState<'in' | 'out'>('in');
  const [weekLoadStatus, setWeekLoadStatus] = useState<WeekLoadStatus>('idle');
  const loadedWeeks = useRef(new Set<number>());

  const loadWeekAndRefresh = useCallback(async (week: number) => {
    if (loadedWeeks.current.has(week)) return;
    setWeekLoadStatus('loading');
    try {
      const result = await ensureWeekData(week);
      loadedWeeks.current.add(week);
      if (result.inserted > 0) {
        const items = await api.getMenuItems();
        setMenuItems(items);
      }
      setWeekLoadStatus(result.status);
    } catch {
      setWeekLoadStatus('error');
    }
  }, []);

  const handleCycleWeekChange = useCallback((week: number) => {
    if (week === selectedCycleWeek) return;
    setWeekTransition('out');
    setTimeout(() => {
      setSelectedCycleWeek(week);
      setWeekTransition('in');
      loadWeekAndRefresh(week);
    }, 150);
  }, [selectedCycleWeek, loadWeekAndRefresh]);

  // Filter sidebar state
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('filterSidebarOpen');
    return saved ? JSON.parse(saved) : false;
  });

  // Filtered item count (for sidebar display)
  const [filteredItemCount, setFilteredItemCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('filterSidebarOpen', JSON.stringify(isFilterSidebarOpen));
  }, [isFilterSidebarOpen]);

  // Device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [showDeviceWorkflow, setShowDeviceWorkflow] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedDaypart, setSelectedDaypart] = useState<string>('Breakfast');
  const [workflowDaypart, setWorkflowDaypart] = useState<string | null>(null);

  // Smart label view & week scheduling
  const [labelViewMode, setLabelViewMode] = useState<'grid' | 'list'>('grid');
  const [labelWeekOffset, setLabelWeekOffset] = useState(0);
  const [isDefaultWeekSelected, setIsDefaultWeekSelected] = useState(false);
  const [weekSchedules, setWeekSchedules] = useState<DeviceWeekSchedule[]>([]);
  const [defaultSchedules, setDefaultSchedules] = useState<DeviceWeekSchedule[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<DeviceWeekSchedule[]>([]);
  const [overrideWeekStarts, setOverrideWeekStarts] = useState<string[]>([]);
  const [weekClipboard, setWeekClipboard] = useState<DeviceWeekSchedule[] | null>(null);
  const [deviceWeekContext, setDeviceWeekContext] = useState<{ isDefault: boolean; weekStart: string | null; label: string } | null>(null);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Day being edited. Shared by every label you open, and changed from the label page.
  const [labelDay, setLabelDay] = useState<number | 'every-day'>(() => new Date().getDay());
  // Labels opened this session, keyed by what was being edited, plus the last one opened
  const [reviewedLabels, setReviewedLabels] = useState<Set<string>>(new Set());
  const [lastOpenedLabelId, setLastOpenedLabelId] = useState<string | null>(null);
  // True while stepping label to label, so the page doesn't slide in each time
  const [steppingLabels, setSteppingLabels] = useState(false);

  // Default daypart based on current time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) setSelectedDaypart('Breakfast');
    else if (hour >= 10 && hour < 15) setSelectedDaypart('Lunch');
    else if (hour >= 15 && hour < 20) setSelectedDaypart('Dinner');
    else setSelectedDaypart('Late Night');
  }, []);

  // Modal state
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  // Product-first placement: pick a label, then open its device page with the
  // product's name in the Available Items search (same pattern as "Show")
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [deviceItemSearch, setDeviceItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  // Closing a label opened from the picker goes back to the picker (wrong label → pick again)
  const [labelFromPicker, setLabelFromPicker] = useState(false);

  // Quick Action Configuration
  const getDefaultQuickActionConfigs = (): QuickActionConfig[] => [
    {
      id: 'groups',
      name: 'Groups',
      description: 'Placement groups count',
      icon: Layers,
      bgColor: 'rgb(6, 182, 212)',
      iconColor: 'text-cyan-500',
      visible: true,
      order: 0
    },
    {
      id: 'signage',
      name: 'Signage',
      description: 'Signage players count',
      icon: Tv,
      bgColor: 'rgb(59, 130, 246)',
      iconColor: 'text-blue-500',
      visible: true,
      order: 1
    },
    {
      id: 'products',
      name: 'Products',
      description: 'Product count and status',
      icon: Package,
      bgColor: 'rgb(16, 185, 129)',
      iconColor: 'text-emerald-500',
      visible: true,
      order: 2
    },
    {
      id: 'webview',
      name: 'Webview Kiosks',
      description: 'Webview kiosk count',
      icon: Globe,
      bgColor: 'rgb(139, 92, 246)',
      iconColor: 'text-violet-500',
      visible: true,
      order: 3
    },
    {
      id: 'smart-labels',
      name: 'Smart Labels',
      description: 'Manage smart label devices',
      icon: Tag,
      bgColor: 'rgb(245, 158, 11)',
      iconColor: 'text-amber-500',
      visible: true,
      order: 4
    },
    {
      id: 'activity',
      name: 'Activity',
      description: 'Recent actions and updates',
      icon: Activity,
      bgColor: 'rgb(139, 92, 246)',
      iconColor: 'text-violet-500',
      visible: true,
      order: 5
    }
  ];

  const [quickActionConfigs, setQuickActionConfigs] = useState<QuickActionConfig[]>(() => {
    const saved = localStorage.getItem('quickActionConfigs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const defaults = getDefaultQuickActionConfigs();
        return defaults.map(def => {
          const savedConfig = parsed.find((p: any) => p.id === def.id);
          return savedConfig ? { ...def, visible: savedConfig.visible, order: savedConfig.order } : def;
        });
      } catch {
        return getDefaultQuickActionConfigs();
      }
    }
    return getDefaultQuickActionConfigs();
  });

  // Location state
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationChangeTrigger, setLocationChangeTrigger] = useState(0);
  const [locationChangeInfo, setLocationChangeInfo] = useState<{ label: string; path: string[] }>({ label: 'WAND', path: [] });

  // Rules state
  const [rules, setRules] = useState<Rule[]>([]);

  // Multi-domain demo state
  const [isMultiDomainUser, setIsMultiDomainUser] = useState(false);
  const [selectedSecondaryDomainId, setSelectedSecondaryDomainId] = useState<string>(demoSecondaryDomains[0]?.id || '');
  const selectedSecondaryDomain = demoSecondaryDomains.find(d => d.id === selectedSecondaryDomainId) || null;

  // Load menu items + ensure current/next week data exists
  useEffect(() => {
    const loadMenuItems = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ensure current & next week data exist, then load
        await ensureCurrentAndNextWeek();
        loadedWeeks.current.add(0);
        loadedWeeks.current.add(1);
        const items = await api.getMenuItems();
        setMenuItems(items);
      } catch (err) {
        console.error('Error loading menu items:', err);
        setError('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    loadMenuItems();
  }, []);

  // Load devices
  useEffect(() => {
    const loadDevices = async () => {
      setLoadingDevices(true);
      setDeviceError(null);
      try {
        const deviceData = await api.getDevices();
        setDevices(deviceData);
      } catch (err) {
        console.error('Error loading devices:', err);
        setDeviceError('Failed to load devices');
      } finally {
        setLoadingDevices(false);
      }
    };

    loadDevices();
  }, []);

  // Load explicit overrides for the selected week
  useEffect(() => {
    if (selectedQuickAction !== 'smart-labels') return;
    const weekStart = getWeekStartString(labelWeekOffset);
    setLoadingSchedules(true);
    api.getWeekSchedules(weekStart)
      .then(setWeekSchedules)
      .catch(() => setWeekSchedules([]))
      .finally(() => setLoadingSchedules(false));
  }, [labelWeekOffset, selectedQuickAction]);

  // Load default week, recurring patterns and the set of overridden weeks
  const refreshScheduleMeta = useCallback(async () => {
    const [defs, recs, overs] = await Promise.all([
      api.getDefaultSchedules(),
      api.getRecurringSchedules(),
      api.getOverrideWeekStarts(),
    ]);
    setDefaultSchedules(defs);
    setRecurringSchedules(recs);
    setOverrideWeekStarts(overs);
  }, []);

  useEffect(() => {
    if (selectedQuickAction !== 'smart-labels') return;
    refreshScheduleMeta().catch(() => {});
  }, [selectedQuickAction, refreshScheduleMeta]);

  const deviceIds = useMemo(() => devices.map(d => d.id), [devices]);

  // The schedules actually shown for the current selection (override -> recurring -> default)
  const effectiveSchedules = useMemo(() => {
    if (isDefaultWeekSelected) return defaultSchedules;
    const weekStart = getWeekStartString(labelWeekOffset);
    return resolveWeekSchedules(weekStart, weekSchedules, defaultSchedules, recurringSchedules, deviceIds);
  }, [isDefaultWeekSelected, defaultSchedules, labelWeekOffset, weekSchedules, recurringSchedules, deviceIds]);

  const overrideWeekStartSet = useMemo(() => new Set(overrideWeekStarts), [overrideWeekStarts]);

  const refreshCurrentWeek = useCallback(async () => {
    await refreshScheduleMeta();
    const weekStart = getWeekStartString(labelWeekOffset);
    const overrides = await api.getWeekSchedules(weekStart);
    setWeekSchedules(overrides);
  }, [refreshScheduleMeta, labelWeekOffset]);

  const handleLabelWeekChange = useCallback((offset: number) => {
    setLabelWeekOffset(offset);
    setIsDefaultWeekSelected(false);
  }, []);

  const handleSelectDefaultWeek = useCallback(() => {
    setIsDefaultWeekSelected(true);
  }, []);

  // Per-day fill status for the selected week; drives the day selector and the Schedule badge
  const weekCoverage = useMemo(
    () => getWeekCoverage(devices, effectiveSchedules),
    [devices, effectiveSchedules],
  );
  const weekGapCount = useMemo(
    () => weekCoverage.reduce((sum, c) => sum + c.gaps, 0),
    [weekCoverage],
  );

  const differingLabelCount = useMemo(
    () => countLabelsDifferingFromDefault(effectiveSchedules, defaultSchedules),
    [effectiveSchedules, defaultSchedules],
  );

  const resetLabelSession = useCallback(() => {
    setLabelDay(new Date().getDay());
    setReviewedLabels(new Set());
    setLastOpenedLabelId(null);
  }, []);

  const closeSchedule = useCallback(() => {
    setScheduleOpen(false);
    setLabelWeekOffset(0);
    setIsDefaultWeekSelected(false);
    resetLabelSession();
  }, [resetLabelSession]);

  const handleToggleSchedule = useCallback(() => {
    if (scheduleOpen) {
      closeSchedule();
    } else {
      setScheduleOpen(true);
    }
  }, [scheduleOpen, closeSchedule]);

  const handleCopyWeek = useCallback(() => {
    setWeekClipboard(effectiveSchedules.map(s => ({ ...s })));
  }, [effectiveSchedules]);

  const handlePasteWeek = useCallback(async () => {
    if (!weekClipboard || isDefaultWeekSelected) return;
    const targetWeekStart = getWeekStartString(labelWeekOffset);
    await api.pasteWeekSchedule(targetWeekStart, weekClipboard, null);
    await refreshCurrentWeek();
  }, [weekClipboard, isDefaultWeekSelected, labelWeekOffset, refreshCurrentWeek]);

  const handleSetRecurring = useCallback(async (weeks: number) => {
    if (isDefaultWeekSelected) return;
    const weekStart = getWeekStartString(labelWeekOffset);
    await api.setWeekRecurring(weekStart, weeks, effectiveSchedules);
    await refreshCurrentWeek();
  }, [isDefaultWeekSelected, labelWeekOffset, effectiveSchedules, refreshCurrentWeek]);

  const handleClearRecurring = useCallback(async () => {
    const weekStart = getWeekStartString(labelWeekOffset);
    await api.clearWeekRecurring(weekStart);
    await refreshCurrentWeek();
  }, [labelWeekOffset, refreshCurrentWeek]);

  const handleEmptyWeek = useCallback(async () => {
    const weekStart = getWeekStartString(labelWeekOffset);
    await api.emptyWeekSchedule(weekStart, deviceIds);
    await refreshCurrentWeek();
  }, [labelWeekOffset, deviceIds, refreshCurrentWeek]);

  const handleResetToDefault = useCallback(async () => {
    const weekStart = getWeekStartString(labelWeekOffset);
    await api.resetWeekToDefault(weekStart);
    await refreshCurrentWeek();
  }, [labelWeekOffset, refreshCurrentWeek]);

  // Device opened for a week shows that week's resolved items (override -> recurring -> default)
  const projectedWorkflowDevice = useMemo(() => {
    if (!selectedDevice) return null;
    if (!deviceWeekContext) return selectedDevice;
    let schedule: DeviceWeekSchedule | undefined;
    if (deviceWeekContext.isDefault) {
      schedule = defaultSchedules.find(s => s.deviceId === selectedDevice.id);
    } else {
      const resolved = resolveWeekSchedules(
        deviceWeekContext.weekStart as string,
        weekSchedules, defaultSchedules, recurringSchedules, [selectedDevice.id],
      );
      schedule = resolved[0];
    }
    return projectScheduleOntoDevice(selectedDevice, schedule, menuItems);
  }, [selectedDevice, deviceWeekContext, defaultSchedules, weekSchedules, recurringSchedules, menuItems]);

  // What the open label runs this week. Only needed when editing its Default Week,
  // which reaches the label only if this week has no override or recurring schedule.
  const [currentWeekSource, setCurrentWeekSource] = useState<ScheduleSource | null>(null);
  const editingDeviceId = showDeviceWorkflow ? selectedDevice?.id : undefined;
  useEffect(() => {
    setCurrentWeekSource(null);
    if (!editingDeviceId || !deviceWeekContext?.isDefault) return;
    let cancelled = false;
    const thisWeek = getWeekStartString(0);
    api.getWeekSchedules(thisWeek).then(overrides => {
      if (!cancelled) setCurrentWeekSource(getScheduleSource(thisWeek, editingDeviceId, overrides, recurringSchedules));
    });
    return () => { cancelled = true; };
  }, [editingDeviceId, deviceWeekContext, recurringSchedules]);

  // Only edits to what the label shows now get pushed; everything else is
  // schedule-only and reaches the label when that week (or schedule) is in effect.
  const editsReachLabel = !deviceWeekContext
    || (deviceWeekContext.isDefault
      ? currentWeekSource === 'default'
      : deviceWeekContext.weekStart === getWeekStartString(0));

  const weekContextNote =
    !deviceWeekContext ? undefined :
    !deviceWeekContext.isDefault ? (editsReachLabel ? undefined : 'changes reach the label when that week starts') :
    currentWeekSource === 'default' ? 'this week uses the Default Week, so changes go to the label' :
    currentWeekSource === 'override' ? 'this week has its own schedule, so changes don’t reach the label this week' :
    currentWeekSource === 'recurring' ? 'a recurring schedule runs this week, so changes don’t reach the label this week' :
    undefined;

  useEffect(() => {
    initLabelSync(devices);
  }, [devices]);

  // Label page edits wait as pending changes (per label and week being edited) and are
  // written when applied. Changes that reach today's label are sent right away;
  // the rest are saved for the nightly update.
  const draftContext = deviceWeekContext
    ? (deviceWeekContext.isDefault ? 'default' : deviceWeekContext.weekStart)
    : 'live';

  const queueChange = useCallback((
    deviceId: string,
    change: Pick<PendingChange, 'summary' | 'daypart' | 'mergeKey' | 'mode' | 'commit'> & { day?: number },
  ) => {
    const { day, ...rest } = change;
    addPendingChange({
      ...rest,
      deviceId,
      draftKey: `${deviceId}|${draftContext}`,
      context: deviceWeekContext?.label,
      live: editsReachLabel && (day === undefined || day === new Date().getDay()),
    });
  }, [draftContext, deviceWeekContext, editsReachLabel]);

  const queueAddItems = useCallback((device: Device, items: MenuItem[], pageId: string) => {
    const target = deviceWeekContext && { isDefault: deviceWeekContext.isDefault, weekStart: deviceWeekContext.weekStart };
    const daypart = device.pages.find(p => p.id === pageId)?.daypart;
    for (const item of items) {
      queueChange(device.id, {
        summary: `Added ${item.name}`,
        daypart,
        mergeKey: `item|${pageId}|${item.id}`,
        mode: 'toggle',
        commit: target
          ? async () => { if (daypart) await api.addScheduleItems(target, device.id, daypart, [item]); }
          : () => api.assignItemToPage(item.id, device.id, pageId),
      });
    }
  }, [deviceWeekContext, queueChange]);

  const queueRemoveItem = useCallback((itemId: number, deviceId: string, pageId: string) => {
    const target = deviceWeekContext && { isDefault: deviceWeekContext.isDefault, weekStart: deviceWeekContext.weekStart };
    const item = menuItems.find(i => i.id === itemId);
    const daypart = projectedWorkflowDevice?.pages.find(p => p.id === pageId)?.daypart;
    queueChange(deviceId, {
      summary: `Removed ${item?.name ?? 'item'}`,
      daypart,
      mergeKey: `item|${pageId}|${itemId}`,
      mode: 'toggle',
      commit: target
        ? async () => { if (item?.mrn && daypart) await api.removeScheduleItem(target, deviceId, daypart, item.mrn); }
        : () => api.removeItemFromPage(itemId, deviceId, pageId),
    });
  }, [deviceWeekContext, menuItems, projectedWorkflowDevice, queueChange]);

  const queueReorder = useCallback((deviceId: string, pageId: string, itemOrder: number[]) => {
    queueChange(deviceId, {
      summary: 'Changed item order',
      daypart: projectedWorkflowDevice?.pages.find(p => p.id === pageId)?.daypart,
      mergeKey: `order|${pageId}`,
      mode: 'replace',
      // Week schedules don't store order yet
      commit: deviceWeekContext ? async () => {} : () => api.reorderPageItems(deviceId, pageId, itemOrder),
    });
  }, [deviceWeekContext, projectedWorkflowDevice, queueChange]);

  // Page-only edits aren't stored by the API; applying them just updates the label
  const queueLocalChange = useCallback((deviceId: string, change: LocalChange) => {
    queueChange(deviceId, { ...change, commit: async () => {} });
  }, [queueChange]);

  // Reload what applied changes wrote
  useEffect(() => {
    setAfterApply(async () => {
      setDevices(await api.getDevices());
      await refreshCurrentWeek();
    });
    return () => setAfterApply(null);
  }, [refreshCurrentWeek]);

  // Leaving Smart Labels (or the page) with pending changes asks first
  const pendingSummary = usePendingSummary();
  const [leaveTarget, setLeaveTarget] = useState<QuickActionType | null>(null);
  useEffect(() => {
    if (pendingSummary.count === 0) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pendingSummary.count]);

  // Load location data
  useEffect(() => {
    const loadLocationData = async () => {
      setLoadingLocations(true);
      try {
        const [conceptsData, companiesData, storesData, placementsData] = await Promise.all([
          api.getConcepts(),
          api.getCompanies(),
          api.getStores(),
          api.getPlacements()
        ]);
        
        setConcepts(conceptsData);
        setCompanies(companiesData);
        setStores(storesData);
        setPlacements(placementsData);
      } catch (error) {
        console.error('Error loading location data:', error);
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocationData();
  }, []);


  // Handlers
  // Saves a new product to Supabase and reloads the list so it shows everywhere. Throws on failure.
  const createMenuItem = useCallback(async (data: Parameters<typeof api.createMenuItem>[0]): Promise<MenuItem | null> => {
    const id = await api.createMenuItem(data);
    const updated = await api.getMenuItems();
    setMenuItems(updated);
    return updated.find(i => i.id === id) ?? null;
  }, []);

  const handleCreateRule = useCallback((rule: Rule) => {
    setRules(prev => [...prev, rule]);
    setShowCreateRuleModal(false);
  }, []);

  const handleEditRule = useCallback((rule: Rule) => {
    setSelectedRule(rule);
    setShowCreateRuleModal(true);
  }, []);

  const handleConceptClick = useCallback((conceptId: string) => {
    if (selectedConcept === conceptId) {
      setSelectedConcept(null);
      setSelectedCompany(null);
      setSelectedStore(null);
      setExpandedConcept(null);
    } else {
      setSelectedConcept(conceptId);
      setSelectedCompany(null);
      setSelectedStore(null);
      setExpandedConcept(conceptId);
    }
  }, [selectedConcept]);

  const handleCompanyClick = useCallback((companyId: string) => {
    if (selectedCompany === companyId) {
      setSelectedCompany(null);
      setSelectedStore(null);
      setExpandedCompany(null);
    } else {
      setSelectedCompany(companyId);
      setSelectedStore(null);
      setExpandedCompany(companyId);
    }
  }, [selectedCompany]);

  const handleStoreSelect = useCallback((storeId: string) => {
    setSelectedStore(storeId);
  }, []);

  const handleDeviceSelect = useCallback((device: Device, daypart?: string | null) => {
    setSelectedDevice(device);
    setSteppingLabels(false);
    setLabelFromPicker(false);
    setWorkflowDaypart(daypart || selectedDaypart);
    if (selectedQuickAction === 'smart-labels') {
      const isDefault = isDefaultWeekSelected;
      const weekStart = isDefault ? null : getWeekStartString(labelWeekOffset);
      const label = isDefault
        ? 'Default Week'
        : labelWeekOffset === 0 ? 'This Week'
        : labelWeekOffset === 1 ? 'Next Week'
        : labelWeekOffset === -1 ? 'Last Week'
        : `Week of ${new Date(getWeekStartString(labelWeekOffset) + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      setDeviceWeekContext({ isDefault, weekStart, label });
      setLastOpenedLabelId(device.id);
    } else {
      setDeviceWeekContext(null);
    }
    setShowDeviceWorkflow(true);
  }, [selectedDaypart, selectedQuickAction, isDefaultWeekSelected, labelWeekOffset]);

  const selectedPlacementIds = useMemo(
    () => activeFilters.find(f => f.type === 'placement')?.selectedValues ?? [],
    [activeFilters],
  );

  // The labels on screen, in order: what previous / next on the label page walk through
  const visibleLabels = useMemo(
    () => filterLabels(devices, searchValue, selectedPlacementIds),
    [devices, searchValue, selectedPlacementIds],
  );

  // What's being edited; a label counts as reviewed once it's been opened for it
  const labelSessionKey = `${scheduleOpen ? (isDefaultWeekSelected ? 'default' : getWeekStartString(labelWeekOffset)) : 'live'}|${labelDay}|${selectedDaypart}`;
  const openLabelId = showDeviceWorkflow && selectedQuickAction === 'smart-labels' ? selectedDevice?.id : undefined;
  useEffect(() => {
    if (!openLabelId) return;
    setReviewedLabels(prev => {
      const key = `${labelSessionKey}|${openLabelId}`;
      return prev.has(key) ? prev : new Set(prev).add(key);
    });
  }, [openLabelId, labelSessionKey]);

  const reviewedLabelIds = useMemo(() => {
    const prefix = `${labelSessionKey}|`;
    const ids = new Set<string>();
    reviewedLabels.forEach(k => { if (k.startsWith(prefix)) ids.add(k.slice(prefix.length)); });
    return ids;
  }, [reviewedLabels, labelSessionKey]);

  const labelNav = useMemo((): LabelNav | undefined => {
    if (selectedQuickAction !== 'smart-labels' || !selectedDevice) return undefined;
    const index = visibleLabels.findIndex(d => d.id === selectedDevice.id);
    if (index === -1) return undefined;
    const prev = visibleLabels[index - 1];
    const next = visibleLabels[index + 1];
    const step = (device: Device) => {
      handleDeviceSelect(device, workflowDaypart);
      setSteppingLabels(true);
    };
    return {
      index,
      total: visibleLabels.length,
      prevName: prev?.name,
      nextName: next?.name,
      onPrev: prev ? () => step(prev) : undefined,
      onNext: next ? () => step(next) : undefined,
    };
  }, [selectedQuickAction, selectedDevice, visibleLabels, workflowDaypart, handleDeviceSelect]);

  const labelDayparts = useMemo(() => orderedDayparts(devices), [devices]);
  const gapsByDay = useMemo(
    () => new Map(weekCoverage.map(c => [c.dayOfWeek, c.gaps])),
    [weekCoverage],
  );
  const reviewedShownCount = useMemo(
    () => visibleLabels.filter(d => reviewedLabelIds.has(d.id)).length,
    [visibleLabels, reviewedLabelIds],
  );

  // Schedule button text while the schedule is open
  const scheduleContextLabel = useMemo(() => {
    if (isDefaultWeekSelected) {
      return labelDay === 'every-day' ? 'Default Week' : `Default · ${formatEditingDay(labelDay, null)}`;
    }
    const weekStart = getWeekStartString(labelWeekOffset);
    return labelDay === 'every-day' ? formatWeekRange(weekStart) : formatEditingDay(labelDay, weekStart);
  }, [isDefaultWeekSelected, labelDay, labelWeekOffset]);

  const nfc = useNfc();

  const handleScanLookup = useCallback((query: string): boolean => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    const device = devices.find(d => d.id.toLowerCase() === q || d.name.toLowerCase() === q);
    if (device) {
      handleDeviceSelect(device, selectedDaypart);
      setSearchValue('');
      return true;
    }
    const byMrn = devices.find(d => d.pages.some(p => p.assignedItems.some(i => i.mrn.toLowerCase() === q)));
    if (byMrn) {
      handleDeviceSelect(byMrn, selectedDaypart);
      setSearchValue('');
      return true;
    }
    return false;
  }, [devices, selectedDaypart, handleDeviceSelect]);

  useEffect(() => {
    if (nfc.lastReading) {
      const found = handleScanLookup(nfc.lastReading.text);
      if (found) {
        nfc.stopScan();
      }
      nfc.clearReading();
    }
  }, [nfc.lastReading, handleScanLookup, nfc]);

  useEffect(() => {
    if (nfc.scanning && devices.length > 0) {
      const hasRealNfc = typeof window !== 'undefined' && 'NDEFReader' in window;
      if (!hasRealNfc) {
        const demoTimer = setTimeout(() => {
          const demoDevice = devices[0];
          nfc.simulateReading(demoDevice.id);
        }, 3500);
        return () => clearTimeout(demoTimer);
      }
    }
  }, [nfc.scanning, devices, nfc]);

  const handleFiltersChange = useCallback((filters: FilterConfig[]) => {
    setActiveFilters(filters);
  }, []);

  const switchQuickAction = useCallback((action: QuickActionType) => {
    setSelectedQuickAction(action);
    localStorage.setItem('selectedQuickAction', action);
    setSearchValue('');
    setActiveFilters([]);
    resetLabelSession();
  }, [resetLabelSession]);

  // Pending changes stay while you move around Smart Labels; leaving asks first
  const handleQuickActionSelect = useCallback((action: QuickActionType) => {
    if (action !== selectedQuickAction && hasPendingChanges()) {
      setLeaveTarget(action);
      return;
    }
    switchQuickAction(action);
  }, [selectedQuickAction, switchQuickAction]);

  // Product refresh from Webtrition (simulated). Applied to the in-memory list;
  // added/changed products are tagged in the list until the next refresh.
  const [refreshTags, setRefreshTags] = useState<Map<number, 'new' | 'updated'>>(new Map());
  const productRefresh = useProductRefresh(menuItems, (items, report) => {
    setMenuItems(items);
    setRefreshTags(new Map([
      ...report.added.map(i => [i.id, 'new'] as const),
      ...report.changed.map(c => [c.item.id, 'updated'] as const),
    ]));
  });

  const handleShowRefreshedProduct = useCallback((item: MenuItem) => {
    productRefresh.closeSheet();
    handleQuickActionSelect('products');
    setSearchValue(item.name);
  }, [productRefresh.closeSheet, handleQuickActionSelect]);

  const handlePlaceRefreshedProduct = useCallback((item: MenuItem) => {
    productRefresh.closeSheet();
    setSelectedItem(item);
    setShowLabelPicker(true);
  }, [productRefresh.closeSheet]);

  const handleLabelPickedForItem = useCallback((device: Device, daypart: string) => {
    setShowLabelPicker(false);
    setDeviceItemSearch(selectedItem?.name ?? '');
    setSelectedDevice(device);
    setWorkflowDaypart(daypart);
    // Same context as opening a label from Smart Labels
    setDeviceWeekContext({ isDefault: false, weekStart: getWeekStartString(0), label: 'This Week' });
    setLabelFromPicker(true);
    setShowDeviceWorkflow(true);
  }, [selectedItem]);

  const handleCustomize = useCallback(() => {
    setShowCustomizeModal(true);
  }, []);

  const handleSaveQuickActionConfigs = useCallback((configs: QuickActionConfig[]) => {
    setQuickActionConfigs(configs);
    const toSave = configs.map(c => ({ id: c.id, visible: c.visible, order: c.order }));
    localStorage.setItem('quickActionConfigs', JSON.stringify(toSave));
  }, []);

  return (
    <div className={theme}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <Navigation
          notifications={notifications}
          setNotifications={setNotifications}
          onCreateItem={() => setShowCreateItemModal(true)}
          theme={theme}
          setTheme={setTheme}
          onMenuClick={() => setIsSidebarOpen(true)}
          selectedPage={selectedPage}
          selectedChannel={selectedChannel}
          concepts={concepts}
          companies={companies}
          stores={stores}
          selectedConcept={selectedConcept}
          selectedCompany={selectedCompany}
          selectedStore={selectedStore}
          expandedConcept={expandedConcept}
          expandedCompany={expandedCompany}
          onExpandConcept={setExpandedConcept}
          onExpandCompany={setExpandedCompany}
          isMultiDomainUser={isMultiDomainUser}
          selectedSecondaryDomain={selectedSecondaryDomain}
          onToggleMultiDomain={setIsMultiDomainUser}
          onSelectSecondaryDomain={setSelectedSecondaryDomainId}
          demoSecondaryDomains={demoSecondaryDomains}
          onResetLocation={() => {
            setSelectedConcept(null);
            setSelectedCompany(null);
            setSelectedStore(null);
            setExpandedConcept(null);
            setExpandedCompany(null);
            setLocationChangeInfo({ label: 'WAND', path: [] });
            setLocationChangeTrigger(t => t + 1);
          }}
          loadingLocations={loadingLocations}
          onSelectConcept={(id) => {
            setSelectedConcept(id);
            setSelectedCompany(null);
            setSelectedStore(null);
            setExpandedConcept(id);
            setExpandedCompany(null);
            const c = concepts.find(c => c.id === id);
            setLocationChangeInfo({ label: c?.name || 'Concept', path: [] });
            setLocationChangeTrigger(t => t + 1);
          }}
          onSelectCompany={(id) => {
            setSelectedCompany(id);
            setSelectedStore(null);
            setExpandedCompany(id);
            const co = companies.find(c => c.id === id);
            const cName = concepts.find(c => c.id === selectedConcept)?.name || '';
            setLocationChangeInfo({ label: cName, path: [co?.name || 'Company'] });
            setLocationChangeTrigger(t => t + 1);
          }}
          onSelectStore={(id) => {
            setSelectedStore(id);
            const s = stores.find(s => s.id === id);
            const cName = concepts.find(c => c.id === selectedConcept)?.name || '';
            setLocationChangeInfo({ label: cName, path: [s?.name || 'Store'] });
            setLocationChangeTrigger(t => t + 1);
          }}
          onSelectOtherStore={(storeId) => {
            const s = stores.find(s => s.id === storeId);
            const co = companies.find(c => c.id === s?.companyId);
            const con = concepts.find(c => c.id === co?.conceptId);
            setSelectedConcept(con?.id || null);
            setSelectedCompany(co?.id || null);
            setSelectedStore(storeId);
            setExpandedConcept(con?.id || null);
            setExpandedCompany(co?.id || null);
            setLocationChangeInfo({ label: con?.name || 'Concept', path: [s?.name || 'Store'] });
            setLocationChangeTrigger(t => t + 1);
          }}
          onSelectOtherConcept={(conceptId) => {
            if (selectedSecondaryDomain && conceptId === selectedSecondaryDomain.concept.id) {
              setSelectedConcept(conceptId);
              setSelectedCompany(null);
              setSelectedStore(null);
              setExpandedConcept(conceptId);
              setExpandedCompany(null);
              setLocationChangeInfo({ label: selectedSecondaryDomain.concept.name, path: [] });
              setLocationChangeTrigger(t => t + 1);
            }
          }}
          onSelectOtherCompany={(companyId) => {
            if (selectedSecondaryDomain) {
              const co = selectedSecondaryDomain.companies.find(c => c.id === companyId);
              if (co) {
                setSelectedConcept(selectedSecondaryDomain.concept.id);
                setSelectedCompany(companyId);
                setSelectedStore(null);
                setExpandedConcept(selectedSecondaryDomain.concept.id);
                setExpandedCompany(companyId);
                setLocationChangeInfo({ label: selectedSecondaryDomain.concept.name, path: [co.name] });
                setLocationChangeTrigger(t => t + 1);
              }
            }
          }}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenGroups={() => handleQuickActionSelect('groups')}
          quickActionConfigs={quickActionConfigs}
          selectedQuickAction={selectedQuickAction}
          onActionSelect={handleQuickActionSelect}
        />

        <div className="w-full mx-auto">
          <main className="pt-16">
            <QuickActionBar
              selectedAction={selectedQuickAction}
              onActionSelect={handleQuickActionSelect}
              devices={devices}
              menuItems={menuItems}
              onCustomize={handleCustomize}
              actionConfigs={quickActionConfigs}
            />

            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {selectedQuickAction === 'smart-labels' ? 'Smart Labels' :
                     selectedQuickAction === 'products' ? 'Products' :
                     selectedQuickAction === 'groups' ? 'Groups' :
                     selectedQuickAction === 'signage' ? 'Signage' :
                     selectedQuickAction === 'webview' ? 'Webview Kiosks' :
                     selectedQuickAction === 'activity' ? 'Activity' : 'Displays'}
                  </h2>
                  {selectedQuickAction === 'products' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg shadow-sm border-brand">
                      <Database className="h-4 w-4 text-brand" />
                      <span className="text-sm font-medium text-brand">Webtrition</span>
                      <RefreshAge refresh={productRefresh} />
                    </div>
                  )}
                </div>

                {selectedQuickAction === 'products' && (
                  <div className="flex items-center gap-2">
                    <ProductRefreshButton refresh={productRefresh} />
                    <button
                      onClick={() => setShowCreateItemModal(true)}
                      className="flex items-center gap-2 h-11 px-4 text-sm font-medium text-white rounded-lg hover:bg-brand-dark transition-colors bg-brand"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Product</span>
                    </button>
                  </div>
                )}
              </div>

              {selectedQuickAction !== 'groups' && (
              <MenuFilters
                viewMode={selectedQuickAction === 'smart-labels' ? labelViewMode : viewMode}
                setViewMode={selectedQuickAction === 'smart-labels'
                  ? (m) => setLabelViewMode(m === 'grid' ? 'grid' : 'list')
                  : setViewMode}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
                selectedQuickAction={selectedQuickAction}
                activeFilters={activeFilters}
                onToggleFilterSidebar={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
                isFilterSidebarOpen={isFilterSidebarOpen}
                menuItems={menuItems}
                onScanLookup={selectedQuickAction === 'smart-labels' ? handleScanLookup : undefined}
                nfcSupported={selectedQuickAction === 'smart-labels'}
                nfcScanning={nfc.scanning}
                onNfcStart={nfc.startScan}
                onNfcStop={nfc.stopScan}
                selectedCycleWeek={selectedCycleWeek}
                onCycleWeekChange={handleCycleWeekChange}
                scheduleOpen={scheduleOpen}
                onToggleSchedule={handleToggleSchedule}
                scheduleGapCount={weekGapCount}
                scheduleContextLabel={scheduleContextLabel}
                scheduleDaypart={selectedDaypart}
              />
              )}

              <div className="flex gap-6 min-h-[calc(100vh-280px)]">
                {selectedQuickAction === 'products' && (
                  <FilterSidebar
                    isOpen={isFilterSidebarOpen}
                    onClose={() => setIsFilterSidebarOpen(false)}
                    activeFilters={activeFilters}
                    onFiltersChange={handleFiltersChange}
                    menuItems={menuItems}
                    filteredCount={filteredItemCount}
                    totalCount={menuItems.length}
                  />
                )}

                {selectedQuickAction === 'smart-labels' && (
                  <SmartLabelFilters
                    isOpen={isFilterSidebarOpen}
                    onClose={() => setIsFilterSidebarOpen(false)}
                    activeFilters={activeFilters}
                    onFiltersChange={handleFiltersChange}
                    placements={placements}
                  />
                )}

                <div className="flex-1 min-w-0">
                  {selectedQuickAction === 'smart-labels' ? (
                    <div className="space-y-4">
                      {!scheduleOpen && (
                        <DaypartSelector
                          devices={devices}
                          selectedDaypart={selectedDaypart}
                          onSelectDaypart={setSelectedDaypart}
                        />
                      )}
                      {scheduleOpen && (
                        <WeekScheduleBar
                          selectedWeekOffset={labelWeekOffset}
                          isDefaultSelected={isDefaultWeekSelected}
                          onSelectWeek={handleLabelWeekChange}
                          onSelectDefault={handleSelectDefaultWeek}
                          overrideWeekStarts={overrideWeekStartSet}
                          recurringSchedules={recurringSchedules}
                          clipboardActive={weekClipboard !== null}
                          onCopy={handleCopyWeek}
                          onPaste={handlePasteWeek}
                          onSetRecurring={handleSetRecurring}
                          onClearRecurring={handleClearRecurring}
                          onEmpty={handleEmptyWeek}
                          onResetToDefault={handleResetToDefault}
                          onClose={closeSchedule}
                          loadingSchedules={loadingSchedules}
                          differingLabelCount={differingLabelCount}
                          totalLabelCount={devices.length}
                          selectedDay={labelDay}
                          onSelectDay={setLabelDay}
                          selectedDaypart={selectedDaypart}
                          onSelectDaypart={setSelectedDaypart}
                          dayparts={labelDayparts}
                          gapsByDay={gapsByDay}
                          reviewedCount={reviewedShownCount}
                          shownLabelCount={visibleLabels.length}
                        />
                      )}
                      {labelViewMode === 'list' ? (
                        <SmartLabelList
                          loading={loadingDevices}
                          error={deviceError}
                          devices={devices}
                          onDeviceSelect={(device, daypart) => handleDeviceSelect(device, daypart)}
                          searchValue={searchValue}
                          placements={placements}
                          selectedDaypart={selectedDaypart}
                          selectedPlacements={selectedPlacementIds}
                          selectedWeekStart={isDefaultWeekSelected ? null : getWeekStartString(labelWeekOffset)}
                          weekSchedules={effectiveSchedules}
                          defaultSchedules={scheduleOpen && !isDefaultWeekSelected ? defaultSchedules : undefined}
                          selectedDay={scheduleOpen ? labelDay : undefined}
                          reviewedIds={reviewedLabelIds}
                          lastOpenedId={lastOpenedLabelId}
                        />
                      ) : (
                        <SmartLabelGrid
                          loading={loadingDevices}
                          error={deviceError}
                          devices={devices}
                          onDeviceSelect={(device, daypart) => handleDeviceSelect(device, daypart)}
                          searchValue={searchValue}
                          placements={placements}
                          selectedDaypart={selectedDaypart}
                          selectedPlacements={selectedPlacementIds}
                          weekSchedules={scheduleOpen ? effectiveSchedules : undefined}
                          reviewedIds={reviewedLabelIds}
                          lastOpenedId={lastOpenedLabelId}
                        />
                      )}
                    </div>
                  ) : selectedQuickAction === 'products' ? (
                    <div key={selectedCycleWeek} className={weekTransition === 'out' ? 'week-transition-out' : 'week-transition-in'}>
                      {weekLoadStatus === 'loading' && (
                        <div className="flex items-center gap-2 px-4 py-2 mb-3 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 rounded-lg text-sm">
                          <div className="h-4 w-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                          Loading week data...
                        </div>
                      )}
                      <MenuItems
                        loading={loading}
                        error={error}
                        menuItems={menuItems}
                        viewMode={viewMode}
                        selectedChannel={selectedChannel}
                        expandedItem={null}
                        toggleItemExpansion={() => {}}
                        isItemInChannel={(itemId, channelId) => api.isItemInChannel(itemId, channelId)}
                        toggleItemInChannel={(item, channelId) => {
                          if (api.isItemInChannel(item.id, channelId)) {
                            api.removeItemFromChannel(item.id, channelId);
                          } else {
                            api.assignItemToChannel(item.id, channelId);
                          }
                        }}
                        setSelectedItem={(item) => {
                          setSelectedItem(item);
                        }}
                        setShowDeviceModal={setShowLabelPicker}
                        setShowPageSelectionModal={() => {}}
                        setWorkflowType={() => {}}
                        devices={devices}
                        searchValue={searchValue}
                        activeFilters={activeFilters}
                        onFilteredCountChange={setFilteredItemCount}
                        refreshTags={refreshTags}
                        selectedCycleWeek={selectedCycleWeek}
                      />
                    </div>
                  ) : selectedQuickAction === 'groups' ? (
                    <GroupsPage devices={devices} />
                  ) : (
                    <div className="text-center py-20">
                      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-400 mb-2">
                        {selectedQuickAction.charAt(0).toUpperCase() + selectedQuickAction.slice(1).replace('-', ' ')}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-500">Coming soon</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>

        {showCreateItemModal && (
          <CreateItemModal
            show={showCreateItemModal}
            onClose={() => setShowCreateItemModal(false)}
            onSave={async (item) => { await createMenuItem(item); }}
          />
        )}

        {showSettings && (
          <SettingsPage
            onClose={() => setShowSettings(false)}
            theme={theme}
            setTheme={setTheme}
            integrationSettings={{
              type: 'webtrition',
              businessUnit: '',
              location: '',
              enabled: false,
              customAttributeDefinitions: [],
              supportedLanguages: []
            }}
            setIntegrationSettings={() => {}}
            onOpenRules={() => setShowCreateRuleModal(true)}
            devices={devices}
          />
        )}

        {showCreateRuleModal && (
          <CreateRuleModal
            show={showCreateRuleModal}
            onClose={() => {
              setShowCreateRuleModal(false);
              setSelectedRule(null);
            }}
            onSave={handleCreateRule}
            selectedRule={selectedRule}
            integrationSettings={{
              type: 'webtrition',
              businessUnit: '',
              location: '',
              enabled: false,
              customAttributeDefinitions: [],
              supportedLanguages: []
            }}
          />
        )}

        <ProductRefreshSheet
          refresh={productRefresh}
          devices={devices}
          onShowProduct={handleShowRefreshedProduct}
          onPlaceOnLabel={handlePlaceRefreshedProduct}
        />

        <CustomizeQuickActionsModal
          isOpen={showCustomizeModal}
          onClose={() => setShowCustomizeModal(false)}
          actions={quickActionConfigs}
          onSave={handleSaveQuickActionConfigs}
        />

        {showDeviceWorkflow && selectedDevice && (
          <div className="fixed inset-x-0 top-16 bottom-0 z-40">
          <DeviceFirstWorkflow
            devices={devices}
            menuItems={menuItems}
            preSelectedDevice={projectedWorkflowDevice ?? selectedDevice}
            preSelectedDaypart={workflowDaypart}
            initialItemSearch={deviceItemSearch}
            weekStart={deviceWeekContext?.weekStart ?? null}
            weekContextLabel={deviceWeekContext?.label}
            weekContextNote={weekContextNote}
            initialDay={selectedQuickAction === 'smart-labels' ? labelDay : undefined}
            onDayChange={selectedQuickAction === 'smart-labels' ? setLabelDay : undefined}
            onDaypartChange={d => {
              setWorkflowDaypart(d);
              if (d && selectedQuickAction === 'smart-labels') setSelectedDaypart(d);
            }}
            labelNav={labelNav}
            animateIn={!steppingLabels}
            draftKey={`${selectedDevice.id}|${draftContext}`}
            onLocalChange={queueLocalChange}
            dayOverridesLocked={deviceWeekContext?.isDefault
              ? 'The Default Week follows each product’s days. Change days on the Products page, or pick a week to turn days on or off.'
              : undefined}
            onAddItems={queueAddItems}
            onRemoveItem={queueRemoveItem}
            onReorderItems={queueReorder}
            onClose={() => {
              setShowDeviceWorkflow(false);
              setDeviceItemSearch('');
              setSelectedDevice(null);
              setSteppingLabels(false);
              if (labelFromPicker) {
                setLabelFromPicker(false);
                setShowLabelPicker(true);
                return;
              }
              // Bring the last label you were on back into view
              const lastId = lastOpenedLabelId;
              if (lastId) {
                requestAnimationFrame(() => {
                  document.querySelector(`[data-label-id="${CSS.escape(lastId)}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
              }
            }}
            onForcePage={async (deviceId, pageId) => {
              await api.updateDeviceStatus(deviceId, { forcedPage: pageId });
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
            }}
            setNotifications={setNotifications}
            onCreateMenuItem={async (data) => {
              try {
                return await createMenuItem(data);
              } catch (err) {
                console.error('Error creating menu item from device page:', err);
                return null;
              }
            }}
          />
          </div>
        )}

        <LabelPickerSheet
          item={showLabelPicker ? selectedItem : null}
          devices={devices}
          placements={placements}
          loading={loadingDevices}
          error={deviceError}
          initialDaypart={selectedDaypart}
          onPick={handleLabelPickedForItem}
          onClose={() => setShowLabelPicker(false)}
        />

        <PendingChangesBar openDeviceId={showDeviceWorkflow ? selectedDevice?.id : undefined} />
        <PendingChangesSheet
          devices={devices}
          leaving={leaveTarget && {
            onStay: () => setLeaveTarget(null),
            onLeave: () => {
              const target = leaveTarget;
              setLeaveTarget(null);
              setShowDeviceWorkflow(false);
              setSelectedDevice(null);
              setLabelFromPicker(false);
              switchQuickAction(target);
            },
          }}
        />
      </div>
      <LocationChangeOverlay
        locationLabel={locationChangeInfo.label}
        locationPath={locationChangeInfo.path}
        trigger={locationChangeTrigger}
      />
      <ScrollToTopButton />
    </div>
  );
}

export default App