import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FilterConfig, FilterType, MenuItem, Placement } from '../types';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  menuItems: MenuItem[];
  selectedCycleWeek: number | null;
  onCycleWeekChange: (week: number | null) => void;
  mode?: 'products' | 'smart-labels';
  placements?: Placement[];
}

interface SectionState {
  week: boolean;
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
  selectedCycleWeek,
  onCycleWeekChange,
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<SectionState>({
    week: true,
    daypart: true,
    station: true,
    menu_item_name: false,
    menu_item_mrn: false,
    date: false,
  });

  const [nameSearch, setNameSearch] = useState('');
  const [mrnSearch, setMrnSearch] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
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
    const existingDateFilter = activeFilters.find(f => f.type === 'date');
    if (existingDateFilter) {
      if (existingDateFilter.singleDate) {
        setDateMode('single');
        setSelectedDate(existingDateFilter.singleDate);
      } else if (existingDateFilter.dateRange) {
        setDateMode('range');
        setRangeStart(existingDateFilter.dateRange.start);
        setRangeEnd(existingDateFilter.dateRange.end);
      }
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

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const existing = activeFilters.find(f => f.type === 'date');
    const updatedFilter: FilterConfig = {
      id: existing?.id || `filter-date-${Date.now()}`,
      type: 'date',
      selectedValues: [],
      singleDate: date,
    };
    if (existing) {
      onFiltersChange(activeFilters.map(f => f.type === 'date' ? updatedFilter : f));
    } else {
      onFiltersChange([...activeFilters, updatedFilter]);
    }
  };

  const handleRangeApply = () => {
    if (rangeStart && rangeEnd) {
      const existing = activeFilters.find(f => f.type === 'date');
      const updatedFilter: FilterConfig = {
        id: existing?.id || `filter-date-${Date.now()}`,
        type: 'date',
        selectedValues: [],
        dateRange: { start: rangeStart, end: rangeEnd },
      };
      if (existing) {
        onFiltersChange(activeFilters.map(f => f.type === 'date' ? updatedFilter : f));
      } else {
        onFiltersChange([...activeFilters, updatedFilter]);
      }
    }
  };

  const clearSection = (type: FilterType) => {
    onFiltersChange(activeFilters.filter(f => f.type !== type));
    if (type === 'menu_item_name') setNameSearch('');
    if (type === 'menu_item_mrn') setMrnSearch('');
    if (type === 'date') {
      setSelectedDate('');
      setRangeStart('');
      setRangeEnd('');
    }
  };

  const clearAll = () => {
    onFiltersChange([]);
    onCycleWeekChange(null);
    setNameSearch('');
    setMrnSearch('');
    setSelectedDate('');
    setRangeStart('');
    setRangeEnd('');
  };

  const activeFilterCount = activeFilters.length + (selectedCycleWeek ? 1 : 0);

  const getCurrentWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push({
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        date: date.toISOString().split('T')[0],
      });
    }
    return days;
  };

  const weekDays = getCurrentWeekDays();
  const today = new Date().toISOString().split('T')[0];

  const hasActiveFilter = (type: FilterType): boolean => {
    return activeFilters.some(f => f.type === type && (f.selectedValues.length > 0 || f.singleDate || f.dateRange));
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    sectionKey,
    hasActive,
  }: {
    title: string;
    icon: React.ElementType;
    sectionKey: keyof SectionState;
    hasActive: boolean;
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-3 px-1 text-left group"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
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
                  Clear All
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

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {selectedCycleWeek && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Week {selectedCycleWeek}
                    <button
                      onClick={() => onCycleWeekChange(null)}
                      className="ml-0.5 hover:text-sky-900 dark:hover:text-sky-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
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
                  } else if (filter.type === 'menu_item_name') {
                    label = `Name: ${filter.selectedValues[0]}`;
                  } else if (filter.type === 'menu_item_mrn') {
                    label = `MRN: ${filter.selectedValues[0]}`;
                  } else if (filter.type === 'date') {
                    if (filter.singleDate) {
                      label = new Date(filter.singleDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    } else if (filter.dateRange) {
                      label = 'Date range';
                    }
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
            {/* Week Section */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <SectionHeader
                title="Cycle Week"
                icon={Layers}
                sectionKey="week"
                hasActive={selectedCycleWeek !== null}
              />
              {expandedSections.week && (
                <div className="pb-3 px-1">
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map(week => (
                      <button
                        key={week}
                        onClick={() => onCycleWeekChange(selectedCycleWeek === week ? null : week)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          selectedCycleWeek === week
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        Week {week}{week === 1 ? ' (Current)' : ''}
                      </button>
                    ))}
                  </div>
                  {selectedCycleWeek && (
                    <button
                      onClick={() => onCycleWeekChange(null)}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

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
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Select All</span>
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
                title="Item Name"
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
                title="Item MRN"
                icon={Hash}
                sectionKey="menu_item_mrn"
                hasActive={hasActiveFilter('menu_item_mrn')}
              />
              {expandedSections.menu_item_mrn && (
                <div className="pb-3 px-1">
                  <Input
                    type="text"
                    placeholder="Enter MRN..."
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
                title="Date"
                icon={Calendar}
                sectionKey="date"
                hasActive={hasActiveFilter('date')}
              />
              {expandedSections.date && (
                <div className="pb-3 px-1 space-y-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDateMode('single')}
                      className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                        dateMode === 'single'
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Single Date
                    </button>
                    <button
                      onClick={() => setDateMode('range')}
                      className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                        dateMode === 'range'
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Date Range
                    </button>
                  </div>

                  {dateMode === 'single' && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Quick Select</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleDateSelect(today)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            selectedDate === today
                              ? 'bg-sky-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          Today
                        </button>
                        {weekDays.map(day => (
                          <button
                            key={day.date}
                            onClick={() => handleDateSelect(day.date)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              selectedDate === day.date
                                ? 'bg-sky-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleDateSelect(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {dateMode === 'range' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start</label>
                        <Input
                          type="date"
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End</label>
                        <Input
                          type="date"
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button
                        onClick={handleRangeApply}
                        disabled={!rangeStart || !rangeEnd}
                        size="sm"
                        className="w-full h-7 text-xs"
                      >
                        Apply Range
                      </Button>
                    </div>
                  )}

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
              className="w-full bg-sky-500 hover:bg-sky-600 text-white"
            >
              Show Results
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}