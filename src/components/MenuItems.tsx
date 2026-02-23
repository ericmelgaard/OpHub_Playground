import React from 'react';
import { AlertCircle, Clock, MapPin } from 'lucide-react';
import { MenuItem as MenuItemComponent } from './MenuItem';
import { MenuItem as MenuItemType, Device } from '../types';
import { Card, CardContent } from '@/components/ui/card';

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
  selectedMealPeriod?: string;
  selectedStation?: string;
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
  selectedMealPeriod = 'all',
  selectedStation = 'all'
}: MenuItemsProps) {
  console.log('MenuItems Props:', {
    loading,
    error,
    menuItemsCount: menuItems.length,
    selectedChannel,
    searchValue,
    selectedMealPeriod,
    selectedStation,
    menuItems // Log full items for inspection
  });

  // Filter items based on search and filters
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = searchValue.trim() === '' || 
      item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchValue.toLowerCase()) ?? false) ||
      (item.enticingDescription?.toLowerCase().includes(searchValue.toLowerCase()) ?? false);

    const matchesMealPeriod = selectedMealPeriod === 'all' || 
      item.mealPeriod === selectedMealPeriod;

    const matchesStation = selectedStation === 'all' || 
      item.mealStation === selectedStation;

    const matches = matchesSearch && matchesMealPeriod && matchesStation;
    
    // Log individual item filtering results for debugging
    console.log('Item Filter:', {
      itemName: item.name,
      matchesSearch,
      matchesMealPeriod,
      matchesStation,
      included: matches
    });

    return matches;
  });

  console.log('Filtered Items:', filteredItems);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
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
          {searchValue || selectedMealPeriod !== 'all' || selectedStation !== 'all'
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
          <div className="bg-indigo-50 dark:bg-indigo-900/50 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-medium text-indigo-900 dark:text-indigo-200">
                  {group.mealPeriod}
                </h3>
              </div>
              <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-700" />
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-medium text-indigo-900 dark:text-indigo-200">
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
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}