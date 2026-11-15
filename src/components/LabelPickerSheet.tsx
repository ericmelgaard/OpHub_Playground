import { useEffect, useState } from 'react';
import { Search, X, Tag } from 'lucide-react';
import { Device, MenuItem, Placement } from '../types';
import { orderedDayparts } from './DaypartSelector';
import { DayPicker, DaypartPicker, getWeekStartString } from './WeekScheduleBar';
import { SmartLabelGrid } from './SmartLabelGrid';
import { productDayparts } from '../lib/stations';

interface LabelPickerSheetProps {
  item: MenuItem | null;
  devices: Device[];
  placements: Placement[];
  loading: boolean;
  error: string | null;
  initialDaypart: string;
  // Day being edited, shared with Smart Labels for the session
  day: number | 'every-day';
  onDayChange: (day: number | 'every-day') => void;
  onPick: (device: Device, daypart: string) => void;
  onClose: () => void;
}

// Product-first entry into the Smart Labels flow: pick a label from the same
// preview grid, then continue on that label's device page.
export function LabelPickerSheet({
  item, devices, placements, loading, error, initialDaypart, day, onDayChange, onPick, onClose,
}: LabelPickerSheetProps) {
  const dayparts = orderedDayparts(devices);
  // Start on the product's first daypart that labels have; products for all dayparts keep the current one
  const startDaypart = (item && productDayparts(item).find(p => dayparts.includes(p)))
    || (dayparts.includes(initialDaypart) ? initialDaypart : dayparts[0] ?? initialDaypart);
  const [daypart, setDaypart] = useState(startDaypart);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (item) {
      setDaypart(startDaypart);
      setSearch('');
    }
    // Reset only when a different product opens the picker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900 refresh-sheet-in" role="dialog" aria-modal="true" aria-label="Choose a label">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <button
          onClick={onClose}
          aria-label="Close"
          className="h-11 w-11 -ml-2 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">Choose a label</h2>
          <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 truncate">
            <Tag className="h-3.5 w-3.5 flex-shrink-0" />
            for <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
            <span className="flex-shrink-0">· ${parseFloat(item.price).toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search labels by name or location..."
            className="w-full h-11 pl-9 pr-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        {/* Same day + daypart pickers as Smart Labels */}
        <div className="flex items-center gap-2 flex-wrap">
          <DayPicker value={day} onChange={onDayChange} weekStart={getWeekStartString(0)} />
          <DaypartPicker value={daypart} onChange={setDaypart} dayparts={dayparts} />
        </div>
        <SmartLabelGrid
          loading={loading}
          error={error}
          devices={devices}
          onDeviceSelect={onPick}
          searchValue={search}
          placements={placements}
          selectedDaypart={daypart}
          selectedPlacements={[]}
        />
      </div>
    </div>
  );
}
