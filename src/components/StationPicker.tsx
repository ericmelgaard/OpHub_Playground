import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StationOption, stationKey } from '../lib/stations';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

interface StationListProps {
  options: StationOption[];
  selected: Set<string>;
  multiple: boolean;
  onPick: (key: string) => void;
  countLabel: string;
  // Single-select "All stations" row
  allRow?: { label: string; selected: boolean; count?: number; onPick: () => void };
}

// Searchable station list with item counts, sized for touch
function StationList({ options, selected, multiple, onPick, countLabel, allRow }: StationListProps) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.name.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <>
      <div className="relative p-2 border-b border-gray-200 dark:border-gray-700">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stations..."
          aria-label="Search stations"
          className="pl-8 h-10"
        />
      </div>
      <div role="listbox" aria-multiselectable={multiple} className="max-h-72 overflow-y-auto scrollbar-thin p-1">
        {allRow && !query && (
          <StationRow
            label={allRow.label}
            count={allRow.count}
            selected={allRow.selected}
            multiple={false}
            onClick={allRow.onPick}
          />
        )}
        {shown.map(o => (
          <StationRow
            key={o.key}
            label={o.name}
            count={o.count}
            selected={selected.has(o.key)}
            multiple={multiple}
            onClick={() => onPick(o.key)}
          />
        ))}
        {shown.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {query ? 'No stations match' : 'No stations have items here'}
          </p>
        )}
      </div>
      <p className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
        {countLabel}
      </p>
    </>
  );
}

function StationRow({ label, count, selected, multiple, onClick }: {
  label: string; count?: number; selected: boolean; multiple: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-left text-sm transition-colors ${
        selected
          ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {multiple ? (
        <span className={`h-4 w-4 flex-shrink-0 rounded border flex items-center justify-center ${
          selected ? 'bg-sky-500 border-sky-500 text-white' : 'border-gray-300 dark:border-gray-600'
        }`}>
          {selected && <Check className="h-3 w-3" />}
        </span>
      ) : (
        <Check className={`h-4 w-4 flex-shrink-0 ${selected ? 'opacity-100' : 'opacity-0'}`} />
      )}
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500 flex-shrink-0">{count}</span>
      )}
    </button>
  );
}

interface StationFilterProps {
  options: StationOption[];
  value: string | null;          // station key, or null for all
  onChange: (key: string | null) => void;
  totalCount: number;
  triggerClassName: string;
  disabled?: boolean;
  disabledReason?: string;
}

// Narrows Available Items to one station
export function StationFilter({ options, value, onChange, totalCount, triggerClassName, disabled, disabledReason }: StationFilterProps) {
  const [open, setOpen] = useState(false);
  const current = value ? options.find(o => o.key === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          title={disabled ? disabledReason : current?.name}
          className={`${triggerClassName} inline-flex items-center gap-1 max-w-[11rem] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="truncate">{current ? current.name : 'Station: All'}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <StationList
          options={options}
          selected={new Set(value ? [value] : [])}
          multiple={false}
          onPick={key => { onChange(key); setOpen(false); }}
          countLabel="Items available for this day and daypart"
          allRow={{ label: 'All stations', selected: !value, count: totalCount, onPick: () => { onChange(null); setOpen(false); } }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface AutoFillPickerProps {
  options: StationOption[];
  // Stations this page auto-fills from now
  stations: string[];
  // What applying a selection (station keys) would do
  preview: (keys: string[]) => { add: number; remove: number };
  // Called with station names
  onApply: (stations: string[]) => void;
}

// Adds a station's items to the page in one deliberate step: pick stations, then confirm
export function AutoFillPicker({ options, stations, preview, onApply }: AutoFillPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const active = stations.length > 0;

  const openChange = (next: boolean) => {
    if (next) setDraft(new Set(stations.map(stationKey)));
    setOpen(next);
  };
  const toggle = (key: string) => setDraft(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const keys = [...draft];
  const { add, remove } = preview(keys);
  const confirmLabel =
    add > 0 && remove > 0 ? `Add ${add} · remove ${remove}` :
    add > 0 ? `Add ${plural(add, 'item')}` :
    remove > 0 ? `Remove ${plural(remove, 'item')}` :
    'Apply';
  const unchanged = keys.length === stations.length && stations.every(s => draft.has(stationKey(s)));

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title={active ? `Auto Fill from ${stations.join(', ')}` : 'Add a station’s items to this page'}
          className={`ml-auto h-8 gap-1.5 px-2.5 text-xs ${
            active
              ? 'border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto Fill
          {active && (
            <span className="min-w-4 h-4 px-1 rounded-full bg-teal-500 text-white text-[10px] font-semibold tabular-nums flex items-center justify-center">
              {stations.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 pt-3 pb-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-teal-500" />
            Auto Fill from stations
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Adds the stations’ items for this daypart. Drag or turn items on and off as usual.
          </p>
        </div>
        <StationList
          options={options}
          selected={draft}
          multiple
          onPick={toggle}
          countLabel="Items each station would add for this daypart"
        />
        <div className="flex items-center justify-between gap-2 p-2 border-t border-gray-200 dark:border-gray-700">
          {active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft(new Set())}
              disabled={draft.size === 0}
              className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Clear stations
            </Button>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400 pl-1">{plural(draft.size, 'station')}</span>
          )}
          <Button
            size="sm"
            disabled={unchanged}
            onClick={() => {
              onApply(keys.map(k => options.find(o => o.key === k)?.name ?? k));
              setOpen(false);
            }}
          >
            {draft.size === 0 && active ? `Turn off${remove > 0 ? ` · remove ${remove}` : ''}` : confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface DaypartOption {
  // '' = all dayparts
  value: string;
  label: string;
  count: number;
}

// Which daypart's products Available Items lists. Starts on the page's daypart; another one
// (the source's "Brunch" while working on Lunch) is a deliberate choice
export function DaypartFilter({ options, value, pageDaypart, onChange, triggerClassName }: {
  options: DaypartOption[];
  // The daypart listed; null = none picked yet
  value: string | null;
  pageDaypart: string;
  onChange: (value: string) => void;
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  const label = value === null ? 'Pick a daypart' : value === pageDaypart ? pageDaypart : `From ${current?.label ?? value}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Products offered in this daypart"
          className={`${triggerClassName} inline-flex items-center gap-1 max-w-[11rem]`}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div role="listbox" className="max-h-72 overflow-y-auto scrollbar-thin p-1">
          {options.map(o => (
            <StationRow
              key={o.value || 'all'}
              label={o.value === pageDaypart ? `${o.label} (this page)` : o.label}
              count={o.count}
              selected={o.value === value}
              multiple={false}
              onClick={() => { onChange(o.value); setOpen(false); }}
            />
          ))}
        </div>
        <p className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
          Items added from another daypart follow its days
        </p>
      </PopoverContent>
    </Popover>
  );
}
