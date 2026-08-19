import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ChevronRight,
  ChevronDown,
  Building2,
  Building,
  MapPin,
  Search,
  Home,
  Loader2,
} from 'lucide-react';
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
  loading?: boolean;
}

const MAX_RESULTS_PER_LEVEL = 50;

const fuzzyMatch = (name: string, query: string): boolean =>
  name.toLowerCase().includes(query.toLowerCase());

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
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
  loading = false,
}: LocationSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const activeRowRef = useRef<HTMLDivElement>(null);

  // Local "browse view" state — controls what's shown in the browse tree and
  // search scope WITHOUT changing the actual selected location. Reset to the
  // actual selection every time the modal opens.
  const [viewConcept, setViewConcept] = useState<string | null>(null);
  const [viewCompany, setViewCompany] = useState<string | null>(null);

  // Auto-expand the path to the current selection when the modal opens.
  // At company/store level, only the current company is exposed (concept stays
  // collapsed as a context header). Breadcrumbing up widens the view.
  useEffect(() => {
    if (isOpen) {
      setViewConcept(selectedConcept || null);
      setViewCompany(selectedCompany || null);
      setSearchQuery('');
      if (selectedCompany) {
        // Scoped to a single company — concept stays collapsed
        onExpandConcept(null);
        onExpandCompany(null);
      } else if (selectedConcept) {
        // Concept level — expand to show sibling companies
        onExpandConcept(selectedConcept);
        onExpandCompany(null);
      } else {
        onExpandConcept(null);
        onExpandCompany(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const conceptById = useMemo(() => {
    const map = new Map<string, any>();
    concepts.forEach((c) => map.set(c.id, c));
    return map;
  }, [concepts]);

  const companyById = useMemo(() => {
    const map = new Map<string, any>();
    companies.forEach((c) => map.set(c.id, c));
    return map;
  }, [companies]);

  // The actual location level (for breadcrumb trail display)
  const currentLevel: 'wand' | 'concept' | 'company' | 'store' = selectedStore
    ? 'store'
    : selectedCompany
      ? 'company'
      : selectedConcept
        ? 'concept'
        : 'wand';

  // The browse view level (what's shown in the tree / search scope)
  const viewLevel: 'wand' | 'concept' | 'company' | 'store' = viewCompany
    ? selectedStore && viewConcept === selectedConcept && viewCompany === selectedCompany
      ? 'store'
      : 'company'
    : viewConcept
      ? 'concept'
      : 'wand';

  const hasSearch = searchQuery.trim().length > 0;

  // Scroll the highlighted (active) row into view only when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (hasSearch) return;
    const t = setTimeout(() => {
      activeRowRef.current?.scrollIntoView({ block: 'center' });
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Search scope is driven by the browse view, not the actual selection
  const scopedConceptIds = useMemo(() => {
    if (viewLevel === 'wand') return new Set(concepts.map((c) => c.id));
    if (viewLevel === 'concept') return new Set([viewConcept!]);
    if (viewLevel === 'company' || viewLevel === 'store') {
      return new Set([companyById.get(viewCompany!)?.conceptId].filter(Boolean) as string[]);
    }
    return new Set<string>();
  }, [viewLevel, concepts, viewConcept, viewCompany, companyById]);

  const scopedCompanyIds = useMemo(() => {
    if (viewLevel === 'wand') return new Set(companies.map((c) => c.id));
    if (viewLevel === 'concept')
      return new Set(
        companies.filter((c) => c.conceptId === viewConcept).map((c) => c.id),
      );
    if (viewLevel === 'company' || viewLevel === 'store')
      return new Set([viewCompany!]);
    return new Set<string>();
  }, [viewLevel, companies, viewConcept, viewCompany]);

  const scopedStoreIds = useMemo(() => {
    if (viewLevel === 'wand') return new Set(stores.map((s) => s.id));
    if (viewLevel === 'concept')
      return new Set(
        stores
          .filter((s) => {
            const comp = companyById.get(s.companyId);
            return comp && comp.conceptId === viewConcept;
          })
          .map((s) => s.id),
      );
    if (viewLevel === 'company' || viewLevel === 'store')
      return new Set(
        stores.filter((s) => s.companyId === viewCompany).map((s) => s.id),
      );
    return new Set<string>();
  }, [viewLevel, stores, viewConcept, viewCompany, companyById]);

  // Build fuzzy search results grouped by level
  const searchResults = useMemo(() => {
    if (!hasSearch) return null;
    const q = searchQuery.trim().toLowerCase();

    const matchingConcepts = concepts
      .filter((c) => scopedConceptIds.has(c.id) && fuzzyMatch(c.name, q))
      .slice(0, MAX_RESULTS_PER_LEVEL);

    const matchingCompanies = companies
      .filter((c) => scopedCompanyIds.has(c.id) && fuzzyMatch(c.name, q))
      .slice(0, MAX_RESULTS_PER_LEVEL);

    const matchingStores = stores
      .filter((s) => scopedStoreIds.has(s.id) && fuzzyMatch(s.name, q))
      .slice(0, MAX_RESULTS_PER_LEVEL);

    return { matchingConcepts, matchingCompanies, matchingStores };
  }, [hasSearch, searchQuery, concepts, companies, stores, scopedConceptIds, scopedCompanyIds, scopedStoreIds]);

  if (!isOpen) return null;

  const getConceptName = (id: string) => conceptById.get(id)?.name || '';
  const getCompanyName = (id: string) => companyById.get(id)?.name || '';

  // Breadcrumb trail shows the actual selected location
  const storeName = selectedStore
    ? stores.find((s) => s.id === selectedStore)?.name || ''
    : '';

  // Browse view names for search placeholder
  const viewConceptName = viewConcept ? getConceptName(viewConcept) : '';
  const viewCompanyName = viewCompany ? getCompanyName(viewCompany) : '';

  const handleSearchResultClick = (type: 'concept' | 'company' | 'store', id: string) => {
    if (type === 'concept') {
      onSelectConcept(id);
    } else if (type === 'company') {
      const comp = companyById.get(id);
      if (comp) onSelectConcept(comp.conceptId);
      onSelectCompany(id);
    } else if (type === 'store') {
      const store = stores.find((s) => s.id === id);
      if (store) {
        const comp = companyById.get(store.companyId);
        if (comp) {
          onSelectConcept(comp.conceptId);
          onSelectCompany(store.companyId);
        }
      }
      onSelectStore(id);
    }
    onClose();
  };

  const getConceptCompanyCount = (conceptId: string) =>
    companies.filter((c) => c.conceptId === conceptId).length;

  const getCompanyStoreCount = (companyId: string) =>
    stores.filter((s) => s.companyId === companyId).length;

  const handleReset = () => {
    onReset();
    setSearchQuery('');
    setViewConcept(null);
    setViewCompany(null);
  };

  // Breadcrumb clicks update the local browse view only — no location change.
  // Each click clears the levels below it in the view, so the breadcrumb trail
  // shrinks to reflect what you're browsing. The actual selected location is
  // untouched.
  const handleBreadcrumbView = (level: 'wand' | 'concept' | 'company') => {
    setSearchQuery('');
    if (level === 'wand') {
      setViewConcept(null);
      setViewCompany(null);
      onExpandConcept(null);
      onExpandCompany(null);
    } else if (level === 'concept') {
      setViewCompany(null);
      onExpandConcept(viewConcept);
      onExpandCompany(null);
    } else if (level === 'company') {
      onExpandCompany(viewCompany);
    }
  };

  // Visible concepts when browsing (not searching) — driven by browse view
  const visibleConcepts =
    viewLevel === 'concept' || viewLevel === 'company' || viewLevel === 'store'
      ? concepts.filter((c) => c.id === viewConcept)
      : concepts;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Select Location
            </h2>
            {loading && (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        {/* Breadcrumb / Return to WAND */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm font-medium mb-2 transition-colors hover:opacity-80"
            style={{ color: 'rgb(0, 173, 240)' }}
          >
            <Home className="h-4 w-4" />
            Return to WAND
          </button>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={() => handleBreadcrumbView('wand')}
              className={`font-medium transition-colors ${
                viewLevel === 'wand'
                  ? 'text-gray-900 dark:text-white'
                  : 'hover:opacity-80'
              }`}
              style={viewLevel === 'wand' ? {} : { color: 'rgb(0, 173, 240)' }}
            >
              WAND
            </button>
            {viewConcept && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <button
                  onClick={() => handleBreadcrumbView('concept')}
                  className={`font-medium transition-colors ${
                    viewLevel === 'concept'
                      ? 'text-gray-900 dark:text-white'
                      : 'hover:opacity-80'
                  }`}
                  style={viewLevel === 'concept' ? {} : { color: 'rgb(0, 173, 240)' }}
                >
                  {getConceptName(viewConcept)}
                </button>
              </>
            )}
            {viewCompany && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <button
                  onClick={() => handleBreadcrumbView('company')}
                  className={`font-medium transition-colors ${
                    viewLevel === 'company' || viewLevel === 'store'
                      ? 'text-gray-900 dark:text-white'
                      : 'hover:opacity-80'
                  }`}
                  style={
                    viewLevel === 'company' || viewLevel === 'store'
                      ? {}
                      : { color: 'rgb(0, 173, 240)' }
                  }
                >
                  {getCompanyName(viewCompany)}
                </button>
              </>
            )}
            {viewLevel === 'store' && storeName && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {storeName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder={
                viewLevel === 'wand'
                  ? 'Search all concepts, companies, or stores...'
                  : viewLevel === 'concept'
                    ? `Search within ${viewConceptName}...`
                    : viewLevel === 'company'
                      ? `Search within ${viewCompanyName}...`
                      : `Search sibling stores...`
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {hasSearch && searchResults ? (
            <SearchResults
              results={searchResults}
              conceptById={conceptById}
              companyById={companyById}
              onResultClick={handleSearchResultClick}
              query={searchQuery.trim()}
            />
          ) : viewLevel === 'company' || viewLevel === 'store' ? (
            // Scoped view: concept as context header + current company with stores
            (() => {
              const concept = conceptById.get(viewConcept!)!;
              const company = companyById.get(viewCompany!)!;
              const conceptCompanyCount = getConceptCompanyCount(viewConcept!);
              const companyStores = stores.filter(
                (s) => s.companyId === viewCompany,
              );
              return (
                <div className="space-y-3">
                  {/* Concept context header (non-interactive label) */}
                  <div className="flex items-stretch rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="w-full flex items-center justify-between p-4 flex-1">
                      <div className="flex items-center gap-3">
                        <Building2
                          className="h-5 w-5 flex-shrink-0"
                          style={{ color: 'rgb(0, 173, 240)' }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {concept.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {conceptCompanyCount} companies
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectConcept(concept.id);
                        onClose();
                      }}
                      className="px-4 text-sm font-medium border-l border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      style={{ color: 'rgb(0, 173, 240)' }}
                    >
                      Go
                    </button>
                  </div>

                  {/* Current company expanded with stores */}
                  <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <Building className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {company.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {companyStores.length} stores
                      </span>
                    </div>
                    <div className="pl-10 space-y-1 p-2">
                      {companyStores.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                          No stores under this company.
                        </p>
                      ) : (
                        companyStores.map((store) => {
                          const isStoreSelected = selectedStore === store.id;
                          const showStoreHighlight = companyStores.length > 1 && isStoreSelected;
                          return (
                            <div
                              key={store.id}
                              ref={showStoreHighlight ? activeRowRef : undefined}
                              className={`rounded-lg scroll-mt-4 ${
                                showStoreHighlight ? 'bg-blue-50/50 dark:bg-gray-700/70' : ''
                              }`}
                            >
                              <button
                                onClick={() => {
                                  onSelectConcept(concept.id);
                                  onSelectCompany(company.id);
                                  onSelectStore(store.id);
                                  onClose();
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
                              >
                                <MapPin className={`h-4 w-4 ${showStoreHighlight ? 'text-[rgb(0,173,240)]' : 'text-red-500'}`} />
                                <span className={showStoreHighlight ? 'text-[rgb(0,173,240)] dark:text-white font-medium' : 'text-gray-900 dark:text-white'}>
                                  {store.name}
                                </span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            // Wide browse mode: expandable concepts and companies
            visibleConcepts.map((concept) => {
              const isExpanded = expandedConcept === concept.id;
              const isSelected = selectedConcept === concept.id;
              const showConceptHighlight = visibleConcepts.length > 1 && isSelected;
              const companyCount = getConceptCompanyCount(concept.id);
              const conceptCompanies = companies.filter(
                (c) => c.conceptId === concept.id,
              );

              return (
                <div
                  key={concept.id}
                  ref={showConceptHighlight ? activeRowRef : undefined}
                  className={`border rounded-lg overflow-hidden transition-colors scroll-mt-4 ${
                    showConceptHighlight
                      ? 'border-[rgb(0,173,240)] bg-blue-50/50 dark:bg-gray-700/70'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Expand button (browse) */}
                    <button
                      onClick={() =>
                        onExpandConcept(isExpanded ? null : concept.id)
                      }
                      className="w-full flex items-center justify-between p-4 flex-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        )}
                        <Building2
                          className="h-5 w-5 flex-shrink-0"
                          style={{ color: 'rgb(0, 173, 240)' }}
                        />
                        <span className={`font-medium ${
                          showConceptHighlight
                            ? 'text-[rgb(0,173,240)] dark:text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {concept.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {companyCount} companies
                      </span>
                    </button>
                    {/* Navigate here button */}
                    <button
                      onClick={() => {
                        onSelectConcept(concept.id);
                        onExpandConcept(isExpanded ? null : concept.id);
                        onClose();
                      }}
                      className="px-4 text-sm font-medium border-l border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      style={{ color: 'rgb(0, 173, 240)' }}
                    >
                      Go
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 pl-12 pr-4 pb-2">
                      {conceptCompanies.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-3">
                          No companies under this concept.
                        </p>
                      ) : (
                        conceptCompanies.map((company) => {
                          const isCompanyExpanded =
                            expandedCompany === company.id;
                          const isCompanySelected =
                            selectedCompany === company.id;
                          const showCompanyHighlight = conceptCompanies.length > 1 && isCompanySelected;
                          const storeCount = getCompanyStoreCount(company.id);
                          const companyStores = stores.filter(
                            (s) => s.companyId === company.id,
                          );

                          return (
                            <div key={company.id} className="mt-2">
                              <div
                                ref={showCompanyHighlight ? activeRowRef : undefined}
                                className={`flex items-stretch rounded-lg overflow-hidden border scroll-mt-4 ${
                                  showCompanyHighlight
                                    ? 'border-[rgb(0,173,240)] bg-blue-50/50 dark:bg-gray-700/70'
                                    : 'border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <button
                                  onClick={() =>
                                    onExpandCompany(
                                      isCompanyExpanded ? null : company.id,
                                    )
                                  }
                                  className="w-full flex items-center justify-between p-3 hover:bg-white dark:hover:bg-gray-800 transition-colors text-left flex-1"
                                >
                                  <div className="flex items-center gap-3">
                                    {isCompanyExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    )}
                                    <Building className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <span className={showCompanyHighlight ? 'text-[rgb(0,173,240)] dark:text-white' : 'text-gray-900 dark:text-white'}>
                                      {company.name}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {storeCount} stores
                                  </span>
                                </button>
                                <button
                                  onClick={() => {
                                    onSelectConcept(concept.id);
                                    onSelectCompany(company.id);
                                    onExpandCompany(
                                      isCompanyExpanded ? null : company.id,
                                    );
                                    onClose();
                                  }}
                                  className="px-3 text-sm font-medium border-l border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                  style={{ color: 'rgb(0, 173, 240)' }}
                                >
                                  Go
                                </button>
                              </div>

                              {isCompanyExpanded && (
                                <div className="pl-10 space-y-1 mt-1">
                                  {companyStores.length === 0 ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                                      No stores under this company.
                                    </p>
                                  ) : (
                                    companyStores.map((store) => {
                                      const isStoreSelected = selectedStore === store.id;
                                      const showStoreHighlight = companyStores.length > 1 && isStoreSelected;
                                      return (
                                      <div
                                        key={store.id}
                                        ref={showStoreHighlight ? activeRowRef : undefined}
                                        className={`rounded-lg scroll-mt-4 ${
                                          showStoreHighlight
                                            ? 'bg-blue-50/50 dark:bg-gray-700/70'
                                            : ''
                                        }`}
                                      >
                                        <button
                                          onClick={() => {
                                            onSelectConcept(concept.id);
                                            onSelectCompany(company.id);
                                            onSelectStore(store.id);
                                            onClose();
                                          }}
                                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
                                        >
                                          <MapPin className={`h-4 w-4 ${showStoreHighlight ? 'text-[rgb(0,173,240)]' : 'text-red-500'}`} />
                                          <span className={showStoreHighlight ? 'text-[rgb(0,173,240)] dark:text-white font-medium' : 'text-gray-900 dark:text-white'}>
                                            {store.name}
                                          </span>
                                        </button>
                                      </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// --- Search results component ---

interface SearchResultsProps {
  results: {
    matchingConcepts: any[];
    matchingCompanies: any[];
    matchingStores: any[];
  };
  conceptById: Map<string, any>;
  companyById: Map<string, any>;
  onResultClick: (
    type: 'concept' | 'company' | 'store',
    id: string,
  ) => void;
  query: string;
}

function SearchResults({
  results,
  conceptById,
  companyById,
  onResultClick,
  query,
}: SearchResultsProps) {
  const { matchingConcepts, matchingCompanies, matchingStores } = results;
  const total =
    matchingConcepts.length + matchingCompanies.length + matchingStores.length;

  if (total === 0) {
    return (
      <div className="text-center py-12">
        <Search className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">No matches found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {matchingConcepts.length > 0 && (
        <SearchGroup title="Concepts" icon={Building2}>
          {matchingConcepts.map((concept) => (
            <SearchResultItem
              key={concept.id}
              icon={Building2}
              name={concept.name}
              path={[]}
              query={query}
              onClick={() => onResultClick('concept', concept.id)}
            />
          ))}
          {results.matchingConcepts.length >= MAX_RESULTS_PER_LEVEL && (
            <p className="text-xs text-gray-400 dark:text-gray-500 pl-11 pt-1">
              Showing first {MAX_RESULTS_PER_LEVEL} concept matches.
            </p>
          )}
        </SearchGroup>
      )}

      {matchingCompanies.length > 0 && (
        <SearchGroup title="Companies" icon={Building}>
          {matchingCompanies.map((company) => {
            const concept = conceptById.get(company.conceptId);
            return (
              <SearchResultItem
                key={company.id}
                icon={Building}
                name={company.name}
                path={concept ? [concept.name] : []}
                query={query}
                onClick={() => onResultClick('company', company.id)}
              />
            );
          })}
          {results.matchingCompanies.length === MAX_RESULTS_PER_LEVEL && (
            <p className="text-xs text-gray-400 dark:text-gray-500 pl-11 pt-1">
              Showing first {MAX_RESULTS_PER_LEVEL} company matches.
            </p>
          )}
        </SearchGroup>
      )}

      {matchingStores.length > 0 && (
        <SearchGroup title="Stores" icon={MapPin}>
          {matchingStores.map((store) => {
            const company = companyById.get(store.companyId);
            const concept = company
              ? conceptById.get(company.conceptId)
              : null;
            return (
              <SearchResultItem
                key={store.id}
                icon={MapPin}
                name={store.name}
                path={[concept?.name, company?.name].filter(Boolean)}
                query={query}
                onClick={() => onResultClick('store', store.id)}
              />
            );
          })}
          {results.matchingStores.length === MAX_RESULTS_PER_LEVEL && (
            <p className="text-xs text-gray-400 dark:text-gray-500 pl-11 pt-1">
              Showing first {MAX_RESULTS_PER_LEVEL} store matches.
            </p>
          )}
        </SearchGroup>
      )}
    </div>
  );
}

function SearchGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SearchResultItem({
  icon: Icon,
  name,
  path,
  query,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  path: string[];
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
    >
      <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      <div className="min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {highlightMatch(name, query)}
        </div>
        {path.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {highlightMatch(path.join(' › '), query)}
          </div>
        )}
      </div>
    </button>
  );
}
