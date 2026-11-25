import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Plus, Search, Trash2 } from 'lucide-react';
import { Device, DevicePage, MenuItem, SubstitutionKey, Substitution } from '../types';
import { Button } from '@/components/ui/button';
import { DAY_ABBR } from '../lib/availability';
import { daypartColor } from '../lib/daypartColors';
import {
  getShownItems, isBaseOffered, isCustomItem, isItemOfferedOn, isOfferedEveryDay, isOfferedOnDay, offeredDays, toggleFor, labelName, followsSource,
  type LabelDayOverrides,
} from '../lib/labelDisplay';
import { servesDaypart } from '../lib/stations';
import { sortDayparts } from '../lib/weekSchedule';
import { plainText } from '../lib/richText';
import { LabelName } from './RichText';
import { ThreeStageToggle, SomeDaysTag } from './DayToggle';
import type { DisplayToggle } from './DayToggle';

interface AllDaypartsEditorProps {
  device: Device;
  // Day being edited, or 'every-day' for the whole week
  selectedDay: number | 'every-day';
  menuItems: MenuItem[];
  toggles: LabelDayOverrides;
  substitutionMap: Map<SubstitutionKey, Substitution>;
  // Why day On / Off can't be used here (Default Week)
  dayOverridesLocked?: string;
  initialSearch?: string;
  // Adds one item to one page (the label page's single add path)
  onAdd?: (item: MenuItem, pageId: string) => void;
  onRemove?: (itemId: number, pageId: string) => void;
  onToggle?: (pageId: string, itemId: number, toggle: DisplayToggle) => void;
  onEditDaypart: (daypart: string) => void;
}

interface Row {
  item: MenuItem;
  // Pages (dayparts) it's on, in daypart order
  pages: DevicePage[];
}

// All dayparts on a label page: every item on the label for the day (or week) in scope, once,
// with actions that apply to every daypart it's on. Order, substitutions and Auto Fill belong
// to one daypart's list, so those stay inside a single daypart.
export function AllDaypartsEditor({
  device, selectedDay, menuItems, toggles, substitutionMap, dayOverridesLocked, initialSearch = '',
  onAdd, onRemove, onToggle, onEditDaypart,
}: AllDaypartsEditorProps) {
  const dayNum = selectedDay === 'every-day' ? null : selectedDay;
  useEffect(() => { setJustTurnedOff(new Set()); }, [dayNum, device.id]);
  const when = dayNum === null ? 'every day' : DAY_ABBR[dayNum];
  const [search, setSearch] = useState(initialSearch);
  const [showNotAvailable, setShowNotAvailable] = useState(false);
  // Items turned Off while looking at this day stay in the list so it can be undone
  const [justTurnedOff, setJustTurnedOff] = useState<Set<number>>(new Set());
  const [confirmRemove, setConfirmRemove] = useState<Row | null>(null);

  const pages = useMemo(() => {
    const order = sortDayparts(device.pages.map(p => p.daypart));
    return [...device.pages].sort((a, b) => order.indexOf(a.daypart) - order.indexOf(b.daypart));
  }, [device.pages]);

  // What each page shows, by the same rule the label preview uses
  const shownByPage = useMemo(() => new Map(pages.map(p => [
    p.id, new Set(getShownItems(p, dayNum, toggles[p.id], substitutionMap).map(r => r.originalItemId)),
  ])), [pages, dayNum, toggles, substitutionMap]);

  // The item as it is on a page: each page's copy knows the daypart it follows there
  const onPage = (p: DevicePage, item: MenuItem) => p.assignedItems.find(i => i.id === item.id) ?? item;

  // One row per item, in daypart order then each item's place in its first daypart
  const { rows, notAvailable } = useMemo(() => {
    const byId = new Map<number, Row>();
    for (const page of pages) {
      for (const id of page.itemOrder) {
        const item = page.assignedItems.find(i => i.id === id);
        if (!item) continue;
        const row = byId.get(id) ?? { item, pages: [] };
        row.pages.push(page);
        byId.set(id, row);
      }
    }
    const all = [...byId.values()];
    if (dayNum === null) return { rows: all, notAvailable: [] as Row[] };
    // For one day: items offered that day in any of its dayparts (or just turned off here, so it can be undone)
    const offered = (r: Row) => r.pages.some(p => {
      const o = toggles[p.id]?.[r.item.id];
      return isOfferedOnDay(onPage(p, r.item), p.daypart, dayNum, o) || (o?.[dayNum] === 'off' && justTurnedOff.has(r.item.id));
    });
    return { rows: all.filter(offered), notAvailable: all.filter(r => !offered(r)) };
  }, [pages, dayNum, toggles, justTurnedOff]);

  const assignedIds = useMemo(() => new Set(pages.flatMap(p => p.assignedItems.map(i => i.id))), [pages]);

  // Dayparts on this label a product could still be added to
  const targetsFor = (item: MenuItem) =>
    pages.filter(p => servesDaypart(item, p.daypart) && !p.assignedItems.some(i => i.id === item.id));

  // On a single day: dayparts already holding the item where it isn't showing that day.
  // Adding it again turns the day on there.
  const againFor = (item: MenuItem) => dayNum === null ? [] : pages.filter(p =>
    p.assignedItems.some(i => i.id === item.id) && !isOfferedOnDay(onPage(p, item), p.daypart, dayNum, toggles[p.id]?.[item.id]));

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems
      .filter(item => {
        if (q && !item.name.toLowerCase().includes(q) && !plainText(item.description).toLowerCase().includes(q)) return false;
        // Same source rule for items already on the label: up top only if the source offers it
        // that day in one of those dayparts (items without a source: always)
        if (againFor(item).some(p => isCustomItem(item) || isBaseOffered(onPage(p, item), p.daypart, dayNum!))) return true;
        const targets = targetsFor(item);
        if (targets.length === 0) return false;
        // Custom products have no days of their own; adding turns them on for the day in scope
        if (isCustomItem(item)) return true;
        return targets.some(p => dayNum === null ? offeredDays(item, p.daypart).length > 0 : isBaseOffered(item, p.daypart, dayNum));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItems, search, pages, dayNum, toggles]);

  // New dayparts get the item; dayparts already holding it get this day back
  // (Auto when the source offers it that day, else On)
  const addTo = (item: MenuItem, targets: DevicePage[], again: DevicePage[]) => {
    targets.forEach(p => onAdd?.(item, p.id));
    if (dayNum === null || !canToggle) return;
    again.forEach(p => onToggle!(p.id, item.id, !isCustomItem(item) && isBaseOffered(onPage(p, item), p.daypart, dayNum) ? 'auto' : 'on'));
  };

  const rowState = (r: Row) => {
    // Days to follow on a page: linked to a source and offered in that daypart
    const follows = (p: DevicePage) => followsSource(onPage(p, r.item), p.daypart);
    const linked = r.pages.every(follows);
    const states = new Set(r.pages.map(p => toggleFor(toggles[p.id]?.[r.item.id], dayNum, follows(p))));
    const toggle: DisplayToggle | 'mixed' = states.size === 1 ? [...states][0] : 'mixed';
    const showingIn = r.pages.filter(p => shownByPage.get(p.id)?.has(r.item.id));
    const waitingIn = r.pages.filter(p =>
      !shownByPage.get(p.id)?.has(r.item.id) && isItemOfferedOn(onPage(p, r.item), p.daypart, dayNum, toggles[p.id]?.[r.item.id]));
    // In Every day: on some days only in every daypart it's on, so not in any everyday preview
    const someDays = dayNum === null && toggle !== 'off'
      && !r.pages.some(p => isOfferedEveryDay(onPage(p, r.item), p.daypart, toggles[p.id]?.[r.item.id]));
    return { linked, toggle, showingIn, waitingIn, someDays };
  };

  const canToggle = !!onToggle && !dayOverridesLocked;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4 sm:px-6 overflow-y-auto lg:overflow-hidden">
      {/* Left: everything on the label in scope */}
      <div className="flex flex-col min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">All dayparts</h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">· {when}</span>
          </div>
          {/* Each daypart's capacity; tap one to edit just that daypart */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pages.map(p => {
              const shown = shownByPage.get(p.id)?.size ?? 0;
              const open = Math.max(0, p.displayCapacity - shown);
              const c = daypartColor(p.daypart);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onEditDaypart(p.daypart)}
                  title={`Edit ${p.daypart}`}
                  className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors hover:shadow-sm ${
                    shown === 0
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : `${c.border} ${c.softBg} ${c.text}`
                  }`}
                >
                  {shown === 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                  {p.daypart}
                  <span className="tabular-nums font-normal">
                    {shown} of {p.displayCapacity}{open > 0 && shown > 0 ? ` · ${open} open` : ''}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Changes here apply to every daypart an item is on. Pick a daypart to reorder, substitute or Auto Fill.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 space-y-1.5">
          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg gap-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {assignedIds.size === 0 ? 'No items on this label yet' : `Nothing on this label ${when}`}
              </p>
              <p className="text-xs text-gray-400">Add items from the right panel</p>
            </div>
          )}
          {rows.map(r => {
            const { linked, toggle, showingIn, waitingIn, someDays } = rowState(r);
            const status =
              toggle === 'off' ? { text: `Off ${when}`, cls: 'text-gray-400 dark:text-gray-500' }
              : someDays ? { text: 'Pick a day to see it', cls: 'text-gray-500 dark:text-gray-400' }
              : toggle === 'mixed' ? { text: 'Differs by daypart or day', cls: 'text-amber-600 dark:text-amber-300' }
              : waitingIn.length > 0 ? { text: `Waiting · ${waitingIn.map(p => p.daypart).join(', ')} full`, cls: 'text-amber-600 dark:text-amber-300' }
              : showingIn.length === r.pages.length ? { text: 'Showing', cls: 'text-sky-600 dark:text-sky-300' }
              : showingIn.length > 0 ? { text: `Showing in ${showingIn.map(p => p.daypart).join(', ')}`, cls: 'text-sky-600 dark:text-sky-300' }
              : { text: 'Not showing', cls: 'text-gray-400 dark:text-gray-500' };
            const missing = targetsFor(r.item);
            return (
              <div
                key={r.item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  toggle === 'off' ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-gray-100 dark:border-gray-700/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${toggle === 'off' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                    <LabelName item={r.item} />
                    {someDays && <span className="ml-1.5 align-middle"><SomeDaysTag /></span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    ${r.item.price}
                    <span className={`text-[11px] ${status.cls}`}>{status.text}</span>
                  </p>
                  {/* Where it is: filled = on that daypart (tap to edit it); dashed = can be added */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.pages.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onEditDaypart(p.daypart)}
                        title={`Edit ${p.daypart}`}
                        className={`h-6 px-2 rounded-full border text-[11px] font-medium ${daypartColor(p.daypart).chip}`}
                      >
                        {p.daypart}
                      </button>
                    ))}
                    {onAdd && missing.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onAdd(r.item, p.id)}
                        title={`Add to ${p.daypart}`}
                        className="inline-flex items-center gap-0.5 h-6 px-2 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-[11px] text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-300"
                      >
                        <Plus className="h-3 w-3" />{p.daypart}
                      </button>
                    ))}
                  </div>
                </div>
                {onToggle && (
                  <ThreeStageToggle
                    state={toggle}
                    allowAuto={linked}
                    disabledReason={dayOverridesLocked}
                    onChange={state => {
                      if (!canToggle) return;
                      if (state === 'off' && dayNum !== null) setJustTurnedOff(prev => new Set(prev).add(r.item.id));
                      r.pages.forEach(p => onToggle(p.id, r.item.id, state));
                    }}
                  />
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(r)}
                    title={r.pages.length > 1 ? `Remove from ${r.pages.length} dayparts` : `Remove from ${r.pages[0].daypart}`}
                    aria-label={`Remove ${labelName(r.item)}`}
                    className="h-9 w-9 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Items on the label that aren't offered on this day in any of their dayparts */}
        {notAvailable.length > 0 && dayNum !== null && (
          <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setShowNotAvailable(!showNotAvailable)}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors"
            >
              {showNotAvailable ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Not available {DAY_ABBR[dayNum]}
              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold text-white rounded-full bg-gray-400 dark:bg-gray-600">
                {notAvailable.length}
              </span>
            </button>
            {showNotAvailable && (
              <div className="max-h-[200px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-700/50">
                {notAvailable.map(r => (
                  <div key={r.item.id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="min-w-0 flex-1 opacity-70">
                      <p className="text-xs font-medium truncate text-gray-700 dark:text-gray-300"><LabelName item={r.item} /></p>
                      <p className="text-[10px] text-gray-400">{r.pages.map(p => p.daypart).join(', ')}</p>
                    </div>
                    {canToggle && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => r.pages.forEach(p => onToggle!(p.id, r.item.id, 'on'))}
                        className="h-8 px-2.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex-shrink-0"
                      >
                        On {DAY_ABBR[dayNum]}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: products that can still go on one or more dayparts */}
      <div className="flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-sky-500" />Available Items
            </h4>
            <span className="text-xs text-gray-400">{available.length}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="w-full h-10 pl-8 pr-3 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Adds to every daypart the product is offered at{dayNum !== null ? `, for products offered ${DAY_ABBR[dayNum]}` : ''}.
          </p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-700/50">
          {available.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-gray-400">No items available</p>
          )}
          {available.map(item => {
            const again = againFor(item);
            const targets = targetsFor(item);
            const all = [...again, ...targets];
            return (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    {item.mealStation && <span className="text-[10px] text-gray-400 mr-1">{item.mealStation}</span>}
                    {all.map(p => (
                      <span key={p.id} className={`text-[10px] font-medium ${daypartColor(p.daypart).text}`}>{p.daypart}</span>
                    ))}
                  </div>
                  {again.length > 0 && (
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">On this label · add to show it {dayNum !== null ? DAY_ABBR[dayNum] : ''}</p>
                  )}
                </div>
                <span className="text-xs font-semibold flex-shrink-0 text-gray-700 dark:text-gray-300 ml-2">${item.price}</span>
                {onAdd && (
                  <button
                    onClick={() => addTo(item, targets, again)}
                    aria-label={`Add ${item.name} to ${all.map(p => p.daypart).join(', ')}`}
                    title={all.length > 1 ? `Add to ${all.length} dayparts` : `Add to ${all[0]?.daypart ?? ''}`}
                    className="flex-shrink-0 h-11 px-3 flex items-center justify-center gap-0.5 rounded-lg border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    {all.length > 1 && <span className="text-xs font-semibold tabular-nums">{all.length}</span>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Removing from several dayparts is a batch, so it asks first */}
      {confirmRemove && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
          onClick={() => setConfirmRemove(null)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center p-6 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Trash2 className="h-7 w-7 text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Remove {labelName(confirmRemove.item)}?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                It comes off {confirmRemove.pages.map(p => p.daypart).join(', ')} for the whole week.
              </p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-12"
                  onClick={() => {
                    confirmRemove.pages.forEach(p => onRemove?.(confirmRemove.item.id, p.id));
                    setConfirmRemove(null);
                  }}
                >
                  {confirmRemove.pages.length > 1 ? `Remove from ${confirmRemove.pages.length}` : 'Remove'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
