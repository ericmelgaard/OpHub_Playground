import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

interface CycleWeekSelectorProps {
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
}

function getWeekStartDate(weekOffset: number): Date {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  monday.setDate(monday.getDate() + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDateLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const ord = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${months[date.getMonth()]} ${day}${ord}`;
}

const WEEK_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

export function CycleWeekSelector({ selectedWeek, onSelectWeek }: CycleWeekSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const weekLabels = useMemo(() =>
    WEEK_OPTIONS.map(offset => ({
      offset,
      date: getWeekStartDate(offset),
    })), []
  );

  const currentLabel = useMemo(() => {
    if (selectedWeek === 0) return 'This Week';
    if (selectedWeek === 1) return 'Next Week';
    const match = weekLabels.find(w => w.offset === selectedWeek);
    if (match) return `Week of ${formatDateLabel(match.date)}`;
    return 'This Week';
  }, [selectedWeek, weekLabels]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all duration-200 whitespace-nowrap ${
          dropdownOpen
            ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <Calendar className="h-4 w-4" />
        <span>{currentLabel}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-h-72 overflow-y-auto scrollbar-thin py-1">
            {weekLabels.map(({ offset, date }) => (
              <button
                key={offset}
                onClick={() => {
                  onSelectWeek(offset);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  selectedWeek === offset
                    ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {offset === 0 ? 'This Week' : offset === 1 ? 'Next Week' : `Week of ${formatDateLabel(date)}`}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {selectedWeek === offset && <Check className="h-4 w-4 text-sky-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
