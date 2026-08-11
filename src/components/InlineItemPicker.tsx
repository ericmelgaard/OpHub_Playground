import React, { useState, useMemo } from 'react';
import { MenuItem, DevicePage } from '../types';
import { Search, Plus, Check, Clock, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InlineItemPickerProps {
  menuItems: MenuItem[];
  page: DevicePage;
  onAddItems: (items: MenuItem[]) => void;
  recentlyAddedIds?: Set<number>;
}

export function InlineItemPicker({ menuItems, page, onAddItems, recentlyAddedIds }: InlineItemPickerProps) {
  const [search, setSearch] = useState('');
  const [mealPeriodFilter, setMealPeriodFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const assignedIds = useMemo(() => new Set(page.assignedItems.map(i => i.id)), [page.assignedItems]);

  const mealPeriods = useMemo(() => {
    const periods = Array.from(new Set(menuItems.map(i => i.mealPeriod).filter(Boolean)));
    return ['all', ...periods];
  }, [menuItems]);

  const stations = useMemo(() => {
    const stns = Array.from(new Set(menuItems.map(i => i.mealStation).filter(Boolean)));
    return ['all', ...stns];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !(item.description?.toLowerCase().includes(q) ?? false)) return false;
      }
      if (mealPeriodFilter !== 'all' && item.mealPeriod !== mealPeriodFilter) return false;
      if (stationFilter !== 'all' && item.mealStation !== stationFilter) return false;
      return true;
    });
  }, [menuItems, search, mealPeriodFilter, stationFilter]);

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAddSelected = () => {
    if (selectedIds.size === 0) return;
    const items = menuItems.filter(i => selectedIds.has(i.id) && !assignedIds.has(i.id));
    if (items.length > 0) onAddItems(items);
    setSelectedIds(new Set());
  };

  const handleQuickAdd = (item: MenuItem) => {
    onAddItems([item]);
  };

  const availableCount = filteredItems.filter(i => !assignedIds.has(i.id)).length;
  const selectedAvailable = Array.from(selectedIds).filter(id => !assignedIds.has(id)).length;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-sky-500" />
            Available Items
          </h4>
          <span className="text-xs text-gray-400">{availableCount} available</span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={mealPeriodFilter} onValueChange={setMealPeriodFilter}>
            <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {mealPeriods.map(p => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p === 'all' ? 'All Periods' : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
              <SelectValue placeholder="Station" />
            </SelectTrigger>
            <SelectContent>
              {stations.map(s => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s === 'all' ? 'All Stations' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400">
            No items found
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredItems.map(item => {
              const isAssigned = assignedIds.has(item.id);
              const isSelected = selectedIds.has(item.id);
              const isRecentlyAdded = recentlyAddedIds?.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => !isAssigned && toggleSelection(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                    isAssigned
                      ? 'opacity-50 bg-gray-100 dark:bg-gray-800/50'
                      : isSelected
                        ? 'bg-sky-50 dark:bg-sky-900/30 cursor-pointer'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
                  }`}
                >
                  {/* Checkbox / status */}
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {isAssigned ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : isSelected ? (
                      <div className="w-3.5 h-3.5 rounded border border-sky-500 bg-sky-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded border border-gray-300 dark:border-gray-600" />
                    )}
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isAssigned ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{item.mealStation}</span>
                      <span>{item.calories} cal</span>
                    </div>
                  </div>

                  {/* Price */}
                  <span className={`text-xs font-semibold flex-shrink-0 ${isAssigned ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    ${item.price}
                  </span>

                  {/* Quick add button */}
                  {!isAssigned && (
                    <button
                      onClick={e => { e.stopPropagation(); handleQuickAdd(item); }}
                      className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                        isRecentlyAdded
                          ? 'bg-green-500 text-white'
                          : 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white'
                      }`}
                      title="Add to label"
                    >
                      {isRecentlyAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: bulk add */}
      {selectedAvailable > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
          <button
            onClick={handleAddSelected}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add {selectedAvailable} item{selectedAvailable === 1 ? '' : 's'} to {page.daypart}
          </button>
        </div>
      )}
    </div>
  );
}
