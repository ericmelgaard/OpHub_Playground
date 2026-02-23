import React, { useState } from 'react';
import {
  X,
  Search,
  LayoutGrid,
  Rows,
  Clock,
  MapPin,
  AlertCircle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { MenuItem, Device } from '../types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ItemSelectionModalProps {
  show: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  selectedDevice: Device | null;
  onItemSelect: (items: MenuItem[]) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
  selectedMealPeriod: string;
  setSelectedMealPeriod: (period: string) => void;
  selectedStation: string;
  setSelectedStation: (station: string) => void;
  mealPeriods: string[];
  stations: string[];
  selectedPage: string | null;
}

export function ItemSelectionModal({
  show,
  onClose,
  menuItems,
  selectedDevice,
  onItemSelect,
  searchValue,
  setSearchValue,
  selectedMealPeriod,
  setSelectedMealPeriod,
  selectedStation,
  setSelectedStation,
  mealPeriods,
  stations,
  selectedPage,
}: ItemSelectionModalProps) {
  const [viewMode, setViewMode] = useState<'list' | 'tiles'>('list');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  if (!show) return null;

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (item.enticingDescription
        ?.toLowerCase()
        .includes(searchValue.toLowerCase()) ??
        false);
    const matchesMealPeriod =
      selectedMealPeriod === 'all' || item.mealPeriod === selectedMealPeriod;
    const matchesStation =
      selectedStation === 'all' || item.mealStation === selectedStation;
    return matchesSearch && matchesMealPeriod && matchesStation;
  });

  const toggleItemExpansion = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation();
    setExpandedItem(
      expandedItem === itemId.toString() ? null : itemId.toString()
    );
  };

  const toggleItemSelection = (item: MenuItem) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(item.id)) {
      newSelectedItems.delete(item.id);
    } else {
      newSelectedItems.add(item.id);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleAddSelected = () => {
    if (selectedItems.size === 0) return;
    const itemsToAdd = menuItems.filter((item) => selectedItems.has(item.id));
    if (itemsToAdd.length > 0) {
      onItemSelect(itemsToAdd);
      setSelectedItems(new Set());
      onClose();
    }
  };

  const getPageInfo = () => {
    if (!selectedDevice || !selectedPage) return null;
    const page = selectedDevice.pages.find((p) => p.id === selectedPage);
    if (!page) return null;
    return `Page ${page.name.split(' ')[1]} - ${page.daypart}`;
  };

  const pageInfo = getPageInfo();

  const renderListItem = (item: MenuItem) => (
    <div
      key={item.id}
      onClick={() => toggleItemSelection(item)}
      className={`px-4 py-3 transition-colors cursor-pointer group relative ${
        selectedItems.has(item.id)
          ? 'bg-indigo-50 dark:bg-indigo-900/50 border-l-4 border-indigo-500 dark:border-indigo-400'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  selectedItems.has(item.id)
                    ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-500 dark:bg-indigo-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {selectedItems.has(item.id) && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate flex-shrink-0 w-64">
                {item.name}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{item.calories} cal</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                ${item.price}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-4">
          {item.allergens && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => toggleItemExpansion(e, item.id)}
              className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <AlertCircle className="h-4 w-4" />
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expandedItem === item.id.toString()
                    ? 'transform rotate-180'
                    : ''
                }`}
              />
            </Button>
          )}
        </div>
      </div>

      {expandedItem === item.id.toString() && (
        <div className="mt-3 pl-[300px]">
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="p-3 space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description:
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.enticingDescription || item.description}
                </p>
              </div>
              {item.allergens && (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Allergens:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {item.allergens.split(', ').map((allergen) => (
                        <span
                          key={allergen}
                          className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs rounded-full"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nutrition:
                    </h4>
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>Protein: {item.nutrition.protein.value}g</div>
                      <div>Carbs: {item.nutrition.carbohydrates.value}g</div>
                      <div>Fat: {item.nutrition.fat.value}g</div>
                      <div>Sugar: {item.nutrition.sugar.value}g</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderTileItem = (item: MenuItem) => (
    <Card
      key={item.id}
      onClick={() => toggleItemSelection(item)}
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer ${
        selectedItems.has(item.id)
          ? 'ring-2 ring-indigo-500 dark:ring-indigo-400'
          : ''
      }`}
    >
      <CardContent className="p-6">
        <div className="absolute top-4 left-4">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              selectedItems.has(item.id)
                ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-500 dark:bg-indigo-400'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {selectedItems.has(item.id) && (
              <Check className="h-3 w-3 text-white" />
            )}
          </div>
        </div>

        <div className="flex items-start justify-between mb-4 pl-7">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 min-h-[3rem]">
              {item.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3 min-h-[4.5rem]">
              {item.enticingDescription || item.description}
            </p>
          </div>
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 ml-4 whitespace-nowrap">
            ${item.price}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {item.calories} calories
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {item.mealStation}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-container">
      <Card className="bg-white dark:bg-gray-800 rounded-lg w-full h-[90vh] max-w-6xl mx-4 flex flex-col modal-content">
        <CardHeader className="flex-shrink-0 p-6 border-b dark:border-gray-700 modal-header">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Items to Add
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedDevice?.name}
                {pageInfo && (
                  <>
                    <span className="mx-2">•</span>
                    {pageInfo}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleAddSelected}
                disabled={selectedItems.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedItems.size > 0
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check className="h-4 w-4" />
                Add Selected Items ({selectedItems.size})
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search items..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <Select
                value={selectedMealPeriod}
                onValueChange={setSelectedMealPeriod}
              >
                <SelectTrigger className="w-1/5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400">
                  <SelectValue placeholder="Select meal period" />
                </SelectTrigger>
                <SelectContent>
                  {mealPeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period === 'all' ? 'All Periods' : period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedStation}
                onValueChange={setSelectedStation}
              >
                <SelectTrigger className="w-1/5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station} value={station}>
                      {station === 'all' ? 'All Stations' : station}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  title="List view"
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Rows className="h-5 w-5" />
                </Button>
                <Button
                  variant={viewMode === 'tiles' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('tiles')}
                  title="Tile view"
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'tiles'
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto scrollbar-thin p-6 modal-body">
          {viewMode === 'list' ? (
            <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.map(renderListItem)}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(renderTileItem)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
