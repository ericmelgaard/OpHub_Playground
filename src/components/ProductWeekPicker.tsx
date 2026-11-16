import { useState } from 'react';
import { CalendarDays, CalendarPlus, Check, ChevronDown, Repeat } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { formatWeekRange, WeekState } from '../lib/weekSchedule';

export interface ProductWeek {
  offset: number;      // 0 = this week
  weekStart: string;
  state: WeekState;
}

interface ProductWeekPickerProps {
  // This week and next week
  weeks: ProductWeek[];
  value: number;
  onChange: (offset: number) => void;
  // Opens Smart Labels → Schedule, where new weeks are planned
  onPlanAnother: () => void;
}

const weekName = (w: ProductWeek) =>
  w.offset === 0 ? 'This week' : w.offset === 1 ? 'Next week' : `Week of ${formatWeekRange(w.weekStart).split(' – ')[0]}`;

const stateText: Record<WeekState, string> = {
  default: 'Follows the Default Week · your first change gives it its own schedule',
  override: 'Has its own schedule',
  recurring: 'Recurring schedule',
};

// "Schedule lite": Products offers this week and next week. A week that follows the
// Default Week gets its own schedule on its first change, as on Smart Labels; later
// weeks are planned in Smart Labels → Schedule.
export function ProductWeekPicker({ weeks, value, onChange, onPlanAnother }: ProductWeekPickerProps) {
  const [open, setOpen] = useState(false);
  const current = weeks.find(w => w.offset === value) ?? weeks[0];
  if (!current) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${weekName(current)} · ${stateText[current.state]}`}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm whitespace-nowrap transition-colors ${
            value === 0
              ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              : 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
          }`}
        >
          <CalendarDays className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">{weekName(current)}</span>
          <span className="hidden sm:inline opacity-80">{formatWeekRange(current.weekStart)}</span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-1">
        <div role="listbox" aria-label="Week">
          {weeks.map(w => {
            const selected = w.offset === value;
            return (
              <button
                key={w.offset}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(w.offset); setOpen(false); }}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-md text-left text-sm transition-colors ${
                  selected
                    ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium">
                    {weekName(w)} <span className="font-normal text-gray-500 dark:text-gray-400">· {formatWeekRange(w.weekStart)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    {w.state === 'recurring' && <Repeat className="h-3 w-3" />}
                    {stateText[w.state]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => { setOpen(false); onPlanAnother(); }}
            className="w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-md text-left text-sm text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
          >
            <CalendarPlus className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-medium">Plan a later week</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Weeks after next are planned in Smart Labels → Schedule
              </span>
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
