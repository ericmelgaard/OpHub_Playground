import { useState, useEffect, useMemo } from 'react';
import { X, Copy, Search, Save, ArrowLeftRight } from 'lucide-react';
import { MenuItem, SubstitutionContext } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DAY_ABBR } from '../lib/availability';

interface SubstitutionFlowProps {
  isOpen: boolean;
  context: SubstitutionContext;
  menuItems: MenuItem[];
  assignedItemIds: Set<number>;
  onComplete: (substituteItem: MenuItem) => void;
  onClose: () => void;
  availableMealPeriods?: string[];
  availableStations?: string[];
}

export function SubstitutionFlow({
  isOpen,
  context,
  menuItems,
  assignedItemIds,
  onComplete,
  onClose,
  availableMealPeriods = [],
  availableStations = [],
}: SubstitutionFlowProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mealPeriod, setMealPeriod] = useState('');
  const [mealStation, setMealStation] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [filledFrom, setFilledFrom] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && context) {
      setName(context.originalItem.name);
      setPrice(context.originalItem.price);
      setMealPeriod(context.originalItem.mealPeriod || '');
      setMealStation(context.originalItem.mealStation || '');
      setShowPicker(false);
      setPickSearch('');
      setFilledFrom(context.originalItem.name);
    }
  }, [isOpen, context]);

  const filteredPickItems = useMemo(() => {
    const items = menuItems.filter(i => i.id !== context?.originalItem.id);
    if (!pickSearch.trim()) return items.slice(0, 50);
    const q = pickSearch.toLowerCase();
    return items
      .filter(i => i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false))
      .slice(0, 50);
  }, [menuItems, pickSearch, context]);

  const fillFromItem = (item: MenuItem) => {
    setName(item.name);
    setPrice(item.price);
    if (item.mealPeriod) setMealPeriod(item.mealPeriod);
    if (item.mealStation) setMealStation(item.mealStation);
    setFilledFrom(item.name);
    setShowPicker(false);
    setPickSearch('');
  };

  const clearForm = () => {
    setName('');
    setPrice('');
    setMealPeriod(context?.originalItem.mealPeriod || '');
    setMealStation(context?.originalItem.mealStation || '');
    setFilledFrom(null);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const subItem: MenuItem = {
      ...context.originalItem,
      id: -(Date.now()),
      name: name.trim(),
      price: price || '0.00',
      mealPeriod,
      mealStation,
      mrn: `SUB-${Date.now()}`,
      activeDays: [context.dayOfWeek],
    };
    onComplete(subItem);
  };

  if (!isOpen || !context) return null;

  const dayLabel = DAY_ABBR[context.dayOfWeek];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <Card className="w-full max-w-lg flex flex-col bg-white dark:bg-gray-800 shadow-xl max-h-[85vh]">
        <CardHeader className="flex-shrink-0 p-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-amber-500" />
                Substitute Item
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Replacing <span className="font-medium text-gray-700 dark:text-gray-300">{context.originalItem.name}</span> on <span className="font-medium text-sky-600 dark:text-sky-400">{dayLabel}</span> only
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-500">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {/* Fill from existing / start fresh */}
          {!showPicker ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowPicker(true)}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <Copy className="h-4 w-4 flex-shrink-0" />
                {filledFrom ? (
                  <span className="truncate">From <span className="font-medium text-gray-700 dark:text-gray-300">{filledFrom}</span></span>
                ) : (
                  <span>Fill from existing</span>
                )}
              </button>
              {filledFrom && (
                <button
                  onClick={clearForm}
                  className="px-3 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 transition-colors whitespace-nowrap"
                >
                  Start fresh
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 border border-amber-200 dark:border-amber-800 rounded-lg p-2 bg-amber-50/50 dark:bg-amber-900/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pick a product to fill from</span>
                <button onClick={() => { setShowPicker(false); setPickSearch(''); }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={pickSearch}
                  onChange={(e) => setPickSearch(e.target.value)}
                  placeholder="Search products..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredPickItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No matching items</p>
                ) : (
                  filteredPickItems.map(item => {
                    const isAssigned = assignedItemIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => fillFromItem(item)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.mealStation} &middot; ${item.price}</p>
                        </div>
                        {isAssigned && (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">On page</span>
                        )}
                        <Copy className="h-3 w-3 text-gray-300 flex-shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-2">
            <Label htmlFor="sub-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sub-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!showPicker}
              placeholder="e.g. Grilled Chicken Salad"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-price" className="text-sm font-medium text-gray-700 dark:text-gray-300">Price</Label>
            <Input
              id="sub-price"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meal Period</Label>
              <Select value={mealPeriod || 'none'} onValueChange={(v) => setMealPeriod(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">None</SelectItem>
                  {availableMealPeriods.map(p => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Station</Label>
              <Select value={mealStation || 'none'} onValueChange={(v) => setMealStation(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select station" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">None</SelectItem>
                  {availableStations.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-shrink-0 border-t dark:border-gray-700 p-3">
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="px-4 py-2 text-sm rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim()}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                name.trim()
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4" />
              Substitute
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
