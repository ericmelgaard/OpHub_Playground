import { useSyncExternalStore } from 'react';
import { Device } from '../types';

// Simulated label push pipeline (no partner callbacks in the prototype).
//
// Every saved edit bumps a label's content version. Sends push the whole latest
// version, so a failed send never loses or reorders edits: the label simply stays
// on its last confirmed version and the next send carries everything since.
//
// Sending is explicit: saved changes wait on the label's Send button. Nothing goes
// out on its own. Changes made while a send is in flight wait for the next Send.

const SEND_DURATION_MS = 2500;

export type LabelSyncState = 'synced' | 'pending' | 'syncing' | 'failed';

interface Entry {
  savedVersion: number;          // latest saved content
  labelVersion: number;          // content the label has confirmed
  sendingVersion: number | null; // content currently being pushed
  pendingSince: number | null;   // first unsent change
  lastSyncedAt: string;          // last confirmed push
  error: string | null;          // set by the last failed push, cleared on success
  wifiStrength: number;          // decides the simulated outcome
}

export interface LabelSyncView {
  state: LabelSyncState;
  behindBy: number;        // saved changes not yet on the label
  lastSyncedAt: string;
  error: string | null;
}

const entries = new Map<string, Entry>();
const views = new Map<string, LabelSyncView>();
const listeners = new Set<() => void>();

function toView(e: Entry): LabelSyncView {
  const behindBy = e.savedVersion - e.labelVersion;
  const state: LabelSyncState =
    e.sendingVersion !== null ? 'syncing' :
    e.pendingSince !== null ? 'pending' :
    e.error ? 'failed' :
    'synced';
  return {
    state,
    behindBy,
    lastSyncedAt: e.lastSyncedAt,
    error: e.error,
  };
}

function update(deviceId: string, patch: Partial<Entry>) {
  const next = { ...entries.get(deviceId)!, ...patch };
  entries.set(deviceId, next);
  views.set(deviceId, toView(next));
  listeners.forEach(l => l());
}

function simulatePush(e: Entry): string | null {
  if (e.wifiStrength === 0) return 'Label offline';
  if (e.wifiStrength === 1 && Math.random() < 0.5) return 'Label did not acknowledge update (weak signal)';
  return null;
}

// Seeds labels not seen before from their mock sync state; known labels keep their
// in-flight state across device refetches and only pick up the latest signal.
export function initLabelSync(devices: Device[]) {
  for (const d of devices) {
    const existing = entries.get(d.id);
    if (existing) {
      existing.wifiStrength = d.status.wifiStrength;
      continue;
    }
    const sync = d.status.sync;
    const lastSyncedAt = sync?.lastSyncedAt ?? new Date().toISOString();
    const entry: Entry = {
      savedVersion: 1, labelVersion: 1, sendingVersion: null, pendingSince: null,
      lastSyncedAt, error: null, wifiStrength: d.status.wifiStrength,
    };
    if (sync?.state === 'syncing') {
      // Changes saved a minute ago, waiting on Send
      entry.savedVersion = 3;
      entry.pendingSince = Date.now() - 60_000;
    } else if (sync?.state === 'failed') {
      entry.savedVersion = 3;
      entry.error = sync.error ?? 'Last send failed';
    }
    entries.set(d.id, entry);
    views.set(d.id, toView(entry));
  }
  listeners.forEach(l => l());
}

// Call after an edit that changes what the label currently shows has been saved.
export function recordLabelChange(deviceId: string) {
  const e = entries.get(deviceId);
  if (!e) return;
  update(deviceId, {
    savedVersion: e.savedVersion + 1,
    pendingSince: e.pendingSince ?? Date.now(),
  });
}

// Pushes the latest saved version to the label. Also serves as Retry after a failure.
export function sendNow(deviceId: string) {
  const e = entries.get(deviceId);
  if (!e || e.sendingVersion !== null || e.savedVersion === e.labelVersion) return;
  const version = e.savedVersion;
  update(deviceId, { sendingVersion: version, pendingSince: null });

  setTimeout(() => {
    const current = entries.get(deviceId)!;
    const error = simulatePush(current);
    update(deviceId, error
      ? { sendingVersion: null, error }
      : { sendingVersion: null, labelVersion: version, lastSyncedAt: new Date().toISOString(), error: null });
  }, SEND_DURATION_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useLabelSync(deviceId: string): LabelSyncView | undefined {
  return useSyncExternalStore(subscribe, () => views.get(deviceId));
}

// Sync states for several labels at once (e.g. every device in a group). The snapshot
// is a joined string so it stays stable between unrelated updates.
export function useLabelSyncStates(deviceIds: string[]): (LabelSyncState | undefined)[] {
  const key = useSyncExternalStore(subscribe, () =>
    deviceIds.map(id => views.get(id)?.state ?? '').join(','));
  if (!key) return deviceIds.map(() => undefined);
  return key.split(',').map(s => (s || undefined) as LabelSyncState | undefined);
}
