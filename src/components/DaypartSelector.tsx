import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Device } from '../types';

interface DaypartSelectorProps {
  devices: Device[];
  selectedDaypart: string;
  onSelectDaypart: (daypart: string) => void;
}

const daypartOrder = ['Breakfast', 'Lunch', 'Dinner', 'Late Night', 'All Day'];

const getDaypartColor = (daypart: string) => {
  switch (daypart) {
    case 'Breakfast':
      return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-400', softBg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700' };
    case 'Lunch':
      return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-400', softBg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700' };
    case 'Dinner':
      return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', ring: 'ring-blue-400', softBg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700' };
    case 'Late Night':
      return { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500', ring: 'ring-violet-400', softBg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-300 dark:border-violet-700' };
    default:
      return { text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500', ring: 'ring-gray-400', softBg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-300 dark:border-gray-700' };
  }
};

export function DaypartSelector({ devices, selectedDaypart, onSelectDaypart }: DaypartSelectorProps) {
  const daypartCounts = React.useMemo(() => {
    const counts: Record<string, { total: number; empty: number }> = {};
    devices.forEach(device => {
      device.pages.forEach(page => {
        if (!counts[page.daypart]) counts[page.daypart] = { total: 0, empty: 0 };
        counts[page.daypart].total += page.assignedItems.length;
        if (page.assignedItems.length === 0) counts[page.daypart].empty += 1;
      });
    });
    return counts;
  }, [devices]);

  const dayparts = React.useMemo(() => {
    const seen = new Set<string>();
    devices.forEach(d => d.pages.forEach(p => seen.add(p.daypart)));
    return Array.from(seen).sort((a, b) => {
      const ai = daypartOrder.indexOf(a);
      const bi = daypartOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [devices]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      {dayparts.map(daypart => {
        const colors = getDaypartColor(daypart);
        const isSelected = selectedDaypart === daypart;
        const count = daypartCounts[daypart]?.total ?? 0;
        const emptyCount = daypartCounts[daypart]?.empty ?? 0;

        return (
          <button
            key={daypart}
            onClick={() => onSelectDaypart(daypart)}
            className={`
              flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 flex-shrink-0
              ${isSelected
                ? `${colors.softBg} ${colors.border} shadow-sm`
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${isSelected ? colors.text : 'text-gray-400 dark:text-gray-500'}`} />
              <span className={`text-sm font-medium whitespace-nowrap ${isSelected ? colors.text : 'text-gray-700 dark:text-gray-300'}`}>
                {daypart}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`
                inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full
                ${isSelected ? `${colors.bg} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
              `}>
                {count}
              </span>
              {emptyCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" title={`${emptyCount} label${emptyCount === 1 ? '' : 's'} with no items assigned`}>
                  <AlertTriangle className="h-3 w-3" />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
