import React from 'react';
import { LayoutGrid, Rows2 as Rows, Search, Camera, Plus, Layers, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterConfig, MenuItem } from '../types';
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
}

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
}: MenuFiltersProps) {
  const handleScanBarcode = () => {
    console.log('Barcode scanning will be implemented when API is available');
  };

  const showProductFilters = selectedQuickAction === 'products';
  const showDeviceFilters = selectedQuickAction === 'smart-labels' || selectedQuickAction === 'groups';

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Left side - Filters toggle button */}
        <div className="flex items-center gap-3 order-1">
          {showProductFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFilterSidebar}
              className={`flex items-center gap-2 whitespace-nowrap transition-colors ${
                isFilterSidebarOpen
                  ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                  : ''
              }`}
            >
              {isFilterSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
              Filters
              {activeFilters.length > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold text-white rounded-full bg-sky-500">
                  {activeFilters.length}
                </span>
              )}
            </Button>
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
