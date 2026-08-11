import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Building2,
  Store as StoreIcon,
  ChevronRight,
  Search,
  Check,
  Settings,
  Package,
  Monitor,
  Tag,
  MapPin,
  Expand,
  Minimize2,
  Nfc,
} from 'lucide-react';
import { Channel, Concept, Company, Store, Placement } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNfc } from '../hooks/useNfc';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  selectedChannel: string | null;
  setSelectedChannel: (channelId: string | null) => void;
  concepts: Concept[];
  companies: Company[];
  stores: Store[];
  selectedConcept: string | null;
  selectedCompany: string | null;
  selectedStore: string | null;
  expandedConcept: string | null;
  expandedCompany: string | null;
  onConceptClick: (conceptId: string) => void;
  onCompanyClick: (companyId: string) => void;
  onStoreSelect: (storeId: string) => void;
  onOpenSettings: () => void;
  selectedPage: 'products' | 'devices' | 'channels';
  setSelectedPage: (page: 'products' | 'devices' | 'channels') => void;
}

export function Sidebar({
  isOpen,
  onClose,
  channels = [],
  selectedChannel,
  setSelectedChannel,
  concepts,
  companies,
  stores,
  selectedConcept,
  selectedCompany,
  selectedStore,
  expandedConcept,
  expandedCompany,
  onConceptClick,
  onCompanyClick,
  onStoreSelect,
  onOpenSettings,
  selectedPage,
  setSelectedPage,
}: SidebarProps) {
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPlacements, setExpandedPlacements] = useState<Set<string>>(new Set());
  const nfc = useNfc();

  // Auto-fill search bar when an NFC tag is read
  useEffect(() => {
    if (nfc.lastReading) {
      setQuickSearchQuery(nfc.lastReading.text);
    }
  }, [nfc.lastReading]);

  // Get current location details
  const currentLocationDetails = useMemo(() => {
    const store = selectedStore ? stores.find(s => s.id === selectedStore) : null;
    const company = selectedCompany ? companies.find(c => c.id === selectedCompany) : 
                   store ? companies.find(c => c.id === store.companyId) : null;
    const concept = selectedConcept ? concepts.find(c => c.id === selectedConcept) :
                   company ? concepts.find(c => c.id === company.conceptId) : null;

    return {
      store,
      company,
      concept,
      path: [concept?.name, company?.name, store?.name].filter(Boolean),
      icon: store ? StoreIcon : company ? Building2 : concept ? Building2 : MapPin,
      name: store?.name || company?.name || concept?.name || 'All Locations'
    };
  }, [selectedStore, selectedCompany, selectedConcept, stores, companies, concepts]);

  // Quick search results
  const quickSearchResults = useMemo(() => {
    if (!quickSearchQuery.trim()) return [];

    const query = quickSearchQuery.toLowerCase();
    const results = [];
    const maxResults = 5; // Limit quick search results

    // Add matching stores
    for (const store of stores) {
      if (results.length >= maxResults) break;
      
      if (store.name.toLowerCase().includes(query)) {
        const company = companies.find(c => c.id === store.companyId);
        const concept = company ? concepts.find(c => c.id === company.conceptId) : null;
        
        results.push({
          id: store.id,
          name: store.name,
          type: 'store',
          path: [concept?.name, company?.name].filter(Boolean),
          icon: StoreIcon,
          companyId: company?.id,
          conceptId: concept?.id
        });
      }
    }

    // Add matching companies if we still have room
    if (results.length < maxResults) {
      for (const company of companies) {
        if (results.length >= maxResults) break;
        
        if (company.name.toLowerCase().includes(query)) {
          const concept = concepts.find(c => c.id === company.conceptId);
          results.push({
            id: company.id,
            name: company.name,
            type: 'company',
            path: concept ? [concept.name] : [],
            icon: Building2,
            conceptId: concept?.id
          });
        }
      }
    }

    // Add matching concepts if we still have room
    if (results.length < maxResults) {
      for (const concept of concepts) {
        if (results.length >= maxResults) break;
        
        if (concept.name.toLowerCase().includes(query)) {
          results.push({
            id: concept.id,
            name: concept.name,
            type: 'concept',
            path: [],
            icon: Building2
          });
        }
      }
    }

    return results;
  }, [quickSearchQuery, companies, concepts, stores]);

  const handleQuickSearchSelect = (result: typeof quickSearchResults[0]) => {
    if (result.type === 'store') {
      if (result.conceptId) onConceptClick(result.conceptId);
      if (result.companyId) onCompanyClick(result.companyId);
      onStoreSelect(result.id);
    } else if (result.type === 'company') {
      if (result.conceptId) onConceptClick(result.conceptId);
      onCompanyClick(result.id);
    } else {
      onConceptClick(result.id);
    }
    setQuickSearchQuery('');
  };

  // Get matching locations for panel search
  const matchingLocations = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = [];

    // Add matching stores
    stores.forEach(store => {
      if (store.name.toLowerCase().includes(query)) {
        const company = companies.find(c => c.id === store.companyId);
        const concept = company ? concepts.find(c => c.id === company.conceptId) : null;
        
        results.push({
          id: store.id,
          name: store.name,
          type: 'store',
          path: [concept?.name, company?.name, store.name].filter(Boolean),
          companyId: company?.id,
          conceptId: concept?.id
        });
      }
    });

    // Add matching companies
    companies.forEach(company => {
      if (company.name.toLowerCase().includes(query)) {
        const concept = concepts.find(c => c.id === company.conceptId);
        results.push({
          id: company.id,
          name: company.name,
          type: 'company',
          path: [concept?.name, company.name].filter(Boolean),
          conceptId: concept?.id
        });
      }
    });

    // Add matching concepts
    concepts.forEach(concept => {
      if (concept.name.toLowerCase().includes(query)) {
        results.push({
          id: concept.id,
          name: concept.name,
          type: 'concept',
          path: [concept.name]
        });
      }
    });

    return results;
  }, [searchQuery, companies, concepts, stores]);

  const handleLocationSelect = (location: typeof matchingLocations[0]) => {
    if (location.type === 'store') {
      if (location.conceptId) onConceptClick(location.conceptId);
      if (location.companyId) onCompanyClick(location.companyId);
      onStoreSelect(location.id);
    } else if (location.type === 'company') {
      if (location.conceptId) onConceptClick(location.conceptId);
      onCompanyClick(location.id);
    } else {
      onConceptClick(location.id);
    }
    setSearchQuery('');
  };

  const togglePlacementExpanded = (id: string) => {
    setExpandedPlacements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderPlacement = (placement: Placement, level = 0) => {
    const isExpanded = expandedPlacements.has(placement.id);
    const isSelected = selectedPlacement === placement.id;
    const hasDevices = placement.devices.length > 0;
    const hasChildren = placement.children.length > 0;

    return (
      <div key={placement.id} className="space-y-1">
        <Button
          variant={isSelected ? 'secondary' : 'ghost'}
          onClick={() => {
            if (hasChildren) {
              togglePlacementExpanded(placement.id);
            }
            if (hasDevices) {
              setSelectedPlacement(placement.id);
            }
          }}
          className={`w-full justify-start ${
            isSelected
              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
              : 'text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        >
          <div className="flex items-center gap-2">
            {placement.devices.length > 0 ? (
              <Monitor className="h-4 w-4" />
            ) : (
              <StoreIcon className="h-4 w-4" />
            )}
            <span>{placement.name}</span>
          </div>
        </Button>

        {isExpanded && placement.children.length > 0 && (
          <div className="space-y-1">
            {placement.children.map((child) =>
              renderPlacement(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-20 flex transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Main sidebar panel */}
        <div className={`w-80 flex flex-col bg-white dark:bg-gray-800 border-r dark:border-gray-700 ${
          showLocationPanel ? 'md:border-r-0 md:relative fixed inset-0 z-20' : ''
        }`}>
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Menu
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick Location Search */}
            <div className="relative mb-4">
              <Input
                type="text"
                placeholder="Quick search locations..."
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-400"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              {nfc.supported && (
                <button
                  onClick={() => (nfc.scanning ? nfc.stopScan() : nfc.startScan())}
                  title={nfc.scanning ? 'Stop NFC scan' : 'Scan NFC tag'}
                  className={`absolute right-2 top-1.5 p-1.5 rounded-md transition-all ${
                    nfc.scanning
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Nfc className="h-5 w-5" />
                </button>
              )}
              {nfc.scanning && (
                <div className="absolute -bottom-5 left-0 right-0 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Tap an NFC tag...
                </div>
              )}
              {nfc.error && (
                <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-500 truncate">
                  {nfc.error}
                </div>
              )}

              {quickSearchQuery && quickSearchResults.length > 0 && (
                <Card className="absolute z-10 w-full mt-1 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg overflow-hidden">
                  <CardContent className="p-0 divide-y divide-gray-200 dark:divide-gray-700">
                    {quickSearchResults.map((result) => (
                      <Button
                        key={`${result.type}-${result.id}`}
                        variant="ghost"
                        onClick={() => handleQuickSearchSelect(result)}
                        className="w-full justify-start p-3 hover:bg-white dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <result.icon className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {result.name}
                            </div>
                            {result.path.length > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {result.path.join(' / ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Current Location with Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {React.createElement(currentLocationDetails.icon, {
                  className: "h-5 w-5 text-gray-500 dark:text-gray-400"
                })}
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentLocationDetails.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPanel(!showLocationPanel)}
                className="ml-2"
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-4 space-y-2">
            <Button
              variant={selectedPage === 'products' ? 'default' : 'ghost'}
              onClick={() => setSelectedPage('products')}
              className="w-full justify-start"
            >
              <Package className="h-4 w-4 mr-2" />
              Products
            </Button>
            <Button
              variant={selectedPage === 'devices' ? 'default' : 'ghost'}
              onClick={() => setSelectedPage('devices')}
              className="w-full justify-start"
            >
              <Monitor className="h-4 w-4 mr-2" />
              Devices
            </Button>
            <Button
              variant={selectedPage === 'channels' ? 'default' : 'ghost'}
              onClick={() => setSelectedPage('channels')}
              className="w-full justify-start"
            >
              <Tag className="h-4 w-4 mr-2" />
              Channels
            </Button>
          </div>

          {/* Channel Selection */}
          {selectedPage === 'channels' && (
            <div className="px-4 pb-4">
              <Card className="bg-gray-50 dark:bg-gray-800/50">
                <CardContent className="p-2 space-y-1">
                  {channels.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <Button
                        key={channel.id}
                        variant="ghost"
                        onClick={() => setSelectedChannel(channel.id)}
                        className={`w-full justify-start ${
                          selectedChannel === channel.id
                            ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {channel.name}
                        {selectedChannel === channel.id && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Button */}
          <div className="mt-auto border-t dark:border-gray-700 p-4">
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full flex justify-start gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Location Panel */}
        {showLocationPanel && (
          <div className={`w-80 flex flex-col bg-white dark:bg-gray-800 ${
            showLocationPanel ? 'fixed md:relative inset-0 md:inset-auto z-30 md:z-auto' : ''
          }`}>
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPanel(false)}
                className="ml-2 md:flex hidden"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPanel(false)}
                className="ml-2 md:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {searchQuery ? (
                <div className="space-y-2">
                  {matchingLocations.map((location) => (
                    <Button
                      key={`${location.type}-${location.id}`}
                      variant="ghost"
                      onClick={() => handleLocationSelect(location)}
                      className="w-full justify-start p-2 text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          {location.type === 'store' ? (
                            <StoreIcon className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                          <span className="font-medium">{location.name}</span>
                        </div>
                        {location.path.length > 1 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                            {location.path.slice(0, -1).join(' / ')}
                          </p>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {concepts.map((concept) => (
                    <div key={concept.id} className="space-y-1">
                      <Button
                        variant="ghost"
                        onClick={() => onConceptClick(concept.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                          selectedConcept === concept.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{concept.name}</span>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedConcept === concept.id ? 'rotate-90' : ''
                          }`}
                        />
                      </Button>

                      {expandedConcept === concept.id && (
                        <div className="ml-4 space-y-1">
                          {companies
                            .filter((company) => company.conceptId === concept.id)
                            .map((company) => (
                              <div key={company.id} className="space-y-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => onCompanyClick(company.id)}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                                    selectedCompany === company.id
                                      ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    <span>{company.name}</span>
                                  </div>
                                  <ChevronRight
                                    className={`h-4 w-4 transition-transform ${
                                      expandedCompany === company.id ? 'rotate-90' : ''
                                    }`}
                                  />
                                </Button>

                                {expandedCompany === company.id && (
                                  <div className="ml-4 space-y-1">
                                    {stores
                                      .filter((store) => store.companyId === company.id)
                                      .map((store) => (
                                        <Button
                                          key={store.id}
                                          variant="ghost"
                                          onClick={() => onStoreSelect(store.id)}
                                          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                                            selectedStore === store.id
                                              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                                              : 'text-gray-700 dark:text-gray-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <StoreIcon className="h-4 w-4" />
                                            <span>{store.name}</span>
                                          </div>
                                          {selectedStore === store.id && (
                                            <Check className="h-4 w-4" />
                                          )}
                                        </Button>
                                      ))}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={onClose}
        />
      )}
    </>
  );
}