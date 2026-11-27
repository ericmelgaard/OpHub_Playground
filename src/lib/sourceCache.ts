// This browser's copy of the source menu, one record per day (menu platform spec §5: freshness is
// per day). It's a speed layer in front of the stored copy (Supabase today, the ETL later): read it
// at once, refresh it in the background (src/services/sourceMenu.ts). Kept in IndexedDB; when the
// browser blocks IndexedDB (private windows, blocked site data) it falls back to memory.

// Bump when the shape of a cached day changes; older records are thrown away on open
export const SOURCE_CACHE_VERSION = 1;

const DB_NAME = 'wand-source-cache';
const STORE = 'days';

// One menu item for one date, as the source sends it (only what scheduling needs: identity per
// date, plus the values that change day to day)
export interface SourceMenuItem {
  id: number;              // the source's menu item id for that date (spec: menu_item_id)
  date: string;            // YYYY-MM-DD
  mrn: string;
  portion: string | null;
  stationId: number;
  mealPeriodId: number;
  name: string;
  price: string;
}

// published: the source answered with a menu. not_published: it answered with none (D59), so it's
// checked again later and never filled with a guess.
export type SourceDayStatus = 'published' | 'not_published';

export interface SourceDay {
  key: string;             // `${source}|${date}`
  source: string;
  date: string;
  status: SourceDayStatus;
  items: SourceMenuItem[];
  hash: string;            // of the items, to tell a real change from a re-check
  fetchedAt: number;       // ms
  version: number;
}

export const dayKey = (source: string, date: string) => `${source}|${date}`;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, SourceDay>();

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('date', 'date');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(db => new Promise<T | undefined>(resolve => {
    if (!db) { resolve(undefined); return; }
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }));
}

// The cached days for these dates (missing or old-version days are left out)
export async function readDays(source: string, dates: string[]): Promise<Map<string, SourceDay>> {
  const out = new Map<string, SourceDay>();
  const db = await openDb();
  for (const date of dates) {
    const key = dayKey(source, date);
    const day = db
      ? await run<SourceDay>('readonly', s => s.get(key))
      : memory.get(key);
    if (day && day.version === SOURCE_CACHE_VERSION) out.set(date, day);
  }
  return out;
}

export async function writeDays(days: SourceDay[]): Promise<void> {
  if (days.length === 0) return;
  const db = await openDb();
  if (!db) { days.forEach(d => memory.set(d.key, d)); return; }
  await run('readwrite', s => { days.forEach(d => s.put(d)); });
}

// Removes days the retention rule says to drop; returns how many
export async function deleteDays(shouldDrop: (day: SourceDay) => boolean): Promise<number> {
  const db = await openDb();
  if (!db) {
    let n = 0;
    for (const [k, d] of memory) if (shouldDrop(d)) { memory.delete(k); n++; }
    return n;
  }
  const all = (await run<SourceDay[]>('readonly', s => s.getAll())) ?? [];
  const drop = all.filter(d => d.version !== SOURCE_CACHE_VERSION || shouldDrop(d));
  if (drop.length) await run('readwrite', s => { drop.forEach(d => s.delete(d.key)); });
  return drop.length;
}

// A short, stable fingerprint of a day's items (order-independent)
export function hashItems(items: SourceMenuItem[]): string {
  const text = items
    .map(i => `${i.id}|${i.mrn}|${i.portion ?? ''}|${i.stationId}|${i.mealPeriodId}|${i.name}|${i.price}`)
    .sort()
    .join('\n');
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${items.length}:${(h >>> 0).toString(36)}`;
}
