import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { X, Layers, Package } from 'lucide-react';
import { MenuItem, ProductVariant, VariantField } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SaveButton } from './SaveButton';
import { RichTextEditor } from './RichTextEditor';
import { CopyButton } from './CopyButton';
import { daypartColor } from '../lib/daypartColors';
import { wandId } from '../lib/labelDisplay';
import { plainText } from '../lib/richText';
import { variantValues } from '../lib/variants';

// Editing one variant (meal station + daypart) of a product: only its own values (name, portion,
// price, description). Anything left as the product's is not saved; the product, the source and the
// other variants never change. Same shell as the product edit page.

const FIELDS: VariantField[] = ['name', 'portion', 'price', 'description'];

const norm = (field: VariantField, v: string) =>
  field === 'price' ? (v.trim() === '' ? '' : (parseFloat(v) || 0).toFixed(2))
  : field === 'description' ? plainText(v).trim() ? v.trim() : ''
  : v.trim();

interface VariantEditPageProps {
  item: MenuItem;
  variant: ProductVariant;
  onCancel: () => void;
  // Saves the variant's local values (only fields that differ from the product). Throws on failure.
  onSave: (local: Partial<Record<VariantField, string>>) => Promise<void>;
}

export function VariantEditPage({ item, variant, onCancel, onSave }: VariantEditPageProps) {
  // What each field is without a value of its own: the product's (or the station's from the source)
  const inherited = useMemo(() => variantValues(item, { ...variant, local: {} }), [item, variant]);
  const initial = useMemo(() => variantValues(item, variant), [item, variant]);
  const start = (f: VariantField) => f === 'price' ? (parseFloat(initial[f].value) || 0).toFixed(2) : initial[f].value;
  const [values, setValues] = useState<Record<VariantField, string>>(() =>
    Object.fromEntries(FIELDS.map(f => [f, start(f)])) as Record<VariantField, string>);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, saving]);

  const set = (f: VariantField, v: string) => setValues(prev => ({ ...prev, [f]: v }));
  // A field is local when it differs from what it would inherit (blank = inherit)
  const isLocal = (f: VariantField) => norm(f, values[f]) !== '' && norm(f, values[f]) !== norm(f, inherited[f].value);
  const changed = FIELDS.filter(f => norm(f, values[f]) !== norm(f, start(f)));
  const localFields = FIELDS.filter(isLocal);

  const save = async () => {
    if (changed.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(Object.fromEntries(localFields.map(f => [f, norm(f, values[f])])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };
  const discard = () => setValues(Object.fromEntries(FIELDS.map(f => [f, start(f)])) as Record<VariantField, string>);

  const inheritedFrom = (f: VariantField) => inherited[f].from === 'station' ? 'this station (source)' : 'the product';
  const localMark = (f: VariantField) => isLocal(f) ? (
    <span className="inline-flex items-center gap-1.5 ml-2 text-xs font-normal">
      <span
        title={`Set for ${variant.station} · ${variant.daypart} only. The product and its other stations aren't changed.`}
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      >
        Local
      </span>
      <button type="button" onClick={() => set(f, f === 'price' ? (parseFloat(inherited.price.value) || 0).toFixed(2) : inherited[f].value)} className="text-sky-600 dark:text-sky-400 hover:underline">
        Use product
      </button>
    </span>
  ) : null;
  const hint = (f: VariantField, shown: ReactNode) => (
    <p className="text-xs text-gray-500 dark:text-gray-400">
      {isLocal(f) ? <>From {inheritedFrom(f)}: {shown}</> : <>From {inheritedFrom(f)}</>}
    </p>
  );

  return (
    <div
      className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-gray-50 dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${item.name.trim()} at ${variant.station}`}
    >
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={saving}
            aria-label="Cancel"
            title="Cancel"
            className="flex-shrink-0 -ml-2 h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              {item.name.trim()}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-0.5 font-medium text-gray-700 dark:text-gray-200">
                ID {wandId(item)}
                <CopyButton value={wandId(item)} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                · <span className={`h-2 w-2 rounded-full ${daypartColor(variant.daypart).solid}`} />
                {variant.station} · {variant.daypart}
              </span>
              {localFields.length > 0 && (
                <span>· {localFields.length} local {localFields.length === 1 ? 'value' : 'values'}</span>
              )}
            </p>
          </div>
        </div>
        <SaveButton form="variant-form" count={changed.length} saving={saving} onSave={save} onDiscard={discard} />
      </div>
      {error && (
        <p className="flex-shrink-0 px-4 sm:px-5 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-800">
          Couldn't save · {error}
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <form
          id="variant-form"
          className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5 safe-area-bottom"
          onSubmit={e => { e.preventDefault(); save(); }}
        >
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Layers className="h-4 w-4 text-gray-400" />
              At {variant.station} · {variant.daypart}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Values set here are used only at {variant.station} ({variant.daypart}). Clear a value, or tap
              Use product, to follow the product again.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center"><Label htmlFor="variant-name">Name</Label>{localMark('name')}</div>
              <Input id="variant-name" value={values.name} onChange={e => set('name', e.target.value)} placeholder={inherited.name.value} />
              {hint('name', inherited.name.value)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center"><Label htmlFor="variant-portion">Portion</Label>{localMark('portion')}</div>
                <Input id="variant-portion" value={values.portion} onChange={e => set('portion', e.target.value)} placeholder={inherited.portion.value || 'e.g. slice'} />
                {hint('portion', inherited.portion.value || 'none')}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center"><Label htmlFor="variant-price">Price</Label>{localMark('price')}</div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <Input id="variant-price" value={values.price} onChange={e => set('price', e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.00" className="pl-6 tabular-nums" />
                </div>
                {hint('price', `$${(parseFloat(inherited.price.value) || 0).toFixed(2)}`)}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              Portion is how the size is called here (“slice” for 1/8 pie). It doesn't change which product it is.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center"><Label htmlFor="variant-description">Description</Label>{localMark('description')}</div>
              <RichTextEditor id="variant-description" value={values.description} onChange={v => set('description', v)} placeholder="Same as the product" ariaLabel="Description" />
              {hint('description', plainText(inherited.description.value) || 'none')}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Package className="h-4 w-4 text-gray-400" />
              From the product
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingredients, nutrition, allergens and images belong to the product and its size, so they're the
              same at every station. Change them with Edit product.
            </p>
          </section>
        </form>
      </div>
    </div>
  );
}
