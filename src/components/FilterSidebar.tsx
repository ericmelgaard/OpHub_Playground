import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Hash,
  Type,
  Tag,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { levelIconColor } from '@/lib/levelColors';
import { DAY_ABBR } from '../lib/availability';
import { getWeekStartDate, WEEK_ORDER } from '../lib/weekSchedule';
import { FilterConfig, FilterType, MenuItem, Placement } from '../types';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  menuItems: MenuItem[];
  mode?: 'products' | 'smart-labels';
  placements?: Placement[];
  filteredCount?: number;
  totalCount?: number;
  // Products: days each product (by MRN) is on labels in the selected week; turns on the Usage section
  labelDaysByMrn?: Map<string, Set<number>>;
  // e.g. "Nov 16 – 22", shown in the Usage and Day sections
  usageWeekLabel?: string;
  // The Products week (0 = this week); the Day chips show its dates
  weekOffset?: number;
}

// Signage options (On signage, In use) join when signage exists
const USAGE_OPTIONS = [
  { value: 'labels', label: 'On labels' },
  { value: 'unused', label: 'Not in use' },
] as const;

interface SectionState {
  usage: boolean;
  daypart: boolean;
  station: boolean;
  menu_item_name: boolean;
  menu_item_mrn: boolean;
  date: boolean;
}

export function FilterSidebar({
  isOpen,
  onClose,
  activeFilters,
  onFiltersChange,
  menuItems,
  filteredCount,
  totalCount,
  labelDaysByMrn,
  usageWeekLabel,
  weekOffset = 0,
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<SectionState>({
    usage: true,
    daypart: true,
    station: true,
    menu_item_name: false,
    menu_item_mrn: false,
    date: false,
  });

  const [nameSearch, setNameSearch] = useState('');
  const [mrnSearch, setMrnSearch] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mrnDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const existingNameFilter = activeFilters.find(f => f.type === 'menu_item_name');
    if (existingNameFilter && existingNameFilter.selectedValues[0] !== nameSearch) {
      setNameSearch(existingNameFilter.selectedValues[0] || '');
    }
    const existingMrnFilter = activeFilters.find(f => f.type === 'menu_item_mrn');
    if (existingMrnFilter && existingMrnFilter.selectedValues[0] !== mrnSearch) {
      setMrnSearch(existingMrnFilter.selectedValues[0] || '');
    }
  }, []);

  const availableDayparts = Array.from(
    new Set(menuItems.map(item => item.mealPeriod).filter(Boolean))
  ).sort();

  const availableStations = Array.from(
    new Set(menuItems.map(item => item.mealStation).filter(Boolean))
  ).sort();

  const filteredStations = stationSearch
    ? availableStations.filter(s => s.toLowerCase().includes(stationSearch.toLowerCase()))
    : availableStations;

  const usageCounts = useMemo(() => {
    const onLabels = menuItems.filter(i => (labelDaysByMrn?.get(i.mrn)?.size ?? 0) > 0).length;
    return { labels: onLabels, unused: menuItems.length - onLabels } as Record<string, number>;
  }, [menuItems, labelDaysByMrn]);

  const getFilterValues = (type: FilterType): string[] => {
    const filter = activeFilters.find(f => f.type === type);
    return filter?.selectedValues || [];
  };

  const toggleSection = (section: keyof SectionState) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateCheckboxFilter = (type: FilterType, value: string, checked: boolean) => {
    const existing = activeFilters.find(f => f.type === type);
    let newValues: string[];

    if (existing) {
      newValues = checked
        ? [...existing.selectedValues, value]
        : existing.selectedValues.filter(v => v !== value);
    } else {
      newValues = checked ? [value] : [];
    }

    if (newValues.length === 0) {
      onFiltersChange(activeFilters.filter(f => f.type !== type));
    } else {
      const updatedFilter: FilterConfig = {
        id: existing?.id || `filter-${type}-${Date.now()}`,
        type,
        selectedValues: newValues,
      };
      if (existing) {
        onFiltersChange(activeFilters.map(f => f.type === type ? updatedFilter : f));
      } else {
        onFiltersChange([...activeFilters, updatedFilter]);
      }
    }
  };

  const handleNameChange = (value: string) => {
    setNameSearch(value);
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    nameDebounceRef.current = setTimeout(() => {
      if (value.trim()) {
        const existing = activeFilters.find(f => f.type === 'menu_item_name');
        const updatedFilter: FilterConfig = {
          id: existing?.id || `filter-name-${Date.now()}`,
          type: 'menu_item_name',
          selectedValues: [value.trim()],
        };
        if (existing) {
          onFiltersChange(activeFilters.map(f => f.type === 'menu_item_name' ? updatedFilter : f));
        } else {
          onFiltersChange([...activeFilters, updatedFilter]);
        }
      } else {
        onFiltersChange(activeFilters.filter(f => f.type !== 'menu_item_name'));
      }
    }, 300);
  };

  const handleMrnChange = (value: string) => {
    setMrnSearch(value);
    if (mrnDebounceRef.current) clearTimeout(mrnDebounceRef.current);
    mrnDebounceRef.current = setTimeout(() => {
      if (value.trim()) {
        const existing = activeFilters.find(f => f.type === 'menu_item_mrn');
        const updatedFilter: FilterConfig = {
          id: existing?.id || `filter-mrn-${Date.now()}`,
          type: 'menu_item_mrn',
          selectedValues: [value.trim()],
        };
        if (existing) {
          onFiltersChange(activeFilters.map(f => f.type === 'menu_item_mrn' ? updatedFilter : f));
        } else {
          onFiltersChange([...activeFilters, updatedFilter]);
        }
      } else {
        onFiltersChange(activeFilters.filter(f => f.type !== 'menu_item_mrn'));
      }
    }, 300);
  };

  const clearSection = (type: FilterType) => {
    onFiltersChange(activeFilters.filter(f => f.type !== type));
    if (type === 'menu_item_name') setNameSearch('');
    if (type === 'menu_item_mrn') setMrnSearch('');
  };

  const clearAll = () => {
    onFiltersChange([]);
    setNameSearch('');
    setMrnSearch('');
  };

  const activeFilterCount = activeFilters.length;

  // The Products week, Sun–Sat. Day filter values are JS day numbers (0 = Sun).
  const weekDays = (() => {
    const start = getWeekStartDate(weekOffset);
    const today = new Date().getDay();
    return WEEK_ORDER.map((day, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { day, label: DAY_ABBR[day], dateNum: date.getDate(), isToday: weekOffset === 0 && day === today };
    });
  })();
  const dayLabel = (v: string) => {
    const d = weekDays.find(w => String(w.day) === v);
    return d ? `${d.label} ${d.dateNum}` : v;
  };

  const hasActiveFilter = (type: FilterType): boolean => {
    return activeFilters.some(f => f.type === type && (f.selectedValues.length > 0 || f.singleDate || f.dateRange));
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    sectionKey,
    hasActive,
    iconClassName = 'text-gray-500 dark:text-gray-400',
  }: {
    title: string;
    icon: React.ElementType;
    iconClassName?: string;
    sectionKey: keyof SectionState;
    hasActive: boolean;
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-3 px-1 text-left group"
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconClassName}`} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</span>
        {hasActive && (
          <span className="w-2 h-2 rounded-full bg-sky-500" />
        )}
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      )}
    </button>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`
          fixed md:relative top-0 left-0 h-full md:h-auto z-50 md:z-0
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-full sm:w-80 md:w-72 lg:w-80' : 'w-0 md:w-0'}
          overflow-hidden flex-shrink-0
        `}
      >
        <div className="w-full sm:w-80 md:w-72 lg:w-80 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-white rounded-full bg-sky-500">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  Clear all
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results count */}
          {filteredCount !== undefined && totalCount !== undefined && (
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Showing</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {filteredCount} of {totalCount} {totalCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              {filteredCount < totalCount && (
                <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${totalCount > 0 ? (filteredCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map(filter => {
                  let label = '';
                  if (filter.type === 'daypart') {
                    label = filter.selectedValues.length === 1
                      ? filter.selectedValues[0]
                      : `${filter.selectedValues.length} dayparts`;
                  } else if (filter.type === 'station') {
                    label = filter.selectedValues.length === 1
                      ? filter.selectedValues[0]
                      : `${filter.selectedValues.length} stations`;
                  } else if (filter.type === 'usage') {
                    label = filter.selectedValues
                      .map(v => USAGE_OPTIONS.find(o => o.value === v)?.label ?? v)
                      .join(' or ');
                  } else if (filter.type === 'menu_item_name') {
                    label = `Name: ${filter.selectedValues[0]}`;
                  } else if (filter.type === 'menu_item_mrn') {
                    label = `ID: ${filter.selectedValues[0]}`;
                  } else if (filter.type === 'date') {
                    label = filter.selectedValues.length === 1
                      ? dayLabel(filter.selectedValues[0])
                      : `${filter.selectedValues.length} days`;
                  }
                  return (
                    <span
                      key={filter.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                    >
                      {label}
                      <button
                        onClick={() => clearSection(filter.type)}
                        className="ml-0.5 hover:text-sky-900 dark:hover:text-sky-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter sections */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
            {/* Usage Section (for the week in the week selector) */}
            {labelDaysByMrn && (
              <div className="border-b border-gray-100 dark:border-gray-800">
                <SectionHeader
                  title="Usage"
                  icon={Tag}
                  sectionKey="usage"
                  hasActive={hasActiveFilter('usage')}
                />
                {expandedSections.usage && (
                  <div className="pb-3 px-1 space-y-1">
                    {usageWeekLabel && <p className="px-2 pb-1 text-xs text-gray-500 dark:text-gray-400">{usageWeekLabel}</p>}
                    {USAGE_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={getFilterValues('usage').includes(option.value)}
                          onChange={(e) => updateCheckboxFilter('usage', option.value, e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5"
                        />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                        <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">{usageCounts[option.value]}</span>
                      </label>
                    ))}
                    {hasActiveFilter('usage') && (
                      <button
                        onClick={() => clearSection('usage')}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mt-1 px-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Dayparts Section */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <SectionHeader
                title="Dayparts"
                icon={Clock}
                sectionKey="daypart"
                hasActive={hasActiveFilter('daypart')}
              />
              {expandedSections.daypart && (
                <div className="pb-3 px-1 space-y-1">
                  {availableDayparts.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No dayparts available</p>
                  ) : (
                    <>
                      {availableDayparts.map(daypart => (
                        <label
                          key={daypart}
                          className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={getFilterValues('daypart').includes(daypart)}
                            onChange={(e) => updateCheckboxFilter('daypart', daypart, e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{daypart}</span>
                        </label>
                      ))}
                      {hasActiveFilter('daypart') && (
                        <button
                          onClick={() => clearSection('daypart')}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mt-1 px-2"
                        >
                          Clear
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Stations Section */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <SectionHeader
                title="Stations"
                icon={MapPin}
                iconClassName={levelIconColor('placement')}
                sectionKey="station"
                hasActive={hasActiveFilter('station')}
              />
              {expandedSections.station && (
                <div className="pb-3 px-1 space-y-1">
                  {availableStations.length > 8 && (
                    <div className="mb-2">
                      <Input
                        type="text"
                        placeholder="Search stations..."
                        value={stationSearch}
                        onChange={(e) => setStationSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                  {filteredStations.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No stations available</p>
                  ) : (
                    <>
                      <label
                        className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 mb-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={filteredStations.length > 0 && filteredStations.every(s => getFilterValues('station').includes(s))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const currentValues = getFilterValues('station');
                              const newValues = Array.from(new Set([...currentValues, ...filteredStations]));
                              const existing = activeFilters.find(f => f.type === 'station');
                              const updatedFilter: FilterConfig = {
                                id: existing?.id || `filter-station-${Date.now()}`,
                                type: 'station',
                                selectedValues: newValues,
                              };
                              if (existing) {
                                onFiltersChange(activeFilters.map(f => f.type === 'station' ? updatedFilter : f));
                              } else {
                                onFiltersChange([...activeFilters, updatedFilter]);
                              }
                            } else {
                              const currentValues = getFilterValues('station');
                              const newValues = currentValues.filter(v => !filteredStations.includes(v));
                              if (newValues.length === 0) {
                                onFiltersChange(activeFilters.filter(f => f.type !== 'station'));
                              } else {
                                const existing = activeFilters.find(f => f.type === 'station')!;
                                onFiltersChange(activeFilters.map(f => f.type === 'station' ? { ...existing, selectedValues: newValues } : f));
                              }
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5"
                        />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Select all</span>
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {filteredStations.map(station => (
                          <label
                            key={station}
                            className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={getFilterValues('station').includes(station)}
                              onChange={(e) => updateCheckboxFilter('station', station, e.target.checked)}
                              className="rounded border-gray-300 dark:border-gray-600 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{station}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Menu Item Name Section */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <SectionHeader
                title="Item name"
                icon={Type}
                sectionKey="menu_item_name"
                hasActive={hasActiveFilter('menu_item_name')}
              />
              {expandedSections.menu_item_name && (
                <div className="pb-3 px-1">
                  <Input
                    type="text"
                    placeholder="Type to filter by name..."
                    value={nameSearch}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-8 text-sm"
                  />
                  {hasActiveFilter('menu_item_name') && (
                    <button
                      onClick={() => clearSection('menu_item_name')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mt-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Menu Item MRN Section */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <SectionHeader
                title="Item ID"
                icon={Hash}
                sectionKey="menu_item_mrn"
                hasActive={hasActiveFilter('menu_item_mrn')}
              />
              {expandedSections.menu_item_mrn && (
                <div className="pb-3 px-1">
                  <Input
                    type="text"
                    placeholder="ID or linked source ID..."
                    value={mrnSearch}
                    onChange={(e) => handleMrnChange(e.target.value)}
                    className="h-8 text-sm"
                  />
                  {hasActiveFilter('menu_item_mrn') && (
                    <button
                      onClick={() => clearSection('menu_item_mrn')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mt-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Date Section */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <SectionHeader
                title="Day"
                icon={Calendar}
                sectionKey="date"
                hasActive={hasActiveFilter('date')}
              />
              {expandedSections.date && (
                <div className="pb-3 px-1 space-y-2">
                  <p className="px-1 text-xs text-gray-500 dark:text-gray-400">
                    {weekOffset === 0 ? 'This week' : 'Week'}{usageWeekLabel ? ` · ${usageWeekLabel}` : ''} · served or on labels that day
                  </p>
                  <div className="grid grid-cols-7 gap-1" role="group" aria-label="Days this week">
                    {weekDays.map(d => {
                      const selected = getFilterValues('date').includes(String(d.day));
                      return (
                        <button
                          key={d.day}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateCheckboxFilter('date', String(d.day), !selected)}
                          title={`${d.label} ${d.dateNum}${d.isToday ? ' (today)' : ''}`}
                          className={`flex flex-col items-center py-1.5 rounded-lg border text-xs transition-colors ${
                            selected
                              // Picked day: soft sky fill + sky-500 border, same as the label page day tiles
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300'
                              : d.isToday
                                ? 'border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className="font-medium">{d.label}</span>
                          <span className="text-[10px] tabular-nums opacity-80">{d.dateNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  {hasActiveFilter('date') && (
                    <button
                      onClick={() => clearSection('date')}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile footer */}
          <div className="md:hidden flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={onClose}
              className="w-full"
            >
              Show results
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}