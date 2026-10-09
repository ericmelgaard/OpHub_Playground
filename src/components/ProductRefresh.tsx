import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshCw, Cloud, Database, Check, Loader2, Circle, X, PackagePlus, PencilLine,
  PackageMinus, CheckCircle2, Search, Tag, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { Device, MenuItem } from '../types';
import {
  REFRESH_STEPS, RefreshReport, randomRefreshDuration, simulateRefresh,
} from '../lib/productRefresh';

type Phase = 'idle' | 'running' | 'done';

export interface ProductRefreshState {
  phase: Phase;
  startedAt: number;
  duration: number;
  report: RefreshReport | null;
  open: boolean;
  unseen: boolean; // finished while the sheet was hidden
  lastRefreshedAt: number;
  start: () => void;
  openSheet: () => void;
  closeSheet: () => void;
}

// Runs the (simulated) refresh at the App level so it keeps going while the
// sheet is hidden or the user moves to another page.
export function useProductRefresh(
  menuItems: MenuItem[],
  onApply: (items: MenuItem[], report: RefreshReport) => void,
): ProductRefreshState {
  const [phase, setPhase] = useState<Phase>('idle');
  const [startedAt, setStartedAt] = useState(0);
  const [duration, setDuration] = useState(0);
  const [report, setReport] = useState<RefreshReport | null>(null);
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => Date.now());

  // Read the latest list when the refresh finishes, not when it started
  const itemsRef = useRef(menuItems);
  itemsRef.current = menuItems;
  const openRef = useRef(open);
  openRef.current = open;
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const start = useCallback(() => {
    if (phase === 'running') return;
    const ms = randomRefreshDuration();
    setPhase('running');
    setStartedAt(Date.now());
    setDuration(ms);
    setReport(null);
    setUnseen(false);
    setOpen(true);
    timer.current = setTimeout(() => {
      const result = simulateRefresh(itemsRef.current);
      onApplyRef.current(result.items, result.report);
      setReport(result.report);
      setPhase('done');
      setLastRefreshedAt(Date.now());
      if (!openRef.current) setUnseen(true);
    }, ms);
  }, [phase]);

  const openSheet = useCallback(() => {
    setOpen(true);
    setUnseen(false);
  }, []);

  const closeSheet = useCallback(() => {
    setOpen(false);
    // Once the report has been seen, the button goes back to its resting state
    setPhase(p => (p === 'done' ? 'idle' : p));
  }, []);

  return { phase, startedAt, duration, report, open, unseen, lastRefreshedAt, start, openSheet, closeSheet };
}

// Re-renders on an interval while active (progress bars, "2m ago" labels)
function useTicker(active: boolean, ms: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}

function progressOf(r: ProductRefreshState) {
  const fraction = r.phase === 'running'
    ? Math.min(0.99, (Date.now() - r.startedAt) / r.duration)
    : r.phase === 'done' ? 1 : 0;
  let acc = 0;
  let stepIndex = REFRESH_STEPS.length;
  for (let i = 0; i < REFRESH_STEPS.length; i++) {
    acc += REFRESH_STEPS[i].weight;
    if (fraction < acc) { stepIndex = i; break; }
  }
  const secondsLeft = Math.max(1, Math.ceil((r.startedAt + r.duration - Date.now()) / 1000));
  return { fraction, stepIndex, secondsLeft };
}

export function formatRefreshAge(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

// "· Refreshed 5m ago", shown beside the data source name
export function RefreshAge({ refresh }: { refresh: ProductRefreshState }) {
  useTicker(true, 30_000);
  return (
    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
      · {refresh.phase === 'running' ? 'Refreshing…' : `Refreshed ${formatRefreshAge(refresh.lastRefreshedAt)}`}
    </span>
  );
}

const reportTotal =(r: RefreshReport) => r.added.length + r.changed.length + r.removed.length;

export function ProductRefreshButton({ refresh }: { refresh: ProductRefreshState }) {
  useTicker(refresh.phase === 'running', 250);
  const running = refresh.phase === 'running';
  const { fraction } = progressOf(refresh);
  const newCount = refresh.report?.added.length ?? 0;

  return (
    <button
      onClick={running || refresh.unseen ? refresh.openSheet : refresh.start}
      className={`relative overflow-hidden flex items-center gap-2 h-11 px-4 text-sm font-medium rounded-lg border transition-colors ${
        refresh.unseen
          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
          : 'border-sky-300 dark:border-sky-700 bg-white dark:bg-gray-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30'
      }`}
    >
      {running && (
        // Progress fills the button behind the label
        <span
          className="absolute inset-y-0 left-0 bg-sky-100 dark:bg-sky-900/50 transition-[width] duration-300 ease-linear"
          style={{ width: `${fraction * 100}%` }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {refresh.unseen ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            {newCount > 0 ? `${newCount} new ${newCount === 1 ? 'product' : 'products'}` : 'Refresh complete'}
          </>
        ) : (
          <>
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? `Refreshing… ${Math.round(fraction * 100)}%` : 'Refresh Products'}
          </>
        )}
      </span>
    </button>
  );
}

interface SheetProps {
  refresh: ProductRefreshState;
  devices: Device[];
  onShowProduct: (item: MenuItem) => void;
  onPlaceOnLabel: (item: MenuItem) => void;
}

export function ProductRefreshSheet({ refresh, devices, onShowProduct, onPlaceOnLabel }: SheetProps) {
  if (!refresh.open || refresh.phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 refresh-sheet-fade" onClick={refresh.closeSheet} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Refresh products"
        className="refresh-sheet-in relative w-full md:w-[680px] max-h-[88vh] flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        {/* Grab handle on the bottom-sheet layout */}
        <div className="md:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
        {refresh.phase === 'running'
          ? <RunningView refresh={refresh} />
          : <ReportView refresh={refresh} devices={devices} onShowProduct={onShowProduct} onPlaceOnLabel={onPlaceOnLabel} />}
      </div>
    </div>
  );
}

function RunningView({ refresh }: { refresh: ProductRefreshState }) {
  useTicker(true, 100);
  const { fraction, stepIndex, secondsLeft } = progressOf(refresh);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Refreshing products</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Getting the latest catalog from Webtrition</p>
        </div>
        <CloseButton onClick={refresh.closeSheet} label="Hide" />
      </div>

      {/* Webtrition → your products, with data flowing between */}
      <div className="my-8 flex items-center justify-center gap-3 sm:gap-6">
        <Endpoint icon={Cloud} label="Webtrition" active />
        <div className="relative h-10 w-32 sm:w-48 overflow-hidden" aria-hidden>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-sky-100 dark:bg-sky-900/60 rounded-full" />
          {[0, 1, 2, 3].map(i => (
            <span
              key={i}
              className="refresh-flow-dot absolute top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.7)]"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}
        </div>
        <Endpoint icon={Database} label="Your products" active={stepIndex >= 2} />
      </div>

      <div className="flex items-baseline justify-between text-sm mb-2">
        <span className="font-medium text-gray-900 dark:text-white tabular-nums">{Math.round(fraction * 100)}%</span>
        <span className="text-gray-500 dark:text-gray-400 tabular-nums">About {secondsLeft}s left</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="refresh-progress-stripes h-full rounded-full bg-sky-500 transition-[width] duration-150 ease-linear"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      <ol className="mt-6 space-y-3">
        {REFRESH_STEPS.map((step, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li key={step.label} className="flex items-center gap-3 text-base">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${
                done ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                : current ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
              }`}>
                {done ? <Check className="h-4 w-4 sync-pop" /> : current ? <Loader2 className="h-4 w-4 animate-spin" /> : <Circle className="h-2.5 w-2.5" />}
              </span>
              <span className={done ? 'text-gray-500 dark:text-gray-400' : current ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <button
        onClick={refresh.closeSheet}
        className="mt-8 w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Keep working — we’ll let you know
      </button>
    </div>
  );
}

function Endpoint({ icon: Icon, label, active }: { icon: typeof Cloud; label: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 w-24">
      <span className={`relative flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-500 ${
        active ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
      }`}>
        {active && <span className="absolute inset-0 rounded-2xl ring-2 ring-sky-400/60 refresh-endpoint-pulse" />}
        <Icon className="h-8 w-8" />
      </span>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 text-center">{label}</span>
    </div>
  );
}

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex-shrink-0 h-11 w-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <X className="h-5 w-5" />
    </button>
  );
}

type Tab = 'added' | 'changed' | 'removed';

const tabStyles: Record<Tab, { icon: typeof PackagePlus; label: string; on: string; count: string }> = {
  added: {
    icon: PackagePlus, label: 'Added',
    on: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    count: 'text-emerald-600 dark:text-emerald-400',
  },
  changed: {
    icon: PencilLine, label: 'Changed',
    on: 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    count: 'text-amber-600 dark:text-amber-400',
  },
  removed: {
    icon: PackageMinus, label: 'Removed',
    on: 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    count: 'text-red-600 dark:text-red-400',
  },
};

function ReportView({ refresh, devices, onShowProduct, onPlaceOnLabel }: Omit<SheetProps, 'refresh'> & { refresh: ProductRefreshState }) {
  const report = refresh.report!;
  const counts: Record<Tab, number> = { added: report.added.length, changed: report.changed.length, removed: report.removed.length };
  // Open on new products (the reason people refresh), else the first non-empty group
  const [tab, setTab] = useState<Tab>(() => (['added', 'changed', 'removed'] as Tab[]).find(t => counts[t] > 0) ?? 'added');
  const total = reportTotal(report);

  return (
    <>
      <div className="p-6 sm:p-8 pb-4 sm:pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6 sync-pop" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {total === 0 ? 'Everything is up to date' : 'Products refreshed'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {total === 0 ? 'No changes in Webtrition since the last refresh' : `${total} ${total === 1 ? 'change' : 'changes'} from Webtrition`}
              </p>
            </div>
          </div>
          <CloseButton onClick={refresh.closeSheet} label="Close" />
        </div>

        {total > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3" role="tablist">
            {(Object.keys(tabStyles) as Tab[]).map(t => {
              const s = tabStyles[t];
              const Icon = s.icon;
              const selected = tab === t;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={selected}
                  disabled={counts[t] === 0}
                  onClick={() => setTab(t)}
                  className={`flex flex-col items-start gap-1 rounded-xl border-2 px-3 py-3 sm:px-4 text-left transition-colors disabled:opacity-40 ${
                    selected ? s.on : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Icon className="h-4 w-4" />{s.label}</span>
                  <span className={`text-2xl font-bold tabular-nums ${selected ? '' : s.count}`}>{counts[t]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 sm:px-8 overscroll-contain">
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            If you just added a product in Webtrition, it can take a few minutes to publish. Try again shortly.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {tab === 'added' && report.added.map(item => (
              <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <ProductSummary item={item} badge={<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>} />
                <div className="flex gap-2 sm:flex-shrink-0">
                  <RowButton onClick={() => onShowProduct(item)} icon={Search}>Show</RowButton>
                  <RowButton onClick={() => onPlaceOnLabel(item)} icon={Tag} primary>Place on label</RowButton>
                </div>
              </li>
            ))}
            {tab === 'changed' && report.changed.map(({ item, changes }) => (
              <li key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <ProductSummary item={item} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {changes.map(c => (
                      <span key={c.field} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-sm">
                        <span className="font-medium text-amber-800 dark:text-amber-300">{c.field}</span>
                        <span className="text-gray-400 line-through">{c.from}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">{c.to}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-shrink-0">
                  <RowButton onClick={() => onShowProduct(item)} icon={Search}>Show</RowButton>
                </div>
              </li>
            ))}
            {tab === 'removed' && report.removed.map(item => {
              const labelCount = devices.filter(d => d.pages.some(p => p.assignedItems.some(i => i.mrn === item.mrn))).length;
              return (
                <li key={item.id} className="py-4 flex flex-col gap-2">
                  <ProductSummary item={item} removed />
                  {labelCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-sm text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      Still on {labelCount} {labelCount === 1 ? 'label' : 'labels'} — replace it there
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">Not on any labels</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-6 sm:px-8 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={refresh.closeSheet}
          className="w-full h-12 rounded-xl text-base font-semibold text-white transition-colors hover:bg-brand-dark bg-brand"
        >
          Done
        </button>
      </div>
    </>
  );
}

function ProductSummary({ item, badge, removed }: { item: MenuItem; badge?: ReactNode; removed?: boolean }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`text-base font-semibold truncate ${removed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{item.name}</span>
        {badge}
      </div>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate">
        {item.mealStation} · {item.mealPeriod} · ${parseFloat(item.price).toFixed(2)} · MRN {item.mrn}
      </p>
    </div>
  );
}

function RowButton({ onClick, icon: Icon, primary, children }: { onClick: () => void; icon: typeof Search; primary?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-lg text-sm font-medium transition-colors ${
        primary
          ? 'bg-sky-600 hover:bg-sky-700 text-white'
          : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
