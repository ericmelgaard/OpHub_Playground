import { useEffect, useState } from 'react';
import { Search, X, Tag, Nfc, AlertTriangle } from 'lucide-react';
import { Device, MenuItem, Placement } from '../types';
import { orderedDayparts } from './DaypartSelector';
import { DayPicker, DaypartPicker } from './WeekScheduleBar';
import { formatWeekRange } from '../lib/weekSchedule';
import { SmartLabelGrid } from './SmartLabelGrid';
import { productDayparts } from '../lib/stations';

interface LabelPickerSheetProps {
  item: MenuItem | null;
  devices: Device[];
  placements: Placement[];
  loading: boolean;
  error: string | null;
  initialDaypart: string;
  // The week Products shows (its Sunday, and "This Week" / "Next Week" / "Week of Nov 30")
  weekStart: string;
  weekLabel: string;
  // Day being edited, shared with Smart Labels for the session
  day: number | 'every-day';
  onDayChange: (day: number | 'every-day') => void;
  onPick: (device: Device, daypart: string) => void;
  onClose: () => void;
  // NFC: scanning a label's tag picks it
  nfcScanning?: boolean;
  onNfcStart?: () => void;
  onNfcStop?: () => void;
  scannedTag?: string | null;
  onScanHandled?: () => void;
}

// Product-first entry into the Smart Labels flow: pick a label from the same
// preview grid, then continue on that label's device page.
export function LabelPickerSheet({
  item, devices, placements, loading, error, initialDaypart, weekStart, weekLabel, day, onDayChange, onPick, onClose,
  nfcScanning = false, onNfcStart, onNfcStop, scannedTag, onScanHandled,
}: LabelPickerSheetProps) {
  const dayparts = orderedDayparts(devices);
  // Start on the product's first daypart that labels have; products for all dayparts keep the current one
  const startDaypart = (item && productDayparts(item).find(p => dayparts.includes(p)))
    || (dayparts.includes(initialDaypart) ? initialDaypart : dayparts[0] ?? initialDaypart);
  const [daypart, setDaypart] = useState(startDaypart);
  const [search, setSearch] = useState('');
  // A scanned tag that matched no label
  const [unknownTag, setUnknownTag] = useState<string | null>(null);

  // A scanned tag picks its label, on the daypart chosen here
  useEffect(() => {
    if (!scannedTag) return;
    const tag = scannedTag.trim().toLowerCase();
    const device = devices.find(d => d.id.toLowerCase() === tag || d.name.toLowerCase() === tag);
    if (device) {
      setUnknownTag(null);
      onPick(device, daypart);
    } else {
      setUnknownTag(scannedTag.trim());
    }
    onScanHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannedTag]);

  useEffect(() => {
    if (item) {
      setDaypart(startDaypart);
      setSearch('');
      setUnknownTag(null);
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
            <span className="flex-shrink-0">· {weekLabel === 'This Week' ? 'This week' : weekLabel}, {formatWeekRange(weekStart)}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        <div className={`relative transition-all ${nfcScanning ? 'nfc-listening-ring' : ''}`}>
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${nfcScanning ? 'text-sky-400 dark:text-sky-500' : 'text-gray-400'}`} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={nfcScanning ? 'Hold the tablet to a label…' : 'Search labels by name or location...'}
            className={`w-full h-11 pl-9 ${onNfcStart ? 'pr-28' : 'pr-3'} text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none ${
              nfcScanning
                ? 'border-sky-400 dark:border-sky-500 ring-2 ring-sky-400/40 dark:ring-sky-500/40'
                : 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-sky-400'
            }`}
          />
          {onNfcStart && (
            <button
              onClick={() => { setUnknownTag(null); if (nfcScanning) onNfcStop?.(); else onNfcStart(); }}
              title={nfcScanning ? 'Stop NFC scan' : 'Scan a label’s NFC tag to pick it'}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                nfcScanning
                  ? 'bg-sky-500 text-white nfc-pulse-glow'
                  : 'text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20'
              }`}
            >
              <Nfc className="h-4 w-4" />
              <span>{nfcScanning ? 'Scanning' : 'Scan'}</span>
            </button>
          )}
        </div>
        {unknownTag && (
          <div role="status" className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 min-w-0">No label here has tag <span className="font-mono">{unknownTag}</span>. Scan again or pick one below.</span>
          </div>
        )}
        {/* Same day + daypart pickers as Smart Labels */}
        <div className="flex items-center gap-2 flex-wrap">
          <DayPicker value={day} onChange={onDayChange} weekStart={weekStart} />
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
