import React, { useEffect } from 'react';
import { AlertCircle, Clock, MapPin } from 'lucide-react';
import { MenuItem as MenuItemComponent } from './MenuItem';
import { MenuItem as MenuItemType, Device, FilterConfig } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { levelIconColor } from '@/lib/levelColors';

interface GroupedItems {
  [key: string]: {
    mealPeriod: string;
    mealStation: string;
    items: MenuItemType[];
  };
}

interface MenuItemsProps {
  loading: boolean;
  error: string | null;
  menuItems: MenuItemType[];
  viewMode: 'grid' | 'tiles';
  selectedChannel: string | null;
  expandedItem: string | null;
  toggleItemExpansion: (itemId: number) => void;
  isItemInChannel: (itemId: number, channelId: string) => boolean;
  toggleItemInChannel: (item: MenuItemType, channelId: string) => void;
  setSelectedItem: (item: MenuItemType) => void;
  setShowDeviceModal: (show: boolean) => void;
  setShowPageSelectionModal: (show: boolean) => void;
  setWorkflowType: (type: 'manage' | 'assign' | null) => void;
  devices: Device[];
  onEdit?: (item: MenuItemType) => void;
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
  selectedChannel,
  expandedItem,
  toggleItemExpansion,
  isItemInChannel,
  toggleItemInChannel,
  setSelectedItem,
  setShowDeviceModal,
  setShowPageSelectionModal,
  setWorkflowType,
  devices,
  onEdit,
  searchValue = '',
  activeFilters = [],
  onFilteredCountChange,
  selectedCycleWeek,
  refreshTags,
}: MenuItemsProps) {
  const applyFilters = (item: MenuItemType): boolean => {
    if (activeFilters.length === 0) return true;

    return activeFilters.every(filter => {
      switch (filter.type) {
        case 'daypart':
          if (item.isGrouped && item.mealPeriods) {
            return filter.selectedValues.some(value => item.mealPeriods!.includes(value));
          }
          return filter.selectedValues.includes(item.mealPeriod);
        case 'station':
          if (item.isGrouped && item.mealStations) {
            return filter.selectedValues.some(value => item.mealStations!.includes(value));
          }
          return filter.selectedValues.includes(item.mealStation);
        case 'menu_item_name':
          return filter.selectedValues.some(value =>
            item.name.toLowerCase().includes(value.toLowerCase())
          );
        case 'menu_item_mrn':
          return filter.selectedValues.some(value =>
            item.mrn.toLowerCase().startsWith(value.toLowerCase())
          );
        case 'date':
          if (filter.singleDate) {
            return item.date === filter.singleDate;
          }
          if (filter.dateRange) {
            const itemDate = new Date(item.date);
            const startDate = new Date(filter.dateRange.start);
            const endDate = new Date(filter.dateRange.end);
            return itemDate >= startDate && itemDate <= endDate;
          }
          return true;
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
      (item.description?.toLowerCase().includes(searchValue.toLowerCase()) ?? false) ||
      (item.enticingDescription?.toLowerCase().includes(searchValue.toLowerCase()) ?? false);

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
            selectedChannel={selectedChannel}
            expandedItem={expandedItem}
            toggleItemExpansion={toggleItemExpansion}
            isItemInChannel={isItemInChannel}
            toggleItemInChannel={toggleItemInChannel}
            setSelectedItem={setSelectedItem}
            setShowDeviceModal={setShowDeviceModal}
            setShowPageSelectionModal={setShowPageSelectionModal}
            setWorkflowType={setWorkflowType}
            viewMode={viewMode}
            devices={devices}
            onEdit={onEdit}
            selectedCycleWeek={selectedCycleWeek}
            refreshTag={refreshTags?.get(item.id)}
          />
        ))}
      </div>
    );
  }

  // Group filtered items by meal period and station
  const groupedItems = filteredItems.reduce((acc: GroupedItems, item) => {
    const key = `${item.mealPeriod}-${item.mealStation}`;
    if (!acc[key]) {
      acc[key] = {
        mealPeriod: item.mealPeriod,
        mealStation: item.mealStation,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  // Sort groups by meal period and station
  const sortedGroups = Object.entries(groupedItems).sort(([, a], [, b]) => {
    const periodCompare = a.mealPeriod.localeCompare(b.mealPeriod);
    if (periodCompare !== 0) return periodCompare;
    return a.mealStation.localeCompare(b.mealStation);
  });

  return (
    <div className="space-y-6">
      {sortedGroups.map(([key, group]) => (
        <Card key={`group-${key}`} className="bg-white dark:bg-gray-800 overflow-hidden transition-colors">
          <div className="bg-sky-50 dark:bg-sky-900/50 px-4 py-3 border-b border-sky-100 dark:border-sky-900">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="font-medium text-sky-900 dark:text-sky-200">
                  {group.mealPeriod}
                </h3>
              </div>
              <div className="w-px h-4 bg-sky-200 dark:bg-sky-700" />
              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${levelIconColor('placement')}`} />
                <h3 className="font-medium text-sky-900 dark:text-sky-200">
                  {group.mealStation}
                </h3>
              </div>
            </div>
          </div>
          <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
            {group.items.map((item) => (
              <MenuItemComponent
                key={`list-${item.id}-${key}`}
                item={item}
                selectedChannel={selectedChannel}
                expandedItem={expandedItem}
                toggleItemExpansion={toggleItemExpansion}
                isItemInChannel={isItemInChannel}
                toggleItemInChannel={toggleItemInChannel}
                setSelectedItem={setSelectedItem}
                setShowDeviceModal={setShowDeviceModal}
                setShowPageSelectionModal={setShowPageSelectionModal}
                setWorkflowType={setWorkflowType}
                viewMode={viewMode}
                devices={devices}
                onEdit={onEdit}
                selectedCycleWeek={selectedCycleWeek}
                refreshTag={refreshTags?.get(item.id)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}