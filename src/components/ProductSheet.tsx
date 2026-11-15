import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  X, Plus, Tag, MapPin, Clock, CalendarDays, Leaf, ChevronRight, ChevronDown, Link2, Unlink, PenLine,
  Pencil, Loader2, Check, Activity, ListChecks,
} from 'lucide-react';
import { SaveButton } from './SaveButton';
import { Device, MenuItem, ProductField, ProductValues } from '../types';
import { valuesOf, sameValue, FIELD_LABELS, PRODUCT_FIELDS } from '../lib/productValues';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { daypartColor } from '../lib/daypartColors';
import { levelIconColor } from '../lib/levelColors';
import { isCustomItem, wandId, linkedSourceId } from '../lib/labelDisplay';
import { parseIngredients } from '../lib/richText';
import { menuDaysInWeek, getWeekStartString, formatWeekRange, sortDayparts, type LabelUse } from '../lib/weekSchedule';
import { productDayparts, ALL_DAYPARTS } from '../lib/stations';
import { ProductDayRows } from './ProductDays';
import type { ProductInput } from '../services/api';
import { RichText, LabelName } from './RichText';
import { RichTextEditor } from './RichTextEditor';

interface ProductSheetProps {
  // The product being viewed, or null
  item: MenuItem | null;
  // Opens the sheet on an empty form for a new custom product
  creating: boolean;
  // Week picked in the Products week selector (offset from this week)
  weekOffset: number;
  // Days this product is on labels that week
  labelDays?: Set<number>;
  // Dayparts and stations it's on labels that week; custom products take theirs only from here
  labelUse?: LabelUse;
  devices: Device[];
  // All products, for the daypart, station, icon and allergen choices
  menuItems: MenuItem[];
  onClose: () => void;
  onAddToLabel: (item: MenuItem) => void;
  onOpenLabel: (device: Device, daypart: string) => void;
  // Saves a new (item null) or edited custom product; resolves to the saved product. Throws on failure.
  onSave: (input: ProductInput, item: MenuItem | null) => Promise<MenuItem | null>;
  // Sets (or clears, with blank) what labels show for a product. Throws on failure.
  onSaveDisplayName: (item: MenuItem, displayName: string) => Promise<void>;
}

// Dayparts a product can be offered at: WAND's dayparts plus any the data uses (the source may
// send ones labels don't, like Brunch). All Day isn't a choice: an All Day page takes any product.
const WAND_DAYPARTS = ['Breakfast', 'Lunch', 'Dinner', 'Late Night'];
function daypartChoices(menuItems: MenuItem[], item?: MenuItem | null): string[] {
  const seen = new Set<string>([...WAND_DAYPARTS, ...(item ? productDayparts(item) : [])]);
  menuItems.forEach(i => productDayparts(i).forEach(p => seen.add(p)));
  seen.delete('All Day');
  return sortDayparts(seen);
}

const NUTRIENTS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbohydrates', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'sugar', label: 'Sugar' },
] as const;
type NutrientKey = typeof NUTRIENTS[number]['key'];

const splitAllergens = (s: string | undefined) => (s ? s.split(',').map(a => a.trim()).filter(Boolean) : []);

// One product: view its details, or (custom products) edit them. Also the form for a new product.
export function ProductSheet({ item, creating, weekOffset, labelDays, labelUse, devices, menuItems, onClose, onAddToLabel, onOpenLabel, onSave, onSaveDisplayName }: ProductSheetProps) {
  const [editing, setEditing] = useState(false);
  const open = creating || !!item;
  const showForm = creating || editing;

  // A different product (or closing) leaves edit mode
  useEffect(() => { setEditing(false); }, [item?.id, creating]);

  useEffect(() => {
    if (!open || showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, showForm, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={creating ? 'New product' : item?.name}>
      {/* While a form is open the backdrop doesn't close it, so typing isn't lost to a stray tap */}
      <div className="absolute inset-0 bg-black/40 refresh-sheet-fade" onClick={showForm ? undefined : onClose} />
      <div className="product-sheet-in relative flex flex-col w-full md:w-[480px] h-full bg-white dark:bg-gray-900 md:border-l border-gray-200 dark:border-gray-700 shadow-2xl safe-area-top">
        {showForm ? (
          <ProductForm
            key={item?.id ?? 'new'}
            item={creating ? null : item}
            menuItems={menuItems}
            onCancel={creating ? onClose : () => setEditing(false)}
            onSave={async input => {
              const saved = await onSave(input, creating ? null : item);
              setEditing(false);
              return saved;
            }}
          />
        ) : item && (
          <ProductDetails
            item={item}
            weekOffset={weekOffset}
            labelDays={labelDays}
            labelUse={labelUse}
            devices={devices}
            onClose={onClose}
            onEdit={() => setEditing(true)}
            onAddToLabel={onAddToLabel}
            onOpenLabel={onOpenLabel}
            onSaveDisplayName={onSaveDisplayName}
          />
        )}
      </div>
    </div>
  );
}

function SheetHeader({ title, subtitle, onClose, closeLabel = 'Close' }: {
  title: string; subtitle?: ReactNode; onClose: () => void; closeLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label={closeLabel}
        className="h-11 w-11 -mr-2 -mt-1 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function ProductDetails({ item, weekOffset, labelDays, labelUse, devices, onClose, onEdit, onAddToLabel, onOpenLabel, onSaveDisplayName }: {
  item: MenuItem;
  weekOffset: number;
  labelDays?: Set<number>;
  labelUse?: LabelUse;
  devices: Device[];
  onClose: () => void;
  onEdit?: () => void;
  onAddToLabel: (item: MenuItem) => void;
  onOpenLabel: (device: Device, daypart: string) => void;
  onSaveDisplayName: (item: MenuItem, displayName: string) => Promise<void>;
}) {
  // Labels showing this product, with the dayparts it's on
  const labels = useMemo(() => devices
    .map(device => ({
      device,
      dayparts: device.pages.filter(p => p.assignedItems.some(i => i.id === item.id)).map(p => p.daypart),
    }))
    .filter(l => l.dayparts.length > 0), [item, devices]);

  const custom = isCustomItem(item);
  // Custom products have no daypart or station of their own: show where they're on labels
  // The product's own dayparts; none means it's offered at all of them
  const periods = sortDayparts(productDayparts(item));
  const stations = custom ? [...(labelUse?.stations ?? [])].sort() : item.mealStations || (item.mealStation ? [item.mealStation] : []);
  const menuDays = useMemo(() => menuDaysInWeek(item, weekOffset), [item, weekOffset]);
  const allergens = splitAllergens(item.allergens);
  const description = item.enticingDescription || item.description;
  const ingredientList = useMemo(() => parseIngredients(item.ingredients), [item.ingredients]);
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  return (
    <>
      <SheetHeader
        title={item.name.trim()}
        onClose={onClose}
        subtitle={<>
          <span className="font-medium text-gray-700 dark:text-gray-200">ID {wandId(item)}</span>
          {linkedSourceId(item) ? (
            <span className="inline-flex items-center gap-1" title="Its values come from the source item">
              · <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-brand" />Linked to source {linkedSourceId(item)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              · <Unlink className="h-3.5 w-3.5 flex-shrink-0" />Not linked
            </span>
          )}
          {item.isActive === false && <span className="text-red-600 dark:text-red-400">· Inactive</span>}
          {(item.localFields?.length ?? 0) > 0 && (
            <span title={`Changed here: ${item.localFields!.map(f => FIELD_LABELS[f]).join(', ')}. The source isn't changed.`}>
              · {item.localFields!.length} local {item.localFields!.length === 1 ? 'value' : 'values'}
            </span>
          )}
        </>}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-5 space-y-6">
        {/* Price, calories */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
            <div className="text-xs text-gray-500 dark:text-gray-400">Price</div>
            <div className="text-lg font-semibold text-sky-600 dark:text-sky-400 tabular-nums">${parseFloat(item.price || '0').toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
            <div className="text-xs text-gray-500 dark:text-gray-400">Calories</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{item.calories || '0'}</div>
          </div>
        </div>

        {/* Changed in Edit (every product can be edited) */}
        <DisplayNameRow item={item} editable={!onEdit} onSave={value => onSaveDisplayName(item, value)} />

        {description && (
          <RichText value={description} className="text-sm text-gray-600 dark:text-gray-300 leading-6 space-y-2" />
        )}

        {/* Dietary */}
        {((item.iconImages?.length ?? 0) > 0 || allergens.length > 0) && (
          <Section icon={Leaf} title="Dietary">
            {(item.iconImages?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.iconImages!.map(icon => (
                  <span key={icon.name} className="inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200">
                    <DietaryIcon url={icon.url} />
                    {icon.name}
                  </span>
                ))}
              </div>
            )}
            {allergens.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-0.5">Contains</span>
                {allergens.map(a => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{a}</span>
                ))}
              </div>
            )}
          </Section>
        )}

        {ingredientList.length > 0 && (
          <Section icon={ListChecks} title={`Ingredients (${ingredientList.length})`}>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-6">
              {(showAllIngredients ? ingredientList : ingredientList.slice(0, 10)).join(', ')}
              {ingredientList.length > 10 && (
                <button type="button" onClick={() => setShowAllIngredients(!showAllIngredients)} className="ml-1.5 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline">
                  {showAllIngredients ? 'Show less' : `+${ingredientList.length - 10} more`}
                </button>
              )}
            </p>
          </Section>
        )}

        {/* When */}
        <Section icon={Clock} title="When">
          <div className="flex flex-wrap gap-1.5">
            {(periods.length > 0 ? periods : [ALL_DAYPARTS]).map(p => (
              <span key={p} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${daypartColor(p).chip}`}>{p}</span>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
              {formatWeekRange(getWeekStartString(weekOffset))}
            </p>
            <ProductDayRows menuDays={menuDays} labelDays={labelDays} showMenu={!custom} />
            {(labelDays?.size ?? 0) === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {custom ? 'Not on any labels this week · days come from the labels it\'s added to' : 'Not on any labels this week'}
              </p>
            )}
          </div>
        </Section>

        {/* Where */}
        {stations.length > 0 && (
          <Section icon={MapPin} iconClassName={levelIconColor('placement')} title={stations.length === 1 ? 'Station' : `Stations (${stations.length})`}>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {stations.map(s => (
                <li key={s} className="text-sm text-gray-700 dark:text-gray-300 truncate">{s}</li>
              ))}
            </ul>
          </Section>
        )}

        {/* On labels */}
        <Section icon={Tag} title={labels.length === 0 ? 'Labels' : `On ${labels.length} ${labels.length === 1 ? 'label' : 'labels'}`}>
          {labels.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Not on any labels yet</p>
          ) : (
            <div className="space-y-1">
              {labels.map(({ device, dayparts }) => (
                <button
                  key={device.id}
                  onClick={() => onOpenLabel(device, dayparts[0])}
                  className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800 hover:border-sky-300 dark:hover:border-sky-700 text-left transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{device.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.location}</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {dayparts.map(d => (
                      <span key={d} className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${daypartColor(d).chip}`}>{d}</span>
                    ))}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-sky-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="flex gap-2 px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-bottom">
        {onEdit && (
          <Button variant="outline" onClick={onEdit} className="h-11 gap-2">
            <Pencil className="h-4 w-4" />Edit
          </Button>
        )}
        <Button onClick={() => onAddToLabel(item)} className="flex-1 h-11 gap-2">
          <Plus className="h-5 w-5" />Add to label
        </Button>
      </div>
    </>
  );
}

function ProductForm({ item, menuItems, onCancel, onSave }: {
  item: MenuItem | null;
  menuItems: MenuItem[];
  onCancel: () => void;
  onSave: (input: ProductInput) => Promise<MenuItem | null>;
}) {
  const [name, setName] = useState(item?.name.trim() ?? '');
  const [displayName, setDisplayName] = useState(item?.displayName?.trim() ?? '');
  const [price, setPrice] = useState(item ? parseFloat(item.price || '0').toFixed(2) : '');
  const [calories, setCalories] = useState(item?.calories && item.calories !== '0' ? item.calories : '');
  // One description: the enticing description when there is one, else the description
  const [description, setDescription] = useState(item?.enticingDescription || item?.description || '');
  const [ingredients, setIngredients] = useState<string[]>(parseIngredients(item?.ingredients));
  // Linked to a source: the source's values, to mark what's changed here (local)
  const source: ProductValues | null = item && !isCustomItem(item) ? item.source ?? valuesOf(item) : null;
  // Custom products tick each daypart they're offered at ("All" ticks every one); older ones with
  // none stored are offered at every daypart, so they open with every box ticked
  const [dayparts, setDayparts] = useState<Set<string>>(() => {
    if (item && source) return new Set(valuesOf(item).dayparts);
    const own = item ? productDayparts(item) : [];
    return new Set(own.length > 0 ? own : daypartChoices(menuItems, item));
  });
  const [icons, setIcons] = useState<Set<string>>(new Set(item?.iconImages?.map(i => i.name) ?? []));
  const [allergens, setAllergens] = useState<Set<string>>(new Set(splitAllergens(item?.allergens)));
  const [nutrition, setNutrition] = useState<Record<NutrientKey, string>>(() => ({
    protein: item?.nutrition?.protein?.value ?? '',
    carbohydrates: item?.nutrition?.carbohydrates?.value ?? '',
    fat: item?.nutrition?.fat?.value ?? '',
    sugar: item?.nutrition?.sugar?.value ?? '',
  }));
  const [showNutrition, setShowNutrition] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triedSave, setTriedSave] = useState(false);

  // Choices come from the products themselves
  const iconOptions = useMemo(() => {
    const byName = new Map<string, { name: string; url: string; rank?: number }>();
    source?.icons.forEach(icon => byName.set(icon.name, icon));
    menuItems.forEach(i => i.iconImages?.forEach(icon => { if (!byName.has(icon.name)) byName.set(icon.name, icon); }));
    return [...byName.values()].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
  }, [menuItems]);
  const daypartOptions = useMemo(() => daypartChoices(menuItems, item), [menuItems, item]);
  const allDayparts = daypartOptions.every(p => dayparts.has(p));
  const noDaypart = !source && dayparts.size === 0;
  const ingredientOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    menuItems.forEach(i => parseIngredients(i.ingredients).forEach(g => { if (!byKey.has(g.toLowerCase())) byKey.set(g.toLowerCase(), g); }));
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [menuItems]);
  const allergenOptions = useMemo(() => {
    const seen = new Set<string>(splitAllergens(item?.allergens));
    menuItems.forEach(i => splitAllergens(i.allergens).forEach(a => seen.add(a)));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [menuItems, item]);

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };
  const nameMissing = !name.trim();

  // What the form holds now, to compare with the source field by field
  const nutrient = (v: string, unit: string) => ({ value: v.trim() || '0', dailyValue: null, displayValue: `${v.trim() || '0'}${unit}` });
  const current: Partial<ProductValues> = {
    name, description: description || null, price, calories,
    ingredients: ingredients.join(', '), allergens: [...allergens].join(', '),
    icons: iconOptions.filter(i => icons.has(i.name)),
    nutrition: {
      calories: { value: calories || '0', dailyValue: null, displayValue: calories || '0' },
      protein: nutrient(nutrition.protein, 'g'), carbohydrates: nutrient(nutrition.carbohydrates, 'g'),
      fat: nutrient(nutrition.fat, 'g'), sugar: nutrient(nutrition.sugar, 'g'),
    },
    dayparts: [...dayparts],
  };
  // What the form opened with: Save stays off until something changes (see "Saving changes")
  const [initial] = useState(() => ({ values: current, displayName }));
  const changedFields = item
    ? PRODUCT_FIELDS.filter(f => !sameValue(f, current[f] as never, initial.values[f] as never))
    : [];
  const changeCount = changedFields.length + (item && displayName.trim() !== initial.displayName.trim() ? 1 : 0);
  const discardChanges = () => {
    const v = initial.values;
    setName(v.name ?? '');
    setDisplayName(initial.displayName);
    setPrice(v.price ?? '');
    setCalories(v.calories ?? '');
    setDescription(v.description ?? '');
    setIngredients(parseIngredients(v.ingredients));
    setAllergens(new Set(splitAllergens(v.allergens)));
    setIcons(new Set((v.icons ?? []).map(i => i.name)));
    setNutrition({
      protein: v.nutrition?.protein?.value === '0' ? '' : v.nutrition?.protein?.value ?? '',
      carbohydrates: v.nutrition?.carbohydrates?.value === '0' ? '' : v.nutrition?.carbohydrates?.value ?? '',
      fat: v.nutrition?.fat?.value === '0' ? '' : v.nutrition?.fat?.value ?? '',
      sugar: v.nutrition?.sugar?.value === '0' ? '' : v.nutrition?.sugar?.value ?? '',
    });
    setDayparts(new Set(v.dayparts ?? []));
    setTriedSave(false);
    setError(null);
  };

  const useSource: Record<ProductField, () => void> = {
    name: () => setName(source!.name),
    description: () => setDescription(source!.description ?? ''),
    price: () => setPrice(source!.price),
    calories: () => setCalories(source!.calories !== '0' ? source!.calories : ''),
    ingredients: () => setIngredients(parseIngredients(source!.ingredients)),
    allergens: () => setAllergens(new Set(splitAllergens(source!.allergens))),
    icons: () => setIcons(new Set(source!.icons.map(i => i.name))),
    nutrition: () => setNutrition({
      protein: source!.nutrition?.protein?.value ?? '',
      carbohydrates: source!.nutrition?.carbohydrates?.value ?? '',
      fat: source!.nutrition?.fat?.value ?? '',
      sugar: source!.nutrition?.sugar?.value ?? '',
    }),
    dayparts: () => setDayparts(new Set(source!.dayparts)),
  };
  // "Local" plus a way back to the source's value, on fields that differ from the source
  const localMark = (field: ProductField) => source && !sameValue(field, current[field] as never, source[field] as never) ? (
    <span className="inline-flex items-center gap-1.5 ml-2 text-xs font-normal">
      <span
        title="Changed here. The source isn't changed."
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      >
        Local
      </span>
      <button type="button" onClick={useSource[field]} className="text-sky-600 dark:text-sky-400 hover:underline">
        Use source
      </button>
    </span>
  ) : null;
  const nutritionFilled = NUTRIENTS.filter(n => nutrition[n.key].trim()).length;

  const handleSave = async () => {
    setTriedSave(true);
    if (nameMissing || noDaypart || (item && changeCount === 0)) return;
    setSaving(true);
    setError(null);
    const cal = calories.trim() || '0';
    try {
      await onSave({
        name,
        displayName: displayName.trim() || null,
        price: price.trim() ? parseFloat(price).toFixed(2) : '0.00',
        calories: cal,
        // Saved back to the field it came from; clearing it clears both
        description: !description ? null : item?.enticingDescription ? item.description : description,
        enticingDescription: !description ? null : item?.enticingDescription ? description : null,
        ingredients: ingredients.join(', '),
        dayparts: sortDayparts(dayparts),
        icons: iconOptions.filter(i => icons.has(i.name)),
        allergens: [...allergens].join(', '),
        nutrition: {
          calories: { value: cal, dailyValue: null, displayValue: cal },
          protein: nutrient(nutrition.protein, 'g'),
          carbohydrates: nutrient(nutrition.carbohydrates, 'g'),
          fat: nutrient(nutrition.fat, 'g'),
          sugar: nutrient(nutrition.sugar, 'g'),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  return (
    <>
      <SheetHeader
        title={item ? 'Edit product' : 'New product'}
        subtitle={item && source
          ? <><Link2 className="h-3.5 w-3.5 flex-shrink-0 text-brand" />ID {wandId(item)} · Linked to source {linkedSourceId(item)} · changes stay here</>
          : item
          ? <><PenLine className="h-3.5 w-3.5 flex-shrink-0" />ID {wandId(item)} · Not linked</>
          : <><PenLine className="h-3.5 w-3.5 flex-shrink-0" />Not linked to a source</>}
        onClose={onCancel}
        closeLabel="Cancel"
      />

      <form
        id="product-form"
        className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-5 space-y-6"
        onSubmit={e => { e.preventDefault(); handleSave(); }}
      >
        {/* Basics */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center"><Label htmlFor="product-name">Name</Label>{localMark('name')}</div>
            <Input
              id="product-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. House Lemonade"
              autoFocus={!item}
              aria-invalid={triedSave && nameMissing}
              className={triedSave && nameMissing ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {triedSave && nameMissing && <p className="text-xs text-red-600 dark:text-red-400">Add a name to save</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-display-name">Display name</Label>
            <RichTextEditor
              id="product-display-name"
              value={displayName}
              onChange={setDisplayName}
              placeholder={name.trim() || 'Same as name'}
              ariaLabel="Display name"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Shown on labels. Leave blank to use the name.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center"><Label htmlFor="product-price">Price</Label>{localMark('price')}</div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <Input id="product-price" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.00" className="pl-6 tabular-nums" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center"><Label htmlFor="product-calories">Calories</Label>{localMark('calories')}</div>
              <Input id="product-calories" value={calories} onChange={e => setCalories(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="0" className="tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center"><Label htmlFor="product-description">Description</Label>{localMark('description')}</div>
            <RichTextEditor id="product-description" value={description} onChange={setDescription} placeholder="What it is" ariaLabel="Description" />
          </div>
        </div>

        {/* Dayparts it may be offered at; stations and days come from labels */}
        <Section icon={Clock} title="Dayparts" aside={localMark('dayparts')}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dayparts">
            {/* Ticks every daypart (or clears them all); not a daypart of its own */}
            <button
              type="button"
              aria-pressed={allDayparts}
              onClick={() => setDayparts(new Set(allDayparts ? [] : daypartOptions))}
              className={`h-9 px-3 rounded-full border text-sm font-medium transition-colors ${
                allDayparts
                  ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              All
            </button>
            {daypartOptions.map(p => {
              const on = dayparts.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDayparts(toggle(dayparts, p))}
                  className={`h-9 px-3 rounded-full border text-sm font-medium transition-colors ${
                    on ? daypartColor(p).chip : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {source
              ? (dayparts.size === 0
                ? 'Offered at every daypart on the days its source offers it.'
                : `Offered at ${sortDayparts(dayparts).join(', ')} on the days its source offers it.`)
              : dayparts.size === 0
              ? null
              : `Can be added at ${allDayparts ? 'every daypart' : sortDayparts(dayparts).join(', ')}. Stations and days come from the labels it's added to.`}
          </p>
          {noDaypart && (
            <p className={`text-xs ${triedSave ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
              Pick at least one daypart
            </p>
          )}
        </Section>

        {/* Ingredients */}
        <Section icon={ListChecks} title="Ingredients" aside={localMark('ingredients')}>
          <IngredientInput value={ingredients} onChange={setIngredients} suggestions={ingredientOptions} />
        </Section>


        {/* Dietary */}
        <Section icon={Leaf} title="Dietary" aside={localMark('icons')}>
          {iconOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {iconOptions.map(icon => {
                const on = icons.has(icon.name);
                return (
                  <button
                    key={icon.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setIcons(toggle(icons, icon.name))}
                    className={`inline-flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full border text-sm transition-colors ${
                      on
                        ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <DietaryIcon url={icon.url} dim={!on} />
                    {icon.name}
                    {on && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}
          <div>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1.5">Contains{localMark('allergens')}</div>
            <div className="flex flex-wrap gap-1.5">
              {allergenOptions.map(a => {
                const on = allergens.has(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAllergens(toggle(allergens, a))}
                    className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${
                      on
                        ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Nutrition (optional, collapsed) */}
        <section className="space-y-2.5">
          <button
            type="button"
            onClick={() => setShowNutrition(!showNutrition)}
            aria-expanded={showNutrition}
            className="w-full flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
          >
            <Activity className="h-4 w-4 text-gray-400" />
            Nutrition
            {nutritionFilled > 0 && !showNutrition && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{nutritionFilled} of {NUTRIENTS.length} filled</span>
            )}
            <ChevronDown className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${showNutrition ? 'rotate-180' : ''}`} />
          </button>
          {localMark('nutrition') && <div className="-mt-1 -ml-2">{localMark('nutrition')}</div>}
          {showNutrition && (
            <div className="grid grid-cols-2 gap-3">
              {NUTRIENTS.map(n => (
                <div key={n.key} className="space-y-1.5">
                  <Label htmlFor={`product-${n.key}`}>{n.label} (g)</Label>
                  <Input
                    id={`product-${n.key}`}
                    value={nutrition[n.key]}
                    onChange={e => setNutrition({ ...nutrition, [n.key]: e.target.value.replace(/[^0-9.]/g, '') })}
                    inputMode="decimal"
                    placeholder="0"
                    className="tabular-nums"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </form>

      <div className="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-area-bottom space-y-2">
        {error && <p className="text-sm text-red-600 dark:text-red-400">Couldn't save · {error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="h-11">Cancel</Button>
          {item ? (
            <SaveButton
              block
              form="product-form"
              count={changeCount}
              saving={saving}
              onSave={handleSave}
              onDiscard={discardChanges}
            />
          ) : (
            <Button type="submit" form="product-form" disabled={saving} className="flex-1 h-11 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Create product'}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// Ingredients as removable chips; type to add, with matches from the product data
function IngredientInput({ value, onChange, suggestions }: {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
}) {
  const [query, setQuery] = useState('');
  const has = (g: string) => value.some(v => v.toLowerCase() === g.toLowerCase());
  const add = (g: string) => {
    const t = g.trim().replace(/,+$/, '');
    if (t && !has(t)) onChange([...value, t]);
    setQuery('');
  };
  const q = query.trim().toLowerCase();
  const matches = q ? suggestions.filter(s => s.toLowerCase().includes(q) && !has(s)).slice(0, 6) : [];

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(g => (
            <span key={g} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200">
              {g}
              <button type="button" aria-label={`Remove ${g}`} onClick={() => onChange(value.filter(v => v !== g))} className="h-6 w-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id="product-ingredients"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(matches[0] && matches[0].toLowerCase() === q ? matches[0] : query);
          }
          if (e.key === 'Backspace' && !query && value.length) onChange(value.slice(0, -1));
        }}
        placeholder={value.length ? 'Add another ingredient' : 'Type an ingredient and press Enter'}
        aria-label="Add ingredient"
      />
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map(m => (
            <button key={m} type="button" onClick={() => add(m)} className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 hover:border-sky-300 hover:text-sky-700 dark:hover:text-sky-300">
              <Plus className="h-3 w-3" />{m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// What labels show for this product, with an inline change for products that have no Edit form
function DisplayNameRow({ item, editable, onSave }: {
  item: MenuItem;
  editable: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [value, setValue] = useState(item.displayName?.trim() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const custom = item.displayName?.trim();

  useEffect(() => { setValue(item.displayName?.trim() ?? ''); setEditingName(false); setError(null); }, [item.id, item.displayName]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  if (editingName) {
    return (
      <form className="space-y-1.5" onSubmit={e => { e.preventDefault(); save(); }}>
        <Label htmlFor="display-name-inline">Display name</Label>
        <RichTextEditor id="display-name-inline" value={value} onChange={setValue} placeholder={item.name.trim()} ariaLabel="Display name" />
        <p className="text-xs text-gray-500 dark:text-gray-400">Shown on labels. Leave blank to use the name.</p>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Save
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setEditingName(false)}>Cancel</Button>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">Couldn't save · {error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5">
      <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500 dark:text-gray-400">Labels show</div>
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          <LabelName item={item} />
          {!custom && <span className="ml-1.5 text-xs font-normal text-gray-400">· same as name</span>}
        </div>
      </div>
      {editable && (
        <button type="button" onClick={() => setEditingName(true)} className="text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline flex-shrink-0">
          {custom ? 'Change' : 'Set display name'}
        </button>
      )}
    </div>
  );
}

// Webtrition's icon artwork is dark on transparent; a white disc keeps it visible in dark mode
function DietaryIcon({ url, dim }: { url: string; dim?: boolean }) {
  return (
    <span className={`h-7 w-7 rounded-full bg-white flex items-center justify-center flex-shrink-0 ${dim ? 'opacity-60' : ''}`}>
      <img src={url} alt="" className="h-5 w-5 object-contain" loading="lazy" />
    </span>
  );
}

function Section({ icon: Icon, iconClassName = 'text-gray-400', title, aside, children }: {
  icon: ElementType;
  iconClassName?: string;
  title: string;
  // Next to the title (e.g. Local · Use source)
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <Icon className={`h-4 w-4 ${iconClassName}`} />
        {title}
        {aside}
      </h3>
      {children}
    </section>
  );
}
