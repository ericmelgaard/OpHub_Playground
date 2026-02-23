import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { MenuItem, Nutrition } from '../types';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CreateItemModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (newItem: MenuItem) => void;
}

const defaultNutritionInfo = {
  value: '0',
  dailyValue: null,
  displayValue: '0',
};

const defaultNutrition: Nutrition = {
  calories: defaultNutritionInfo,
  protein: defaultNutritionInfo,
  carbohydrates: defaultNutritionInfo,
  fat: defaultNutritionInfo,
  sugar: defaultNutritionInfo,
};

export function CreateItemModal({
  show,
  onClose,
  onSave,
}: CreateItemModalProps) {
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    enticingDescription: '',
    price: '',
    mealPeriod: '',
    mealStation: '',
    nutrition: defaultNutrition,
    allergens: '',
    calories: '0',
  });

  const handleChange = (field: keyof MenuItem, value: any) => {
    setNewItem((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNutritionChange = (field: keyof Nutrition, value: string) => {
    setNewItem((prev) => ({
      ...prev,
      nutrition: {
        ...prev.nutrition!,
        [field]: {
          ...prev.nutrition![field],
          value,
        },
      },
    }));
  };

  const handleSubmit = () => {
    if (!newItem.name) return;

    const item: MenuItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      name: newItem.name,
      description: newItem.description || null,
      enticingDescription: newItem.enticingDescription || null,
      ingredients: '',
      price: newItem.price || '0.00',
      mrn: '',
      nutrition: newItem.nutrition!,
      allergens: newItem.allergens || '',
      portion: '',
      icons: [],
      calories: newItem.calories || '0',
      mealPeriodId: 0,
      mealStation: newItem.mealStation || '',
      mealPeriod: newItem.mealPeriod || '',
      sortOrder: 0,
    };

    onSave(item);
    onClose();
    setNewItem({
      name: '',
      description: '',
      enticingDescription: '',
      price: '',
      mealPeriod: '',
      mealStation: '',
      nutrition: defaultNutrition,
      allergens: '',
      calories: '0',
    });
  };

  if (!show) return null;

  const renderField = (
    field: keyof MenuItem,
    label: string,
    value: string,
    required: boolean = false,
    type: 'input' | 'textarea' = 'input'
  ) => (
    <div className="space-y-2">
      <Label
        htmlFor={field}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {type === 'input' ? (
        <Input
          id={field}
          type="text"
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          required={required}
          className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      ) : (
        <Textarea
          id={field}
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          rows={2}
          className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      )}
    </div>
  );

  const nutritionFields = Object.keys(defaultNutrition)
    .filter((key) => key !== 'calories')
    .map((key) => (
      <div key={`nutrition-${key}`} className="space-y-2">
        <Label
          htmlFor={`nutrition-${key}`}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {key.charAt(0).toUpperCase() + key.slice(1)} (g)
        </Label>
        <Input
          id={`nutrition-${key}`}
          type="text"
          value={newItem.nutrition?.[key as keyof Nutrition]?.value || '0'}
          onChange={(e) =>
            handleNutritionChange(key as keyof Nutrition, e.target.value)
          }
          className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
    ));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl flex flex-col h-[90vh] bg-white dark:bg-gray-800">
        <CardHeader className="flex-shrink-0 p-6 border-b dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Menu Item
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {renderField('name', 'Name', newItem.name || '', true)}
              {renderField('price', 'Price', newItem.price || '')}
            </div>

            <div className="space-y-4">
              {renderField(
                'description',
                'Description',
                newItem.description || '',
                false,
                'textarea'
              )}
              {renderField(
                'enticingDescription',
                'Enticing Description',
                newItem.enticingDescription || '',
                false,
                'textarea'
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {renderField(
                'mealPeriod',
                'Meal Period',
                newItem.mealPeriod || ''
              )}
              {renderField(
                'mealStation',
                'Meal Station',
                newItem.mealStation || ''
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Nutrition Information
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {renderField('calories', 'Calories', newItem.calories || '0')}
                {nutritionFields}
              </div>
            </div>

            {renderField(
              'allergens',
              'Allergens (comma-separated)',
              newItem.allergens || ''
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-shrink-0 border-t dark:border-gray-700 p-4">
          <div className="flex justify-end w-full">
            <Button
              onClick={handleSubmit}
              disabled={!newItem.name}
              // className="flex items-center gap-2"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                newItem.name.length > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4" />
              Create Item
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
