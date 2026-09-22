import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
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

interface QuickAddModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (item: {
    name: string;
    price: string;
    mealPeriod: string;
    mealStation: string;
  }) => void;
  defaultMealPeriod?: string;
  defaultMealStation?: string;
  availableMealPeriods?: string[];
  availableStations?: string[];
}

export function QuickAddModal({
  show,
  onClose,
  onSave,
  defaultMealPeriod = '',
  defaultMealStation = '',
  availableMealPeriods = [],
  availableStations = [],
}: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [mealPeriod, setMealPeriod] = useState(defaultMealPeriod);
  const [mealStation, setMealStation] = useState(defaultMealStation);

  useEffect(() => {
    if (show) {
      setName('');
      setPrice('');
      setMealPeriod(defaultMealPeriod);
      setMealStation(defaultMealStation);
    }
  }, [show, defaultMealPeriod, defaultMealStation]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      price: price || '0.00',
      mealPeriod,
      mealStation,
    });
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <Card className="w-full max-w-md flex flex-col bg-white dark:bg-gray-800 shadow-xl">
        <CardHeader className="flex-shrink-0 p-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Quick Add Product
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Create a product and assign it immediately. Add full details later from the Products page.
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

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="quick-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
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
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Meal Period
              </Label>
              <Select
                value={mealPeriod || 'none'}
                onValueChange={(v) => setMealPeriod(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">None</SelectItem>
                  {availableMealPeriods.map((p) => (
                    <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Station
              </Label>
              <Select
                value={mealStation || 'none'}
                onValueChange={(v) => setMealStation(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">None</SelectItem>
                  {availableStations.map((s) => (
                    <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-shrink-0 border-t dark:border-gray-700 p-3">
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim()}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                name.trim()
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
