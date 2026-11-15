import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, X, Search, Sparkles, Tag, ListPlus, CalendarDays, Layers, CalendarRange, Send, Package, RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GuideFigure } from './UserGuideFigures';
import { GUIDE_SECTIONS, GUIDE_UPDATES, GuideSection } from '../lib/userGuide';

const SECTION_ICONS: Record<GuideSection['icon'], typeof Tag> = {
  labels: Tag,
  items: ListPlus,
  days: CalendarDays,
  every: Layers,
  weeks: CalendarRange,
  apply: Send,
  autofill: Sparkles,
  products: Package,
  sync: RefreshCw,
};

const SHOWN_UPDATES = 3;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface UserGuideSheetProps {
  open: boolean;
  // Updates not yet seen when the guide was opened, marked New
  newIds: Set<string>;
  onClose: () => void;
}

export function UserGuideSheet({ open, newIds, onClose }: UserGuideSheetProps) {
  const [query, setQuery] = useState('');
  const [allUpdates, setAllUpdates] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setAllUpdates(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    if (!q) return GUIDE_SECTIONS;
    return GUIDE_SECTIONS
      .map(s => {
        const titleHit = s.title.toLowerCase().includes(q) || s.intro?.toLowerCase().includes(q);
        const entries = titleHit
          ? s.entries
          : s.entries.filter(e => `${e.term ?? ''} ${e.text}`.toLowerCase().includes(q));
        return { ...s, entries };
      })
      .filter(s => s.entries.length > 0);
  }, [q]);

  const updates = allUpdates ? GUIDE_UPDATES : GUIDE_UPDATES.slice(0, SHOWN_UPDATES);

  const goTo = (sectionId: string) => {
    setQuery('');
    requestAnimationFrame(() => {
      bodyRef.current?.querySelector(`[data-section="${sectionId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="User guide">
      <div className="absolute inset-0 bg-black/40 refresh-sheet-fade" onClick={onClose} />
      <div className="product-sheet-in relative flex flex-col w-full md:w-[480px] h-full bg-white dark:bg-gray-900 md:border-l border-gray-200 dark:border-gray-700 shadow-2xl safe-area-top">
        {/* Header */}
        <div className="flex items-start gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <BookOpen className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              User guide
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">How to set up and update your labels</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search the guide"
              className="pl-9"
              aria-label="Search the guide"
            />
          </div>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 safe-area-bottom">
          {/* What's new */}
          {!q && (
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
                <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                What's new
              </h3>
              <ul className="space-y-2">
                {updates.map(u => (
                  <li
                    key={u.id}
                    className={`rounded-lg border px-3 py-2.5 ${
                      newIds.has(u.id)
                        ? 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(u.date)}</span>
                      {newIds.has(u.id) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{u.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{u.text}</p>
                    {u.section && (
                      <button
                        type="button"
                        onClick={() => goTo(u.section!)}
                        className="mt-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Read more
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {GUIDE_UPDATES.length > SHOWN_UPDATES && (
                <button
                  type="button"
                  onClick={() => setAllUpdates(v => !v)}
                  className="mt-2 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
                >
                  {allUpdates ? 'Show fewer' : `Show all ${GUIDE_UPDATES.length} updates`}
                </button>
              )}
            </section>
          )}

          {/* Guide */}
          {sections.map(s => {
            const Icon = SECTION_ICONS[s.icon];
            return (
              <section key={s.id} data-section={s.id} className="scroll-mt-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {s.title}
                </h3>
                {s.intro && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{s.intro}</p>}
                {s.figure && !q && <GuideFigure id={s.figure} />}
                <dl className="mt-2 space-y-2">
                  {s.entries.map((e, i) => (
                    <div key={i} className="text-sm">
                      {e.term && <dt className="font-medium text-gray-900 dark:text-white">{e.term}</dt>}
                      <dd className="text-gray-600 dark:text-gray-300">{e.text}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}

          {q && sections.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Nothing in the guide matches "{query.trim()}".
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
