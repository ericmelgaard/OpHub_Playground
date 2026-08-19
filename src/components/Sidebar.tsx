import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Building2,
  Store as StoreIcon,
  ChevronRight,
  Search,
  Check,
  Settings,
  Expand,
  Minimize2,
  Nfc,
  MapPin,
} from 'lucide-react';
import { Concept, Company, Store } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNfc } from '../hooks/useNfc';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export function Sidebar({
  isOpen,
  onClose,
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
}: SidebarProps) {
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const nfc = useNfc();

  useEffect(() => {
    if (nfc.lastReading) {
      setQuickSearchQuery(nfc.lastReading.text);
    }
  }, [nfc.lastReading]);

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

  const quickSearchResults = useMemo(() => {
    if (!quickSearchQuery.trim()) return [];

    const query = quickSearchQuery.toLowerCase();
    const results = [];
    const maxResults = 5;

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

  const matchingLocations = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = [];

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
                className="w-full pl-10 pr-10 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:border-[rgb(0,173,240)] dark:focus:border-[rgb(0,173,240)]"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              {nfc.supported && !nfc.scanning && (
                <button
                  onClick={() => nfc.startScan()}
                  title="Scan NFC tag"
                  className="absolute right-2 top-1.5 p-1.5 rounded-md transition-all text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Nfc className="h-5 w-5" />
                </button>
              )}
              {nfc.scanning && (
                <>
                  <button
                    onClick={() => nfc.stopScan()}
                    title="Stop NFC scan"
                    className="absolute right-2 top-1.5 p-1.5 rounded-md transition-all bg-emerald-500 text-white nfc-pulse-glow z-10"
                  >
                    <Nfc className="h-5 w-5" />
                  </button>
                  <div className="absolute right-2 top-1.5 pointer-events-none">
                    <span className="absolute inset-0 rounded-md bg-emerald-400 nfc-wave-ring" />
                    <span className="absolute inset-0 rounded-md bg-emerald-400 nfc-wave-ring-delayed" />
                  </div>
                </>
              )}
              {nfc.scanning && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Scanning... tap a tag
                    </span>
                  </div>
                  <button
                    onClick={() => nfc.stopScan()}
                    className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 underline-offset-2 hover:underline"
                  >
                    Stop
                  </button>
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
              <div className="flex items-center gap-2 min-w-0">
                {React.createElement(currentLocationDetails.icon, {
                  className: "h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0"
                })}
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {currentLocationDetails.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPanel(!showLocationPanel)}
                className="ml-2 flex-shrink-0"
              >
                <Expand className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 py-10">
            <div className="w-full max-w-[240px] text-center">
              <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-700">
                <img
                  src="/wand-digital-41-years-and-counting_(1).png"
                  alt="WANDdigital"
                  className="block w-full h-auto"
                />
              </div>
              <div className="mt-5">
                <p className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                  Operator Hub
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  WANDdigital operations workspace
                </p>
              </div>
              <p className="mt-6 text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
                v0.0.0
              </p>
            </div>
          </div>

          {/* Settings Button */}
          <div className="border-t dark:border-gray-700 p-4">
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
                            ? 'bg-[rgb(0,173,240)]/10 text-[rgb(0,173,240)]'
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
                                      ? 'bg-[rgb(0,173,240)]/10 text-[rgb(0,173,240)]'
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
                                              ? 'bg-[rgb(0,173,240)]/10 text-[rgb(0,173,240)]'
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
