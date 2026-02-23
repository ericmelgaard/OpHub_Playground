import React, { useState } from 'react';
import {
  LayoutGrid,
  Rows,
  Search,
  Building2,
  Store,
  Camera,
  Monitor,
  Plus,
  Database,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterCard } from './FilterCard';
import { FilterModal } from './FilterModal';
import { Placement, FilterConfig, FilterType, MenuItem } from '../types';
import { QuickActionType } from './QuickActionBar';

interface MenuFiltersProps {
  viewMode: 'grid' | 'tiles';
  setViewMode: (mode: 'grid' | 'tiles') => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedLocation?: {
    concept?: string;
    company?: string;
    store?: string;
  };
  selectedQuickAction: QuickActionType;
  onCreateItem: () => void;
  placements?: Placement[];
  selectedPlacement: string | null;
  setSelectedPlacement: (id: string | null) => void;
  activeFilters: FilterConfig[];
  onAddFilter: (filter: FilterConfig) => void;
  onEditFilter: (filter: FilterConfig) => void;
  onDeleteFilter: (filterId: string) => void;
  onClearAllFilters: () => void;
  menuItems: MenuItem[];
}

export function MenuFilters({
  viewMode,
  setViewMode,
  searchValue,
  setSearchValue,
  selectedLocation,
  selectedQuickAction,
  onCreateItem,
  placements = [],
  selectedPlacement,
  setSelectedPlacement,
  activeFilters,
  onAddFilter,
  onEditFilter,
  onDeleteFilter,
  onClearAllFilters,
  menuItems,
}: MenuFiltersProps) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType | null>(null);
  const [editingFilter, setEditingFilter] = useState<FilterConfig | null>(null);
  const [showFilterTypeMenu, setShowFilterTypeMenu] = useState(false);

  const handleScanBarcode = () => {
    console.log('Barcode scanning will be implemented when API is available');
  };

  const extractUniqueValues = (type: FilterType): string[] => {
    switch (type) {
      case 'daypart':
        return Array.from(new Set(menuItems.map((item) => item.mealPeriod).filter(Boolean)));
      case 'station':
        return Array.from(new Set(menuItems.map((item) => item.mealStation).filter(Boolean)));
      case 'menu_item_name':
        return Array.from(new Set(menuItems.map((item) => item.name).filter(Boolean)));
      case 'menu_item_mrn':
        return Array.from(new Set(menuItems.map((item) => item.mrn).filter(Boolean)));
      default:
        return [];
    }
  };

  const handleFilterTypeSelect = (type: FilterType) => {
    setSelectedFilterType(type);
    setShowFilterTypeMenu(false);
    setShowFilterModal(true);
    setEditingFilter(null);
  };

  const handleEditFilter = (filter: FilterConfig) => {
    setSelectedFilterType(filter.type);
    setEditingFilter(filter);
    setShowFilterModal(true);
  };

  const handleApplyFilter = (filter: FilterConfig) => {
    if (editingFilter) {
      onEditFilter(filter);
    } else {
      onAddFilter(filter);
    }
    setShowFilterModal(false);
    setEditingFilter(null);
  };

  const renderLocationInfo = () => {
    if (!selectedLocation) return null;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center text-sm">
        {selectedLocation.store && (
          <div className="flex items-center gap-1">
            <Store className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
              {selectedLocation.store}
            </span>
          </div>
        )}
        {selectedLocation.company && (
          <>
            <span className="hidden sm:inline text-gray-400 dark:text-gray-500 mx-2">
              •
            </span>
            <div className="flex items-center gap-1 mt-1 sm:mt-0">
              <Building2 className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                {selectedLocation.company}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderDataSourceIndicator = () => (
    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
      <Database className="h-3 w-3" />
      <span>Webtrition</span>
    </div>
  );

  const showProductFilters = selectedQuickAction === 'products';
  const showDeviceFilters = selectedQuickAction === 'smart-labels' || selectedQuickAction === 'groups';

  return (
    <div className="mb-8 space-y-4">
      {/* Filter Row - Compact single row */}
      {showProductFilters && (
        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
          {/* Add Filter Button with Dropdown */}
          <div className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterTypeMenu(!showFilterTypeMenu)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Filter className="h-4 w-4" />
              Add Filter
              <ChevronDown className="h-3 w-3" />
            </Button>

            {showFilterTypeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[180px]">
                <button
                  onClick={() => handleFilterTypeSelect('daypart')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Dayparts
                </button>
                <button
                  onClick={() => handleFilterTypeSelect('station')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Stations
                </button>
                <button
                  onClick={() => handleFilterTypeSelect('menu_item_name')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Menu Item Name
                </button>
                <button
                  onClick={() => handleFilterTypeSelect('menu_item_mrn')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                >
                  Menu Item MRN
                </button>
                <button
                  onClick={() => handleFilterTypeSelect('date')}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm rounded-b-lg"
                >
                  Date
                </button>
              </div>
            )}
          </div>

          {/* Filter Cards */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {activeFilters.map((filter) => (
              <FilterCard
                key={filter.id}
                filter={filter}
                onEdit={() => handleEditFilter(filter)}
                onDelete={() => onDeleteFilter(filter.id)}
              />
            ))}
          </div>

          {/* Clear All Button */}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAllFilters}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear All
            </Button>
          )}

          {/* Data Source Indicator */}
          <div className="flex-shrink-0 ml-auto">
            {renderDataSourceIndicator()}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        {/* Search Bar */}
        <div className="relative flex-1 order-2 sm:order-1">
          <Input
            type="text"
            placeholder={showDeviceFilters ? "Search devices..." : "Search menu items..."}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-12 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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
        <div className="flex items-center gap-2 order-1 sm:order-2">
          {showProductFilters && (
            <Button
              variant="secondary"
              onClick={onCreateItem}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/70"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Item</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'tiles' : 'grid')}
            className={`p-2 rounded-lg transition-colors ${
              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
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

      {/* Filter Modal */}
      {showFilterModal && selectedFilterType && (
        <FilterModal
          show={showFilterModal}
          onClose={() => {
            setShowFilterModal(false);
            setEditingFilter(null);
          }}
          onApply={handleApplyFilter}
          filterType={selectedFilterType}
          availableOptions={extractUniqueValues(selectedFilterType)}
          existingFilter={editingFilter || undefined}
        />
      )}
    </div>
  );
}
