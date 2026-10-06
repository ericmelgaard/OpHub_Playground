import React from 'react';
import { Device, DevicePage, LabelSize, ResolvedItem, Substitution, SubstitutionKey } from '../types';
import { getShownItems, DisplayToggleState } from '../lib/labelDisplay';

interface LabelAnchorProps {
  device: Device;
  activeDaypart: string | null;
  onSelectDaypart: (daypart: string | null) => void;
  selectedDay: number | 'every-day';
  onSelectDay: (day: number | 'every-day') => void;
  toggles: Record<string, Record<number, DisplayToggleState>>;
  substitutionMap: Map<SubstitutionKey, Substitution>;
  // Monday (YYYY-MM-DD) of the week being edited; dates are hidden without it
  weekStart?: string | null;
  highlightItemId?: number | null;
  onItemTap?: (resolved: ResolvedItem, e: React.MouseEvent) => void;
}

const DAYPART_COLORS: Record<string, string> = {
  'Breakfast': '#F59E0B',
  'Lunch': '#10B981',
  'Dinner': '#3B82F6',
  'Late Night': '#8B5CF6',
  'All Day': '#6B7280',
};
const daypartColor = (d: string) => DAYPART_COLORS[d] ?? '#0EA5E9';

// Fits the narrow page tiles; full names are in each tile's label
const SHORT_NAMES: Record<string, string> = { 'Breakfast': 'Bkfst', 'Late Night': 'Late', 'All Day': 'All day' };
const shortName = (d: string) => SHORT_NAMES[d] ?? d;

const ASPECT: Record<LabelSize, string> = {
  '2-inch': 'aspect-[3/2]',
  '3-inch': 'aspect-[4/3]',
  '4-inch': 'aspect-[3/2]',
  '7-inch': 'aspect-[4/3]',
  '11-inch': 'aspect-[5/3]',
};

// Mon–Sun in JS day numbers
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

function isPageLiveNow(page: DevicePage): boolean {
  if (!page.schedule) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= toMinutes(page.schedule.startTime) && mins < toMinutes(page.schedule.endTime);
}

const formatPrice = (price: string) => {
  const n = parseFloat(price);
  return isNaN(n) ? price : `$${n.toFixed(2)}`;
};

// Left column of the device page: the label as it will look, which page and day
// you're on, and how full each one is. Everything else on the page edits what's here.
export function LabelAnchor({
  device, activeDaypart, onSelectDaypart, selectedDay, onSelectDay,
  toggles, substitutionMap, weekStart, highlightItemId, onItemTap,
}: LabelAnchorProps) {
  const day = selectedDay === 'every-day' ? null : selectedDay;
  const today = new Date().getDay();
  const isAll = activeDaypart === null;
  const shownFor = (page: DevicePage, d: number | null) => getShownItems(page, d, toggles[page.id], substitutionMap);

  // "All" previews whichever page is on the label right now
  const previewPage = isAll
    ? device.pages.find(isPageLiveNow) ?? device.pages[0]
    : device.pages.find(p => p.daypart === activeDaypart) ?? device.pages[0];
  if (!previewPage) return null;

  const shown = shownFor(previewPage, day);
  const capacity = previewPage.displayCapacity;
  const color = daypartColor(previewPage.daypart);
  const thisWeek = (() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  })();
  const isLive = isPageLiveNow(previewPage) && day === today && (!weekStart || weekStart === thisWeek);

  const dateFor = (jsDay: number) => {
    if (!weekStart) return null;
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + ((jsDay + 6) % 7));
    return d.getDate();
  };

  // A day has open rows when the page (or any page, in All) shows fewer than it can
  const dayHasGaps = (jsDay: number) => (isAll ? device.pages : [previewPage])
    .some(p => shownFor(p, jsDay).length < p.displayCapacity);

  const tileClass = (selected: boolean) =>
    `flex flex-col p-1.5 rounded-xl border-2 text-left transition-colors min-h-[44px] ${
      selected
        ? 'bg-sky-50 dark:bg-slate-800 border-sky-500'
        : 'bg-white dark:bg-transparent border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
    }`;

  return (
    <aside className="grid grid-cols-1 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:flex lg:flex-col gap-x-5 gap-y-3 lg:gap-4 p-4 lg:w-[360px] flex-shrink-0 lg:overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-slate-800">
      {/* The label */}
      <div className="flex flex-col gap-2 sm:row-span-2">
        <div className="flex items-center gap-2 min-h-[22px]">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {isAll && 'Live page · '}{previewPage.daypart} · {day === null ? 'Every day' : DAY_LONG[day]}
          </span>
          {isLive && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              On the label now
            </span>
          )}
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-700 dark:bg-slate-800 border border-slate-600 shadow-lg">
          <div className={`${ASPECT[device.labelSize]} w-full rounded-md bg-[#F3F3EE] text-[#111] overflow-hidden flex flex-col`}>
            <div className="h-2 flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="flex items-baseline justify-between px-3 pt-1.5 pb-1">
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#3F3F3F] truncate">{previewPage.daypart}</span>
              {previewPage.schedule && (
                <span className="text-[10px] text-[#6B6B6B] flex-shrink-0">{previewPage.schedule.startTime} – {previewPage.schedule.endTime}</span>
              )}
            </div>

            {capacity === 1 ? (
              shown[0] ? (
                <button
                  onClick={(e) => onItemTap?.(shown[0], e)}
                  className={`flex-1 flex flex-col justify-center text-left px-3 pb-2 mx-1.5 mb-1.5 rounded-md border-2 ${
                    highlightItemId === shown[0].originalItemId ? 'border-sky-500 ring-4 ring-sky-500/25' : 'border-transparent'
                  }`}
                >
                  <span className="text-base font-bold leading-tight line-clamp-2">{shown[0].item.name}</span>
                  {shown[0].item.description && (
                    <span className="text-[10px] text-[#555] leading-snug line-clamp-2 mt-0.5">{shown[0].item.description}</span>
                  )}
                  <span className="flex items-end justify-between mt-auto pt-1">
                    <span className="text-[10px] text-[#5F5F5F]">{shown[0].item.calories} cal</span>
                    <span className="text-xl font-bold tabular-nums">{formatPrice(shown[0].item.price)}</span>
                  </span>
                </button>
              ) : (
                <EmptyRow />
              )
            ) : (
              <div className="flex-1 flex flex-col gap-0.5 px-1.5 pb-1.5 min-h-0">
                {Array.from({ length: capacity }, (_, i) => {
                  const r = shown[i];
                  if (!r) return <EmptyRow key={i} compact={capacity > 4} />;
                  const selected = highlightItemId === r.originalItemId;
                  return (
                    <button
                      key={r.originalItemId}
                      onClick={(e) => onItemTap?.(r, e)}
                      className={`flex-1 min-h-0 flex items-center gap-2 px-2 rounded-md border-2 text-left ${
                        selected ? 'border-sky-500 ring-4 ring-sky-500/25' : 'border-transparent hover:bg-black/5'
                      }`}
                    >
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className={`${capacity > 4 ? 'text-xs' : 'text-sm'} font-bold truncate`}>{r.item.name}</span>
                        {capacity <= 4 && <span className="text-[10px] text-[#5F5F5F]">{r.item.calories} cal</span>}
                      </span>
                      <span className={`${capacity > 4 ? 'text-xs' : 'text-base'} font-bold tabular-nums`}>{formatPrice(r.item.price)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pages */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-slate-400">Pages on this label</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-1.5">
          <button onClick={() => onSelectDaypart(null)} className={tileClass(isAll)} aria-pressed={isAll}>
            <span className="grid grid-cols-2 gap-[3px] h-10">
              {device.pages.slice(0, 4).map(p => (
                <span key={p.id} className="rounded-sm bg-[#F3F3EE] border-t-[3px]" style={{ borderTopColor: daypartColor(p.daypart) }} />
              ))}
            </span>
            <span className="mt-1 text-xs font-semibold text-gray-800 dark:text-slate-200">All</span>
          </button>
          {device.pages.map(p => {
            const s = shownFor(p, day);
            const full = s.length >= p.displayCapacity;
            const bars = Math.min(p.displayCapacity, 5);
            return (
              <button
                key={p.id}
                onClick={() => onSelectDaypart(p.daypart)}
                className={tileClass(activeDaypart === p.daypart)}
                aria-pressed={activeDaypart === p.daypart}
                aria-label={`${p.daypart}, ${s.length} of ${p.displayCapacity} showing`}
                style={activeDaypart === p.daypart ? { borderColor: daypartColor(p.daypart) } : undefined}
              >
                <span className="flex flex-col h-10 rounded-sm bg-[#F3F3EE] overflow-hidden">
                  <span className="h-1 flex-shrink-0" style={{ backgroundColor: daypartColor(p.daypart) }} />
                  <span className="flex-1 flex flex-col justify-center gap-[3px] px-1">
                    {Array.from({ length: bars }, (_, i) => (
                      <span
                        key={i}
                        className={i < s.length ? 'h-1 rounded-sm bg-[#2B2B2B]' : 'h-0.5 rounded-sm border border-dashed border-[#A8A8A0]'}
                      />
                    ))}
                  </span>
                </span>
                <span className="mt-1 text-[11px] font-semibold leading-tight text-gray-800 dark:text-slate-200 truncate">{shortName(p.daypart)}</span>
                <span className={`text-[10px] leading-tight tabular-nums ${full ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}`}>
                  {s.length}/{p.displayCapacity} showing
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Days */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-slate-400">Day</span>
        <div className="grid grid-cols-[1.4fr_repeat(7,minmax(0,1fr))] gap-1">
          <button
            onClick={() => onSelectDay('every-day')}
            aria-pressed={selectedDay === 'every-day'}
            className={`${dayTileClass(selectedDay === 'every-day')}`}
          >
            <span className="text-[10px] text-gray-500 dark:text-slate-400">Every</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">day</span>
          </button>
          {WEEK.map(d => {
            const date = dateFor(d);
            const gaps = dayHasGaps(d);
            return (
              <button
                key={d}
                onClick={() => onSelectDay(d)}
                aria-pressed={selectedDay === d}
                aria-label={`${DAY_LONG[d]}${gaps ? ', open rows on the label' : ', label full'}`}
                className={dayTileClass(selectedDay === d)}
              >
                <span className={`text-[10px] ${d === today ? 'font-bold text-sky-600 dark:text-sky-300' : 'text-gray-500 dark:text-slate-400'}`}>{DAY_ABBR[d]}</span>
                {date !== null && <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{date}</span>}
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${gaps ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

const dayTileClass = (selected: boolean) =>
  `h-14 flex flex-col items-center justify-center rounded-xl border-2 transition-colors ${
    selected
      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500'
      : 'bg-white dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
  }`;

function EmptyRow({ compact }: { compact?: boolean }) {
  return (
    <div className="flex-1 min-h-0 flex items-center px-2 rounded-md border-2 border-dashed border-[#C9C9C0] bg-[repeating-linear-gradient(135deg,#ECECE6_0_6px,#F3F3EE_6px_12px)]">
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} italic text-[#6F6F6F] truncate`}>Open — the next item added shows here</span>
    </div>
  );
}
