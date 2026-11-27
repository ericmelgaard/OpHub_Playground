import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { MenuItem as MenuItemComponent, PRODUCT_ROW_COLS } from './MenuItem';
import { MenuItem as MenuItemType, Device, FilterConfig } from '../types';
import { plainText } from '../lib/richText';
import { isCustomItem, matchesItemId } from '../lib/labelDisplay';
import { productDayparts } from '../lib/stations';
import { menuDaysInWeek, type LabelUse } from '../lib/weekSchedule';

interface MenuItemsProps {
  loading: boolean;
  error: string | null;
  menuItems: MenuItemType[];
  viewMode: 'grid' | 'list';
  setSelectedItem: (item: MenuItemType) => void;
  setShowDeviceModal: (show: boolean) => void;
  setWorkflowType: (type: 'manage' | 'assign' | null) => void;
  devices: Device[];
  onEdit?: (item: MenuItemType) => void;
  onOpen?: (item: MenuItemType) => void;
  // The product opened last (sky ring)
  lastOpenedMrn?: string | null;
  // Days each product (by MRN) is on labels in the selected week
  labelDaysByMrn?: Map<string, Set<number>>;
  // Dayparts and stations each product is on labels (custom products take theirs from here)
  labelUseByMrn?: Map<string, LabelUse>;
  searchValue?: string;
  activeFilters?: FilterConfig[];
  onFilteredCountChange?: (count: number) => void;
  selectedCycleWeek?: number;
  // Products added or changed by the last refresh, shown with a badge
  refreshTags?: Map<number, 'new' | 'updated'>;
}

export function MenuItems({
  loading,
  error,
  menuItems,
  viewMode,
  setSelectedItem,
  setShowDeviceModal,
  setWorkflowType,
  devices,
  onEdit,
  onOpen,
  lastOpenedMrn,
  labelDaysByMrn,
  labelUseByMrn,
  searchValue = '',
  activeFilters = [],
  onFilteredCountChange,
  selectedCycleWeek,
  refreshTags,
}: MenuItemsProps) {
  // Days picked in the Day filter, underlined in each product's day strip
  const markDays = activeFilters.find(f => f.type === 'date')?.selectedValues.map(Number);

  const applyFilters = (item: MenuItemType): boolean => {
    if (activeFilters.length === 0) return true;

    return activeFilters.every(filter => {
      switch (filter.type) {
        case 'daypart': {
          // The product's own dayparts; none means it's offered at all of them
          const dayparts = productDayparts(item);
          return dayparts.length === 0 || filter.selectedValues.some(value => dayparts.includes(value));
        }
        case 'station':
          if (isCustomItem(item)) {
            return filter.selectedValues.some(value => labelUseByMrn?.get(item.mrn)?.stations.has(value));
          }
          if (item.isGrouped && item.mealStations) {
            return filter.selectedValues.some(value => item.mealStations!.includes(value));
          }
          return filter.selectedValues.includes(item.mealStation);
        case 'usage': {
          // Same week as the day strips
          const onLabels = (labelDaysByMrn?.get(item.mrn)?.size ?? 0) > 0;
          return filter.selectedValues.some(v => (v === 'labels' ? onLabels : !onLabels));
        }
        case 'menu_item_name':
          return filter.selectedValues.some(value =>
            item.name.toLowerCase().includes(value.toLowerCase())
          );
        case 'menu_item_mrn':
          return filter.selectedValues.some(value => matchesItemId(item, value));
        case 'date': {
          // Days in the Products week (0–6): the source serves it that day or a label uses
          // it that day — the same two things the day strip shows
          const days = new Set(menuDaysInWeek(item, selectedCycleWeek ?? 0));
          labelDaysByMrn?.get(item.mrn)?.forEach(d => days.add(d));
          return filter.selectedValues.some(v => days.has(Number(v)));
        }
        case 'week':
          return true;
        default:
          return true;
      }
    });
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = searchValue.trim() === '' ||
      item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      plainText(item.displayName).toLowerCase().includes(searchValue.toLowerCase()) ||
      plainText(item.description).toLowerCase().includes(searchValue.toLowerCase()) ||
      plainText(item.enticingDescription).toLowerCase().includes(searchValue.toLowerCase());

    const matchesFilters = applyFilters(item);

    return matchesSearch && matchesFilters;
  });

  useEffect(() => {
    onFilteredCountChange?.(filteredItems.length);
  }, [filteredItems.length, onFilteredCountChange]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 dark:border-sky-400 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading menu items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {searchValue || activeFilters.length > 0
            ? 'No items match your search criteria'
            : 'No menu items available at this time'}
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    const gridColumns = filteredItems.length <= 3 
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : filteredItems.length <= 6 
      ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4';

    return (
      <div className={`grid ${gridColumns} gap-6`}>
        {filteredItems.map((item) => (
          <MenuItemComponent
            key={`grid-${item.id}`}
            item={item}
            setSelectedItem={setSelectedItem}
            setShowDeviceModal={setShowDeviceModal}
            setWorkflowType={setWorkflowType}
            viewMode={viewMode}
            devices={devices}
            onEdit={onEdit}
            onOpen={onOpen}
            lastOpened={!!lastOpenedMrn && item.mrn === lastOpenedMrn}
            labelDays={labelDaysByMrn?.get(item.mrn)}
            markDays={markDays}
            labelUse={labelUseByMrn?.get(item.mrn)}
            selectedCycleWeek={selectedCycleWeek}
            refreshTag={refreshTags?.get(item.id)}
          />
        ))}
      </div>
    );
  }

  // One flat list; daypart and station are filters, so they don't split it up
  const sortedItems = [...filteredItems].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className={`hidden lg:grid ${PRODUCT_ROW_COLS} gap-3 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700`}>
        <span>Product</span>
        <span>Dayparts</span>
        <span>Stations</span>
        <span>Days</span>
        <span>Calories</span>
        <span>Price</span>
        <span />
      </div>

      {sortedItems.map((item) => (
        <MenuItemComponent
          key={`list-${item.id}`}
          item={item}
          setSelectedItem={setSelectedItem}
          setShowDeviceModal={setShowDeviceModal}
          setWorkflowType={setWorkflowType}
          viewMode={viewMode}
          devices={devices}
          onEdit={onEdit}
          onOpen={onOpen}
          lastOpened={!!lastOpenedMrn && item.mrn === lastOpenedMrn}
          labelDays={labelDaysByMrn?.get(item.mrn)}
          markDays={markDays}
          labelUse={labelUseByMrn?.get(item.mrn)}
          selectedCycleWeek={selectedCycleWeek}
          refreshTag={refreshTags?.get(item.id)}
        />
      ))}
    </div>
  );
}