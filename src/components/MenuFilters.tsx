import React from 'react';
import { LayoutGrid, Rows2 as Rows, Search, Camera, Plus, Layers, PanelLeftOpen, PanelLeftClose, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterConfig, FilterType, MenuItem } from '../types';
import { QuickActionType } from './QuickActionBar';

interface MenuFiltersProps {
  viewMode: 'grid' | 'tiles';
  setViewMode: (mode: 'grid' | 'tiles') => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedQuickAction: QuickActionType;
  onCreateItem: () => void;
  activeFilters: FilterConfig[];
  onToggleFilterSidebar: () => void;
  isFilterSidebarOpen: boolean;
  menuItems: MenuItem[];
  groupByMrn?: boolean;
  onToggleGroupByMrn?: () => void;
  selectedCycleWeek?: number | null;
  onClearAllFilters?: () => void;
}

const filterTypeLabels: Record<FilterType, string> = {
  daypart: 'Daypart',
  station: 'Station',
  menu_item_name: 'Name',
  menu_item_mrn: 'MRN',
  date: 'Date',
  week: 'Week',
};

export function MenuFilters({
  viewMode,
  setViewMode,
  searchValue,
  setSearchValue,
  selectedQuickAction,
  onCreateItem,
  activeFilters,
  onToggleFilterSidebar,
  isFilterSidebarOpen,
  groupByMrn = false,
  onToggleGroupByMrn,
  selectedCycleWeek,
  onClearAllFilters,
}: MenuFiltersProps) {
  const handleScanBarcode = () => {
    console.log('Barcode scanning will be implemented when API is available');
  };

  const showProductFilters = selectedQuickAction === 'products';
  const showDeviceFilters = selectedQuickAction === 'smart-labels' || selectedQuickAction === 'groups';

  const totalActiveCount = activeFilters.length + (selectedCycleWeek ? 1 : 0);

  const getActiveFilterSummary = (): string[] => {
    const summaries: string[] = [];
    if (selectedCycleWeek) {
      summaries.push(`Week ${selectedCycleWeek}`);
    }
    for (const filter of activeFilters) {
      if (filter.type === 'date') {
        if (filter.singleDate) {
          summaries.push(new Date(filter.singleDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        } else if (filter.dateRange) {
          summaries.push('Date range');
        }
      } else if (filter.selectedValues.length === 1) {
        summaries.push(filter.selectedValues[0]);
      } else {
        summaries.push(`${filterTypeLabels[filter.type]} (${filter.selectedValues.length})`);
      }
    }
    return summaries;
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Left side - Filters toggle button with active summary */}
        <div className="flex items-center gap-2 order-1">
          {showProductFilters && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFilterSidebar}
                className={`flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isFilterSidebarOpen
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                    : totalActiveCount > 0
                    ? 'border-sky-200 dark:border-sky-800'
                    : ''
                }`}
              >
                {isFilterSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
                Filters
                {totalActiveCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold text-white rounded-full bg-sky-500">
                    {totalActiveCount}
                  </span>
                )}
              </Button>

              {totalActiveCount > 0 && !isFilterSidebarOpen && (
                <div className="hidden sm:flex items-center gap-1.5 overflow-hidden">
                  <div className="flex items-center gap-1 overflow-x-auto max-w-[320px] lg:max-w-[480px]">
                    {getActiveFilterSummary().map((label, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 whitespace-nowrap"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  {onClearAllFilters && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearAllFilters();
                      }}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Clear all filters"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 order-2">
          <Input
            type="text"
            placeholder={showDeviceFilters ? "Search displays..." : "Search menu items..."}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-12 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleScanBarcode}
            className="md:hidden absolute right-2 top-1.5 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Scan barcode"
          >
            <Camera className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 order-3">
          {showProductFilters && (
            <>
              <Button
                variant="secondary"
                onClick={onCreateItem}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-[rgb(0,153,220)] transition-colors"
                style={{ backgroundColor: 'rgb(0, 173, 240)' }}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Item</span>
              </Button>

              {onToggleGroupByMrn && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={onToggleGroupByMrn}
                  className={`p-2 rounded-lg transition-colors ${
                    groupByMrn
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title={groupByMrn ? 'Show all items' : 'Group by MRN'}
                >
                  <Layers className="h-5 w-5" />
                </Button>
              )}
            </>
          )}

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'tiles' : 'grid')}
            className="p-2 rounded-lg transition-colors bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? (
              <Rows className="h-5 w-5" />
            ) : (
              <LayoutGrid className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
