import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { X, Plus, Tag, MapPin, Clock, CalendarDays, Leaf, ChevronRight, ChevronDown, Link2, Unlink, Pencil, Loader2, Check, ListChecks, Layers, Package } from 'lucide-react';
import { Device, MenuItem, ProductVariant, VariantField } from '../types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { VariantEditPage } from './VariantEditPage';
import { FIELD_LABELS } from '../lib/productValues';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { daypartColor } from '../lib/daypartColors';
import { levelIconColor } from '../lib/levelColors';
import { isCustomItem, wandId, linkedSourceId } from '../lib/labelDisplay';
import { parseIngredients } from '../lib/richText';
import { menuDaysInWeek, getWeekStartString, formatWeekRange, sortDayparts, type LabelUse, type WeekState } from '../lib/weekSchedule';
import { productDayparts, ALL_DAYPARTS } from '../lib/stations';
import { ProductDayRows } from './ProductDays';
import type { ProductInput } from '../services/api';
import { RichText, LabelName } from './RichText';
import { RichTextEditor } from './RichTextEditor';
import { productSource } from '../lib/sources';
import { ProductEditPage, DietaryIcon, splitAllergens, type ProductScheduleRow } from './ProductEditPage';
import { deviceName } from '../lib/deviceName';
import { CopyButton } from './CopyButton';
import { VariantList, VariantDetails, FromTag, money } from './ProductVariants';
import { defaultVariant, findVariant, placed, sizeOf, variantDays, variantLocalCount, variantValues } from '../lib/variants';

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
  // Opens another product in the sheet (another size of the same recipe)
  onOpenProduct?: (item: MenuItem) => void;
  // Saves a new (item null) or edited custom product; resolves to the saved product. Throws on failure.
  onSave: (input: ProductInput, item: MenuItem | null) => Promise<MenuItem | null>;
  // Sets (or clears, with blank) what labels show for a product. Throws on failure.
  onSaveDisplayName: (item: MenuItem, displayName: string) => Promise<void>;
  // Saves one variant's local values. Throws on failure.
  onSaveVariant?: (item: MenuItem, variant: ProductVariant, local: Partial<Record<VariantField, string>>) => Promise<void>;
  // For the edit page's Schedule: how a week is scheduled, and where the product is on labels that week
  weekStateOf?: (weekOffset: number) => WeekState;
  loadSchedule?: (mrn: string, weekOffset: number | null) => Promise<ProductScheduleRow[]>;
}

// One product: its details in a right-side sheet. Edit and New product open the full-screen edit page.
export function ProductSheet({ item, creating, weekOffset, labelDays, labelUse, devices, menuItems, onClose, onAddToLabel, onOpenLabel, onOpenProduct, onSave, onSaveDisplayName, onSaveVariant, weekStateOf, loadSchedule }: ProductSheetProps) {
  const [editing, setEditing] = useState(false);
  // Editing one variant (its key), on its own page
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  // The variant picked in the sheet (null = the card's), kept while editing so the sheet comes back to it
  const [viewing, setViewing] = useState<string | null>(null);
  const open = creating || !!item;
  const showForm = creating || editing;

  // A different product (or closing) leaves edit mode
  useEffect(() => { setEditing(false); setEditingVariant(null); setViewing(null); }, [item?.id, creating]);

  useEffect(() => {
    if (!open || showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, showForm, onClose]);

  if (!open) return null;

  const variantToEdit = item && editingVariant ? item.variants?.find(v => v.key === editingVariant) : undefined;
  if (item && variantToEdit && onSaveVariant) {
    return (
      <VariantEditPage
        key={`${item.id}|${variantToEdit.key}`}
        item={item}
        variant={variantToEdit}
        onCancel={() => setEditingVariant(null)}
        onSave={async local => {
          await onSaveVariant(item, variantToEdit, local);
          setEditingVariant(null);
        }}
      />
    );
  }

  // Editing or creating opens a full-screen page, like opening a label
  if (showForm) {
    return (
      <ProductEditPage
        key={item?.id ?? 'new'}
        item={creating ? null : item}
        menuItems={menuItems}
        weekStateOf={weekStateOf}
        loadSchedule={loadSchedule}
        onCancel={creating ? onClose : () => setEditing(false)}
        onSave={async input => {
          const saved = await onSave(input, creating ? null : item);
          setEditing(false);
          return saved;
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={item?.name}>
      <div className="absolute inset-0 bg-black/40 refresh-sheet-fade" onClick={onClose} />
      <div className="product-sheet-in relative flex flex-col w-full md:w-[480px] h-full bg-white dark:bg-gray-900 md:border-l border-gray-200 dark:border-gray-700 shadow-2xl safe-area-top">
        {item && (
          <ProductDetails
            item={item}
            weekOffset={weekOffset}
            labelDays={labelDays}
            labelUse={labelUse}
            devices={devices}
            onClose={onClose}
            onEdit={() => setEditing(true)}
            onEditVariant={onSaveVariant ? setEditingVariant : undefined}
            viewing={viewing}
            onView={setViewing}
            onAddToLabel={onAddToLabel}
            onOpenLabel={onOpenLabel}
            onSaveDisplayName={onSaveDisplayName}
            onOpenSize={onOpenProduct ? mrn => { const other = menuItems.find(i => i.mrn === mrn); if (other) onOpenProduct(other); } : undefined}
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

function ProductDetails({ item, weekOffset, labelDays, labelUse, devices, onClose, onEdit, onEditVariant, viewing, onView: setViewing, onAddToLabel, onOpenLabel, onSaveDisplayName, onOpenSize }: {
  item: MenuItem;
  weekOffset: number;
  labelDays?: Set<number>;
  labelUse?: LabelUse;
  devices: Device[];
  onClose: () => void;
  onEdit?: () => void;
  // Edits one variant (its key)
  onEditVariant?: (key: string) => void;
  // The variant being viewed (its key); null opens on the one the card stands for
  viewing: string | null;
  onView: (key: string) => void;
  onAddToLabel: (item: MenuItem) => void;
  onOpenLabel: (device: Device, daypart: string) => void;
  onSaveDisplayName: (item: MenuItem, displayName: string) => Promise<void>;
  // Opens another size of the same recipe (its product key)
  onOpenSize?: (mrn: string) => void;
}) {
  // The variant being viewed (station + daypart)
  // Always one variant when there are any: the picked one, else the one the card stands for
  const variant = item.variants?.find(v => v.key === viewing) ?? defaultVariant(item) ?? null;
  const hasVariants = (item.variants?.length ?? 0) > 0;

  // Labels showing this product, with the dayparts it's on. Viewing a variant: the labels using it
  // (it's named there, or it's the only one that fits that page's daypart).
  const labels = useMemo(() => devices
    .map(device => ({
      device,
      dayparts: device.pages.filter(p => p.assignedItems.some(i => {
        if (i.id !== item.id) return false;
        if (!variant) return true;
        const named = i.variant ? findVariant(item, i.variant) : undefined;
        return named ? named.key === variant.key : (i.followsDaypart || p.daypart) === variant.daypart;
      })).map(p => p.daypart),
    }))
    .filter(l => l.dayparts.length > 0), [item, devices, variant]);

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
          <span className="inline-flex items-center gap-0.5 font-medium text-gray-700 dark:text-gray-200">
            ID {wandId(item)}
            <CopyButton value={wandId(item)} />
          </span>
          {linkedSourceId(item) ? (
            <span className="inline-flex items-center gap-1" title={`Its values come from the ${productSource(item)?.name} item`}>
              · <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-brand" />Linked to {productSource(item)?.name} {productSource(item)?.idLabel} {linkedSourceId(item)}
              <CopyButton value={linkedSourceId(item)!} label={productSource(item)?.idLabel ?? 'source ID'} />
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
        {/* Sizes of the same recipe are separate products; link to the others */}
        {sizeOf(item) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Size</span>
            {item.sizes!.map(sz => (
              <button
                key={sz.mrn}
                type="button"
                disabled={sz.mrn === item.mrn || !onOpenSize}
                onClick={() => onOpenSize?.(sz.mrn)}
                aria-current={sz.mrn === item.mrn}
                className={`h-7 px-2.5 rounded-full border text-xs font-medium transition-colors ${
                  sz.mrn === item.mrn
                    ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-sky-300 dark:hover:border-sky-700'
                }`}
              >
                {sz.size}
              </button>
            ))}
          </div>
        )}

        {/* Which variant you're looking at: preselected on the one the card stands for */}
        {hasVariants && (
          <Section icon={Layers} title={`Served at (${item.variants!.length})`}>
            <VariantList item={item} value={variant?.key ?? null} onChange={setViewing} weekStart={getWeekStartString(weekOffset)} />
          </Section>
        )}

        {variant ? (
          <>
            <Section icon={Layers} title={`${variant.station} · ${variant.daypart}`}>
              <VariantDetails item={item} variant={variant} />
            </Section>
            {/* This variant's price, beside the product's calories */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  Price
                  {variantValues(item, variant).price.from !== 'product' && <FromTag from={variantValues(item, variant).price.from} />}
                </div>
                <div className="text-lg font-semibold text-sky-600 dark:text-sky-400 tabular-nums">{money(variantValues(item, variant).price.value)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                <div className="text-xs text-gray-500 dark:text-gray-400">Calories</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{item.calories || '0'}</div>
              </div>
            </div>
            <DisplayNameRow item={item} editable={!onEdit} onSave={value => onSaveDisplayName(item, value)} />
          </>
        ) : (
          <>
            {/* A product with no variants (custom, or not served at a station) */}
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
          </>
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

        {/* When: days belong to a variant (or a product without any) */}
        {(variant || !hasVariants) && <Section icon={Clock} title="When">
          {!variant && <div className="flex flex-wrap gap-1.5">
            {(periods.length > 0 ? periods : [ALL_DAYPARTS]).map(p => (
              <span key={p} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${daypartColor(p).chip}`}>{p}</span>
            ))}
          </div>}
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
              {formatWeekRange(getWeekStartString(weekOffset))}
            </p>
            <ProductDayRows menuDays={variant ? variantDays(variant, getWeekStartString(weekOffset)) : menuDays} labelDays={labelDays} showMenu={!custom} />
            {(labelDays?.size ?? 0) === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {custom ? 'Not on any labels this week · days come from the labels it\'s added to' : 'Not on any labels this week'}
              </p>
            )}
          </div>
        </Section>}

        {/* Where (the variant list shows stations when there are variants) */}
        {!hasVariants && stations.length > 0 && (
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
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{deviceName(device)}</div>
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
        {onEdit && (variant && onEditVariant ? (
          // Edit asks what to edit: this variant, or the product (every variant)
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-guide="product-edit" className="h-11 gap-2">
                <Pencil className="h-4 w-4" />Edit
                <ChevronDown className="h-4 w-4 -mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-72">
              <DropdownMenuItem onSelect={() => onEditVariant(variant.key)} className="items-start">
                <Layers className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block truncate">Edit for {variant.station} · {variant.daypart}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    Name, price, portion, description
                    {variantLocalCount(variant) > 0 && ` · ${variantLocalCount(variant)} local`}
                  </span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit} className="items-start">
                <Package className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block">Edit product</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Every station{(item.variants?.length ?? 0) > 1 ? ` (${item.variants!.length})` : ''}</span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" onClick={onEdit} data-guide="product-edit" className="h-11 gap-2">
            <Pencil className="h-4 w-4" />Edit
          </Button>
        ))}
        <Button
          // The variant shown opens the label page with Available Items filtered to its station and
          // daypart (visible filters), so it's added as that one unless the filters are changed
          onClick={() => onAddToLabel(variant ? { ...item, variant: placed(variant, 'user') } : item)}
          title={variant ? `Opens the label filtered to ${variant.station} (${variant.daypart})` : undefined}
          className="flex-1 h-11 gap-2"
        >
          <Plus className="h-5 w-5" />Add to label
        </Button>
      </div>
    </>
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
