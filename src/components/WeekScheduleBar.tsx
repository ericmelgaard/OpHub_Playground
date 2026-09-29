import React, { useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Copy, Repeat, RotateCcw } from 'lucide-react';

interface WeekScheduleBarProps {
  selectedWeekOffset: number;
  onSelectWeek: (offset: number) => void;
  totalWeeks?: number;
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

function getWeekEndDate(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatWeekLabel(offset: number): string {
  if (offset === 0) return 'This Week';
  if (offset === 1) return 'Next Week';
  const start = getWeekStartDate(offset);
  return `Week of ${formatShortDate(start)}`;
}

export function getWeekStartString(weekOffset: number): string {
  const d = getWeekStartDate(weekOffset);
  return d.toISOString().split('T')[0];
}

const WEEK_COUNT = 8;

export function WeekScheduleBar({ selectedWeekOffset, onSelectWeek, totalWeeks = WEEK_COUNT }: WeekScheduleBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const weeks = useMemo(() =>
    Array.from({ length: totalWeeks }, (_, i) => {
      const start = getWeekStartDate(i);
      const end = getWeekEndDate(start);
      return {
        offset: i,
        start,
        end,
        label: formatWeekLabel(i),
        range: `${formatShortDate(start)} – ${formatShortDate(end)}`,
      };
    }), [totalWeeks]
  );

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = selectedRef.current;
      const left = el.offsetLeft - container.offsetLeft - 16;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [selectedWeekOffset]);

  const scrollBy = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => scrollBy(-1)}
        className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
        aria-label="Scroll weeks left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {weeks.map(week => {
          const isSelected = week.offset === selectedWeekOffset;
          const isCurrent = week.offset === 0;
          const isFuture = week.offset > 0;

          return (
            <button
              key={week.offset}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelectWeek(week.offset)}
              className={`
                flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border-2 transition-all duration-200
                ${isSelected
                  ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : isCurrent
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:border-sky-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-center gap-1.5">
                {isCurrent && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                )}
                <span className="text-xs font-semibold whitespace-nowrap">{week.label}</span>
              </div>
              <span className={`text-[10px] whitespace-nowrap ${isSelected ? 'text-sky-100' : 'text-gray-400 dark:text-gray-500'}`}>
                {week.range}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scrollBy(1)}
        className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
        aria-label="Scroll weeks right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

interface WeekActionsProps {
  selectedWeekOffset: number;
  onCopyWeek: () => void;
  onSetRecurring: () => void;
  onClearWeek: () => void;
  hasSchedule: boolean;
}

export function WeekActions({ selectedWeekOffset, onCopyWeek, onSetRecurring, onClearWeek, hasSchedule }: WeekActionsProps) {
  if (selectedWeekOffset === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCopyWeek}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-sky-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        title="Copy another week's schedule to this week"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy Week
      </button>
      <button
        onClick={onSetRecurring}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        title="Set this week to repeat on an interval"
      >
        <Repeat className="h-3.5 w-3.5" />
        Set Recurring
      </button>
      {hasSchedule && (
        <button
          onClick={onClearWeek}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Clear all items from this week"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear Week
        </button>
      )}
    </div>
  );
}
