import { useEffect, useMemo, useState } from 'react';
import { X, Utensils, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuItem, PlacedVariant } from '../types';
import { daypartColor } from '../lib/daypartColors';
import { placed, variantDayparts, variantDays, variantValues, variantsIn } from '../lib/variants';
import { DAY_ABBR } from '../lib/availability';
import { WEEK_ORDER } from '../lib/weekSchedule';
import { money } from './ProductVariants';

// Pick which variant (meal station + daypart) a label item stands for (menu platform spec F8). The
// daypart starts on the one you're adding from and can be changed. When one station is left in the
// daypart, it's picked for you.

interface VariantChooserProps {
  item: MenuItem;
  // The daypart you're adding from (the page's, or another picked in Available Items)
  daypart: string;
  // The label page's own daypart, marked "This page"
  pageDaypart: string;
  // Adding, or fixing an item already on the page
  mode: 'add' | 'fix';
  // The current choice, when fixing
  current?: PlacedVariant | null;
  onPick: (variant: PlacedVariant, daypart: string) => void;
  onClose: () => void;
}

export function VariantChooser({ item, daypart: startDaypart, pageDaypart, mode, current, onPick, onClose }: VariantChooserProps) {
  const dayparts = variantDayparts(item);
  const [daypart, setDaypart] = useState(dayparts.includes(startDaypart) ? startDaypart : dayparts[0]);
  const [stationKey, setStationKey] = useState<string | null>(null);
  const options = useMemo(() => variantsIn(item, daypart), [item, daypart]);

  // Start on the current choice (fixing), else on the only station when there's one
  useEffect(() => {
    const cur = current && current.choice !== 'review'
      ? options.find(v => v.stationId === current.stationId && v.mealPeriodId === current.mealPeriodId)
      : undefined;
    setStationKey(cur?.key ?? (options.length === 1 ? options[0].key : null));
  }, [options, current]);

  const station = options.find(v => v.key === stationKey) ?? null;
  const confirm = () => {
    if (!station) return;
    onPick(placed(station, 'user'), daypart);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center modal-container md:p-4" role="dialog" aria-modal="true" aria-label={`Choose station for ${item.name}`}>
      <div className="absolute inset-0 bg-black/40 refresh-sheet-fade" onClick={onClose} />
      <div className="relative modal-content flex flex-col w-full md:max-w-lg max-h-[85vh] bg-white dark:bg-gray-800 rounded-t-xl md:rounded-xl shadow-xl refresh-sheet-in">
        <div className="modal-header flex items-start gap-3 px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {mode === 'add' ? `Add ${item.name.trim()}` : `Station for ${item.name.trim()}`}
              {item.size && (item.sizes?.length ?? 0) > 1 && <span className="ml-1.5 text-sm font-normal text-gray-500 dark:text-gray-400">{item.size}</span>}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'add' ? 'Pick the station it’s served at, so the label shows the right item.' : 'Which station this item stands for on the label.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 -mr-2 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="modal-body flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          {/* Daypart: preselected, changeable */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Daypart
            </h3>
            <div className="flex flex-wrap gap-2">
              {dayparts.map(dp => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => setDaypart(dp)}
                  aria-pressed={dp === daypart}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm font-medium transition-colors ${
                    dp === daypart
                      ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-500 text-sky-700 dark:text-sky-300'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${daypartColor(dp).solid}`} />
                  {dp}
                  {dp === pageDaypart && <span className="text-[10px] text-gray-500 dark:text-gray-400">This page</span>}
                </button>
              ))}
            </div>
            {daypart !== pageDaypart && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">It follows {daypart}’s days on this page.</p>
            )}
          </section>

          {/* Station */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
              <Utensils className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              Meal station
            </h3>
            <div className="space-y-1.5">
              {options.map(v => {
                const selected = v.key === stationKey;
                const days = variantDays(v);
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setStationKey(v.key)}
                    aria-pressed={selected}
                    className={`w-full flex items-center gap-3 min-h-[52px] px-3 py-2 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-500'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{v.station}</span>
                      {variantValues(item, v).name.from !== 'product' && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">As “{variantValues(item, v).name.value}”</span>
                      )}
                      <span className="mt-1 flex gap-0.5" aria-label={`Served ${days.map(d => DAY_ABBR[d]).join(', ') || 'no days this week'}`}>
                        {WEEK_ORDER.map(d => (
                          <span
                            key={d}
                            className={`h-4 w-4 rounded text-[9px] font-bold flex items-center justify-center ${
                              days.includes(d)
                                ? 'border border-gray-500 dark:border-gray-400 text-gray-700 dark:text-gray-200'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {DAY_ABBR[d][0]}
                          </span>
                        ))}
                      </span>
                    </span>
                    {parseFloat(variantValues(item, v).price.value) > 0 && <span className="text-sm tabular-nums text-gray-700 dark:text-gray-200">{money(variantValues(item, v).price.value)}</span>}
                    {selected && <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
          <span className="flex-1 text-xs text-gray-500 dark:text-gray-400">{station ? null : 'Pick the station'}</span>
          <Button variant="outline" onClick={onClose} className="h-11">Cancel</Button>
          <Button onClick={confirm} disabled={!station} className="h-11">
            {mode === 'add' ? 'Add' : 'Done'}
          </Button>
        </div>
      </div>
    </div>
  );
}
