import { DAY_ABBR } from '../lib/availability';
import { WEEK_ORDER } from '../lib/weekSchedule';

// A product's day has two independent parts:
// - Outline: the product's source (the API feeding products in; Webtrition today) offers it that day.
// - Fill (and letter color): how it's used here that week — none when unused, soft sky on labels.
//   Labels and signage get their own colors once signage exists; until then labels use the accent.
// Lists and cards show one strip; the product sheet shows a row per source.


type Use = 'none' | 'labels' | 'signage';

// Letter color, and the outline's color when the source offers the day.
// Contrast on the card (white / gray-800) is at least 4.5:1 for every letter.
// Use is a soft fill (it changes the pill's brightness, so it reads apart from gray at a glance).
const COLOR: Record<Use, { text: string; outline: string; fill: string }> = {
  none: { text: 'text-gray-700 dark:text-gray-200', outline: 'border-gray-500 dark:border-gray-400', fill: '' },
  labels: { text: 'text-sky-800 dark:text-sky-200', outline: 'border-brand dark:border-sky-400', fill: 'bg-sky-100 dark:bg-sky-900/60' },
  // Placeholder until signage exists and its color is decided
  signage: { text: 'text-sky-900 dark:text-sky-100', outline: 'border-sky-900 dark:border-sky-200', fill: 'bg-sky-200 dark:bg-sky-800' },
};
// Unused and not offered: quieter, but still readable
const FAINT = 'text-gray-500 dark:text-gray-400';

const sizes = {
  sm: 'h-5 w-5 text-[10px] rounded',
  md: 'h-7 w-7 text-[11px] rounded-md',
};

interface DayUse {
  menuDays: number[];
  labelDays?: Set<number>;
  // Not built yet
  signageDays?: Set<number>;
}

// How labels + signage on the same day should look is still open; until signage exists it can't happen
const useOf = (onLabels: boolean, onSignage: boolean): Use => (onSignage ? 'signage' : onLabels ? 'labels' : 'none');

function describe(d: number, onMenu: boolean, onLabels: boolean, onSignage: boolean) {
  const use = onLabels && onSignage ? 'on labels and signage' : onLabels ? 'on labels' : onSignage ? 'on signage' : 'not used';
  return `${DAY_ABBR[d]} · ${onMenu ? 'offered by the source' : 'not offered by the source'} · ${use}`;
}

export function dayClass(onMenu: boolean, use: Use) {
  const outline = onMenu ? `border-2 ${COLOR[use].outline}` : 'border-2 border-transparent';
  const text = !onMenu && use === 'none' ? FAINT : COLOR[use].text;
  return `${outline} ${COLOR[use].fill} ${text}`;
}

// One strip (lists and cards)
// `markDays`: the picked day(s) — the day being edited on a label page, or the Day filter on
// Products — get a short sky bar underneath (the strip's own sky fill and outline already mean
// "on labels" and "served", so the pick can't be another fill or border).
export function ProductDayStrip({ menuDays, labelDays, signageDays, size = 'sm', markDays }: DayUse & { size?: 'sm' | 'md'; markDays?: number[] }) {
  const marking = (markDays?.length ?? 0) > 0;
  return (
    <div className="flex gap-0.5" data-guide="day-strip">
      {WEEK_ORDER.map(d => {
        const onMenu = menuDays.includes(d);
        const onLabels = !!labelDays?.has(d);
        const onSignage = !!signageDays?.has(d);
        const marked = !!markDays?.includes(d);
        const pill = (
          <span
            key={d}
            title={`${describe(d, onMenu, onLabels, onSignage)}${marked ? ' · picked' : ''}`}
            className={`${sizes[size]} ${dayClass(onMenu, useOf(onLabels, onSignage))} flex items-center justify-center font-bold flex-shrink-0`}
          >
            {DAY_ABBR[d][0]}
          </span>
        );
        if (!marking) return pill;
        return (
          <span key={d} className="flex flex-col items-center gap-0.5 flex-shrink-0">
            {pill}
            <span className={`h-0.5 w-3 rounded-full ${marked ? 'bg-sky-500 dark:bg-sky-400' : 'bg-transparent'}`} />
          </span>
        );
      })}
    </div>
  );
}

// A row per source, lined up by day, with a legend (product sheet)
export function ProductDayRows({ menuDays, labelDays, signageDays, showMenu }: DayUse & {
  // Webtrition products only; custom products have no menu days
  showMenu: boolean;
}) {
  const rows: { label: string; on: (d: number) => boolean; className: string }[] = [
    ...(showMenu ? [{ label: 'Source', on: (d: number) => menuDays.includes(d), className: dayClass(true, 'none') }] : []),
    { label: 'On labels', on: (d: number) => !!labelDays?.has(d), className: dayClass(false, 'labels') },
    ...(signageDays ? [{ label: 'On signage', on: (d: number) => signageDays.has(d), className: dayClass(false, 'signage') }] : []),
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_repeat(7,1.75rem)] items-center gap-x-1 gap-y-1.5">
        {rows.map(row => (
          <Row key={row.label} label={row.label} isOn={row.on} onClass={row.className} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        {showMenu && <LegendSwatch className={dayClass(true, 'none')} label="Outline · offered by the source" />}
        <LegendSwatch className={dayClass(false, 'labels')} label="Blue fill · on labels" />
        {signageDays && <LegendSwatch className={dayClass(false, 'signage')} label="Dark blue · on signage" />}
      </div>
    </div>
  );
}

function Row({ label, isOn, onClass }: { label: string; isOn: (d: number) => boolean; onClass: string }) {
  return (
    <>
      <span className="pr-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
      {WEEK_ORDER.map(d => (
        <span
          key={d}
          title={`${DAY_ABBR[d]} · ${isOn(d) ? label : `not ${label.toLowerCase()}`}`}
          className={`h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-bold ${
            isOn(d) ? onClass : `border-2 border-transparent ${FAINT}`
          }`}
        >
          {DAY_ABBR[d][0]}
        </span>
      ))}
    </>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-4 w-4 rounded flex items-center justify-center text-[9px] font-bold ${className}`}>M</span>
      {label}
    </span>
  );
}
