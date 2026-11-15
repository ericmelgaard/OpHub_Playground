import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronDown, Plus, PencilLine, Save } from 'lucide-react';
import { ThreeStageToggle, SomeDaysTag } from './DayToggle';
import { ProductDayStrip } from './ProductDays';
import { daypartColor } from '../lib/daypartColors';
import type { GuideFigureId } from '../lib/userGuide';

// Pictures for the user guide, drawn with the app's own components so they always match
// what's on screen (and follow light / dark mode). They're examples only: nothing in them responds.

function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  // inert: the example controls can't be focused or clicked
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.setAttribute('inert', ''); }, []);
  return (
    <figure className="mt-3">
      <div
        ref={ref}
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4 select-none"
      >
        {children}
      </div>
      <figcaption className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{caption}</figcaption>
    </figure>
  );
}

const noop = () => {};

function DaysFigure() {
  const rows: { label: string; node: ReactNode }[] = [
    { label: 'Follows the source', node: <ThreeStageToggle state="auto" onChange={noop} /> },
    { label: 'Shows on this day', node: <ThreeStageToggle state="on" onChange={noop} /> },
    { label: 'Hidden on this day', node: <ThreeStageToggle state="off" onChange={noop} /> },
    { label: 'Custom product', node: <ThreeStageToggle state="on" onChange={noop} allowAuto={false} /> },
  ];
  return (
    <Figure caption="Set each day with Off, Auto or On. Custom products have Off and On only.">
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
            {r.node}
          </div>
        ))}
      </div>
    </Figure>
  );
}

function EveryDayFigure() {
  return (
    <Figure caption="In All dayparts, chips show where the item is. Tap a dashed chip to add it to one more daypart.">
      <div className="rounded-lg border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
          <span className="truncate">Blueberry pancakes</span>
          <SomeDaysTag />
        </p>
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {['Breakfast', 'Lunch'].map(d => (
            <span key={d} className={`inline-flex items-center h-6 px-2 rounded-full border text-[11px] font-medium ${daypartColor(d).chip}`}>
              {d}
            </span>
          ))}
          <span className="inline-flex items-center gap-0.5 h-6 px-2 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-[11px] text-gray-500 dark:text-gray-400">
            <Plus className="h-3 w-3" />
            Dinner
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Pick a day to see it</p>
      </div>
    </Figure>
  );
}

function ApplyFigure() {
  return (
    <Figure caption="Changes wait until you apply them. The arrow opens Review changes and Discard changes.">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium tabular-nums bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
          <PencilLine className="h-3.5 w-3.5" />
          3 pending
        </span>
        <div className="flex items-stretch">
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-l-md bg-brand text-white text-sm font-medium">
            <Save className="h-4 w-4" />
            Save
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-white/25 text-xs font-semibold tabular-nums flex items-center justify-center">3</span>
          </span>
          <span className="inline-flex items-center h-8 px-2 rounded-r-md bg-brand text-white border-l border-white/30">
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Figure>
  );
}

function ProductsFigure() {
  return (
    <Figure caption="Outlined days are offered by the source. Blue days are on a label in the week you picked.">
      <div className="flex flex-col items-start gap-3">
        <ProductDayStrip size="md" menuDays={[1, 2, 3, 4, 5]} labelDays={new Set([1, 2, 3, 6])} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <span>M T W · offered and on labels</span>
          <span>T F · offered, not used</span>
          <span>S · on labels only</span>
        </div>
      </div>
    </Figure>
  );
}

export function GuideFigure({ id }: { id: GuideFigureId }) {
  switch (id) {
    case 'days': return <DaysFigure />;
    case 'every-day': return <EveryDayFigure />;
    case 'apply': return <ApplyFigure />;
    case 'products': return <ProductsFigure />;
  }
}
