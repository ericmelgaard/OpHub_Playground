import { useState, useEffect, useMemo } from 'react';
import { X, Save, Search, Copy } from 'lucide-react';
import { MenuItem } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

interface QuickAddModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (item: {
    name: string;
    price: string;
    mealPeriod: string;
    mealStation: string;
    activeDays: number[];
  }) => void;
  defaultMealPeriod?: string;
  defaultMealStation?: string;
  availableMealPeriods?: string[];
  availableStations?: string[];
  selectedDay?: number | 'every-day';
  menuItems?: MenuItem[];
}

export function QuickAddModal({
  show,
  onClose,
  onSave,
  defaultMealPeriod = '',
  defaultMealStation = '',
  availableMealPeriods = [],
  availableStations = [],
  selectedDay,
  menuItems = [],
}: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mealPeriod, setMealPeriod] = useState(defaultMealPeriod);
  const [mealStation, setMealStation] = useState(defaultMealStation);
  const [activeDays, setActiveDays] = useState<number[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [filledFrom, setFilledFrom] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setName('');
      setPrice('');
      setMealPeriod(defaultMealPeriod);
      setMealStation(defaultMealStation);
      setShowPicker(false);
      setPickSearch('');
      setFilledFrom(null);
      if (selectedDay !== undefined && selectedDay !== 'every-day') {
        setActiveDays([selectedDay]);
      } else {
        setActiveDays([0, 1, 2, 3, 4, 5, 6]);
      }
    }
  }, [show, defaultMealPeriod, defaultMealStation, selectedDay]);

  const toggleDay = (day: number) => {
    setActiveDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const selectAllDays = () => setActiveDays([0, 1, 2, 3, 4, 5, 6]);

  const filteredPickItems = useMemo(() => {
    if (!pickSearch.trim()) return menuItems.slice(0, 50);
    const q = pickSearch.toLowerCase();
    return menuItems
      .filter(i => i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false))
      .slice(0, 50);
  }, [menuItems, pickSearch]);

  const fillFromItem = (item: MenuItem) => {
    setName(item.name);
    setPrice(item.price);
    if (item.mealPeriod) setMealPeriod(item.mealPeriod);
    if (item.mealStation) setMealStation(item.mealStation);
    setFilledFrom(item.name);
    setShowPicker(false);
    setPickSearch('');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      price: price || '0.00',
      mealPeriod,
      mealStation,
      activeDays,
    });
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <Card className="w-full max-w-md flex flex-col bg-white dark:bg-gray-800 shadow-xl max-h-[85vh]">
        <CardHeader className="flex-shrink-0 p-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Quick Add Product
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Create a product and assign it to this page.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {/* Copy from existing */}
          {!showPicker ? (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              <Copy className="h-4 w-4" />
              {filledFrom ? (
                <span>Filled from <span className="font-medium text-gray-700 dark:text-gray-300">{filledFrom}</span> &middot; tap to change</span>
              ) : (
                <span>Fill from an existing product</span>
              )}
            </button>
          ) : (
            <div className="space-y-2 border border-sky-200 dark:border-sky-800 rounded-lg p-2 bg-sky-50/50 dark:bg-sky-900/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sky-600 dark:text-sky-400">Pick a product to fill from</span>
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
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>
              <div className="max-h-[180px] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredPickItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No matching items</p>
                ) : (
                  filteredPickItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => fillFromItem(item)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.mealStation} &middot; ${item.price}</p>
                      </div>
                      <Copy className="h-3 w-3 text-gray-300 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-2">
            <Label htmlFor="quick-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quick-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!showPicker}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="e.g. Avocado Toast"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Price
            </Label>
            <Input
              id="quick-price"
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Meal Period</Label>
              <Select value={mealPeriod || 'none'} onValueChange={(v) => setMealPeriod(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select period" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">None</SelectItem>
                  {availableMealPeriods.map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Station</Label>
              <Select value={mealStation || 'none'} onValueChange={(v) => setMealStation(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select station" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">None</SelectItem>
                  {availableStations.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Day pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Days</Label>
              <button
                onClick={selectAllDays}
                className={`text-[10px] font-medium transition-colors ${
                  activeDays.length === 7 ? 'text-gray-300 dark:text-gray-600' : 'text-sky-500 hover:text-sky-600'
                }`}
              >Every day</button>
            </div>
            <div className="flex gap-1.5">
              {DAY_OPTIONS.map(d => {
                const isActive = activeDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all min-w-0 ${
                      isActive
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-shrink-0 border-t dark:border-gray-700 p-3">
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || activeDays.length === 0}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                name.trim() && activeDays.length > 0
                  ? 'bg-sky-500 text-white hover:bg-sky-600'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
