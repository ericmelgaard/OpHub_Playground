import { useState, useEffect, useMemo } from 'react';
import { X, Copy, Search, Plus, Save, ArrowLeftRight, Check } from 'lucide-react';
import { MenuItem, SubstitutionContext, SubstitutionMode } from '../types';
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
  onCreateMenuItem?: (data: { name: string; price: string; mealPeriod: string; mealStation: string }) => Promise<MenuItem | null>;
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
  onCreateMenuItem,
  availableMealPeriods = [],
  availableStations = [],
}: SubstitutionFlowProps) {
  const [mode, setMode] = useState<SubstitutionMode>('copy-and-edit');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mealPeriod, setMealPeriod] = useState('');
  const [mealStation, setMealStation] = useState('');
  const [pickSearch, setPickSearch] = useState('');
  const [selectedPickItem, setSelectedPickItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (isOpen && context) {
      setMode('copy-and-edit');
      setName(context.originalItem.name);
      setPrice(context.originalItem.price);
      setMealPeriod(context.originalItem.mealPeriod || '');
      setMealStation(context.originalItem.mealStation || '');
      setPickSearch('');
      setSelectedPickItem(null);
    }
  }, [isOpen, context]);

  const resetToNew = () => {
    setName('');
    setPrice('');
    setMealPeriod(context?.originalItem.mealPeriod || '');
    setMealStation(context?.originalItem.mealStation || '');
  };

  const handleModeChange = (newMode: SubstitutionMode) => {
    setMode(newMode);
    if (newMode === 'copy-and-edit' && context) {
      setName(context.originalItem.name);
      setPrice(context.originalItem.price);
      setMealPeriod(context.originalItem.mealPeriod || '');
      setMealStation(context.originalItem.mealStation || '');
    } else if (newMode === 'create-new') {
      resetToNew();
    }
    setSelectedPickItem(null);
  };

  const filteredPickItems = useMemo(() => {
    if (!pickSearch.trim()) return menuItems.filter(i => i.id !== context?.originalItem.id).slice(0, 50);
    const q = pickSearch.toLowerCase();
    return menuItems
      .filter(i => i.id !== context?.originalItem.id && (i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false)))
      .slice(0, 50);
  }, [menuItems, pickSearch, context]);

  const handleSaveCopyOrNew = () => {
    if (!name.trim()) return;
    const subItem: MenuItem = {
      ...context.originalItem,
      id: -(Date.now()),
      name: name.trim(),
      price: price || '0.00',
      mealPeriod: mealPeriod,
      mealStation: mealStation,
      mrn: `SUB-${Date.now()}`,
      activeDays: [context.dayOfWeek],
    };
    onComplete(subItem);
  };

  const handleSavePick = async () => {
    if (!selectedPickItem) return;
    onComplete(selectedPickItem);
  };

  const handleCreateAndSave = async () => {
    if (!name.trim()) return;
    if (onCreateMenuItem) {
      const item = await onCreateMenuItem({ name: name.trim(), price: price || '0.00', mealPeriod, mealStation });
      if (item) {
        onComplete(item);
        return;
      }
    }
    handleSaveCopyOrNew();
  };

  if (!isOpen || !context) return null;

  const dayLabel = DAY_ABBR[context.dayOfWeek];
  const tabs: { key: SubstitutionMode; label: string; icon: React.ReactNode }[] = [
    { key: 'copy-and-edit', label: 'Copy & Edit', icon: <Copy className="h-3.5 w-3.5" /> },
    { key: 'pick-existing', label: 'Pick Existing', icon: <Search className="h-3.5 w-3.5" /> },
    { key: 'create-new', label: 'Create New', icon: <Plus className="h-3.5 w-3.5" /> },
  ];

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
          <div className="flex gap-1 mt-3 bg-gray-100 dark:bg-gray-900/40 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleModeChange(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  mode === tab.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 min-h-0">
          {mode === 'copy-and-edit' && (
            <ItemForm
              name={name} setName={setName}
              price={price} setPrice={setPrice}
              mealPeriod={mealPeriod} setMealPeriod={setMealPeriod}
              mealStation={mealStation} setMealStation={setMealStation}
              availableMealPeriods={availableMealPeriods}
              availableStations={availableStations}
            />
          )}

          {mode === 'pick-existing' && (
            <div className="space-y-3">
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
              <div className="max-h-[300px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredPickItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No matching items</p>
                ) : (
                  filteredPickItems.map(item => {
                    const isSelected = selectedPickItem?.id === item.id;
                    const isAssigned = assignedItemIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedPickItem(item)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-900/30 ring-1 ring-inset ring-sky-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.mealStation} · ${item.price}</p>
                        </div>
                        {isAssigned && (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">On page</span>
                        )}
                        {isSelected && <Check className="h-4 w-4 text-sky-500 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {mode === 'create-new' && (
            <ItemForm
              name={name} setName={setName}
              price={price} setPrice={setPrice}
              mealPeriod={mealPeriod} setMealPeriod={setMealPeriod}
              mealStation={mealStation} setMealStation={setMealStation}
              availableMealPeriods={availableMealPeriods}
              availableStations={availableStations}
            />
          )}
        </CardContent>

        <CardFooter className="flex-shrink-0 border-t dark:border-gray-700 p-3">
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="px-4 py-2 text-sm rounded-lg">
              Cancel
            </Button>
            {mode === 'pick-existing' ? (
              <Button
                onClick={handleSavePick}
                disabled={!selectedPickItem}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedPickItem
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Substitute
              </Button>
            ) : (
              <Button
                onClick={mode === 'create-new' ? handleCreateAndSave : handleSaveCopyOrNew}
                disabled={!name.trim()}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  name.trim()
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="h-4 w-4" />
                {mode === 'create-new' ? 'Create & Substitute' : 'Substitute'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function ItemForm({ name, setName, price, setPrice, mealPeriod, setMealPeriod, mealStation, setMealStation, availableMealPeriods, availableStations }: {
  name: string; setName: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  mealPeriod: string; setMealPeriod: (v: string) => void;
  mealStation: string; setMealStation: (v: string) => void;
  availableMealPeriods: string[];
  availableStations: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sub-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="sub-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
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
    </div>
  );
}
