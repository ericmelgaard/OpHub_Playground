import React from 'react';
import { LayoutGrid, Rows2 as Rows, Search, Camera, Layers, PanelLeftOpen, PanelLeftClose, Nfc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterConfig, MenuItem } from '../types';
import { QuickActionType } from './QuickActionBar';
import { CycleWeekSelector } from './CycleWeekSelector';

interface MenuFiltersProps {
  viewMode: 'grid' | 'tiles';
  setViewMode: (mode: 'grid' | 'tiles') => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedQuickAction: QuickActionType;
  activeFilters: FilterConfig[];
  onToggleFilterSidebar: () => void;
  isFilterSidebarOpen: boolean;
  menuItems: MenuItem[];
  groupByMrn?: boolean;
  onToggleGroupByMrn?: () => void;
  onScanLookup?: (query: string) => boolean;
  nfcSupported?: boolean;
  nfcScanning?: boolean;
  onNfcStart?: () => void;
  onNfcStop?: () => void;
  selectedCycleWeek?: number;
  onCycleWeekChange?: (week: number) => void;
}

export function MenuFilters({
  viewMode,
  setViewMode,
  searchValue,
  setSearchValue,
  selectedQuickAction,
  activeFilters,
  onToggleFilterSidebar,
  isFilterSidebarOpen,
  groupByMrn = false,
  onToggleGroupByMrn,
  onScanLookup,
  nfcSupported = false,
  nfcScanning = false,
  onNfcStart,
  onNfcStop,
  selectedCycleWeek,
  onCycleWeekChange,
}: MenuFiltersProps) {
  const handleScanBarcode = () => {
    console.log('Barcode scanning will be implemented when API is available');
  };

  const showProductFilters = selectedQuickAction === 'products';
  const showDeviceFilters = selectedQuickAction === 'smart-labels' || selectedQuickAction === 'groups';
  const showFilterToggle = selectedQuickAction === 'products' || selectedQuickAction === 'smart-labels';

  const totalActiveCount = activeFilters.length;

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Left side - Filters toggle button */}
        <div className="flex items-center gap-3 order-1">
          {showFilterToggle && (
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
          )}
          {showProductFilters && selectedCycleWeek !== undefined && onCycleWeekChange && (
            <CycleWeekSelector
              selectedWeek={selectedCycleWeek}
              onSelectWeek={onCycleWeekChange}
            />
          )}
        </div>

        {/* Search Bar */}
        <div className={`relative flex-1 order-2 transition-all ${nfcSupported && nfcScanning ? 'nfc-listening-ring' : ''}`}>
          <Input
            type="text"
            placeholder={selectedQuickAction === 'smart-labels' ? "Search by product name, tag ID, or location..." : showDeviceFilters ? "Search displays..." : "Search menu items..."}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onScanLookup && searchValue.trim()) {
                onScanLookup(searchValue);
              }
            }}
            className={`w-full pl-10 ${nfcSupported ? 'pr-28' : 'pr-12'} py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
              nfcSupported && nfcScanning
                ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-400/40 dark:ring-blue-500/40'
                : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
            }`}
          />
          <Search className={`absolute left-3 top-2.5 h-5 w-5 ${
            nfcSupported && nfcScanning ? 'text-blue-400 dark:text-blue-500' : 'text-gray-400 dark:text-gray-500'
          }`} />
          {nfcSupported && (
            <button
              onClick={() => nfcScanning ? onNfcStop?.() : onNfcStart?.()}
              title={nfcScanning ? "Stop NFC scan" : "Scan NFC tag"}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                nfcScanning
                  ? 'bg-blue-500 text-white nfc-pulse-glow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              <Nfc className="h-4 w-4" />
              <span>{nfcScanning ? 'Scanning' : 'Scan'}</span>
            </button>
          )}
          {!nfcSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleScanBarcode}
              className="md:hidden absolute right-2 top-1.5 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Scan barcode"
            >
              <Camera className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 order-3">
          {showProductFilters && (
            <>
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
