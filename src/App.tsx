import React, { useState, useCallback, useEffect } from 'react';
import { Tag, Tv, Receipt, Database, Package, Layers, Globe, Activity } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { MenuFilters } from './components/MenuFilters';
import { MenuItems } from './components/MenuItems';
import { DeviceGrid } from './components/DeviceGrid';
import { Sidebar } from './components/Sidebar';
import { FilterSidebar } from './components/FilterSidebar';
import { CreateItemModal } from './components/CreateItemModal';
import { CreateRuleModal } from './components/CreateRuleModal';
import { DeviceFirstWorkflow } from './workflows/DeviceFirstWorkflow';
import { ItemFirstWorkflow } from './workflows/ItemFirstWorkflow';
import { QuickActionBar, QuickActionType, QuickActionConfig } from './components/QuickActionBar';
import { CustomizeQuickActionsModal } from './components/CustomizeQuickActionsModal';
import { Theme, Channel, MenuItem, Device, Rule, FilterConfig } from './types';
import { api } from './services/api';

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

  // MRN grouping state
  const [groupByMrn, setGroupByMrn] = useState(() => {
    const saved = localStorage.getItem('groupByMrn');
    return saved ? JSON.parse(saved) : false;
  });

  // Cycle Week state
  const [selectedCycleWeek, setSelectedCycleWeek] = useState<number | null>(1);

  // Filter sidebar state
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('filterSidebarOpen');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('filterSidebarOpen', JSON.stringify(isFilterSidebarOpen));
  }, [isFilterSidebarOpen]);

  // Device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [showDeviceWorkflow, setShowDeviceWorkflow] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

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

  // Rules state
  const [rules, setRules] = useState<Rule[]>([]);

  // Load menu items
  useEffect(() => {
    const loadMenuItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = groupByMrn
          ? await api.getGroupedMenuItems()
          : await api.getMenuItems();
        setMenuItems(items);
      } catch (err) {
        console.error('Error loading menu items:', err);
        setError('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    loadMenuItems();
  }, [groupByMrn]);

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

  // Load location data
  useEffect(() => {
    const loadLocationData = async () => {
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

  const handleDeviceSelect = useCallback((device: Device) => {
    setSelectedDevice(device);
    setShowDeviceWorkflow(true);
  }, []);

  const handleFiltersChange = useCallback((filters: FilterConfig[]) => {
    setActiveFilters(filters);
  }, []);

  const handleToggleGroupByMrn = useCallback(() => {
    const newValue = !groupByMrn;
    setGroupByMrn(newValue);
    localStorage.setItem('groupByMrn', JSON.stringify(newValue));
  }, [groupByMrn]);

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
          onCreateRule={() => setShowCreateRuleModal(true)}
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
          onSelectConcept={setSelectedConcept}
          onSelectCompany={setSelectedCompany}
          onSelectStore={setSelectedStore}
          onExpandConcept={setExpandedConcept}
          onExpandCompany={setExpandedCompany}
          onResetLocation={() => {
            setSelectedConcept(null);
            setSelectedCompany(null);
            setSelectedStore(null);
            setExpandedConcept(null);
            setExpandedCompany(null);
          }}
        />

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          channels={channels}
          selectedChannel={selectedChannel}
          setSelectedChannel={setSelectedChannel}
          concepts={concepts}
          companies={companies}
          stores={stores}
          selectedConcept={selectedConcept}
          selectedCompany={selectedCompany}
          selectedStore={selectedStore}
          expandedConcept={expandedConcept}
          expandedCompany={expandedCompany}
          onConceptClick={handleConceptClick}
          onCompanyClick={handleCompanyClick}
          onStoreSelect={handleStoreSelect}
          onOpenSettings={() => setShowSettings(true)}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
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
              </div>

              <MenuFilters
                viewMode={viewMode}
                setViewMode={setViewMode}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
                selectedQuickAction={selectedQuickAction}
                onCreateItem={() => setShowCreateItemModal(true)}
                activeFilters={activeFilters}
                onToggleFilterSidebar={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
                isFilterSidebarOpen={isFilterSidebarOpen}
                menuItems={menuItems}
                groupByMrn={groupByMrn}
                onToggleGroupByMrn={handleToggleGroupByMrn}
                selectedCycleWeek={selectedCycleWeek}
              />

              <div className="flex gap-6 min-h-[calc(100vh-280px)]">
                {selectedQuickAction === 'products' && (
                  <FilterSidebar
                    isOpen={isFilterSidebarOpen}
                    onClose={() => setIsFilterSidebarOpen(false)}
                    activeFilters={activeFilters}
                    onFiltersChange={handleFiltersChange}
                    menuItems={menuItems}
                    selectedCycleWeek={selectedCycleWeek}
                    onCycleWeekChange={setSelectedCycleWeek}
                  />
                )}

                <div className="flex-1 min-w-0">
                  {selectedQuickAction === 'smart-labels' ? (
                    <DeviceGrid
                      loading={loadingDevices}
                      error={deviceError}
                      devices={devices}
                      onDeviceSelect={handleDeviceSelect}
                      searchValue={searchValue}
                      viewMode={viewMode === 'grid' ? 'grid' : 'list'}
                      placements={placements}
                    />
                  ) : selectedQuickAction === 'products' ? (
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
                    />
                  ) : selectedQuickAction === 'groups' ? (
                    <div className="text-center py-20">
                      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-400 mb-2">Groups</h3>
                      <p className="text-gray-500 dark:text-gray-500">Work in progress - coming soon</p>
                    </div>
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
          <DeviceFirstWorkflow
            devices={devices}
            menuItems={menuItems}
            preSelectedDevice={selectedDevice}
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
          />
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
    </div>
  );
}

export default App