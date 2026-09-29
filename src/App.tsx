import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tag, Tv, Receipt, Database, Package, Layers, Globe, Activity, Building2, Building, Store as StoreIcon, Plus } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { MenuFilters } from './components/MenuFilters';
import { ensureWeekData, ensureCurrentAndNextWeek, WeekLoadStatus } from './services/menuDataLoader';
import { MenuItems } from './components/MenuItems';
import { DeviceGrid } from './components/DeviceGrid';
import { SmartLabelGrid } from './components/SmartLabelGrid';
import { SmartLabelList } from './components/SmartLabelList';
import { WeekScheduleBar, WeekActions, getWeekStartString } from './components/WeekScheduleBar';
import { DaypartSelector } from './components/DaypartSelector';
import { SmartLabelFilters } from './components/SmartLabelFilters';
import { Sidebar } from './components/Sidebar';
import { FilterSidebar } from './components/FilterSidebar';
import { CreateItemModal } from './components/CreateItemModal';
import { CreateRuleModal } from './components/CreateRuleModal';
import { DeviceFirstWorkflow } from './workflows/DeviceFirstWorkflow';
import { ItemFirstWorkflow } from './workflows/ItemFirstWorkflow';
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
  const [weekSchedules, setWeekSchedules] = useState<DeviceWeekSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

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
  const [showItemWorkflow, setShowItemWorkflow] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [workflowType, setWorkflowType] = useState<'manage' | 'assign' | null>(null);

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

  // Load week schedules when label week offset changes
  useEffect(() => {
    if (selectedQuickAction !== 'smart-labels') return;
    const weekStart = getWeekStartString(labelWeekOffset);
    setLoadingSchedules(true);
    api.getWeekSchedules(weekStart)
      .then(setWeekSchedules)
      .catch(() => setWeekSchedules([]))
      .finally(() => setLoadingSchedules(false));
  }, [labelWeekOffset, selectedQuickAction]);

  const handleLabelWeekChange = useCallback((offset: number) => {
    setLabelWeekOffset(offset);
    if (offset > 0) setLabelViewMode('list');
  }, []);

  const handleCopyWeek = useCallback(async () => {
    if (labelWeekOffset === 0) return;
    const currentWeekStart = getWeekStartString(0);
    const targetWeekStart = getWeekStartString(labelWeekOffset);
    await api.copyWeekSchedule(currentWeekStart, targetWeekStart);
    const updated = await api.getWeekSchedules(targetWeekStart);
    setWeekSchedules(updated);
  }, [labelWeekOffset]);

  const handleClearWeek = useCallback(async () => {
    const weekStart = getWeekStartString(labelWeekOffset);
    await api.clearWeekSchedule(weekStart);
    setWeekSchedules([]);
  }, [labelWeekOffset]);

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

  const handleDeviceSelect = useCallback((device: Device, daypart?: string) => {
    setSelectedDevice(device);
    setWorkflowDaypart(daypart || selectedDaypart);
    setShowDeviceWorkflow(true);
  }, [selectedDaypart]);

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

  const handleQuickActionSelect = useCallback((action: QuickActionType) => {
    setSelectedQuickAction(action);
    localStorage.setItem('selectedQuickAction', action);
    setSearchValue('');
    setActiveFilters([]);
  }, []);

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
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg shadow-sm" style={{ borderColor: 'rgb(0, 173, 240)' }}>
                      <Database className="h-4 w-4" style={{ color: 'rgb(0, 173, 240)' }} />
                      <span className="text-sm font-medium" style={{ color: 'rgb(0, 173, 240)' }}>Webtrition</span>
                    </div>
                  )}
                </div>

                {selectedQuickAction === 'products' && (
                  <button
                    onClick={() => setShowCreateItemModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-[rgb(0,153,220)] transition-colors"
                    style={{ backgroundColor: 'rgb(0, 173, 240)' }}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Product</span>
                  </button>
                )}
              </div>

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
              />

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
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex-shrink-0">
                          <DaypartSelector
                            devices={devices}
                            selectedDaypart={selectedDaypart}
                            onSelectDaypart={setSelectedDaypart}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <WeekScheduleBar
                            selectedWeekOffset={labelWeekOffset}
                            onSelectWeek={handleLabelWeekChange}
                          />
                        </div>
                      </div>
                      {labelWeekOffset > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Scheduling for week of {getWeekStartString(labelWeekOffset)}
                            </span>
                            {loadingSchedules && (
                              <div className="h-4 w-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                          <WeekActions
                            selectedWeekOffset={labelWeekOffset}
                            onCopyWeek={handleCopyWeek}
                            onSetRecurring={() => {}}
                            onClearWeek={handleClearWeek}
                            hasSchedule={weekSchedules.length > 0}
                          />
                        </div>
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
                          selectedPlacements={activeFilters.find(f => f.type === 'placement')?.selectedValues ?? []}
                          selectedWeekStart={labelWeekOffset > 0 ? getWeekStartString(labelWeekOffset) : null}
                          weekSchedules={weekSchedules}
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
                          selectedPlacements={activeFilters.find(f => f.type === 'placement')?.selectedValues ?? []}
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
                        setShowDeviceModal={(show) => {
                          setShowItemWorkflow(show);
                        }}
                        setShowPageSelectionModal={() => {}}
                        setWorkflowType={(type) => {
                          setWorkflowType(type);
                        }}
                        devices={devices}
                        searchValue={searchValue}
                        activeFilters={activeFilters}
                        onFilteredCountChange={setFilteredItemCount}
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
            onSave={() => setShowCreateItemModal(false)}
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
            preSelectedDevice={selectedDevice}
            preSelectedDaypart={workflowDaypart}
            onAddItems={async (device, items, pageId) => {
              for (const item of items) {
                await api.assignItemToPage(item.id, device.id, pageId);
              }
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
            }}
            onRemoveItem={async (itemId, deviceId, pageId) => {
              await api.removeItemFromPage(itemId, deviceId, pageId);
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
            }}
            onReorderItems={async (deviceId, pageId, startIndex, endIndex) => {
              const device = devices.find(d => d.id === deviceId);
              if (!device) return;
              const page = device.pages.find(p => p.id === pageId);
              if (!page) return;
              await api.reorderPageItems(deviceId, pageId, page.itemOrder);
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
            }}
            onClose={() => {
              setShowDeviceWorkflow(false);
              setSelectedDevice(null);
            }}
            onForcePage={async (deviceId, pageId) => {
              await api.updateDeviceStatus(deviceId, { forcedPage: pageId });
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
            }}
            setNotifications={setNotifications}
            onCreateMenuItem={async (data) => {
              try {
                const item = await api.createMenuItem(data);
                const updated = await api.getMenuItems();
                setMenuItems(updated);
                return item;
              } catch (err) {
                console.error('Error creating menu item from device page:', err);
                return null;
              }
            }}
          />
          </div>
        )}

        {showItemWorkflow && selectedItem && (
          <ItemFirstWorkflow
            devices={devices}
            menuItems={menuItems}
            selectedItem={selectedItem}
            onAssignToPage={async (device, items, pageId) => {
              for (const item of items) {
                await api.assignItemToPage(item.id, device.id, pageId);
              }
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
            }}
            onClose={() => {
              setShowItemWorkflow(false);
              setSelectedItem(null);
              setWorkflowType(null);
            }}
            onForcePage={async (deviceId, pageId) => {
              await api.updateDeviceStatus(deviceId, { forcedPage: pageId });
              const updatedDevices = await api.getDevices();
              setDevices(updatedDevices);
            }}
          />
        )}
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