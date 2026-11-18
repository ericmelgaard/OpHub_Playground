import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import {
  X, Plus, Clock, Leaf, Link2, Unlink, PenLine, Loader2, Check, ListChecks, Package, Image as ImageIcon,
  Layers, CalendarDays, Building2, ChevronLeft, ChevronRight, LayoutTemplate, MapPin, Plug,
} from 'lucide-react';
import { SaveButton } from './SaveButton';
import { MenuItem, ProductField, ProductValues } from '../types';
import { valuesOf, sameValue, FIELD_LABELS, PRODUCT_FIELDS } from '../lib/productValues';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { daypartColor } from '../lib/daypartColors';
import { levelIconColor } from '../lib/levelColors';
import { isCustomItem, wandId, linkedSourceId, isBaseOffered } from '../lib/labelDisplay';
import { parseIngredients, plainText } from '../lib/richText';
import {
  menuDaysInWeek, getWeekStartDate, getWeekStartString, formatWeekRange, sortDayparts, WEEK_ORDER, type WeekState,
} from '../lib/weekSchedule';
import { productDayparts } from '../lib/stations';
import { DAY_ABBR } from '../lib/availability';
import { dayClass } from './ProductDays';
import type { ProductInput } from '../services/api';
import { RichTextEditor } from './RichTextEditor';
import { productSource, sourceSystem, type ProductSource } from '../lib/sources';
import { CopyButton } from './CopyButton';

// One product on one label page in a week: the days it shows there
export interface ProductScheduleRow {
  daypart: string;
  deviceId: string;
  label: string;
  station?: string;
  days: number[];
}

interface ProductEditPageProps {
  // The product being edited, or null to create one
  item: MenuItem | null;
  // All products, for the daypart, icon, ingredient and allergen choices
  menuItems: MenuItem[];
  // How a week is scheduled (Default Week, its own schedule, recurring); week offset from this week
  weekStateOf?: (weekOffset: number) => WeekState;
  // Where the product is on labels in a week (null = the Default Week)
  loadSchedule?: (mrn: string, weekOffset: number | null) => Promise<ProductScheduleRow[]>;
  onCancel: () => void;
  // Saves a new (item null) or edited product. Throws on failure.
  onSave: (input: ProductInput) => Promise<MenuItem | null>;
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

export const splitAllergens = (s: string | undefined) => (s ? s.split(',').map(a => a.trim()).filter(Boolean) : []);

type SectionId = 'basics' | 'dayparts' | 'images' | 'variations' | 'ingredients' | 'dietary' | 'schedule' | 'customizations' | 'source';

// Editing or creating a product: a full-screen page like an open label, with a section bookmark nav
export function ProductEditPage({ item, menuItems, weekStateOf, loadSchedule, onCancel, onSave }: ProductEditPageProps) {
  const [name, setName] = useState(item?.name.trim() ?? '');
  const [displayName, setDisplayName] = useState(item?.displayName?.trim() ?? '');
  const [price, setPrice] = useState(item ? parseFloat(item.price || '0').toFixed(2) : '');
  const [calories, setCalories] = useState(item?.calories && item.calories !== '0' ? item.calories : '');
  // One description: the enticing description when there is one, else the description
  const [description, setDescription] = useState(item?.enticingDescription || item?.description || '');
  const [ingredients, setIngredients] = useState<string[]>(parseIngredients(item?.ingredients));
  // Linked to a source: the source's values, to mark what's changed here (local)
  const source: ProductValues | null = item && !isCustomItem(item) ? item.source ?? valuesOf(item) : null;
  // The API it's linked to (name and ID label come from lib/sources); unlinked ones would link to the default
  const linkedTo = item ? productSource(item) : null;
  const sourceName = (linkedTo ?? sourceSystem()).name;
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
  // What the page opened with: Save stays off until something changes (see "Saving changes")
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
  const isLocal = (field: ProductField) => !!source && !sameValue(field, current[field] as never, source[field] as never);
  const localFields = PRODUCT_FIELDS.filter(isLocal);
  // "Local" plus a way back to the source's value, on fields that differ from the source
  const localMark = (field: ProductField) => isLocal(field) ? (
    <span className="inline-flex items-center gap-1.5 ml-2 text-xs font-normal">
      <span
        title={`Changed here. ${sourceName} isn't changed.`}
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      >
        Local
      </span>
      <button type="button" onClick={useSource[field]} className="text-sky-600 dark:text-sky-400 hover:underline">
        Use source
      </button>
    </span>
  ) : null;

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

  // Sections, in page order; the nav is built from the same list
  const sections: { id: SectionId; label: string; icon: ElementType }[] = [
    { id: 'basics', label: 'Basics', icon: Package },
    { id: 'dayparts', label: 'Dayparts', icon: Clock },
    ...(item ? [
      { id: 'images' as const, label: 'Images', icon: ImageIcon },
      { id: 'variations' as const, label: 'Variations', icon: Layers },
    ] : []),
    { id: 'ingredients', label: 'Ingredients', icon: ListChecks },
    { id: 'dietary', label: 'Dietary and nutrition', icon: Leaf },
    ...(item ? [
      { id: 'schedule' as const, label: 'Schedule', icon: CalendarDays },
      { id: 'customizations' as const, label: 'Customizations', icon: Building2 },
      { id: 'source' as const, label: 'Menu source', icon: Link2 },
    ] : []),
  ];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('basics');
  const jumpTo = (id: SectionId) => {
    const container = scrollRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!container || !el) return;
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16;
    container.scrollTo({ top, behavior: 'smooth' });
    setActiveSection(id);
  };
  // Scroll-spy: the last section whose heading has reached the top
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const limit = container.getBoundingClientRect().top + 96;
    let current: SectionId = sections[0].id;
    for (const s of sections) {
      const el = container.querySelector<HTMLElement>(`[data-section="${s.id}"]`);
      if (el && el.getBoundingClientRect().top <= limit) current = s.id;
    }
    // At the bottom, the last section counts as reached
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) current = sections[sections.length - 1].id;
    setActiveSection(current);
  };

  const sourceId = item ? linkedSourceId(item) : null;

  return (
    <div
      className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-gray-50 dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={item ? `Edit ${item.name.trim()}` : 'New product'}
    >
      {/* Header: like the label page header */}
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
              {item ? (name.trim() || item.name.trim()) : (name.trim() || 'New product')}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              {item ? (
                <span className="inline-flex items-center gap-0.5 font-medium text-gray-700 dark:text-gray-200">
                  ID {wandId(item)}
                  <CopyButton value={wandId(item)} />
                </span>
              ) : <span>New product</span>}
              {sourceId ? (
                <span className="inline-flex items-center gap-1">
                  · <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-brand" />{linkedTo?.name} {linkedTo?.idLabel} {sourceId}
                  <CopyButton value={sourceId} label={linkedTo?.idLabel ?? 'source ID'} />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  · {item ? <Unlink className="h-3.5 w-3.5 flex-shrink-0" /> : <PenLine className="h-3.5 w-3.5 flex-shrink-0" />}Not linked
                </span>
              )}
              {localFields.length > 0 && (
                <span title={`Changed here: ${localFields.map(f => FIELD_LABELS[f]).join(', ')}. ${sourceName} isn't changed.`}>
                  · {localFields.length} local {localFields.length === 1 ? 'value' : 'values'}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item ? (
            <SaveButton
              form="product-form"
              count={changeCount}
              saving={saving}
              onSave={handleSave}
              onDiscard={discardChanges}
            />
          ) : (
            <Button type="submit" form="product-form" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Create product'}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p className="flex-shrink-0 px-4 sm:px-5 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-b border-red-200 dark:border-red-800">
          Couldn't save · {error}
        </p>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Section bookmarks */}
        <aside className="hidden lg:block w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto scrollbar-thin">
          <nav aria-label="Sections" className="p-3">
            <div className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sections</div>
            <div className="space-y-0.5">
              {sections.map(({ id, label, icon: Icon }) => {
                const active = id === activeSection;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => jumpTo(id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md border-l-2 text-sm text-left transition-colors ${
                      active
                        ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-500 font-medium'
                        : 'text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          <form
            id="product-form"
            className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5 safe-area-bottom"
            onSubmit={e => { e.preventDefault(); handleSave(); }}
          >
            <Card id="basics" icon={Package} title="Basics">
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
            </Card>

            {/* Dayparts it may be offered at; stations and days come from labels */}
            <Card id="dayparts" icon={Clock} title="Dayparts" aside={localMark('dayparts')}>
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
                    ? `Offered at every daypart on the days ${sourceName} offers it.`
                    : `Offered at ${sortDayparts(dayparts).join(', ')} on the days ${sourceName} offers it.`)
                  : dayparts.size === 0
                  ? null
                  : `Can be added at ${allDayparts ? 'every daypart' : sortDayparts(dayparts).join(', ')}. Stations and days come from the labels it's added to.`}
              </p>
              {noDaypart && (
                <p className={`text-xs ${triedSave ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Pick at least one daypart
                </p>
              )}
            </Card>

            {item && (
              <>
                <Card id="images" icon={ImageIcon} title="Images" aside={<NotBuilt />}>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Photos of the product: a main image, more images, and one per variation where it looks different.
                  </p>
                </Card>
                <Card id="variations" icon={Layers} title="Variations" aside={<NotBuilt />}>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    The same product (same ID) where it's offered by daypart, station and group, each with its own name,
                    price or description there. A Breakfast page could show "Hashbrowns" while Dinner shows
                    "Pan Fried Potatoes". A different portion is a different product.
                  </p>
                </Card>
              </>
            )}

            <Card id="ingredients" icon={ListChecks} title="Ingredients" aside={localMark('ingredients')}>
              <IngredientInput value={ingredients} onChange={setIngredients} suggestions={ingredientOptions} />
            </Card>

            <Card id="dietary" icon={Leaf} title="Dietary and nutrition" aside={localMark('icons')}>
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
              <div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1.5">Nutrition{localMark('nutrition')}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              </div>
            </Card>

            {item && (
              <>
                <ScheduleCard item={item} weekStateOf={weekStateOf} loadSchedule={loadSchedule} />

                <Card id="customizations" icon={Building2} title="Customizations" aside={<NotBuilt />}>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Changes made to this product by the levels below the one you're at (groups and stores
                    under a company, for example), so you can see what they show instead.
                  </p>
                </Card>

                <Card id="source" icon={Link2} title="Menu source">
                  {source && sourceId ? (
                    <SourceValues
                      linkedTo={linkedTo ?? sourceSystem()}
                      sourceId={sourceId}
                      source={source}
                      current={current}
                      isLocal={isLocal}
                      onUseSource={f => useSource[f]()}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <Unlink className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Not linked to {sourceName}, so every value is set here. Linking it to a {sourceName} item
                        (search by name or {sourceSystem().idLabel}) is coming; values set here will stay as local values.
                      </p>
                    </div>
                  )}
                </Card>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function Card({ id, icon: Icon, title, aside, children }: {
  id: SectionId;
  icon: ElementType;
  title: string;
  // Next to the title (e.g. Local · Use source)
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-section={id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-4">
      <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <Icon className="h-4 w-4 text-gray-400" />
        {title}
        {aside}
      </h3>
      {children}
    </section>
  );
}

function NotBuilt() {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
      Not built yet
    </span>
  );
}

// ---------- Schedule: the week selector from Smart Labels → Schedule, view only ----------

const WEEK_OFFSETS = Array.from({ length: 10 }, (_, i) => i - 1); // last week … 8 weeks out

const stateBar: Record<WeekState, { className: string; style?: React.CSSProperties }> = {
  default: { className: 'bg-gray-300 dark:bg-gray-600' },
  override: { className: 'bg-teal-400' },
  recurring: {
    className: '',
    style: { backgroundImage: 'repeating-linear-gradient(90deg, rgb(167 139 250) 0 6px, transparent 6px 10px)' },
  },
};
const stateLabel: Record<WeekState, string> = {
  default: 'Follows the Default Week',
  override: 'Has its own schedule',
  recurring: 'Recurring schedule',
};

function weekName(offset: number) {
  if (offset === -1) return 'Last week';
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Next week';
  return `Week of ${getWeekStartDate(offset).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function ScheduleCard({ item, weekStateOf, loadSchedule }: {
  item: MenuItem;
  weekStateOf?: (weekOffset: number) => WeekState;
  loadSchedule?: (mrn: string, weekOffset: number | null) => Promise<ProductScheduleRow[]>;
}) {
  // null = the Default Week
  const [week, setWeek] = useState<number | null>(0);
  const [rows, setRows] = useState<ProductScheduleRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadSchedule) return;
    let cancelled = false;
    setRows(null);
    setFailed(false);
    loadSchedule(item.mrn, week)
      .then(r => { if (!cancelled) setRows(r); })
      .catch(() => { if (!cancelled) { setRows([]); setFailed(true); } });
    return () => { cancelled = true; };
  }, [item.mrn, week, loadSchedule]);

  const custom = isCustomItem(item);
  const sourceName = productSource(item)?.name ?? 'the source';
  // The source's menu is loaded for this week and next only
  const sourceKnown = !custom && (week === null || week === 0 || week === 1);
  const sourceDays = (daypart: string): number[] => {
    if (custom) return [];
    const inWeek = week === null ? WEEK_ORDER : menuDaysInWeek(item, week);
    return inWeek.filter(d => isBaseOffered(item, daypart, d));
  };

  // One row per daypart + station: labels there merged; dayparts the source offers with no labels too
  const grouped = useMemo(() => {
    const byKey = new Map<string, { daypart: string; station?: string; days: Set<number>; labels: string[] }>();
    for (const r of rows ?? []) {
      const key = `${r.daypart}|${r.station ?? ''}`;
      const g = byKey.get(key) ?? { daypart: r.daypart, station: r.station, days: new Set<number>(), labels: [] };
      r.days.forEach(d => g.days.add(d));
      g.labels.push(r.label);
      byKey.set(key, g);
    }
    if (sourceKnown) {
      const dps = productDayparts(item);
      for (const dp of dps.length > 0 ? dps : []) {
        if (![...byKey.values()].some(g => g.daypart === dp) && sourceDays(dp).length > 0) {
          byKey.set(`${dp}|`, { daypart: dp, days: new Set(), labels: [] });
        }
      }
    }
    const order = sortDayparts(new Set([...byKey.values()].map(g => g.daypart)));
    return [...byKey.values()].sort((a, b) =>
      order.indexOf(a.daypart) - order.indexOf(b.daypart) || (a.station ?? '').localeCompare(b.station ?? ''));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sourceKnown, item, week]);

  const weekStart = week === null ? null : getWeekStartString(week);
  const dayHead = (d: number) => {
    if (!weekStart) return DAY_ABBR[d][0];
    const date = new Date(weekStart + 'T00:00:00');
    date.setDate(date.getDate() + WEEK_ORDER.indexOf(d));
    return `${DAY_ABBR[d][0]} ${date.getDate()}`;
  };
  const state = week === null ? null : weekStateOf?.(week) ?? 'default';
  const scrollWeeks = (dir: -1 | 1) => stripRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });

  return (
    <section data-section="schedule" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700/70">
        <div className="flex-1 min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <CalendarDays className="h-4 w-4 text-gray-400" />Schedule
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {week === null
              ? 'Default Week · the base every week starts from'
              : `${weekName(week)} · ${formatWeekRange(weekStart!)} · ${stateLabel[state!]}`}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3.5 text-xs text-gray-500 dark:text-gray-400">
          {(['default', 'override', 'recurring'] as WeekState[]).map(s => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`h-1 w-4 rounded-full ${stateBar[s].className}`} style={stateBar[s].style} />
              {s === 'default' ? 'Default' : s === 'override' ? 'Override' : 'Recurring'}
            </span>
          ))}
        </div>
      </div>

      {/* Week tiles, as in Smart Labels → Schedule */}
      <div className="flex items-stretch gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700/70">
        <button
          type="button"
          onClick={() => setWeek(null)}
          className={`flex-shrink-0 flex flex-col items-start justify-center gap-0.5 px-3 py-2 rounded-xl border w-36 transition-colors ${
            week === null
              ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-400 dark:border-sky-400 text-gray-900 dark:text-white'
              : 'bg-gray-50 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <span className="flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap">
            <LayoutTemplate className="h-3.5 w-3.5 text-sky-500" />Default Week
          </span>
          <span className="text-[11px] whitespace-nowrap text-gray-500 dark:text-gray-400">Base for every week</span>
        </button>
        <div className="w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        <button type="button" onClick={() => scrollWeeks(-1)} aria-label="Scroll weeks left" className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 self-center">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div ref={stripRef} className="flex items-stretch gap-1.5 overflow-x-auto scroll-smooth flex-1" style={{ scrollbarWidth: 'none' }}>
          {WEEK_OFFSETS.map(offset => {
            const selected = week === offset;
            const isCurrent = offset === 0;
            const s = weekStateOf?.(offset) ?? 'default';
            return (
              <button
                key={offset}
                type="button"
                onClick={() => setWeek(offset)}
                title={stateLabel[s]}
                className={`relative overflow-hidden flex-shrink-0 flex flex-col items-start gap-0.5 px-3 pt-2 pb-3 rounded-xl border min-w-[8rem] transition-colors ${
                  selected
                    ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-400 dark:border-sky-400 text-gray-900 dark:text-white'
                    : isCurrent
                      ? 'bg-white dark:bg-gray-900/60 border-sky-300 dark:border-sky-700 text-gray-900 dark:text-gray-100 hover:border-sky-400'
                      : offset < 0
                        ? 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        : 'bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
                  {isCurrent && !selected && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />}
                  {weekName(offset)}
                </span>
                <span className="text-[11px] whitespace-nowrap opacity-75">{formatWeekRange(getWeekStartString(offset))}</span>
                <span className={`absolute inset-x-0 bottom-0 h-1 ${stateBar[s].className}`} style={stateBar[s].style} />
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => scrollWeeks(1)} aria-label="Scroll weeks right" className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 self-center">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          {!custom && <Swatch className={dayClass(true, 'none')} label={`Outline · offered by ${sourceName}`} />}
          <Swatch className={dayClass(false, 'labels')} label="Blue fill · on labels" />
          {!custom && !sourceKnown && <Swatch className="border-2 border-dashed border-gray-400 dark:border-gray-500 text-gray-500 dark:text-gray-400" label={`Dashed · ${sourceName} menu not in yet`} />}
        </div>

        {rows === null ? (
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {failed ? "Couldn't load this week" : week === null ? 'Not on any labels in the Default Week' : 'Not on any labels this week'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[36rem] space-y-1">
              <div className="grid grid-cols-[10rem_repeat(7,2.75rem)_minmax(0,1fr)] gap-x-1 items-center px-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span className="uppercase tracking-wider">Where</span>
                {WEEK_ORDER.map(d => <span key={d} className="text-center">{dayHead(d)}</span>)}
                <span className="text-right uppercase tracking-wider">Labels</span>
              </div>
              {grouped.map(g => {
                const offered = sourceDays(g.daypart);
                return (
                  <div key={`${g.daypart}|${g.station ?? ''}`} className="grid grid-cols-[10rem_repeat(7,2.75rem)_minmax(0,1fr)] gap-x-1 items-center px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div className="min-w-0 space-y-1">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${daypartColor(g.daypart).chip}`}>{g.daypart}</span>
                      {g.station && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                          <MapPin className={`h-3 w-3 flex-shrink-0 ${levelIconColor('placement')}`} />{g.station}
                        </div>
                      )}
                    </div>
                    {WEEK_ORDER.map(d => {
                      const onLabels = g.days.has(d);
                      const onMenu = offered.includes(d);
                      const cls = sourceKnown || custom
                        ? dayClass(onMenu, onLabels ? 'labels' : 'none')
                        : `border-2 border-dashed border-gray-400 dark:border-gray-500 ${onLabels ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200' : 'text-gray-500 dark:text-gray-400'}`;
                      return (
                        <span
                          key={d}
                          title={`${DAY_ABBR[d]} · ${sourceKnown ? (onMenu ? `offered by ${sourceName}` : `not offered by ${sourceName}`) : custom ? 'custom product' : `${sourceName} menu not in yet`} · ${onLabels ? 'on labels' : 'not on labels'}`}
                          className={`h-8 w-9 justify-self-center rounded-md flex items-center justify-center text-[11px] font-bold ${cls}`}
                        >
                          {DAY_ABBR[d][0]}
                        </span>
                      );
                    })}
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-right truncate" title={g.labels.join(', ')}>
                      {g.labels.length === 0 ? 'Not on labels' : g.labels.length <= 2 ? g.labels.join(', ') : `${g.labels[0]} +${g.labels.length - 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          View only. Labels set their days in Smart Labels → Schedule.
          {!custom && !sourceKnown && ` ${sourceName} sends menus for this week and next, so later weeks show the labels' days only.`}
        </p>
      </div>
    </section>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-4 w-4 rounded flex items-center justify-center text-[9px] font-bold ${className}`}>M</span>
      {label}
    </span>
  );
}

// ---------- Menu source: what the source sends and what's set here ----------

function summarize(field: ProductField, v: Partial<ProductValues>): string {
  switch (field) {
    case 'name': return v.name?.trim() || '—';
    case 'description': return plainText(v.description) || '—';
    case 'price': return v.price ? `$${parseFloat(v.price || '0').toFixed(2)}` : '—';
    case 'calories': return v.calories && v.calories !== '0' ? v.calories : '—';
    case 'ingredients': {
      const n = parseIngredients(v.ingredients).length;
      return n === 0 ? '—' : `${n} ${n === 1 ? 'ingredient' : 'ingredients'}`;
    }
    case 'allergens': return splitAllergens(v.allergens).join(', ') || 'None';
    case 'icons': return (v.icons ?? []).map(i => i.name).join(', ') || 'None';
    case 'nutrition': {
      const n = v.nutrition;
      const parts = ([['protein', 'Protein'], ['carbohydrates', 'Carbs'], ['fat', 'Fat'], ['sugar', 'Sugar']] as const)
        .map(([k, l]) => n?.[k]?.value && n[k]!.value !== '0' ? `${l} ${n[k]!.value}g` : null)
        .filter(Boolean);
      return parts.join(' · ') || '—';
    }
    case 'dayparts': return (v.dayparts ?? []).length === 0 ? 'Every daypart' : sortDayparts(v.dayparts!).join(', ');
  }
}

function SourceValues({ linkedTo, sourceId, source, current, isLocal, onUseSource }: {
  linkedTo: ProductSource;
  sourceId: string;
  source: ProductValues;
  current: Partial<ProductValues>;
  isLocal: (field: ProductField) => boolean;
  onUseSource: (field: ProductField) => void;
}) {
  const sourceName = linkedTo.name;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
        <span className="h-9 w-9 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
          <Plug className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
            {sourceName} · {linkedTo.idLabel} {sourceId}
            <CopyButton value={sourceId} label={linkedTo.idLabel} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {source.name} · {summarize('price', source)} · {summarize('calories', source)} cal · menus for this week and next
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[32rem] space-y-1">
          <div className="grid grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_6rem] gap-3 px-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <span>Field</span><span>{sourceName}</span><span>Here</span><span />
          </div>
          {PRODUCT_FIELDS.map(f => {
            const local = isLocal(f);
            return (
              <div key={f} className="grid grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_6rem] gap-3 items-center px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50 text-sm">
                <span className="font-medium text-gray-900 dark:text-white">{FIELD_LABELS[f]}</span>
                <span className={`truncate ${local ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`} title={summarize(f, source)}>
                  {summarize(f, source)}
                </span>
                <span className={`truncate ${local ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} title={local ? summarize(f, current) : undefined}>
                  {local ? summarize(f, current) : 'Same'}
                </span>
                {local ? (
                  <button type="button" onClick={() => onUseSource(f)} className="justify-self-end text-xs text-sky-600 dark:text-sky-400 hover:underline">
                    Use source
                  </button>
                ) : <span />}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {sourceName} sends these by {linkedTo.idLabel}. Values changed here are local values; {sourceName} is never changed.
      </p>
    </div>
  );
}

// ---------- Shared pieces ----------

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
            <span key={g} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-xs text-gray-700 dark:text-gray-200">
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

// Webtrition's icon artwork is dark on transparent; a white disc keeps it visible in dark mode
export function DietaryIcon({ url, dim }: { url: string; dim?: boolean }) {
  return (
    <span className={`h-7 w-7 rounded-full bg-white flex items-center justify-center flex-shrink-0 ${dim ? 'opacity-60' : ''}`}>
      <img src={url} alt="" className="h-5 w-5 object-contain" loading="lazy" />
    </span>
  );
}
