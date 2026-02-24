import React, { useState, useCallback, useEffect } from 'react';
import { Tag, Tv, Receipt, Database } from 'lucide-react';
import { Navigation } from './components/Navigation';
import { MenuFilters } from './components/MenuFilters';
import { MenuItems } from './components/MenuItems';
import { DeviceGrid } from './components/DeviceGrid';
import { Sidebar } from './components/Sidebar';
import { CreateItemModal } from './components/CreateItemModal';
import { CreateRuleModal } from './components/CreateRuleModal';
import { DeviceFirstWorkflow } from './workflows/DeviceFirstWorkflow';
import { QuickActionBar, QuickActionType } from './components/QuickActionBar';
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
    return (saved as QuickActionType) || 'smart-labels';
  });

  // Filter state
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

  // Cycle Week state
  const [selectedCycleWeek, setSelectedCycleWeek] = useState<number>(1);

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

  // Get selected location info for navigation
  const selectedLocation = {
    concept: concepts.find(c => c.id === selectedConcept)?.name,
    company: companies.find(c => c.id === selectedCompany)?.name,
    store: stores.find(s => s.id === selectedStore)?.name
  };

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

  const handleAddFilter = useCallback((filter: FilterConfig) => {
    setActiveFilters(prev => [...prev, filter]);
  }, []);

  const handleEditFilter = useCallback((updatedFilter: FilterConfig) => {
    setActiveFilters(prev =>
      prev.map(filter => filter.id === updatedFilter.id ? updatedFilter : filter)
    );
  }, []);

  const handleDeleteFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => prev.filter(filter => filter.id !== filterId));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  const handleQuickActionSelect = useCallback((action: QuickActionType) => {
    setSelectedQuickAction(action);
    localStorage.setItem('selectedQuickAction', action);
    setSearchValue('');
    setActiveFilters([]);
  }, []);

  const handleCustomize = useCallback(() => {
    alert('Customize quick action cards (coming soon)');
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
          selectedLocation={selectedLocation}
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
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                      <Database className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Webtrition</span>
                    </div>
                  )}
                </div>
                {selectedQuickAction === 'products' && (
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedCycleWeek}
                      onChange={(e) => setSelectedCycleWeek(Number(e.target.value))}
                      className="px-5 py-2.5 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white border-2 border-blue-700 dark:border-blue-400 rounded-lg hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-900 transition-all shadow-lg cursor-pointer"
                    >
                      <option value={1}>Week 1 (Current)</option>
                      <option value={2}>Week 2</option>
                      <option value={3}>Week 3</option>
                      <option value={4}>Week 4</option>
                    </select>
                  </div>
                )}
              </div>

              <MenuFilters
                viewMode={viewMode}
                setViewMode={setViewMode}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
                selectedQuickAction={selectedQuickAction}
                onCreateItem={() => setShowCreateItemModal(true)}
                placements={placements}
                selectedPlacement={selectedPlacement}
                setSelectedPlacement={setSelectedPlacement}
                activeFilters={activeFilters}
                onAddFilter={handleAddFilter}
                onEditFilter={handleEditFilter}
                onDeleteFilter={handleDeleteFilter}
                onClearAllFilters={handleClearAllFilters}
                menuItems={menuItems}
                selectedLocation={selectedLocation}
              />

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
                  setSelectedItem={() => {}}
                  setShowDeviceModal={() => {}}
                  setShowPageSelectionModal={() => {}}
                  setWorkflowType={() => {}}
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

        {showDeviceWorkflow && selectedDevice && (
          <DeviceFirstWorkflow
            devices={devices}
            menuItems={menuItems}
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
      </div>
    </div>
  );
}

export default App