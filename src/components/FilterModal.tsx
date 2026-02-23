import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { FilterType, FilterConfig } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DateFilterPicker } from './DateFilterPicker';

interface FilterModalProps {
  show: boolean;
  onClose: () => void;
  onApply: (filter: FilterConfig) => void;
  filterType: FilterType;
  availableOptions: string[];
  existingFilter?: FilterConfig;
}

const filterTypeLabels: Record<FilterType, string> = {
  daypart: 'Dayparts',
  station: 'Stations',
  menu_item_name: 'Menu Item Names',
  menu_item_mrn: 'Menu Item MRNs',
  date: 'Date',
};

export const FilterModal: React.FC<FilterModalProps> = ({
  show,
  onClose,
  onApply,
  filterType,
  availableOptions,
  existingFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState<Set<string>>(
    new Set(existingFilter?.selectedValues || [])
  );
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState<string | undefined>(existingFilter?.singleDate);
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | undefined>(
    existingFilter?.dateRange
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return availableOptions;
    return availableOptions.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableOptions, searchTerm]);

  useEffect(() => {
    if (searchTerm && filterType !== 'date') {
      const matchingOptions = filteredOptions;
      const newSelected = new Set(selectedValues);
      matchingOptions.forEach((option) => newSelected.add(option));
      setSelectedValues(newSelected);
    }
  }, [searchTerm, filteredOptions, filterType]);

  const toggleValue = (value: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelectedValues(newSelected);
  };

  const selectAll = () => {
    setSelectedValues(new Set(availableOptions));
  };

  const clearAll = () => {
    setSelectedValues(new Set());
    setSearchTerm('');
  };

  const handleApply = () => {
    if (filterType === 'date') {
      const filter: FilterConfig = {
        id: existingFilter?.id || `filter-${Date.now()}`,
        type: filterType,
        selectedValues: [],
        singleDate: dateMode === 'single' ? selectedDate : undefined,
        dateRange: dateMode === 'range' ? selectedRange : undefined,
      };
      onApply(filter);
    } else {
      const filter: FilterConfig = {
        id: existingFilter?.id || `filter-${Date.now()}`,
        type: filterType,
        selectedValues: Array.from(selectedValues),
      };
      onApply(filter);
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Filter by {filterTypeLabels[filterType]}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filterType === 'date' ? (
            <DateFilterPicker
              selectedDate={selectedDate}
              selectedRange={selectedRange}
              onDateSelect={setSelectedDate}
              onRangeSelect={(start, end) => setSelectedRange({ start, end })}
              mode={dateMode}
              onModeChange={setDateMode}
            />
          ) : (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search and auto-select..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No options available
                  </p>
                ) : (
                  filteredOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.has(option)}
                        onChange={() => toggleValue(option)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1"
            disabled={
              filterType === 'date'
                ? dateMode === 'single'
                  ? !selectedDate
                  : !selectedRange
                : selectedValues.size === 0
            }
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
};
