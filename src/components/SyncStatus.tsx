import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, AlertCircle, Clock, Send, RotateCw } from 'lucide-react';
import { useLabelSync, sendNow, LabelSyncState } from '../lib/labelSync';

function formatAge(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const plural = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`;

const styles: Record<LabelSyncState, { icon: typeof Clock; pill: string; iconAnim: string }> = {
  synced: {
    icon: CheckCircle2,
    pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    iconAnim: 'sync-pop',
  },
  pending: {
    icon: Clock,
    pill: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    iconAnim: '',
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
  // Show Send now / Retry next to the badge
  showActions?: boolean;
}

export function SyncStatus({ deviceId, size = 'sm', showActions = false }: SyncStatusProps) {
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
    case 'pending':
      text = `${plural(view.behindBy)} not sent`;
      title = `${plural(view.behindBy)} saved but not on the label yet. Press Send now to update the label.`
        + (view.error ? ` The previous send failed (${view.error}); this send includes those changes.` : '');
      break;
    case 'syncing':
      text = 'Syncing…';
      title = `Sending ${plural(view.behindBy)} to the label. Last successful sync ${age}.`;
      break;
    case 'failed':
      text = `Sync failed · ${plural(view.behindBy)} behind`;
      title = `${view.error}. The label is still showing content from ${age}.`;
      break;
  }

  const action =
    view.state === 'pending' ? { label: 'Send now', icon: Send } :
    view.state === 'failed' ? { label: 'Retry', icon: RotateCw } :
    null;

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
          className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap text-white transition-colors ${sz.button} ${
            view.state === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700'
          }`}
        >
          <action.icon className={sz.icon} />
          {action.label}
        </button>
      )}
    </span>
  );
}
