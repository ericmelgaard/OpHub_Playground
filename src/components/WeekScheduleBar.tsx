import { useMemo, useRef, useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, LayoutTemplate, Copy, ClipboardPaste,
  Repeat, Eraser, RotateCcw, X, Check, CalendarDays, Clock, AlertTriangle,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger } from '@/components/ui/select';
import { daypartColor } from '../lib/daypartColors';
import { DeviceWeekSchedule } from '../types';
import {
  getWeekStartDate, getWeekEndDate, getWeekStartString as libGetWeekStartString,
  getWeekState, WeekState, formatEditingDay,
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
  // Labels whose items differ from the Default Week, for the header summary.
  differingLabelCount?: number;
  totalLabelCount?: number;
  // Day and daypart being edited; shared with every label you open
  selectedDay: number | 'every-day';
  onSelectDay: (day: number | 'every-day') => void;
  selectedDaypart: string;
  onSelectDaypart: (daypart: string) => void;
  dayparts: string[];
  // Empty label + daypart slots per day of week (0 = Sunday)
  gapsByDay?: Map<number, number>;
  // Labels opened this session for the current day and daypart
  reviewedCount?: number;
  shownLabelCount?: number;
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

const stateChip: Record<WeekState, { label: string; className: string }> = {
  default: {
    label: 'Default',
    className: 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  },
  override: {
    label: 'Override',
    className: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  recurring: {
    label: 'Recurring',
    className: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  },
};

// Bottom bar on each week tile. Recurring is dashed so it reads without relying on hue.
const stateBar: Record<WeekState, { className: string; style?: React.CSSProperties }> = {
  default: { className: 'bg-gray-300 dark:bg-gray-600' },
  override: { className: 'bg-teal-400' },
  recurring: {
    className: '',
    style: { backgroundImage: 'repeating-linear-gradient(90deg, rgb(167 139 250) 0 6px, transparent 6px 10px)' },
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
  differingLabelCount,
  totalLabelCount,
  selectedDay,
  onSelectDay,
  selectedDaypart,
  onSelectDaypart,
  dayparts,
  gapsByDay,
  reviewedCount,
  shownLabelCount,
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

  // Center the selected week. Measured after layout settles; jumps on first open, glides after.
  const hasCentered = useRef(false);
  useEffect(() => {
    if (isDefaultSelected) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const el = selectedRef.current;
      if (!container || !el) return;
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const left = container.scrollLeft + (eRect.left - cRect.left) - cRect.width / 2 + eRect.width / 2;
      container.scrollTo({ left, behavior: hasCentered.current ? 'smooth' : 'auto' });
      hasCentered.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedWeekOffset, isDefaultSelected]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  const selectedWeek = weeks.find(w => w.offset === selectedWeekOffset);
  const selectedState = selectedWeek?.state ?? 'default';
  const isPast = selectedWeekOffset < 0;
  const chip = stateChip[selectedState];

  const title = isDefaultSelected
    ? 'Default Week'
    : selectedWeek ? `${selectedWeek.label} · ${selectedWeek.range}` : '';

  const summary = isDefaultSelected
    ? 'Applies to every week without an override'
    : differingLabelCount !== undefined && totalLabelCount
      ? differingLabelCount === 0
        ? 'Same as Default for all labels'
        : `${differingLabelCount} of ${totalLabelCount} labels differ from Default`
      : null;

  return (
    <section
      aria-label="Week schedule"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60"
    >
      {/* Header: what is being edited */}
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700/70">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Editing
          </span>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{title}</span>
            {!isDefaultSelected && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${chip.className}`}>
                {chip.label}
              </span>
            )}
            {summary && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{summary}</span>
            )}
          </div>
        </div>

        {/* Day + daypart: own line under the title below lg, inline beside it from lg */}
        <div className="order-last lg:order-none basis-full lg:basis-auto flex items-center gap-2 flex-wrap">
          <DayPicker
            value={selectedDay}
            onChange={onSelectDay}
            weekStart={isDefaultSelected ? null : selectedWeek?.weekStart ?? null}
            gapsByDay={gapsByDay}
          />
          <DaypartPicker value={selectedDaypart} onChange={onSelectDaypart} dayparts={dayparts} />
          {reviewedCount !== undefined && shownLabelCount !== undefined && shownLabelCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{reviewedCount}</span> of {shownLabelCount} reviewed
            </span>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3.5 text-xs text-gray-500 dark:text-gray-400">
          <LegendSwatch state="default" label="Default" />
          <LegendSwatch state="override" label="Override" />
          <LegendSwatch state="recurring" label="Recurring" />
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close schedule"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Default week + week strip */}
      <div className="flex items-stretch gap-2 px-4 py-3">
        <button
          onClick={onSelectDefault}
          className={`
            flex-shrink-0 flex flex-col items-start justify-center gap-0.5 px-3 py-2 rounded-xl border w-36 transition-colors
            ${isDefaultSelected
              ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-400 dark:border-sky-400 text-gray-900 dark:text-white'
              : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
          title="The default week is always applied unless a specific week overrides it"
        >
          <span className="flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap">
            <LayoutTemplate className="h-3.5 w-3.5 text-sky-500" />
            Default Week
          </span>
          <span className="text-[11px] whitespace-nowrap text-gray-500 dark:text-gray-400">Base for every week</span>
        </button>

        <div className="w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

        <button
          onClick={() => scrollBy(-1)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors self-center"
          aria-label="Scroll weeks left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-stretch gap-1.5 overflow-x-auto scroll-smooth flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {weeks.map(week => {
            const isSelected = !isDefaultSelected && week.offset === selectedWeekOffset;
            const isCurrent = week.offset === 0;
            const bar = stateBar[week.state];

            return (
              <button
                key={week.offset}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => onSelectWeek(week.offset)}
                className={`
                  relative overflow-hidden flex-shrink-0 flex flex-col items-start gap-0.5 px-3 pt-2 pb-3 rounded-xl border min-w-[8rem] transition-colors
                  ${isSelected
                    ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-400 dark:border-sky-400 text-gray-900 dark:text-white'
                    : isCurrent
                      ? 'bg-white dark:bg-gray-900/60 border-sky-300 dark:border-sky-700 text-gray-900 dark:text-gray-100 hover:border-sky-400'
                      : week.offset < 0
                        ? 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
                title={stateChip[week.state].label}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
                  {isCurrent && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />}
                  {week.label}
                </span>
                <span className="text-[11px] whitespace-nowrap opacity-75">{week.range}</span>
                <span className={`absolute inset-x-0 bottom-0 h-1 ${bar.className}`} style={bar.style} />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollBy(1)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors self-center"
          aria-label="Scroll weeks right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Actions for the current selection */}
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-t border-gray-200 dark:border-gray-700/70 bg-gray-50 dark:bg-gray-900/40 rounded-b-xl">
        {loadingSchedules && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 mr-1">
            <span className="h-3 w-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            Loading…
          </span>
        )}

        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <SegmentButton icon={Copy} label={isDefaultSelected ? 'Copy default' : 'Copy week'} onClick={onCopy} />
          <SegmentButton
            icon={ClipboardPaste}
            label="Paste"
            onClick={onPaste}
            disabled={!clipboardActive || isDefaultSelected}
            title={isDefaultSelected ? 'Paste into a specific week' : clipboardActive ? 'Paste copied schedule here' : 'Nothing copied yet'}
            divider
          />
        </div>

        {!isDefaultSelected && !isPast && (
          <div className="relative">
            <ActionButton
              icon={Repeat}
              label={selectedState === 'recurring' ? 'Repeating' : 'Repeat…'}
              trailing={ChevronDown}
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
                    aria-label="Weeks between repeats"
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

        <span className="flex-1" />

        {!isDefaultSelected && (
          <>
            <button
              onClick={onEmpty}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Eraser className="h-3.5 w-3.5" />
              Empty week
            </button>
            {selectedState !== 'default' && (
              <ActionButton icon={RotateCcw} label="Reset to Default" onClick={onResetToDefault} variant="danger" />
            )}
          </>
        )}
      </div>
    </section>
  );
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const pickerTrigger = 'h-8 w-auto gap-2 rounded-lg px-2.5 text-sm font-medium focus:ring-sky-500 focus:ring-offset-0 dark:focus:ring-sky-400';

export function DayPicker({ value, onChange, weekStart, gapsByDay }: {
  value: number | 'every-day';
  onChange: (day: number | 'every-day') => void;
  weekStart: string | null;
  gapsByDay?: Map<number, number>;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={v => onChange(v === 'every-day' ? 'every-day' : Number(v))}
    >
      <SelectTrigger
        aria-label="Day"
        className={`${pickerTrigger} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
      >
        <CalendarDays className="h-4 w-4 text-sky-500 flex-shrink-0" />
        <span className="whitespace-nowrap">{formatEditingDay(value, weekStart)}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="every-day">Every day</SelectItem>
        <SelectSeparator />
        {WEEK_ORDER.map(d => {
          const gaps = gapsByDay?.get(d) ?? 0;
          return (
            <SelectItem key={d} value={String(d)}>
              <span className="flex items-center gap-2">
                {formatEditingDay(d, weekStart)}
                {gaps > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 h-4 px-1.5 text-[10px] font-semibold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    title={`${gaps} empty slot${gaps === 1 ? '' : 's'}`}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {gaps}
                  </span>
                )}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function DaypartPicker({ value, onChange, dayparts }: {
  value: string;
  onChange: (daypart: string) => void;
  dayparts: string[];
}) {
  const c = daypartColor(value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Daypart" className={`${pickerTrigger} ${c.softBg} ${c.border} ${c.text}`}>
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span className="whitespace-nowrap">{value}</span>
      </SelectTrigger>
      <SelectContent>
        {dayparts.map(d => (
          <SelectItem key={d} value={d}>
            <span className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${daypartColor(d).text}`} />
              {d}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LegendSwatch({ state, label }: { state: WeekState; label: string }) {
  const bar = stateBar[state];
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={`w-3.5 h-1 rounded-sm ${bar.className}`} style={bar.style} />
      {label}
    </span>
  );
}

type IconType = React.ComponentType<{ className?: string }>;

function SegmentButton({ icon: Icon, label, onClick, disabled, title, divider }: {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  divider?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${divider ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

interface ActionButtonProps {
  icon: IconType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'danger';
  title?: string;
  trailing?: IconType;
}

function ActionButton({ icon: Icon, label, onClick, disabled, active, variant = 'default', title, trailing: Trailing }: ActionButtonProps) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = active
    ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
    : variant === 'danger'
      ? 'bg-transparent border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-sky-300 hover:text-sky-600 dark:hover:text-sky-400';
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
      {Trailing && <Trailing className="h-3 w-3 opacity-70" />}
    </button>
  );
}
