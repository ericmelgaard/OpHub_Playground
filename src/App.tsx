import { useState, useCallback, useEffect, useMemo } from 'react';
import { Tag, Tv, Database, Package, Layers, Globe, Activity, Plus } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { MenuFilters } from './components/MenuFilters';
import { ensureCurrentAndNextWeek } from './services/menuDataLoader';
import { ProductWeekPicker, ProductWeek } from './components/ProductWeekPicker';
import { MenuItems } from './components/MenuItems';
import { SmartLabelGrid } from './components/SmartLabelGrid';
import { SmartLabelList } from './components/SmartLabelList';
import { WeekScheduleBar, DayPicker, DaypartPicker, getWeekStartString } from './components/WeekScheduleBar';
import { resolveWeekSchedules, getScheduleSource, ScheduleSource, formatWeekRange, formatEditingDay, labelUseByMrn, getWeekState } from './lib/weekSchedule';

// Products offers this week and next week (both loaded from the source at startup)
const PRODUCT_WEEKS = 2;
import { filterLabels } from './lib/labelFilter';
import { projectScheduleOntoDevice, scheduleDayToggles } from './lib/deviceWeekProjection';
import { getWeekCoverage, countLabelsDifferingFromDefault } from './lib/scheduleCoverage';
import { initLabelSync } from './lib/labelSync';
import { useProductRefresh, ProductRefreshButton, ProductRefreshSheet, RefreshAge } from './components/ProductRefresh';
import { orderedDayparts } from './components/DaypartSelector';
import { SmartLabelFilters } from './components/SmartLabelFilters';
import { Sidebar } from './components/Sidebar';
import { FilterSidebar } from './components/FilterSidebar';
import { DeviceFirstWorkflow, LabelNav, LocalChange } from './workflows/DeviceFirstWorkflow';
import { addPendingChange, getDraft, hasPendingChanges, setAfterApply, usePendingSummary, PendingChange } from './lib/pendingChanges';
import { isOfferedOnDay, isCustomItem, WEEK_DAYS, type ItemDayOverrides } from './lib/labelDisplay';
import { valuesOf, localDiff } from './lib/productValues';
import { PendingChangesBar, PendingChangesSheet } from './components/PendingChanges';
import { LabelPickerSheet } from './components/LabelPickerSheet';
import { ProductSheet } from './components/ProductSheet';
import type { ProductScheduleRow } from './components/ProductEditPage';
import { sourceSystem } from './lib/sources';
import { QuickActionBar, QuickActionType, QuickActionConfig } from './components/QuickActionBar';
import { CustomizeQuickActionsModal } from './components/CustomizeQuickActionsModal';
import { GroupsPage } from './components/GroupsPage';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { LocationChangeOverlay } from './components/LocationChangeOverlay';
import { Theme, MenuItem, Device, FilterConfig, DeviceWeekSchedule, ProductValues } from './types';
import { api, type ProductInput } from './services/api';
import { demoSecondaryDomains } from './services/mockData';
import { useNfc } from './hooks/useNfc';
import { deviceName, matchesDevice } from './lib/deviceName';
import { DEFAULT_SITE_SETTINGS, SITE_ID, SiteSettings, SiteSettingsContext } from './lib/siteSettings';
import { SiteSettingsPage } from './components/SiteSettingsPage';

// Each label item replaced by the current product with the same id (or MRN), when there is one
function withCurrentProducts(devices: Device[], menuItems: MenuItem[]): Device[] {
  if (menuItems.length === 0) return devices;
  const byId = new Map(menuItems.map(i => [i.id, i]));
  const byMrn = new Map(menuItems.map(i => [i.mrn, i]));
  const current = (item: MenuItem) => byId.get(item.id) ?? byMrn.get(item.mrn) ?? item;
  return devices.map(device => ({
    ...device,
    assignedItems: device.assignedItems.map(current),
    pages: device.pages.map(page => ({ ...page, assignedItems: page.assignedItems.map(current) })),
  }));
}

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
  // Site settings (side panel → Site settings)
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  useEffect(() => {
    api.getSiteSettings(SITE_ID).then(setSiteSettings);
  }, []);


  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchValue, setSearchValue] = useState('');
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickActionType>(() => {
    const saved = localStorage.getItem('selectedQuickAction');
    return (saved as QuickActionType) || 'products';
  });

  // Filter state
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

  // Products shows this week (0). It can also show a future week that already has a
  // schedule (its own or recurring); new weeks are planned only in Smart Labels → Schedule.
  const [selectedCycleWeek, setSelectedCycleWeek] = useState(0);

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

  // Device state. Labels keep a copy of each product from when it was added; `devices`
  // swaps in the current product so renames and display names show on every label.
  const [storedDevices, setDevices] = useState<Device[]>([]);
  const devices = useMemo(() => withCurrentProducts(storedDevices, menuItems), [storedDevices, menuItems]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [showDeviceWorkflow, setShowDeviceWorkflow] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedDaypart, setSelectedDaypart] = useState<string>('Breakfast');
  const [workflowDaypart, setWorkflowDaypart] = useState<string | null>(null);

  // Smart label view & week scheduling
  // Labels open as a list the first time; after that, whatever you last picked
  const [labelViewMode, setLabelViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem('labelViewMode') === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('labelViewMode', labelViewMode);
    } catch {
      // Storage blocked: it opens as a list next time
    }
  }, [labelViewMode]);
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

  // Day being edited. Shared by every label you open (from Smart Labels or Products) and kept
  // for the browser session, so Every day stays picked until you pick a day.
  const [labelDay, setLabelDayState] = useState<number | 'every-day'>(() => {
    try {
      const saved = sessionStorage.getItem('labelDay');
      if (saved === 'every-day') return 'every-day';
      if (saved !== null && /^[0-6]$/.test(saved)) return Number(saved);
    } catch { /* storage unavailable */ }
    return new Date().getDay();
  });
  const setLabelDay = useCallback((day: number | 'every-day') => {
    setLabelDayState(day);
    try { sessionStorage.setItem('labelDay', String(day)); } catch { /* storage unavailable */ }
  }, []);
  // Labels opened this session, keyed by what was being edited, plus the last one opened
  const [reviewedLabels, setReviewedLabels] = useState<Set<string>>(new Set());
  const [lastOpenedLabelId, setLastOpenedLabelId] = useState<string | null>(null);
  // The label last opened from Products' label picker (sky ring there, until you leave Products)
  const [lastPickedLabelId, setLastPickedLabelId] = useState<string | null>(null);
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
  // The product sheet's form for a new custom product
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  // Product-first placement: pick a label, then open its device page with the
  // product's name in the Available Items search (same pattern as "Show")
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [deviceItemSearch, setDeviceItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  // Closing a label opened from the picker goes back to the picker (wrong label → pick again)
  const [labelFromPicker, setLabelFromPicker] = useState(false);
  // Product details sheet, opened by clicking a product card or row
  const [productSheetItem, setProductSheetItem] = useState<MenuItem | null>(null);
  // The product you opened last keeps a sky ring in the list (like labels) until you leave Products
  const [lastOpenedProductMrn, setLastOpenedProductMrn] = useState<string | null>(null);
  useEffect(() => {
    if (productSheetItem) setLastOpenedProductMrn(productSheetItem.mrn);
  }, [productSheetItem]);

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
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationChangeTrigger, setLocationChangeTrigger] = useState(0);
  const [locationChangeInfo, setLocationChangeInfo] = useState<{ label: string; path: string[] }>({ label: 'WAND', path: [] });

  // Multi-domain users: off until it comes from the APIs (the demo toggle was in Manage Demo)
  const isMultiDomainUser = false;
  const selectedSecondaryDomain = demoSecondaryDomains[0] ?? null;

  // Load menu items + ensure current/next week data exists
  useEffect(() => {
    const loadMenuItems = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ensure current & next week data exist, then load
        await ensureCurrentAndNextWeek();
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

  // Products: which days each product is on labels, for the week picked in the Products week selector
  const [productWeekOverrides, setProductWeekOverrides] = useState<DeviceWeekSchedule[]>([]);
  // Bumped after label changes are applied, so Products reloads what's on labels
  const [labelsVersion, setLabelsVersion] = useState(0);
  useEffect(() => {
    if (selectedQuickAction !== 'products') return;
    refreshScheduleMeta().catch(() => {});
    api.getWeekSchedules(getWeekStartString(selectedCycleWeek))
      .then(setProductWeekOverrides)
      .catch(() => setProductWeekOverrides([]));
  }, [selectedQuickAction, selectedCycleWeek, refreshScheduleMeta, labelsVersion]);

  const deviceIds = useMemo(() => devices.map(d => d.id), [devices]);

  // A label's station is its placement (the same thing today), else its location text
  const stationOfDevice = useMemo(() => {
    const placementNames = new Map<string, string>();
    const walk = (nodes: any[]) => nodes.forEach(n => { placementNames.set(n.id, n.name); walk(n.children ?? []); });
    walk(placements);
    const byDevice = new Map(devices.map(d => [d.id, (d.placementId && placementNames.get(d.placementId)) || d.location || undefined]));
    return (deviceId: string) => byDevice.get(deviceId);
  }, [placements, devices]);

  // Days, dayparts and stations each product is on labels, for the Products week selector's week.
  // A day counts only when the label shows the item that day (its stored day settings applied).
  // The days a product shows on one label page (its stored day settings applied)
  const shownDaysOnPage = useMemo(() => {
    const byMrn = new Map(menuItems.map(i => [i.mrn, i]));
    return (schedule: DeviceWeekSchedule, daypart: string, mrn: string, rowDays: number[]) => {
      const product = byMrn.get(mrn);
      if (!product) return rowDays;
      // The daypart it follows on that page, when not the page's own
      const followsDaypart = schedule.items?.find(si => si.daypart === daypart && si.menuItemMrn === mrn && si.followsDaypart)?.followsDaypart;
      const item = followsDaypart ? { ...product, followsDaypart } : product;
      const overrides: ItemDayOverrides = {};
      for (const s of schedule.daySettings ?? []) {
        if (s.daypart === daypart && s.menuItemMrn === mrn) overrides[s.dayOfWeek] = s.state;
      }
      return WEEK_DAYS.filter(d => isOfferedOnDay(item, daypart, d, overrides));
    };
  }, [menuItems]);

  // Whether a scheduled item shows on that page and day: the label page's rule, used by gap
  // counts and the list's week strip so they agree with the label page
  const shownOnDay = useCallback(
    (schedule: DeviceWeekSchedule, daypart: string, mrn: string, day: number) =>
      shownDaysOnPage(schedule, daypart, mrn, [day]).includes(day),
    [shownDaysOnPage],
  );

  // Every label's schedule for the week Products shows (also the label picker's list view)
  const productWeekSchedules = useMemo(
    () => resolveWeekSchedules(getWeekStartString(selectedCycleWeek), productWeekOverrides, defaultSchedules, recurringSchedules, deviceIds),
    [selectedCycleWeek, productWeekOverrides, defaultSchedules, recurringSchedules, deviceIds],
  );
  const productLabelUse = useMemo(() => {
    return labelUseByMrn(
      productWeekSchedules,
      stationOfDevice,
      shownDaysOnPage,
    );
  }, [productWeekSchedules, stationOfDevice, shownDaysOnPage]);

  // Product edit page → Schedule: where one product is on labels in a week (null = the Default Week)
  const loadProductSchedule = useCallback(async (mrn: string, weekOffset: number | null): Promise<ProductScheduleRow[]> => {
    let schedules = defaultSchedules;
    if (weekOffset !== null) {
      const weekStart = getWeekStartString(weekOffset);
      const overrides = await api.getWeekSchedules(weekStart);
      schedules = resolveWeekSchedules(weekStart, overrides, defaultSchedules, recurringSchedules, deviceIds);
    }
    const names = new Map(devices.map(d => [d.id, deviceName(d)]));
    const rows: ProductScheduleRow[] = [];
    for (const s of schedules) {
      const byDaypart = new Map<string, number[]>();
      for (const i of s.items ?? []) {
        if (i.menuItemMrn === mrn) byDaypart.set(i.daypart, [...(byDaypart.get(i.daypart) ?? []), i.dayOfWeek]);
      }
      for (const [daypart, rowDays] of byDaypart) {
        rows.push({
          daypart,
          deviceId: s.deviceId,
          label: names.get(s.deviceId) ?? s.deviceId,
          station: stationOfDevice(s.deviceId),
          days: shownDaysOnPage(s, daypart, mrn, rowDays),
        });
      }
    }
    return rows;
  }, [defaultSchedules, recurringSchedules, deviceIds, devices, stationOfDevice, shownDaysOnPage]);
  const productLabelDays = useMemo(
    () => new Map([...productLabelUse].map(([mrn, use]) => [mrn, use.days])),
    [productLabelUse],
  );

  // The schedules actually shown for the current selection (override -> recurring -> default)
  const effectiveSchedules = useMemo(() => {
    if (isDefaultWeekSelected) return defaultSchedules;
    const weekStart = getWeekStartString(labelWeekOffset);
    return resolveWeekSchedules(weekStart, weekSchedules, defaultSchedules, recurringSchedules, deviceIds);
  }, [isDefaultWeekSelected, defaultSchedules, labelWeekOffset, weekSchedules, recurringSchedules, deviceIds]);

  const overrideWeekStartSet = useMemo(() => new Set(overrideWeekStarts), [overrideWeekStarts]);
  const productWeekStateOf = useCallback(
    (offset: number) => getWeekState(getWeekStartString(offset), overrideWeekStartSet, recurringSchedules),
    [overrideWeekStartSet, recurringSchedules],
  );

  // Weeks Products can show ("schedule lite"): this week and next week. A week that follows
  // the Default Week gets its own schedule on its first change, as on Smart Labels.
  // Later weeks are planned in Smart Labels → Schedule.
  const productWeeks = useMemo((): ProductWeek[] =>
    Array.from({ length: PRODUCT_WEEKS }, (_, offset) => {
      const weekStart = getWeekStartString(offset);
      return { offset, weekStart, state: getWeekState(weekStart, overrideWeekStartSet, recurringSchedules) };
    }),
  [overrideWeekStartSet, recurringSchedules]);

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
    () => getWeekCoverage(devices, effectiveSchedules, siteSettings.openDays, shownOnDay),
    [devices, effectiveSchedules, siteSettings.openDays, shownOnDay],
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

  // The schedule the open label shows for the week being edited (override -> recurring -> default)
  const workflowSchedule = useMemo((): DeviceWeekSchedule | undefined => {
    if (!selectedDevice || !deviceWeekContext) return undefined;
    if (deviceWeekContext.isDefault) return defaultSchedules.find(s => s.deviceId === selectedDevice.id);
    return resolveWeekSchedules(
      deviceWeekContext.weekStart as string,
      weekSchedules, defaultSchedules, recurringSchedules, [selectedDevice.id],
    )[0];
  }, [selectedDevice, deviceWeekContext, defaultSchedules, weekSchedules, recurringSchedules]);

  // Device opened for a week shows that week's resolved items
  const projectedWorkflowDevice = useMemo(() => {
    if (!selectedDevice) return null;
    if (!deviceWeekContext) return selectedDevice;
    return projectScheduleOntoDevice(selectedDevice, workflowSchedule, menuItems);
  }, [selectedDevice, deviceWeekContext, workflowSchedule, menuItems]);

  // Its stored day settings (Off / On per item and day); the Default Week's are each item's base
  const storedDayToggles = useMemo(
    () => (deviceWeekContext && projectedWorkflowDevice ? scheduleDayToggles(projectedWorkflowDevice, workflowSchedule) : undefined),
    [deviceWeekContext, projectedWorkflowDevice, workflowSchedule],
  );

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

  // A week without its own schedule gets a copy of what it shows before its first edit
  const prepareWeek = useCallback((target: { isDefault: boolean; weekStart: string | null }, deviceId: string) => {
    const shown = workflowSchedule;
    return target.isDefault || !target.weekStart
      ? Promise.resolve()
      : api.ensureWeekCopy(target.weekStart, deviceId, shown);
  }, [workflowSchedule]);

  const queueAddItems = useCallback((device: Device, items: MenuItem[], pageId: string) => {
    const target = deviceWeekContext && { isDefault: deviceWeekContext.isDefault, weekStart: deviceWeekContext.weekStart };
    const daypart = device.pages.find(p => p.id === pageId)?.daypart;
    const prepare = () => (target ? prepareWeek(target, device.id) : Promise.resolve());
    for (const item of items) {
      queueChange(device.id, {
        summary: `Added ${item.name}`,
        daypart,
        mergeKey: `item|${pageId}|${item.id}`,
        mode: 'toggle',
        commit: target
          ? async () => { if (daypart) { await prepare(); await api.addScheduleItems(target, device.id, daypart, [item]); } }
          : () => api.assignItemToPage(item.id, device.id, pageId),
      });
    }
  }, [deviceWeekContext, queueChange, prepareWeek]);

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
        ? async () => {
            if (!item?.mrn || !daypart) return;
            await prepareWeek(target, deviceId);
            await api.removeScheduleItem(target, deviceId, daypart, item.mrn);
          }
        : () => api.removeItemFromPage(itemId, deviceId, pageId),
    });
  }, [deviceWeekContext, menuItems, projectedWorkflowDevice, queueChange, prepareWeek]);

  const queueReorder = useCallback((deviceId: string, pageId: string, itemOrder: number[]) => {
    const target = deviceWeekContext && { isDefault: deviceWeekContext.isDefault, weekStart: deviceWeekContext.weekStart };
    const daypart = projectedWorkflowDevice?.pages.find(p => p.id === pageId)?.daypart;
    // The schedule stores order by MRN (sort_order on the page's daypart)
    const mrnById = new Map(menuItems.map(i => [i.id, i.mrn]));
    const mrns = itemOrder.map(id => mrnById.get(id)).filter((m): m is string => !!m);
    queueChange(deviceId, {
      summary: 'Changed item order',
      daypart,
      mergeKey: `order|${pageId}`,
      mode: 'replace',
      commit: target
        ? async () => {
            if (!daypart) return;
            await prepareWeek(target, deviceId);
            await api.reorderScheduleItems(target, deviceId, daypart, mrns);
          }
        : () => api.reorderPageItems(deviceId, pageId, itemOrder),
    });
  }, [deviceWeekContext, projectedWorkflowDevice, menuItems, queueChange, prepareWeek]);

  // An item's day settings on a page: written as its whole week when applied, from the
  // label's working copy at that moment
  const queueItemDays = useCallback((deviceId: string, pageId: string, itemId: number, change: LocalChange) => {
    const target = deviceWeekContext && { isDefault: deviceWeekContext.isDefault, weekStart: deviceWeekContext.weekStart };
    const mrn = menuItems.find(i => i.id === itemId)?.mrn;
    const daypart = projectedWorkflowDevice?.pages.find(p => p.id === pageId)?.daypart;
    const key = `${deviceId}|${draftContext}`;
    queueChange(deviceId, {
      ...change,
      commit: target && mrn && daypart
        ? async () => {
            const days = getDraft(key)?.toggles[pageId]?.[itemId] ?? {};
            await prepareWeek(target, deviceId);
            await api.setItemDaySettings(target, deviceId, daypart, mrn, days);
          }
        : async () => {},
    });
  }, [deviceWeekContext, menuItems, projectedWorkflowDevice, draftContext, queueChange, prepareWeek]);

  // Page-only edits aren't stored by the API; applying them just updates the label
  const queueLocalChange = useCallback((deviceId: string, change: LocalChange) => {
    queueChange(deviceId, { ...change, commit: async () => {} });
  }, [queueChange]);

  // Reload what applied changes wrote
  useEffect(() => {
    setAfterApply(async () => {
      setDevices(await api.getDevices());
      await refreshCurrentWeek();
      setLabelsVersion(v => v + 1);
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
    const device = devices.find(d => matchesDevice(d, q));
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

  // A tag scanned while choosing a label for a product picks that label (the picker
  // matches it, so the label opens on the picker's daypart)
  const [pickerScan, setPickerScan] = useState<string | null>(null);

  useEffect(() => {
    if (!nfc.lastReading) return;
    if (showLabelPicker) {
      setPickerScan(nfc.lastReading.text);
      nfc.stopScan();
      nfc.clearReading();
      return;
    }
    {
      const found = handleScanLookup(nfc.lastReading.text);
      if (found) {
        nfc.stopScan();
      }
      nfc.clearReading();
    }
  }, [nfc.lastReading, handleScanLookup, nfc, showLabelPicker]);

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
    setLastOpenedProductMrn(null);
    setLastPickedLabelId(null);
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

  // Labels opened from Products edit the week Products shows: this week, or a later week
  // that already has a schedule. Never the Default Week.
  const productWeekContext = useMemo(() => ({
    isDefault: false,
    weekStart: getWeekStartString(selectedCycleWeek),
    label: selectedCycleWeek === 0 ? 'This Week'
      : selectedCycleWeek === 1 ? 'Next Week'
      : `Week of ${new Date(getWeekStartString(selectedCycleWeek) + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
  }), [selectedCycleWeek]);

  const handleLabelPickedForItem = useCallback((device: Device, daypart: string) => {
    setShowLabelPicker(false);
    setDeviceItemSearch(selectedItem?.name ?? '');
    setSelectedDevice(device);
    setWorkflowDaypart(daypart);
    setDeviceWeekContext(productWeekContext);
    setLabelFromPicker(true);
    setLastPickedLabelId(device.id);
    setShowDeviceWorkflow(true);
  }, [selectedItem, productWeekContext]);

  // Weeks after next are planned in Schedule, opened on the week after next
  const handlePlanAnotherWeek = useCallback(() => {
    handleQuickActionSelect('smart-labels');
    setScheduleOpen(true);
    setLabelWeekOffset(2);
    setIsDefaultWeekSelected(false);
  }, [handleQuickActionSelect]);

  const handleAddFromProductSheet = useCallback((item: MenuItem) => {
    setProductSheetItem(null);
    setSelectedItem(item);
    setShowLabelPicker(true);
  }, []);

  // Create or edit a custom product, reload, and show the saved product in the sheet
  const handleSaveProduct = useCallback(async (input: ProductInput, item: MenuItem | null) => {
    let saved: MenuItem | null;
    if (item && !isCustomItem(item)) {
      // Linked to a source: save what differs from the source as local values
      const source = item.source ?? valuesOf(item);
      const next: ProductValues = {
        name: input.name.trim(),
        description: input.enticingDescription || input.description || null,
        price: input.price ?? source.price,
        calories: input.calories ?? source.calories,
        ingredients: input.ingredients ?? '',
        allergens: input.allergens ?? '',
        icons: input.icons ?? [],
        nutrition: input.nutrition ?? source.nutrition,
        dayparts: input.dayparts ?? [],
      };
      await api.setLocalValues(item.mrn, localDiff(source, next));
      if (input.displayName !== undefined) await api.setDisplayName(item.mrn, input.displayName);
      const updated = await api.getMenuItems();
      setMenuItems(updated);
      saved = updated.find(i => i.mrn === item.mrn) ?? null;
    } else if (item) {
      await api.updateCustomProduct(item.mrn, input);
      const updated = await api.getMenuItems();
      setMenuItems(updated);
      saved = updated.find(i => i.mrn === item.mrn) ?? null;
    } else {
      saved = await createMenuItem(input);
    }
    setCreatingProduct(false);
    setProductSheetItem(saved);
    return saved;
  }, [createMenuItem]);

  // Display name for any product (Webtrition ones only change it here)
  const handleSaveDisplayName = useCallback(async (item: MenuItem, displayName: string) => {
    await api.setDisplayName(item.mrn, displayName);
    const updated = await api.getMenuItems();
    setMenuItems(updated);
    setProductSheetItem(updated.find(i => i.mrn === item.mrn) ?? item);
  }, []);

  // Open a label the product is on, with the product searched in Available Items
  const handleOpenLabelFromProductSheet = useCallback((device: Device, daypart: string) => {
    const item = productSheetItem;
    setProductSheetItem(null);
    setDeviceItemSearch(item?.name.trim() ?? '');
    setSelectedDevice(device);
    setWorkflowDaypart(daypart);
    setDeviceWeekContext(productWeekContext);
    setLabelFromPicker(false);
    setShowDeviceWorkflow(true);
  }, [productSheetItem, productWeekContext]);

  const handleCustomize = useCallback(() => {
    setShowCustomizeModal(true);
  }, []);

  const handleSaveQuickActionConfigs = useCallback((configs: QuickActionConfig[]) => {
    setQuickActionConfigs(configs);
    const toSave = configs.map(c => ({ id: c.id, visible: c.visible, order: c.order }));
    localStorage.setItem('quickActionConfigs', JSON.stringify(toSave));
  }, []);

  return (
    <SiteSettingsContext.Provider value={siteSettings}>
    <div className={theme}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <Navigation
          notifications={notifications}
          setNotifications={setNotifications}
          theme={theme}
          setTheme={setTheme}
          onMenuClick={() => setIsSidebarOpen(true)}
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
          onOpenSettings={() => setShowSiteSettings(true)}
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
                      <span className="text-sm font-medium text-brand">{sourceSystem().name}</span>
                      <RefreshAge refresh={productRefresh} />
                    </div>
                  )}
                </div>

                {selectedQuickAction === 'products' && (
                  <div className="flex items-center gap-2">
                    <ProductRefreshButton refresh={productRefresh} />
                    <button
                      onClick={() => setCreatingProduct(true)}
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
                weekControl={
                  <ProductWeekPicker
                    weeks={productWeeks}
                    value={selectedCycleWeek}
                    onChange={setSelectedCycleWeek}
                    onPlanAnother={handlePlanAnotherWeek}
                  />
                }
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
                    labelDaysByMrn={productLabelDays}
                    usageWeekLabel={formatWeekRange(getWeekStartString(selectedCycleWeek))}
                    weekOffset={selectedCycleWeek}
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
                      {/* Same day + daypart pickers as the schedule bar, for this week */}
                      {!scheduleOpen && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <DayPicker
                            value={labelDay}
                            onChange={setLabelDay}
                            weekStart={getWeekStartString(0)}
                            gapsByDay={gapsByDay}
                          />
                          <DaypartPicker
                            value={selectedDaypart}
                            onChange={setSelectedDaypart}
                            dayparts={labelDayparts}
                          />
                          {visibleLabels.length > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{reviewedShownCount}</span> of {visibleLabels.length} reviewed
                            </span>
                          )}
                        </div>
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
                          selectedDaypart={selectedDaypart}
                          selectedPlacements={selectedPlacementIds}
                          selectedWeekStart={isDefaultWeekSelected ? null : getWeekStartString(labelWeekOffset)}
                          weekSchedules={effectiveSchedules}
                          defaultSchedules={scheduleOpen && !isDefaultWeekSelected ? defaultSchedules : undefined}
                          selectedDay={labelDay}
                          reviewedIds={reviewedLabelIds}
                          lastOpenedId={lastOpenedLabelId}
                          shownOnDay={shownOnDay}
                        />
                      ) : (
                        <SmartLabelGrid
                          loading={loadingDevices}
                          error={deviceError}
                          devices={devices}
                          onDeviceSelect={(device, daypart) => handleDeviceSelect(device, daypart)}
                          searchValue={searchValue}
                          selectedDaypart={selectedDaypart}
                          selectedPlacements={selectedPlacementIds}
                          weekSchedules={scheduleOpen ? effectiveSchedules : undefined}
                          reviewedIds={reviewedLabelIds}
                          lastOpenedId={lastOpenedLabelId}
                          shownOnDay={shownOnDay}
                        />
                      )}
                    </div>
                  ) : selectedQuickAction === 'products' ? (
                    <div>
                      <MenuItems
                        loading={loading}
                        error={error}
                        menuItems={menuItems}
                        viewMode={viewMode}
                        setSelectedItem={(item) => {
                          setSelectedItem(item);
                        }}
                        setShowDeviceModal={setShowLabelPicker}
                        setWorkflowType={() => {}}
                        devices={devices}
                        searchValue={searchValue}
                        activeFilters={activeFilters}
                        onFilteredCountChange={setFilteredItemCount}
                        refreshTags={refreshTags}
                        onOpen={setProductSheetItem}
                        lastOpenedMrn={lastOpenedProductMrn}
                        labelDaysByMrn={productLabelDays}
                        labelUseByMrn={productLabelUse}
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


        {showSiteSettings && (
          <SiteSettingsPage
            settings={siteSettings}
            onSave={async (next) => {
              await api.saveSiteSettings(SITE_ID, next);
              setSiteSettings(next);
            }}
            onClose={() => setShowSiteSettings(false)}
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
            initialDay={labelDay}
            onDayChange={setLabelDay}
            onDaypartChange={d => {
              setWorkflowDaypart(d);
              if (d && selectedQuickAction === 'smart-labels') setSelectedDaypart(d);
            }}
            labelNav={labelNav}
            animateIn={!steppingLabels}
            draftKey={`${selectedDevice.id}|${draftContext}`}
            onLocalChange={queueLocalChange}
            onItemDaysChange={queueItemDays}
            storedToggles={storedDayToggles}
            onAddItems={queueAddItems}
            onRemoveItem={queueRemoveItem}
            onReorderItems={queueReorder}
            onClose={() => {
              setShowDeviceWorkflow(false);
              setDeviceItemSearch('');
              setSelectedDevice(null);
              setSteppingLabels(false);
              // Back to the picker or the grid, with the label you were on brought into view
              const lastId = labelFromPicker ? lastPickedLabelId : lastOpenedLabelId;
              if (labelFromPicker) {
                setLabelFromPicker(false);
                setShowLabelPicker(true);
              }
              if (lastId) {
                requestAnimationFrame(() => {
                  document.querySelector(`[data-label-id="${CSS.escape(lastId)}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
              }
            }}
            onRenameDevice={async (deviceId, name) => {
              await api.setDeviceName(deviceId, name);
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
              setSelectedDevice(prev => (prev && prev.id === deviceId ? updatedDevices.find(d => d.id === deviceId) ?? prev : prev));
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

        <ProductSheet
          item={productSheetItem}
          creating={creatingProduct}
          weekOffset={selectedCycleWeek}
          labelDays={productSheetItem ? productLabelDays.get(productSheetItem.mrn) : undefined}
          labelUse={productSheetItem ? productLabelUse.get(productSheetItem.mrn) : undefined}
          devices={devices}
          menuItems={menuItems}
          onClose={() => { setProductSheetItem(null); setCreatingProduct(false); }}
          onSave={handleSaveProduct}
          onSaveDisplayName={handleSaveDisplayName}
          onAddToLabel={handleAddFromProductSheet}
          onOpenLabel={handleOpenLabelFromProductSheet}
          weekStateOf={productWeekStateOf}
          loadSchedule={loadProductSchedule}
        />

        <LabelPickerSheet
          item={showLabelPicker ? selectedItem : null}
          devices={devices}
          placements={placements}
          loading={loadingDevices}
          error={deviceError}
          initialDaypart={selectedDaypart}
          weekStart={productWeekContext.weekStart}
          weekLabel={productWeekContext.label}
          day={labelDay}
          onDayChange={setLabelDay}
          onPick={handleLabelPickedForItem}
          onClose={() => { nfc.stopScan(); setPickerScan(null); setShowLabelPicker(false); }}
          nfcScanning={nfc.scanning}
          onNfcStart={nfc.startScan}
          onNfcStop={nfc.stopScan}
          scannedTag={pickerScan}
          onScanHandled={() => setPickerScan(null)}
          weekSchedules={productWeekSchedules}
          viewMode={labelViewMode}
          lastOpenedId={lastPickedLabelId}
          shownOnDay={shownOnDay}
          onViewModeChange={setLabelViewMode}
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
    </SiteSettingsContext.Provider>
  );
}

export default App
