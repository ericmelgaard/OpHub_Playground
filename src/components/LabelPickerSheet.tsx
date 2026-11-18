import { useEffect, useMemo, useState } from 'react';
import { X, Tag, AlertTriangle } from 'lucide-react';
import { Device, DeviceWeekSchedule, FilterConfig, MenuItem, Placement } from '../types';
import { orderedDayparts } from './DaypartSelector';
import { DayPicker, DaypartPicker } from './WeekScheduleBar';
import { formatWeekRange } from '../lib/weekSchedule';
import { SmartLabelGrid } from './SmartLabelGrid';
import { SmartLabelList } from './SmartLabelList';
import { SmartLabelFilters } from './SmartLabelFilters';
import { MenuFilters } from './MenuFilters';
import { productDayparts } from '../lib/stations';
import { matchesDevice } from '../lib/deviceName';

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
  // Every label's schedule for the week (list view)
  weekSchedules: DeviceWeekSchedule[];
  // Grid or list, shared with Smart Labels
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  // The label last opened from here (sky ring, like Smart Labels)
  lastOpenedId?: string | null;
}

// Product-first entry into the Smart Labels flow: pick a label from the same
// preview grid, then continue on that label's device page.
export function LabelPickerSheet({
  item, devices, placements, loading, error, initialDaypart, weekStart, weekLabel, day, onDayChange, onPick, onClose,
  nfcScanning = false, onNfcStart, onNfcStop, scannedTag, onScanHandled, weekSchedules, viewMode, onViewModeChange, lastOpenedId,
}: LabelPickerSheetProps) {
  const dayparts = orderedDayparts(devices);
  // Start on the product's first daypart that labels have; products for all dayparts keep the current one
  const startDaypart = (item && productDayparts(item).find(p => dayparts.includes(p)))
    || (dayparts.includes(initialDaypart) ? initialDaypart : dayparts[0] ?? initialDaypart);
  const [daypart, setDaypart] = useState(startDaypart);
  const [search, setSearch] = useState('');
  // Same Filters panel as Smart Labels, kept for this picker only (Products has its own filters)
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const placementIds = useMemo(() => filters.find(f => f.type === 'placement')?.selectedValues ?? [], [filters]);
  // A scanned tag that matched no label
  const [unknownTag, setUnknownTag] = useState<string | null>(null);

  // A tag (scanned, or typed + Enter) picks its label, on the daypart chosen here
  const pickByTag = (raw: string): boolean => {
    const device = devices.find(d => matchesDevice(d, raw));
    if (device) {
      setUnknownTag(null);
      onPick(device, daypart);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!scannedTag) return;
    if (!pickByTag(scannedTag)) setUnknownTag(scannedTag.trim());
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

      {/* Same toolbar, Filters panel and grid / list as Smart Labels (no Schedule: the week is Products') */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <MenuFilters
          viewMode={viewMode}
          setViewMode={onViewModeChange}
          searchValue={search}
          setSearchValue={setSearch}
          selectedQuickAction="smart-labels"
          activeFilters={filters}
          onToggleFilterSidebar={() => setFiltersOpen(o => !o)}
          isFilterSidebarOpen={filtersOpen}
          menuItems={[]}
          onScanLookup={pickByTag}
          nfcSupported={!!onNfcStart}
          nfcScanning={nfcScanning}
          onNfcStart={() => { setUnknownTag(null); onNfcStart?.(); }}
          onNfcStop={onNfcStop}
        />
        <div className="flex gap-6 min-h-[calc(100vh-280px)]">
          <SmartLabelFilters
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            activeFilters={filters}
            onFiltersChange={setFilters}
            placements={placements}
          />
          <div className="flex-1 min-w-0 space-y-4">
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
            {viewMode === 'list' ? (
              <SmartLabelList
                loading={loading}
                error={error}
                devices={devices}
                onDeviceSelect={onPick}
                searchValue={search}
                placements={placements}
                selectedDaypart={daypart}
                selectedPlacements={placementIds}
                selectedWeekStart={weekStart}
                weekSchedules={weekSchedules}
                selectedDay={day}
                lastOpenedId={lastOpenedId}
              />
            ) : (
              <SmartLabelGrid
                loading={loading}
                error={error}
                devices={devices}
                onDeviceSelect={onPick}
                searchValue={search}
                placements={placements}
                selectedDaypart={daypart}
                selectedPlacements={placementIds}
                lastOpenedId={lastOpenedId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
