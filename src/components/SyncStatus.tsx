import { CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { DeviceSync } from '../types';

function formatAge(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const styles = {
  synced: {
    icon: CheckCircle2,
    pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    iconAnim: 'sync-pop',
  },
  syncing: {
    icon: RefreshCw,
    pill: 'sync-shimmer bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    iconAnim: 'animate-spin [animation-duration:1.4s]',
  },
  failed: {
    icon: AlertCircle,
    pill: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    iconAnim: '',
  },
};

export function SyncStatus({ sync }: { sync?: DeviceSync }) {
  if (!sync) return null;
  const style = styles[sync.state];
  const Icon = style.icon;
  const age = formatAge(sync.lastSyncedAt);

  const text =
    sync.state === 'synced' ? `Synced ${age}` :
    sync.state === 'syncing' ? 'Syncing…' :
    'Sync failed';

  const title =
    sync.state === 'failed'
      ? `${sync.error ?? 'Last sync failed'}. Last successful sync ${age}.`
      : sync.state === 'syncing'
        ? `Sending update to label. Last successful sync ${age}.`
        : `Label matches the latest schedule. Synced ${age}.`;

  return (
    // Keyed on state so the entry animation replays when the state changes
    <span
      key={sync.state}
      title={title}
      className={`relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap overflow-hidden ${style.pill}`}
    >
      <span className="relative flex h-3 w-3 flex-shrink-0 items-center justify-center">
        {sync.state === 'failed' && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
        )}
        <Icon className={`relative h-3 w-3 ${style.iconAnim}`} />
      </span>
      {text}
    </span>
  );
}
