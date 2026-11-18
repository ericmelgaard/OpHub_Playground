import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SaveButton } from './SaveButton';
import { SiteSettings } from '../lib/siteSettings';
import { WEEK_ORDER } from '../lib/weekSchedule';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface SiteSettingsPageProps {
  settings: SiteSettings;
  onSave: (settings: SiteSettings) => Promise<void>;
  onClose: () => void;
}

// Settings for the site. Starts with the business days; more settings join as their own cards.
export function SiteSettingsPage({ settings, onSave, onClose }: SiteSettingsPageProps) {
  const [openDays, setOpenDays] = useState<number[]>(settings.openDays);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setOpenDays(settings.openDays); }, [settings]);

  const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every(d => b.includes(d));
  const changes = sameDays(openDays, settings.openDays) ? 0 : 1;
  const noDays = openDays.length === 0;

  const toggleDay = (d: number) =>
    setOpenDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : WEEK_ORDER.filter(x => x === d || prev.includes(x))));

  const save = async () => {
    if (!changes || noDays) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...settings, openDays });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Settings didn't save.");
    } finally {
      setSaving(false);
    }
  };

  const closed = WEEK_ORDER.filter(d => !openDays.includes(d));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900" role="dialog" aria-modal="true" aria-label="Site settings">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-top">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-ml-2 h-9 w-9 text-gray-500 dark:text-gray-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">Site settings</h1>
        </div>
        <SaveButton
          count={noDays ? 0 : changes}
          saving={saving}
          onSave={save}
          onDiscard={() => { setOpenDays(settings.openDays); setError(null); }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Business days</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  The days you're open. Empty spots on labels aren't flagged on closed days. You can still add items on any day.
                </p>
              </div>

              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Business days">
                {WEEK_ORDER.map(d => {
                  const open = openDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={open}
                      aria-label={`${DAY_LONG[d]}, ${open ? 'open' : 'closed'}`}
                      className={`h-14 flex flex-col items-center justify-center rounded-xl border-2 transition-colors ${
                        open
                          ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-500 text-sky-700 dark:text-sky-300'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-sm font-semibold">{DAY_SHORT[d]}</span>
                      <span className="text-[10px]">{open ? 'Open' : 'Closed'}</span>
                    </button>
                  );
                })}
              </div>

              <p className={`text-xs ${noDays ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {noDays
                  ? 'Pick at least one day.'
                  : closed.length === 0
                    ? 'Open every day.'
                    : `Closed ${closed.map(d => DAY_SHORT[d]).join(', ')}.`}
              </p>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
