import React from 'react';
import { X } from 'lucide-react';
import { FilterConfig, FilterType } from '../types';
import { Button } from './ui/button';

interface FilterCardProps {
  filter: FilterConfig;
  onEdit: () => void;
  onDelete: () => void;
}

const filterTypeLabels: Record<FilterType, string> = {
  daypart: 'Daypart',
  station: 'Station',
  menu_item_name: 'Item Name',
  menu_item_mrn: 'Item MRN',
  date: 'Date',
};

export const FilterCard: React.FC<FilterCardProps> = ({ filter, onEdit, onDelete }) => {
  const getFilterDisplay = () => {
    if (filter.type === 'date') {
      if (filter.singleDate) {
        return new Date(filter.singleDate).toLocaleDateString();
      }
      if (filter.dateRange) {
        const start = new Date(filter.dateRange.start).toLocaleDateString();
        const end = new Date(filter.dateRange.end).toLocaleDateString();
        return `${start} - ${end}`;
      }
    }

    const count = filter.selectedValues.length;
    if (count === 0) return 'None selected';
    if (count === 1) return filter.selectedValues[0];
    if (count === 2) return filter.selectedValues.join(', ');
    return `${filter.selectedValues.slice(0, 2).join(', ')}, +${count - 2}`;
  };

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
      onClick={onEdit}
      title={filter.selectedValues.join(', ')}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
          {filterTypeLabels[filter.type]}:
        </span>
        <span className="text-xs text-blue-700 dark:text-blue-300 max-w-[200px] truncate">
          {getFilterDisplay()}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-sm opacity-60 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
