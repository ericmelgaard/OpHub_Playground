import { useEffect, useState } from 'react';
import { Save, Trash2, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Device } from '../types';
import { Button } from '@/components/ui/button';
import { daypartColor } from '../lib/daypartColors';
import { SaveButton } from './SaveButton';
import {
  PendingChange,
  PendingSummary,
  applyPendingChanges,
  discardPendingChanges,
  openPendingSheet,
  usePendingStore,
  usePendingSummary,
  summarize,
} from '../lib/pendingChanges';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Always Save: how a change reaches the label (right away for today, the nightly update for
// later days) is ours to handle, not something people choose or need to see
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function applyAction(_summary: PendingSummary) {
  return { label: 'Save', icon: Save };
}

// Pending changes on one label: Save, review, or discard (label page header)
export function PendingChangesButton({ deviceId }: { deviceId: string }) {
  const summary = usePendingSummary([deviceId]);
  return (
    <SaveButton
      count={summary.count}
      saving={summary.applying}
      noun="pending change"
      onSave={() => applyPendingChanges([deviceId])}
      onReview={() => openPendingSheet({ mode: 'review', deviceIds: [deviceId] })}
      onDiscard={() => openPendingSheet({ mode: 'discard', deviceIds: [deviceId] })}
    />
  );
}

const NOTICE_MS = 4000;

// Floating bar for every label's pending changes: the catch-all apply. Hidden on a
// label page when that label is the only one with changes (its header button covers it).
export function PendingChangesBar({ openDeviceId }: { openDeviceId?: string }) {
  const { notice } = usePendingStore();
  const summary = usePendingSummary();
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    if (!notice) return;
    setShowNotice(true);
    const id = setTimeout(() => setShowNotice(false), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const onlyOpenLabel = !!openDeviceId && summary.changes.every(c => c.deviceId === openDeviceId);
  const showBar = summary.count > 0 && !onlyOpenLabel;

  if (!showBar) {
    if (!showNotice || !notice || summary.applying) return null;
    const failed = notice.text.includes('could not');
    const NoticeIcon = failed ? AlertCircle : CheckCircle2;
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 flex justify-center pointer-events-none safe-area-bottom">
        <div
          role="status"
          className={`refresh-sheet-in flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg text-sm font-medium ${
            failed
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          }`}
        >
          <NoticeIcon className="h-4 w-4 flex-shrink-0" />
          {notice.text}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex justify-center pointer-events-none safe-area-bottom">
      <div className="refresh-sheet-in pointer-events-auto flex items-center gap-2 sm:gap-3 w-full max-w-xl pl-4 pr-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">
          <span className="font-semibold">{plural(summary.count, 'pending change')}</span>
          <span className="text-gray-500 dark:text-gray-400"> · {plural(summary.labelCount, 'label')}</span>
        </p>
        <SaveButton
          count={summary.count}
          saving={summary.applying}
          noun="pending change"
          onSave={() => applyPendingChanges()}
          onReview={() => openPendingSheet({ mode: 'review' })}
          onDiscard={() => openPendingSheet({ mode: 'discard' })}
        />
      </div>
    </div>
  );
}

interface PendingChangesSheetProps {
  devices: Device[];
  // Set when leaving Smart Labels with pending changes
  leaving?: { onStay: () => void; onLeave: () => void } | null;
}

// Review, discard, or leave with pending changes. Changes are grouped by label,
// each tagged with where it goes when applied.
export function PendingChangesSheet({ devices, leaving }: PendingChangesSheetProps) {
  const { sheet, changes, applying } = usePendingStore();
  const mode = leaving ? 'leave' : sheet?.mode;
  if (!mode) return null;

  const deviceIds = !leaving ? sheet?.deviceIds : undefined;
  const scoped = deviceIds ? changes.filter(c => deviceIds.includes(c.deviceId)) : changes;
  const summary = summarize(scoped, applying);
  if (summary.count === 0 && !applying) return null;

  const action = applyAction(summary);
  const close = () => (leaving ? leaving.onStay() : openPendingSheet(null));
  const nameOf = (id: string) => devices.find(d => d.id === id)?.name ?? id;
  const scope = summary.labelCount === 1 ? `on ${nameOf(scoped[0]?.deviceId)}` : `on ${plural(summary.labelCount, 'label')}`;

  const byDevice = new Map<string, PendingChange[]>();
  for (const c of scoped) byDevice.set(c.deviceId, [...(byDevice.get(c.deviceId) ?? []), c]);

  const title =
    mode === 'leave' ? 'Changes not applied' :
    mode === 'discard' ? 'Discard changes?' :
    'Pending changes';
  const subtitle =
    mode === 'leave' ? `${plural(summary.count, 'change')} ${scope} will be lost if you leave.` :
    mode === 'discard' ? `${plural(summary.count, 'change')} ${scope} will be removed. The label stays as it is.` :
    `${plural(summary.count, 'change')} ${scope}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center modal-container md:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 refresh-sheet-fade" onClick={close} />
      <div className="relative modal-content flex flex-col w-full md:max-w-lg max-h-[85vh] bg-white dark:bg-gray-800 rounded-t-xl md:rounded-xl shadow-xl refresh-sheet-in">
        <div className="modal-header flex items-start gap-3 px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="h-9 w-9 -mr-2 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="modal-body flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-4">
          {[...byDevice].map(([deviceId, list]) => (
            <section key={deviceId}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">
                  {nameOf(deviceId)}
                </h3>
                {mode === 'review' && byDevice.size > 1 && (
                  <button
                    onClick={() => discardPendingChanges([deviceId])}
                    disabled={applying}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 flex-shrink-0"
                  >
                    Discard
                  </button>
                )}
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                {list.map(c => (
                  <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="flex-1 min-w-0 truncate text-gray-900 dark:text-white">{c.summary}</span>
                    {c.daypart && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${daypartColor(c.daypart).chip}`}>
                        {c.daypart}
                      </span>
                    )}
                    <WhenTag change={c} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
          {mode === 'review' && (
            <>
              <Button
                variant="ghost"
                onClick={() => openPendingSheet({ mode: 'discard', deviceIds })}
                disabled={applying}
                className="mr-auto gap-1.5 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-4 w-4" />
                Discard all
              </Button>
              <Button onClick={() => applyPendingChanges(deviceIds)} disabled={applying} className="gap-1.5">
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            </>
          )}
          {mode === 'discard' && (
            <>
              <Button variant="outline" onClick={() => openPendingSheet({ mode: 'review', deviceIds })}>Keep changes</Button>
              <Button variant="destructive" onClick={() => discardPendingChanges(deviceIds)} className="gap-1.5">
                <Trash2 className="h-4 w-4" />
                Discard
              </Button>
            </>
          )}
          {mode === 'leave' && leaving && (
            <>
              <Button variant="ghost" onClick={leaving.onStay} disabled={applying} className="mr-auto">Keep editing</Button>
              <Button
                variant="outline"
                onClick={() => { discardPendingChanges(); leaving.onLeave(); }}
                disabled={applying}
                className="text-red-600 dark:text-red-400"
              >
                Discard and leave
              </Button>
              <Button
                onClick={async () => { await applyPendingChanges(); leaving.onLeave(); }}
                disabled={applying}
                className="gap-1.5"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
                {action.label} and leave
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Which week a change is for (when it isn't this week's label as shown)
function WhenTag({ change }: { change: PendingChange }) {
  if (!change.context) return null;
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700">
      {change.context}
    </span>
  );
}
