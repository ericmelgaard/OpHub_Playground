import { Check, AlertTriangle, Ban } from 'lucide-react';
import { DayCoverage } from '../lib/scheduleCoverage';
import { DAY_ABBR } from '../lib/availability';

interface ScheduleDaySelectorProps {
  coverage: DayCoverage[];
  selectedDay: number;
  onSelectDay: (dayOfWeek: number) => void;
  // Monday of the displayed week; null for the Default Week (no dates shown).
  weekStart: Date | null;
}

const statusStyles = {
  complete: {
    icon: Check,
    text: 'text-emerald-600 dark:text-emerald-300',
    tile: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
  },
  partial: {
    icon: AlertTriangle,
    text: 'text-amber-600 dark:text-amber-300',
    tile: 'bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700',
  },
  empty: {
    icon: Ban,
    text: 'text-red-600 dark:text-red-300',
    tile: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/70 hover:border-red-300 dark:hover:border-red-700',
  },
};

function statusLabel(c: DayCoverage): string {
  if (c.status === 'complete') return 'All set';
  if (c.status === 'empty') return 'Empty';
  return `${c.gaps} ${c.gaps === 1 ? 'gap' : 'gaps'}`;
}

export function ScheduleDaySelector({ coverage, selectedDay, onSelectDay, weekStart }: ScheduleDaySelectorProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Day">
      {coverage.map((c, idx) => {
        const isSelected = c.dayOfWeek === selectedDay;
        const style = statusStyles[c.status];
        const Icon = style.icon;
        let dateLabel = '';
        if (weekStart) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + idx);
          dateLabel = String(d.getDate());
        }

        return (
          <button
            key={c.dayOfWeek}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectDay(c.dayOfWeek)}
            title={c.totalSlots > 0 ? `${c.totalSlots - c.gaps} of ${c.totalSlots} slots filled` : undefined}
            className={`
              flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border-2 text-left transition-all duration-200 min-w-0
              ${isSelected
                ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-400 dark:border-sky-500 shadow-sm'
                : style.tile}
            `}
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              {DAY_ABBR[c.dayOfWeek]}{dateLabel && ` ${dateLabel}`}
            </span>
            <span className={`flex items-center gap-1 text-xs font-medium whitespace-nowrap ${style.text}`}>
              <Icon className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{statusLabel(c)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
