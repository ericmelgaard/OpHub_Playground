import { useMemo, useSyncExternalStore } from 'react';
import { Device, Substitution } from '../types';
import type { DisplayToggle } from '../components/InlineItemPicker';
import { recordLabelChange, sendNow } from './labelSync';

// Edits on a label page wait here as pending changes until they're applied or
// discarded. Nothing is written until then, so leaving without applying loses them.
//
// Applying is one action; where each change goes is decided per change, not by the
// person: changes that affect what the label shows today are sent right away, and
// the rest (later days and weeks) are saved for the nightly update. Saved is final.
//
// Pending changes survive stepping between labels and going back to the grid. They
// are kept per label and per week being edited (the draft key).

export type MergeMode = 'replace' | 'toggle';

export interface PendingChange {
  id: string;
  deviceId: string;
  draftKey: string;
  summary: string;           // "Added Pancakes"
  daypart?: string;
  context?: string;          // "This Week", "Default Week"
  live: boolean;             // affects today's label, so it's sent right away
  // Same key as an earlier change: 'replace' keeps only the newest,
  // 'toggle' cancels both (an add then a remove of the same item)
  mergeKey?: string;
  mode?: MergeMode;
  commit: () => Promise<void>;
}

// Page-only edits (display toggles, substitutions, auto fill) aren't stored by the
// prototype's API, so they're kept here after applying too.
export interface LabelLocalState {
  toggles: Record<string, Record<number, DisplayToggle>>;
  substitutions: Substitution[];
  autoFill: boolean;
}

export interface LabelDraft extends LabelLocalState {
  device: Device;
}

export type PendingSheet =
  | { mode: 'review'; deviceIds?: string[] }
  | { mode: 'discard'; deviceIds?: string[] };

export interface ApplyNotice {
  text: string;
  at: number;
}

interface Snapshot {
  changes: PendingChange[];
  applying: boolean;
  sheet: PendingSheet | null;
  notice: ApplyNotice | null;
}

let snapshot: Snapshot = { changes: [], applying: false, sheet: null, notice: null };
const drafts = new Map<string, LabelDraft>();
const applied = new Map<string, LabelLocalState>();
const listeners = new Set<() => void>();
let afterApply: (() => Promise<void>) | null = null;

function set(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  // Drafts only matter while they have changes behind them
  for (const key of drafts.keys()) {
    if (!snapshot.changes.some(c => c.draftKey === key)) drafts.delete(key);
  }
  listeners.forEach(l => l());
}

const inScope = (deviceIds?: string[]) => (c: PendingChange) => !deviceIds || deviceIds.includes(c.deviceId);

export function addPendingChange(change: Omit<PendingChange, 'id'>) {
  const changes = [...snapshot.changes];
  const existing = change.mergeKey
    ? changes.findIndex(c => c.draftKey === change.draftKey && c.mergeKey === change.mergeKey)
    : -1;
  if (existing !== -1) {
    changes.splice(existing, 1);
    if (change.mode === 'toggle') {
      set({ changes });
      return;
    }
  }
  changes.push({ ...change, id: crypto.randomUUID() });
  set({ changes });
}

// The page's working copy of a label, so pending edits show again when you come back to it
export function saveDraft(draftKey: string, draft: LabelDraft) {
  if (snapshot.changes.some(c => c.draftKey === draftKey)) drafts.set(draftKey, draft);
}

export function getDraft(draftKey: string): LabelDraft | undefined {
  return drafts.get(draftKey);
}

export function getAppliedLocalState(draftKey: string): LabelLocalState | undefined {
  return applied.get(draftKey);
}

export function hasPendingChanges() {
  return snapshot.changes.length > 0;
}

// Reloads data after changes are written (set by the app)
export function setAfterApply(fn: (() => Promise<void>) | null) {
  afterApply = fn;
}

export function discardPendingChanges(deviceIds?: string[]) {
  set({ changes: snapshot.changes.filter(c => !inScope(deviceIds)(c)), sheet: null });
}

export async function applyPendingChanges(deviceIds?: string[]) {
  if (snapshot.applying) return;
  const batch = snapshot.changes.filter(inScope(deviceIds));
  if (batch.length === 0) return;
  set({ applying: true, sheet: null });

  const done = new Set<string>();
  let error: string | null = null;
  for (const change of batch) {
    try {
      await change.commit();
      done.add(change.id);
    } catch (err) {
      console.error('Error applying change:', err);
      error = 'Some changes could not be applied and are still pending';
      break;
    }
  }

  const appliedChanges = batch.filter(c => done.has(c.id));
  for (const key of new Set(appliedChanges.map(c => c.draftKey))) {
    const draft = drafts.get(key);
    if (draft && !batch.some(c => c.draftKey === key && !done.has(c.id))) {
      applied.set(key, { toggles: draft.toggles, substitutions: draft.substitutions, autoFill: draft.autoFill });
    }
  }

  try {
    await afterApply?.();
  } catch (err) {
    console.error('Error reloading after apply:', err);
  }

  const liveByDevice = new Map<string, number>();
  for (const c of appliedChanges) {
    if (c.live) liveByDevice.set(c.deviceId, (liveByDevice.get(c.deviceId) ?? 0) + 1);
  }
  for (const [deviceId, count] of liveByDevice) {
    for (let i = 0; i < count; i++) recordLabelChange(deviceId);
    sendNow(deviceId);
  }

  const savedCount = appliedChanges.filter(c => !c.live).length;
  const sentLabels = liveByDevice.size;
  const text = error ?? (
    sentLabels > 0
      ? `Sending to ${sentLabels} ${sentLabels === 1 ? 'label' : 'labels'}`
        + (savedCount > 0 ? ` · ${savedCount} saved for the nightly update` : '')
      : 'Saved · goes out with the nightly update'
  );
  set({
    changes: snapshot.changes.filter(c => !done.has(c.id)),
    applying: false,
    notice: { text, at: Date.now() },
  });
}

export function openPendingSheet(sheet: PendingSheet | null) {
  set({ sheet });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function usePendingStore(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export interface PendingSummary {
  changes: PendingChange[];
  count: number;
  labelCount: number;
  // Any change goes to the label right away, so applying reads as Send now
  anyLive: boolean;
  applying: boolean;
}

export function summarize(changes: PendingChange[], applying: boolean): PendingSummary {
  return {
    changes,
    count: changes.length,
    labelCount: new Set(changes.map(c => c.deviceId)).size,
    anyLive: changes.some(c => c.live),
    applying,
  };
}

export function usePendingSummary(deviceIds?: string[]): PendingSummary {
  const { changes, applying } = usePendingStore();
  const key = deviceIds?.join(',');
  return useMemo(
    () => summarize(changes.filter(inScope(deviceIds)), applying),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [changes, applying, key],
  );
}

export function useHasDraft(draftKey: string): boolean {
  const { changes } = usePendingStore();
  return changes.some(c => c.draftKey === draftKey);
}
