import React, { useState } from 'react';
import {
  X,
  Save,
  AlertCircle,
  CloudOff,
  RotateCcw,
  ChevronDown,
  Plus,
  Globe,
  Trash2,
} from 'lucide-react';
import {
  MenuItem,
  Nutrition,
  NutritionInfo,
  ModifiedFields,
  CustomAttribute,
  CustomAttributeValue,
  IntegrationSettings,
} from '../types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditItemModalProps {
  item: MenuItem;
  onClose: () => void;
  onSave: (updatedItem: MenuItem, modifiedFields: ModifiedFields) => void;
  modifiedFields: ModifiedFields | null;
  integrationSettings: IntegrationSettings;
}

const defaultNutritionInfo: NutritionInfo = {
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

export function EditItemModal({
  item,
  onClose,
  onSave,
  modifiedFields: initialModifiedFields,
  integrationSettings,
}: EditItemModalProps) {
  const [webtritionItem] = useState<MenuItem>({
    ...item,
    nutrition: item.nutrition || defaultNutrition,
  });

  const [editedItem, setEditedItem] = useState<MenuItem>({
    ...item,
    nutrition: item.nutrition || defaultNutrition,
    customAttributes: item.customAttributes || [],
  });

  const [modifiedFields, setModifiedFields] = useState<ModifiedFields>(
    initialModifiedFields || {}
  );
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const isFieldModified = (field: string): boolean => {
    if (field.startsWith('nutrition.')) {
      const [, nutritionField] = field.split('.');
      return !!(
        modifiedFields.nutrition && modifiedFields.nutrition[nutritionField]
      );
    }
    if (field.startsWith('customAttributes.')) {
      const [, definitionId, language] = field.split('.');
      return !!(
        modifiedFields.customAttributes?.[definitionId]?.[language || 'default']
      );
    }
    return !!modifiedFields[field];
  };

  const handleChange = (field: keyof MenuItem, value: any) => {
    setEditedItem((prev) => ({
      ...prev,
      [field]: value,
    }));
    setModifiedFields((prev) => ({
      ...prev,
      [field]: value !== webtritionItem[field],
    }));
  };

  const handleNutritionChange = (field: keyof Nutrition, value: string) => {
    setEditedItem((prev) => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        [field]: {
          ...prev.nutrition[field],
          value,
        },
      },
    }));
    setModifiedFields((prev) => ({
      ...prev,
      nutrition: {
        ...prev.nutrition,
        [field]: value !== webtritionItem.nutrition?.[field]?.value,
      },
    }));
  };

  const handleCustomAttributeChange = (
    definitionId: string,
    value: string,
    language?: string
  ) => {
    setEditedItem((prev) => {
      const attributes = [...(prev.customAttributes || [])];
      const attributeIndex = attributes.findIndex(
        (attr) => attr.definitionId === definitionId
      );

      if (attributeIndex === -1) {
        attributes.push({
          definitionId,
          values: [{ value, language }],
        });
      } else {
        const valueIndex = attributes[attributeIndex].values.findIndex(
          (v) => v.language === language
        );
        if (valueIndex === -1) {
          attributes[attributeIndex].values.push({ value, language });
        } else {
          attributes[attributeIndex].values[valueIndex].value = value;
        }
      }

      return {
        ...prev,
        customAttributes: attributes,
      };
    });

    setModifiedFields((prev) => ({
      ...prev,
      customAttributes: {
        ...prev.customAttributes,
        [definitionId]: {
          ...(prev.customAttributes?.[definitionId] || {}),
          [language || 'default']: true,
        },
      },
    }));
  };

  const handleAddLanguageAlternate = (definitionId: string) => {
    const availableLanguages = integrationSettings.supportedLanguages || [];
    const currentAttribute = editedItem.customAttributes?.find(
      (attr) => attr.definitionId === definitionId
    );
    const usedLanguages = new Set(
      currentAttribute?.values.map((v) => v.language)
    );

    const firstAvailableLanguage = availableLanguages.find(
      (lang) => !usedLanguages.has(lang.code)
    );

    if (firstAvailableLanguage) {
      handleCustomAttributeChange(
        definitionId,
        '',
        firstAvailableLanguage.code
      );
    }
  };

  const handleRemoveLanguageAlternate = (
    definitionId: string,
    language: string
  ) => {
    setEditedItem((prev) => {
      const attributes = [...(prev.customAttributes || [])];
      const attributeIndex = attributes.findIndex(
        (attr) => attr.definitionId === definitionId
      );

      if (attributeIndex !== -1) {
        attributes[attributeIndex].values = attributes[
          attributeIndex
        ].values.filter((v) => v.language !== language);
      }

      return {
        ...prev,
        customAttributes: attributes,
      };
    });

    setModifiedFields((prev) => {
      const newModifiedFields = { ...prev };
      if (newModifiedFields.customAttributes?.[definitionId]) {
        delete newModifiedFields.customAttributes[definitionId][language];
      }
      return newModifiedFields;
    });
  };

  const handleRevertField = (field: string) => {
    if (field.startsWith('nutrition.')) {
      const nutritionField = field.split('.')[1] as keyof Nutrition;
      setEditedItem((prev) => ({
        ...prev,
        nutrition: {
          ...prev.nutrition,
          [nutritionField]: webtritionItem.nutrition[nutritionField],
        },
      }));
      setModifiedFields((prev) => ({
        ...prev,
        nutrition: {
          ...prev.nutrition,
          [nutritionField]: false,
        },
      }));
    } else if (field.startsWith('customAttributes.')) {
      const [, definitionId, language] = field.split('.');
      setEditedItem((prev) => {
        const originalAttribute = webtritionItem.customAttributes?.find(
          (attr) => attr.definitionId === definitionId
        );
        const originalValue = originalAttribute?.values.find(
          (v) => v.language === language
        );

        const attributes = [...(prev.customAttributes || [])];
        const attributeIndex = attributes.findIndex(
          (attr) => attr.definitionId === definitionId
        );

        if (attributeIndex !== -1 && originalValue) {
          const valueIndex = attributes[attributeIndex].values.findIndex(
            (v) => v.language === language
          );
          if (valueIndex !== -1) {
            attributes[attributeIndex].values[valueIndex] = { ...originalValue };
          }
        }

        return {
          ...prev,
          customAttributes: attributes,
        };
      });
      setModifiedFields((prev) => ({
        ...prev,
        customAttributes: {
          ...prev.customAttributes,
          [definitionId]: {
            ...prev.customAttributes?.[definitionId],
            [language || 'default']: false,
          },
        },
      }));
    } else {
      setEditedItem((prev) => ({
        ...prev,
        [field]: webtritionItem[field as keyof MenuItem],
      }));
      setModifiedFields((prev) => ({
        ...prev,
        [field]: false,
      }));
    }
  };

  const handleRevertAll = () => {
    setEditedItem(webtritionItem);
    setModifiedFields({});
    setShowActionsMenu(false);
  };

  const hasChanges = Object.keys(modifiedFields).length > 0;

  const renderField = (
    field: string,
    label: string,
    value: string,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void,
    type: 'input' | 'textarea' = 'input'
  ) => {
    const showRevert = isFieldModified(field);

    return (
      <div className="space-y-2">
        <Label
          htmlFor={field}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </Label>
        <div className="flex items-center gap-1">
          {type === 'input' ? (
            <Input
              id={field}
              type="text"
              value={value}
              onChange={onChange}
              className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          ) : (
            <Textarea
              id={field}
              value={value}
              onChange={onChange}
              rows={2}
              className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          )}
          {showRevert && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRevertField(field)}
              title="Revert to original value"
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
            >
              <RotateCcw className="h-4 w-4 text-sky-500" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderCustomAttributes = () => {
    if (!integrationSettings?.customAttributeDefinitions?.length) return null;

    return (
      <div className="space-y-6">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Custom Attributes
        </h4>
        <div className="space-y-4">
          {integrationSettings.customAttributeDefinitions.map((definition) => {
            const attribute = editedItem.customAttributes?.find(
              (attr) => attr.definitionId === definition.id
            );
            const values = attribute?.values || [];

            return (
              <div key={definition.id} className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {definition.label}
                </Label>
                <div className="space-y-2">
                  {values.map((value, index) => {
                    const showRevert = isFieldModified(
                      `customAttributes.${definition.id}.${value.language || 'default'}`
                    );

                    return (
                      <div
                        key={`${definition.id}-${value.language || 'default'}`}
                        className="flex items-center gap-2"
                      >
                        {value.language && (
                          <Select
                            value={value.language}
                            onValueChange={(newLang) => {
                              handleCustomAttributeChange(
                                definition.id,
                                value.value,
                                newLang
                              );
                              handleRemoveLanguageAlternate(
                                definition.id,
                                value.language!
                              );
                            }}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {integrationSettings.supportedLanguages?.map(
                                (lang) => (
                                  <SelectItem
                                    key={lang.code}
                                    value={lang.code}
                                  >
                                    {lang.name}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        <Input
                          value={value.value}
                          onChange={(e) =>
                            handleCustomAttributeChange(
                              definition.id,
                              e.target.value,
                              value.language
                            )
                          }
                          className="flex-1"
                          placeholder={`Enter ${definition.label}${
                            value.language ? ` (${value.language})` : ''
                          }`}
                        />
                        {showRevert && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRevertField(
                                `customAttributes.${definition.id}.${
                                  value.language || 'default'
                                }`
                              )
                            }
                            title="Revert to original value"
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          >
                            <RotateCcw className="h-4 w-4 text-sky-500" />
                          </Button>
                        )}
                        {value.language && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveLanguageAlternate(
                                definition.id,
                                value.language!
                              )
                            }
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        {value.isInherited && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Inherited
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {definition.allowAlternates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddLanguageAlternate(definition.id)}
                      className="mt-2"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Add Language Alternate
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="bg-white dark:bg-gray-800 w-full max-w-4xl flex flex-col h-[90vh]">
        <CardHeader className="flex-shrink-0 border-b dark:border-gray-700 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Menu Item
              </h3>
              <div className="relative">
                {hasChanges && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/70 border-amber-200 dark:border-amber-800"
                  >
                    <CloudOff className="h-4 w-4" />
                    Channel changes
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        showActionsMenu ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                )}
                {showActionsMenu && (
                  <Card className="absolute top-full right-0 mt-1 w-56 z-10">
                    <CardContent className="p-1">
                      <Button
                        variant="ghost"
                        onClick={handleRevertAll}
                        className="w-full justify-start"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Inherit from Webtrition
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {renderField('name', 'Name', editedItem.name, (e) =>
                handleChange('name', e.target.value)
              )}
              {renderField('price', 'Price', editedItem.price, (e) =>
                handleChange('price', e.target.value)
              )}
            </div>

            <div className="space-y-4">
              {renderField(
                'description',
                'Description',
                editedItem.description || '',
                (e) => handleChange('description', e.target.value),
                'textarea'
              )}
              {renderField(
                'enticingDescription',
                'Enticing Description',
                editedItem.enticingDescription || '',
                (e) => handleChange('enticingDescription', e.target.value),
                'textarea'
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {renderField(
                'mealPeriod',
                'Meal Period',
                editedItem.mealPeriod,
                (e) => handleChange('mealPeriod', e.target.value)
              )}
              {renderField(
                'mealStation',
                'Meal Station',
                editedItem.mealStation,
                (e) => handleChange('mealStation', e.target.value)
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">
                Nutrition Information
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {renderField(
                  'nutrition.calories',
                  'Calories',
                  editedItem.nutrition?.calories?.value || '0',
                  (e) => handleNutritionChange('calories', e.target.value)
                )}
                {renderField(
                  'nutrition.protein',
                  'Protein (g)',
                  editedItem.nutrition?.protein?.value || '0',
                  (e) => handleNutritionChange('protein', e.target.value)
                )}
                {renderField(
                  'nutrition.carbohydrates',
                  'Carbohydrates (g)',
                  editedItem.nutrition?.carbohydrates?.value || '0',
                  (e) => handleNutritionChange('carbohydrates', e.target.value)
                )}
                {renderField(
                  'nutrition.fat',
                  'Fat (g)',
                  editedItem.nutrition?.fat?.value || '0',
                  (e) => handleNutritionChange('fat', e.target.value)
                )}
              </div>
            </div>

            {renderField(
              'allergens',
              'Allergens (comma-separated)',
              editedItem.allergens || '',
              (e) => handleChange('allergens', e.target.value)
            )}

            {renderCustomAttributes()}

            <div className="h-16" />
          </div>
        </CardContent>

        {hasChanges && (
          <CardFooter className="border-t bg-white dark:border-gray-700 dark:bg-gray-800 bg-opacity-90 backdrop-blur-sm p-4 sticky bottom-0">
            <div className="w-full flex justify-end">
              <Button
                onClick={() => onSave(editedItem, modifiedFields)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 dark:bg-sky-600 text-white dark:text-white rounded-lg hover:bg-sky-700 dark:hover:bg-sky-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}