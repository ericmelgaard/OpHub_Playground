import { useMemo, useRef, useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, LayoutTemplate, Copy, ClipboardPaste,
  Repeat, Eraser, RotateCcw, X, Check,
} from 'lucide-react';
import { DeviceWeekSchedule } from '../types';
import {
  getWeekStartDate, getWeekEndDate, getWeekStartString as libGetWeekStartString,
  getWeekState, WeekState,
} from '../lib/weekSchedule';

// Re-exported for existing importers.
export const getWeekStartString = libGetWeekStartString;

const WEEKS_BACK = 8;
const WEEKS_FORWARD = 8;

interface WeekScheduleBarProps {
  selectedWeekOffset: number;
  isDefaultSelected: boolean;
  onSelectWeek: (offset: number) => void;
  onSelectDefault: () => void;
  overrideWeekStarts: Set<string>;
  recurringSchedules: DeviceWeekSchedule[];
  clipboardActive: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onSetRecurring: (weeks: number) => void;
  onClearRecurring: () => void;
  onEmpty: () => void;
  onResetToDefault: () => void;
  onClose?: () => void;
  loadingSchedules?: boolean;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatWeekLabel(offset: number): string {
  if (offset === 0) return 'This Week';
  if (offset === 1) return 'Next Week';
  if (offset === -1) return 'Last Week';
  const start = getWeekStartDate(offset);
  return `Week of ${formatShortDate(start)}`;
}

const stateBadge: Record<WeekState, { label: string; className: string } | null> = {
  default: null,
  override: {
    label: 'Override',
    className: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  },
  recurring: {
    label: 'Recurring',
    className: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400',
  },
};

export function WeekScheduleBar({
  selectedWeekOffset,
  isDefaultSelected,
  onSelectWeek,
  onSelectDefault,
  overrideWeekStarts,
  recurringSchedules,
  clipboardActive,
  onCopy,
  onPaste,
  onSetRecurring,
  onClearRecurring,
  onEmpty,
  onResetToDefault,
  onClose,
  loadingSchedules = false,
}: WeekScheduleBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [recurOpen, setRecurOpen] = useState(false);
  const [recurN, setRecurN] = useState(2);

  const weeks = useMemo(() => {
    const list = [];
    for (let i = -WEEKS_BACK; i <= WEEKS_FORWARD; i++) {
      const start = getWeekStartDate(i);
      const end = getWeekEndDate(start);
      const weekStart = start.toISOString().split('T')[0];
      list.push({
        offset: i,
        weekStart,
        label: formatWeekLabel(i),
        range: `${formatShortDate(start)} – ${formatShortDate(end)}`,
        state: getWeekState(weekStart, overrideWeekStarts, recurringSchedules),
      });
    }
    return list;
  }, [overrideWeekStarts, recurringSchedules]);

  useEffect(() => {
    if (isDefaultSelected) return;
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = selectedRef.current;
      const left = el.offsetLeft - container.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [selectedWeekOffset, isDefaultSelected]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  const selectedWeek = weeks.find(w => w.offset === selectedWeekOffset);
  const selectedState = selectedWeek?.state ?? 'default';
  const isPast = selectedWeekOffset < 0;

  return (
    <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Week Schedule
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close schedule"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Default week + week strip */}
      <div className="flex items-stretch gap-2">
        {/* Default week card (always visible) */}
        <button
          onClick={onSelectDefault}
          className={`
            flex-shrink-0 flex flex-col items-start justify-center gap-0.5 px-3.5 py-2 rounded-xl border-2 transition-all duration-200 w-36
            ${isDefaultSelected
              ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-500/20'
              : 'bg-white dark:bg-gray-800 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:border-sky-300'
            }
          `}
          title="The default week is always applied unless a specific week overrides it"
        >
          <div className="flex items-center gap-1.5">
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold whitespace-nowrap">Default Week</span>
          </div>
          <span className={`text-[10px] whitespace-nowrap ${isDefaultSelected ? 'text-sky-100' : 'text-gray-400 dark:text-gray-500'}`}>
            Always carries forward
          </span>
        </button>

        <div className="w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

        <button
          onClick={() => scrollBy(-1)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-700 text-gray-400 transition-colors self-center"
          aria-label="Scroll weeks left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto scroll-smooth flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {weeks.map(week => {
            const isSelected = !isDefaultSelected && week.offset === selectedWeekOffset;
            const isCurrent = week.offset === 0;
            const badge = stateBadge[week.state];

            return (
              <button
                key={week.offset}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => onSelectWeek(week.offset)}
                className={`
                  flex-shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border-2 transition-all duration-200 min-w-[7.5rem]
                  ${isSelected
                    ? 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-500/20'
                    : isCurrent
                      ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:border-sky-400'
                      : week.offset < 0
                        ? 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
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
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] whitespace-nowrap ${isSelected ? 'text-sky-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    {week.range}
                  </span>
                  {badge && (
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${isSelected ? 'bg-white/20 text-white' : badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollBy(1)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-700 text-gray-400 transition-colors self-center"
          aria-label="Scroll weeks right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Actions for the current selection */}
      <div className="flex items-center gap-2 flex-wrap">
        {loadingSchedules && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-3 w-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            Loading…
          </span>
        )}

        <ActionButton icon={Copy} label={isDefaultSelected ? 'Copy Default' : 'Copy Week'} onClick={onCopy} />
        <ActionButton
          icon={ClipboardPaste}
          label="Paste"
          onClick={onPaste}
          disabled={!clipboardActive || isDefaultSelected}
          title={isDefaultSelected ? 'Paste into a specific week' : clipboardActive ? 'Paste copied schedule here' : 'Nothing copied yet'}
        />

        {!isDefaultSelected && !isPast && (
          <div className="relative">
            <ActionButton
              icon={Repeat}
              label={selectedState === 'recurring' ? 'Recurring ✓' : 'Set Recurring'}
              onClick={() => setRecurOpen(o => !o)}
              active={selectedState === 'recurring'}
            />
            {recurOpen && (
              <div className="absolute z-50 top-full mt-1.5 left-0 w-52 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg space-y-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Repeat every</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={recurN}
                    onChange={e => setRecurN(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                    className="w-16 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">week(s)</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => { onSetRecurring(recurN); setRecurOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" /> Apply
                  </button>
                  {selectedState === 'recurring' && (
                    <button
                      onClick={() => { onClearRecurring(); setRecurOpen(false); }}
                      className="px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!isDefaultSelected && (
          <>
            <ActionButton icon={Eraser} label="Empty Week" onClick={onEmpty} />
            {selectedState !== 'default' && (
              <ActionButton
                icon={RotateCcw}
                label="Reset to Default"
                onClick={onResetToDefault}
                variant="danger"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'danger';
  title?: string;
}

function ActionButton({ icon: Icon, label, onClick, disabled, active, variant = 'default', title }: ActionButtonProps) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = active
    ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
    : variant === 'danger'
      ? 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-sky-300 hover:text-sky-600 dark:hover:text-sky-400';
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
