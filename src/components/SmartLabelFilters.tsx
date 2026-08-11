import React, { useState, useMemo } from 'react';
import { FilterConfig, Placement } from '../types';
import { ChevronDown, ChevronRight, Store, X, Check, CheckSquare, Square } from 'lucide-react';
import { Button } from './ui/button';

interface SmartLabelFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  placements: Placement[];
}

function flattenPlacements(placements: Placement[]): { id: string; name: string; path: string }[] {
  const result: { id: string; name: string; path: string }[] = [];
  const walk = (items: Placement[], path: string[] = []) => {
    items.forEach(p => {
      const fullPath = [...path, p.name];
      if (p.devices.length > 0 || !p.children?.length) {
        result.push({ id: p.id, name: p.name, path: path.join(' / ') });
      }
      if (p.children?.length) walk(p.children, fullPath);
    });
  };
  walk(placements);
  return result;
}

export function SmartLabelFilters({ isOpen, onClose, activeFilters, onFiltersChange, placements }: SmartLabelFiltersProps) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState('');

  const flatPlacements = useMemo(() => flattenPlacements(placements), [placements]);

  const filteredPlacements = useMemo(() => {
    if (!search.trim()) return flatPlacements;
    return flatPlacements.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [flatPlacements, search]);

  const placementFilter = activeFilters.find(f => f.type === 'placement');
  const selectedIds = placementFilter?.selectedValues ?? [];

  const togglePlacement = (id: string) => {
    const newValues = selectedIds.includes(id)
      ? selectedIds.filter(v => v !== id)
      : [...selectedIds, id];
    updatePlacementFilter(newValues);
  };

  const updatePlacementFilter = (values: string[]) => {
    if (values.length === 0) {
      onFiltersChange(activeFilters.filter(f => f.type !== 'placement'));
    } else {
      const existing = activeFilters.find(f => f.type === 'placement');
      const updated: FilterConfig = {
        id: existing?.id || `filter-placement-${Date.now()}`,
        type: 'placement',
        selectedValues: values,
      };
      onFiltersChange(existing ? activeFilters.map(f => f.type === 'placement' ? updated : f) : [...activeFilters, updated]);
    }
  };

  const selectAll = () => updatePlacementFilter(flatPlacements.map(p => p.id));
  const deselectAll = () => updatePlacementFilter([]);

  const activeCount = selectedIds.length;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />
      )}

      <div className={`
        fixed md:relative top-0 left-0 h-full md:h-auto z-50 md:z-0
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'w-full sm:w-80 md:w-72 lg:w-80' : 'w-0 md:w-0'}
      `}>
        <div className="w-full sm:w-80 md:w-72 lg:w-80 h-full flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button onClick={deselectAll} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">
                  Clear all
                </button>
              )}
              <button onClick={onClose} className="md:hidden">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map(id => {
                  const p = flatPlacements.find(fp => fp.id === id);
                  if (!p) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                      {p.name}
                      <button onClick={() => togglePlacement(id)} className="hover:text-sky-900 dark:hover:text-sky-200">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Placements section */}
          <div className="flex-1 px-4 py-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Placements</span>
                {activeCount > 0 && <span className="w-2 h-2 rounded-full bg-sky-500" />}
              </div>
              {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>

            {expanded && (
              <div className="space-y-2 pb-4">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search placements..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />

                <div className="flex items-center gap-2 text-xs">
                  <button onClick={selectAll} className="text-sky-600 dark:text-sky-400 hover:underline">Select all</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAll} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline">Deselect all</button>
                </div>

                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  {filteredPlacements.map(p => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlacement(p.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-sky-500 flex-shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.name}</p>
                          {p.path && <p className="text-[10px] text-gray-400 truncate">{p.path}</p>}
                        </div>
                      </button>
                    );
                  })}
                  {filteredPlacements.length === 0 && (
                    <p className="text-xs text-gray-400 py-2 text-center">No placements found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
