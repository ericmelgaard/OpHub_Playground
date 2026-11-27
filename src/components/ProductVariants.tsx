import { Check } from 'lucide-react';
import { MenuItem, ProductVariant, VariantField } from '../types';
import { daypartColor } from '../lib/daypartColors';
import { variantDays, variantValues, type ValueFrom } from '../lib/variants';
import { DAY_ABBR } from '../lib/availability';
import { WEEK_ORDER } from '../lib/weekSchedule';
import { RichText } from './RichText';

// A source product (MRN + portion) and its variants: each meal station + daypart it's served at, with
// its own name, price and portion there (menu platform spec §6, §15.6). One list picks what you're
// viewing: All variants (the product) or one variant.

export const money = (p: string) => `$${(parseFloat(p) || 0).toFixed(2)}`;

// Day letters a variant is served on (outlined), in week order
function VariantDayLetters({ v, weekStart }: { v: ProductVariant; weekStart?: string }) {
  const days = variantDays(v, weekStart);
  return (
    <span className="flex gap-0.5 flex-shrink-0" aria-label={`Served ${days.map(d => DAY_ABBR[d]).join(', ') || 'no days'}`}>
      {WEEK_ORDER.map(d => (
        <span
          key={d}
          className={`h-4 w-4 rounded text-[9px] font-bold flex items-center justify-center ${
            days.includes(d)
              ? 'border border-gray-500 dark:border-gray-400 text-gray-700 dark:text-gray-200'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {DAY_ABBR[d][0]}
        </span>
      ))}
    </span>
  );
}

// The variants as compact rows. With onChange it's the sheet's picker: the picked row in the sky
// selected style (the sheet always shows one variant; the card's is picked when it opens).
export function VariantList({ item, value, onChange, weekStart }: {
  item: MenuItem;
  // The picked variant's key
  value?: string | null;
  onChange?: (key: string) => void;
  weekStart?: string;
}) {
  const variants = item.variants ?? [];
  if (variants.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Not served at a meal station.</p>;
  }
  const picker = !!onChange;
  const rowClass = (selected: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 min-h-[48px] rounded-lg border text-left transition-colors ${
      selected
        ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-500'
        : `bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 ${picker ? 'hover:border-sky-300 dark:hover:border-sky-700' : ''}`
    }`;
  const Row = picker ? 'button' : 'div';

  return (
    <div className="space-y-3" role={picker ? 'radiogroup' : undefined} aria-label={picker ? 'Variant' : undefined} data-guide="variant-tabs">
      {[...new Set(variants.map(v => v.daypart))].map(dp => (
      <div key={dp}>
        {/* Each daypart once, its serving stations under it */}
        <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${daypartColor(dp).solid}`} />
          {dp}
        </div>
        <div className="space-y-1">
      {variants.filter(v => v.daypart === dp).map(v => {
        const vals = variantValues(item, v);
        const selected = picker && value === v.key;
        const own = [
          vals.name.from !== 'product' ? `“${vals.name.value}”` : null,
          vals.portion.from === 'variant' ? vals.portion.value : null,
        ].filter(Boolean).join(' · ');
        return (
          <Row
            key={v.key}
            {...(picker ? { type: 'button' as const, role: 'radio', 'aria-checked': selected, onClick: () => onChange!(v.key) } : {})}
            className={rowClass(selected)}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{v.station}</span>
              <span className="mt-0.5 flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">{own || 'Same as the product'}</span>
                <VariantDayLetters v={v} weekStart={weekStart} />
              </span>
            </span>
            <span className="text-sm tabular-nums text-gray-700 dark:text-gray-200 flex-shrink-0">{money(vals.price.value)}</span>
            {picker && (selected
              ? <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              : <span className="w-4 flex-shrink-0" />)}
          </Row>
        );
      })}
        </div>
      </div>
      ))}
    </div>
  );
}

const FROM_LABEL: Record<ValueFrom, string> = {
  variant: 'Local',
  station: 'At this station',
  product: 'From product',
};
const FROM_TITLE: Record<ValueFrom, string> = {
  variant: 'Set here for this station and daypart only',
  station: 'The source sends its own value for this station',
  product: 'The product’s value, shared by every station',
};

// Where a value comes from: a gray tag for Local, plain text otherwise
export function FromTag({ from }: { from: ValueFrom }) {
  return (
    <span
      title={FROM_TITLE[from]}
      className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${
        from === 'variant' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {FROM_LABEL[from]}
    </span>
  );
}

// One variant's values, each marked where it comes from
export function VariantDetails({ item, variant }: { item: MenuItem; variant: ProductVariant }) {
  const vals = variantValues(item, variant);
  const rows: [VariantField | null, string, React.ReactNode][] = [
    ['name', 'Name', vals.name.value],
    ['portion', 'Portion', vals.portion.value || '—'],
    [null, 'Meal station', `${variant.station} · ${variant.daypart}`],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([field, label, value]) => (
          <div key={label} className="contents">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="text-gray-900 dark:text-white min-w-0 flex items-center">
              <span className="truncate">{value}</span>
              {field && <FromTag from={vals[field].from} />}
            </dd>
          </div>
        ))}
      </dl>
      {vals.description.value && (
        <div>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            Description<FromTag from={vals.description.from} />
          </div>
          <RichText value={vals.description.value} className="text-sm text-gray-600 dark:text-gray-300 leading-6 space-y-2" />
        </div>
      )}
    </div>
  );
}
