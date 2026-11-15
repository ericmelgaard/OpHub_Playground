import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, AlertCircle, RotateCw, PencilLine } from 'lucide-react';
import { useLabelSync, sendNow, LabelSyncState } from '../lib/labelSync';
import { usePendingSummary } from '../lib/pendingChanges';

function formatAge(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const plural = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`;

const styles: Record<LabelSyncState, { icon: typeof CheckCircle2; pill: string; iconAnim: string }> = {
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

const sizes = {
  sm: { pill: 'gap-1 px-1.5 py-0.5 text-[10px]', icon: 'h-3 w-3', button: 'px-2 py-0.5 text-[10px]' },
  md: { pill: 'gap-1.5 px-2.5 py-1 text-xs', icon: 'h-3.5 w-3.5', button: 'px-2.5 py-1 text-xs' },
};

interface SyncStatusProps {
  deviceId: string;
  size?: keyof typeof sizes;
  // Show Retry next to the badge when a send failed
  showActions?: boolean;
  // Short text and icon-only actions, for cards and list rows (details stay in the tooltip)
  compact?: boolean;
}

export function SyncStatus({ deviceId, size = 'sm', showActions = false, compact = false }: SyncStatusProps) {
  const view = useLabelSync(deviceId);

  // Tick every 30s to keep "Synced 2m ago" current
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!view) return null;
  const sz = sizes[size];
  const style = styles[view.state];
  const Icon = style.icon;
  const age = formatAge(view.lastSyncedAt);

  let text: string;
  let title: string;
  switch (view.state) {
    case 'synced':
      text = `Synced ${age}`;
      title = `Label is showing the latest changes. Synced ${age}.`;
      break;
    case 'syncing':
      text = 'Syncing…';
      title = `Sending ${plural(view.behindBy)} to the label. Last successful sync ${age}.`;
      break;
    case 'failed':
      text = compact ? 'Sync failed' : `Sync failed · ${plural(view.behindBy)} behind`;
      title = `${view.error}. ${plural(view.behindBy)} not on the label; it's still showing content from ${age}.`;
      break;
  }

  // Retry resends what the label is missing; new edits go through pending changes
  const action = view.state === 'failed' ? { label: 'Retry', icon: RotateCw } : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      {/* Keyed on state so the entry animation replays when the state changes */}
      <span
        key={view.state}
        title={title}
        className={`relative inline-flex items-center rounded-full border font-medium whitespace-nowrap overflow-hidden tabular-nums ${sz.pill} ${style.pill}`}
      >
        <span className={`relative flex flex-shrink-0 items-center justify-center ${sz.icon}`}>
          {view.state === 'failed' && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
          )}
          <Icon className={`relative ${sz.icon} ${style.iconAnim}`} />
        </span>
        {text}
      </span>
      {showActions && action && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); sendNow(deviceId); }}
          title={action.label}
          aria-label={action.label}
          className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap text-white transition-colors ${
            compact ? 'h-6 w-6 justify-center flex-shrink-0' : sz.button
          } ${
            view.state === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700'
          }`}
        >
          <action.icon className={sz.icon} />
          {!compact && action.label}
        </button>
      )}
    </span>
  );
}

// Edits on this label not saved yet (they live on the label page until Save)
export function PendingPill({ deviceId, size = 'sm' }: { deviceId: string; size?: keyof typeof sizes }) {
  const { count } = usePendingSummary([deviceId]);
  if (count === 0) return null;
  const sz = sizes[size];
  return (
    <span
      title={`${count} pending ${count === 1 ? 'change' : 'changes'} not applied. Open the label to send or save them.`}
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap tabular-nums ${sz.pill} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`}
    >
      <PencilLine className={sz.icon} />
      {count} pending
    </span>
  );
}
