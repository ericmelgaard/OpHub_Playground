import { useSyncExternalStore } from 'react';
import { Device } from '../types';

// Simulated label push pipeline (no partner callbacks in the prototype).
//
// Every saved edit bumps a label's content version. Sends push the whole latest
// version, so a failed send never loses or reorders edits: the label simply stays
// on its last confirmed version and the next send carries everything since.
//
// Batching: the first unsent change starts a 2 minute timer; changes made before it
// fires ride along. Send now skips the wait. Changes made while a send is in flight
// start a new timer.

export const SEND_DELAY_MS = 2 * 60_000;
const SEND_DURATION_MS = 2500;

export type LabelSyncState = 'synced' | 'pending' | 'syncing' | 'failed';

interface Entry {
  savedVersion: number;          // latest saved content
  labelVersion: number;          // content the label has confirmed
  sendingVersion: number | null; // content currently being pushed
  pendingSince: number | null;   // first unsent change; the send timer runs from here
  lastSyncedAt: string;          // last confirmed push
  error: string | null;          // set by the last failed push, cleared on success
  wifiStrength: number;          // decides the simulated outcome
}

export interface LabelSyncView {
  state: LabelSyncState;
  behindBy: number;        // saved changes not yet on the label
  sendAt: number | null;   // when the pending batch auto-sends
  lastSyncedAt: string;
  error: string | null;
}

const entries = new Map<string, Entry>();
const views = new Map<string, LabelSyncView>();
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

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
    sendAt: e.pendingSince !== null ? e.pendingSince + SEND_DELAY_MS : null,
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

function scheduleAutoSend(deviceId: string) {
  clearTimeout(timers.get(deviceId));
  const e = entries.get(deviceId);
  if (!e || e.pendingSince === null) return;
  timers.set(deviceId, setTimeout(() => sendNow(deviceId), Math.max(0, e.pendingSince + SEND_DELAY_MS - Date.now())));
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
      // Mid-batch: saved a minute ago, auto-sends within the next minute
      entry.savedVersion = 3;
      entry.pendingSince = Date.now() - 60_000 - Math.round(Math.random() * 30_000);
    } else if (sync?.state === 'failed') {
      entry.savedVersion = 3;
      entry.error = sync.error ?? 'Last send failed';
    }
    entries.set(d.id, entry);
    views.set(d.id, toView(entry));
    scheduleAutoSend(d.id);
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
  scheduleAutoSend(deviceId);
}

// Pushes the latest saved version now. Also serves as Retry after a failure.
export function sendNow(deviceId: string) {
  const e = entries.get(deviceId);
  if (!e || e.sendingVersion !== null || e.savedVersion === e.labelVersion) return;
  clearTimeout(timers.get(deviceId));
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
