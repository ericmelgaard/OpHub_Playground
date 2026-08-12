import React from 'react';
import { LayoutGrid, Rows2 as Rows, Search, Camera, Plus, Layers, PanelLeftOpen, PanelLeftClose, Nfc, BatteryWarning, X } from 'lucide-react';
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
  selectedCycleWeek?: number | null;
  onScanLookup?: (query: string) => boolean;
  nfcSupported?: boolean;
  nfcScanning?: boolean;
  nfcError?: string | null;
  onNfcStart?: () => void;
  onNfcStop?: () => void;
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
  selectedCycleWeek,
  onScanLookup,
  nfcSupported = false,
  nfcScanning = false,
  nfcError = null,
  onNfcStart,
  onNfcStop,
}: MenuFiltersProps) {
  const handleScanBarcode = () => {
    console.log('Barcode scanning will be implemented when API is available');
  };

  const showProductFilters = selectedQuickAction === 'products';
  const showDeviceFilters = selectedQuickAction === 'smart-labels' || selectedQuickAction === 'groups';
  const showFilterToggle = selectedQuickAction === 'products' || selectedQuickAction === 'smart-labels';

  const totalActiveCount = activeFilters.length + (selectedCycleWeek ? 1 : 0);

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
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 order-2">
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
            className={`w-full pl-10 ${nfcSupported ? 'pr-20' : 'pr-12'} py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
          {nfcSupported && !nfcScanning && (
            <button
              onClick={() => onNfcStart?.()}
              title="Scan NFC tag"
              className="absolute right-2 top-1.5 p-1.5 rounded-md transition-all text-gray-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              <Nfc className="h-5 w-5" />
            </button>
          )}
          {nfcSupported && nfcScanning && (
            <div className="absolute right-2 top-1.5 pointer-events-none">
              <button
                onClick={() => onNfcStop?.()}
                title="Stop NFC scan"
                className="relative p-1.5 rounded-md bg-emerald-500 text-white nfc-pulse-glow z-10 pointer-events-auto"
              >
                <Nfc className="h-5 w-5" />
              </button>
              <span className="absolute inset-0 rounded-md bg-emerald-400 nfc-wave-ring" />
              <span className="absolute inset-0 rounded-md bg-emerald-400 nfc-wave-ring-delayed" />
            </div>
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

        {/* NFC scanning banner */}
        {nfcSupported && nfcScanning && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 order-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Scanning... tap a tag
              </span>
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-emerald-200 dark:border-emerald-800">
                <BatteryWarning className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-[11px] text-amber-600 dark:text-amber-400">Battery in use</span>
              </div>
            </div>
            <button
              onClick={() => onNfcStop?.()}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 underline-offset-2 hover:underline whitespace-nowrap"
            >
              Stop
            </button>
          </div>
        )}

        {/* NFC error banner */}
        {nfcSupported && nfcError && !nfcScanning && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 order-4">
            <X className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">NFC scan failed</span>
              <span className="text-xs text-red-600 dark:text-red-400">{nfcError}</span>
            </div>
            <button
              onClick={() => onNfcStart?.()}
              className="ml-auto text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline-offset-2 hover:underline whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        )}

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
