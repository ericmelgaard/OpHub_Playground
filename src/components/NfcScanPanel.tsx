import { Nfc, BatteryWarning, X } from 'lucide-react';

interface NfcScanPanelProps {
  supported: boolean;
  scanning: boolean;
  error: string | null;
  onStartScan: () => void;
  onStopScan: () => void;
}

export function NfcScanPanel({
  supported,
  scanning,
  error,
  onStartScan,
  onStopScan,
}: NfcScanPanelProps) {
  if (!supported && !scanning) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900/50">
      {/* Idle state — centered tap-to-scan button */}
      {!scanning && !error && (
        <>
          <button
            onClick={onStartScan}
            className="relative flex flex-col items-center gap-2 px-8 py-5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all group"
          >
            <Nfc className="h-8 w-8 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Tap to Scan NFC
            </span>
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-sm">
            Hold your device near an NFC tag to instantly locate its label.
            Searching by name or location also works from the search bar above.
          </p>
        </>
      )}

      {/* Active scanning state — animated icon + status bar + battery warning */}
      {scanning && (
        <>
          <div className="relative flex items-center justify-center">
            <button
              onClick={onStopScan}
              title="Stop NFC scan"
              className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500 text-white nfc-pulse-glow z-10"
            >
              <Nfc className="h-8 w-8" />
            </button>
            <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-400 nfc-wave-ring pointer-events-none" />
            <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-400 nfc-wave-ring-delayed pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Scanning... tap a tag
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5">
            <BatteryWarning className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              NFC scanning uses extra battery — stop when done
            </span>
          </div>

          <button
            onClick={onStopScan}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline-offset-2 hover:underline"
          >
            Stop scanning
          </button>
        </>
      )}

      {/* Error state */}
      {error && !scanning && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 max-w-sm">
          <X className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-red-700 dark:text-red-300">
              NFC scan failed
            </span>
            <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
            <button
              onClick={onStartScan}
              className="text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline-offset-2 hover:underline mt-0.5"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
