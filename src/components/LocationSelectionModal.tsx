import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Building2, Building, MapPin, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  concepts: any[];
  companies: any[];
  stores: any[];
  selectedConcept: string | null;
  selectedCompany: string | null;
  selectedStore: string | null;
  expandedConcept: string | null;
  expandedCompany: string | null;
  onSelectConcept: (conceptId: string) => void;
  onSelectCompany: (companyId: string) => void;
  onSelectStore: (storeId: string) => void;
  onExpandConcept: (conceptId: string | null) => void;
  onExpandCompany: (companyId: string | null) => void;
  onReset: () => void;
}

export function LocationSelectionModal({
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
  onSelectConcept,
  onSelectCompany,
  onSelectStore,
  onExpandConcept,
  onExpandCompany,
  onReset,
}: LocationSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const getBreadcrumbs = () => {
    const crumbs = [];

    const selectedConceptData = concepts.find(c => c.id === selectedConcept);
    if (selectedConceptData) {
      crumbs.push({ label: selectedConceptData.name, onClick: () => {} });
    }

    const selectedCompanyData = companies.find(c => c.id === selectedCompany);
    if (selectedCompanyData) {
      crumbs.push({ label: selectedCompanyData.name, onClick: () => {} });
    }

    const selectedStoreData = stores.find(s => s.id === selectedStore);
    if (selectedStoreData) {
      crumbs.push({ label: selectedStoreData.name, onClick: () => {} });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const filteredConcepts = concepts.filter(concept =>
    concept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFilteredCompaniesForConcept = (conceptId: string) => {
    return companies.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConcept = company.concept_id === conceptId;
      return matchesSearch && matchesConcept;
    });
  };

  const getFilteredStoresForCompany = (companyId: string) => {
    return stores.filter(store => {
      const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = store.company_id === companyId;
      return matchesSearch && matchesCompany;
    });
  };

  const getConceptCompanyCount = (conceptId: string) => {
    return companies.filter(c => c.concept_id === conceptId).length;
  };

  const getCompanyStoreCount = (companyId: string) => {
    return stores.filter(s => s.company_id === companyId).length;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Select Location</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        {breadcrumbs.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onReset}
              className="flex items-center gap-2 text-sm font-medium mb-3 transition-colors"
              style={{ color: 'rgb(0, 173, 240)' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Return to WAND Digital
            </button>
            <div className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                  <button
                    onClick={crumb.onClick}
                    className="font-medium transition-colors"
                    style={{ color: index === breadcrumbs.length - 1 ? '#1f2937' : 'rgb(0, 173, 240)' }}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Search concepts, companies, or stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredConcepts.map((concept) => {
            const isExpanded = expandedConcept === concept.id;
            const companyCount = getConceptCompanyCount(concept.id);
            const conceptCompanies = getFilteredCompaniesForConcept(concept.id);

            return (
              <div key={concept.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    onExpandConcept(isExpanded ? null : concept.id);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                    <Building2 className="h-5 w-5" style={{ color: 'rgb(0, 173, 240)' }} />
                    <span className="font-medium text-gray-900 dark:text-white">{concept.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{companyCount} companies</span>
                </button>

                {isExpanded && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 pl-12 pr-4 pb-2">
                    {conceptCompanies.map((company) => {
                      const isCompanyExpanded = expandedCompany === company.id;
                      const storeCount = getCompanyStoreCount(company.id);
                      const companyStores = getFilteredStoresForCompany(company.id);

                      return (
                        <div key={company.id} className="mt-2">
                          <button
                            onClick={() => {
                              onExpandCompany(isCompanyExpanded ? null : company.id);
                            }}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isCompanyExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              )}
                              <Building className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-gray-900 dark:text-white">{company.name}</span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{storeCount} stores</span>
                          </button>

                          {isCompanyExpanded && (
                            <div className="pl-10 space-y-1 mt-1">
                              {companyStores.map((store) => (
                                <button
                                  key={store.id}
                                  onClick={() => {
                                    onSelectConcept(concept.id);
                                    onSelectCompany(company.id);
                                    onSelectStore(store.id);
                                    onClose();
                                  }}
                                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                  <MapPin className="h-4 w-4 text-red-500" />
                                  <span className="text-gray-900 dark:text-white">{store.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
