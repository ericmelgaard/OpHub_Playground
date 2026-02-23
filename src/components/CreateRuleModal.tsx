import React, { useState } from 'react';
import { X, Save, Globe, Check, Tag, Plus, Trash2, ToggleLeft as Toggle, ChevronDown } from 'lucide-react';
import { Rule, RuleAction, IntegrationSettings } from '../types';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
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

interface CreateRuleModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  selectedRule: Rule | null;
  integrationSettings: IntegrationSettings;
}

const AVAILABLE_FIELDS = [
  { id: 'name', label: 'Name' },
  { id: 'description', label: 'Description' },
  { id: 'enticingDescription', label: 'Enticing Description' },
  { id: 'allergens', label: 'Allergens' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'presentation', label: 'Presentation' },
] as const;

interface ReplaceAction {
  field: string;
  target: string;
  value: string;
}

export function CreateRuleModal({
  show,
  onClose,
  onSave,
  selectedRule,
  integrationSettings,
}: CreateRuleModalProps) {
  const [ruleName, setRuleName] = useState(selectedRule?.name || '');
  const [ruleDescription, setRuleDescription] = useState(selectedRule?.description || '');
  const [action, setAction] = useState<RuleAction>(
    selectedRule?.action || {
      type: 'presentation',
      field: 'presentation',
      presentationRules: {
        daypart: [],
        station: [],
        displayName: true,
        displayDescription: true,
        displayPrice: true,
        displayCalories: true,
        displayAllergens: true,
        displayNutrition: true,
      },
    }
  );

  // State for managing multiple replace actions
  const [replaceActions, setReplaceActions] = useState<ReplaceAction[]>([
    { field: AVAILABLE_FIELDS[0].id, target: '', value: '' }
  ]);

  const handleComponentToggle = (componentId: string) => {
    setAction(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [componentId]: {
          ...prev.components?.[componentId],
          enabled: !prev.components?.[componentId]?.enabled,
          alternates: prev.components?.[componentId]?.alternates || []
        }
      }
    }));
  };

  const handleAddVariant = (componentId: string) => {
    setAction(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [componentId]: {
          enabled: prev.components?.[componentId]?.enabled || true,
          alternates: [...(prev.components?.[componentId]?.alternates || []), '']
        }
      }
    }));
  };

  const handleUpdateVariant = (componentId: string, index: number, value: string) => {
    setAction(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [componentId]: {
          enabled: prev.components?.[componentId]?.enabled || true,
          alternates: prev.components?.[componentId]?.alternates?.map((variant, i) => 
            i === index ? value : variant
          ) || []
        }
      }
    }));
  };

  const handleRemoveVariant = (componentId: string, index: number) => {
    setAction(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [componentId]: {
          enabled: prev.components?.[componentId]?.enabled || true,
          alternates: prev.components?.[componentId]?.alternates?.filter((_, i) => i !== index) || []
        }
      }
    }));
  };

  const handleActionTypeChange = (type: 'presentation' | 'replace' | 'components') => {
    if (type === 'presentation') {
      setAction({
        type: 'presentation',
        field: 'presentation',
        presentationRules: {
          daypart: [],
          station: [],
          displayName: true,
          displayDescription: true,
          displayPrice: true,
          displayCalories: true,
          displayAllergens: true,
          displayNutrition: true,
        },
      });
    } else if (type === 'components') {
      setAction({
        type: 'components',
        components: {},
      });
    } else {
      setAction({
        type: 'replace',
        field: AVAILABLE_FIELDS[0].id,
        value: '',
        target: '',
      });
      setReplaceActions([{ field: AVAILABLE_FIELDS[0].id, target: '', value: '' }]);
    }
  };

  const handleAddReplaceAction = () => {
    setReplaceActions([...replaceActions, { field: AVAILABLE_FIELDS[0].id, target: '', value: '' }]);
  };

  const handleRemoveReplaceAction = (index: number) => {
    setReplaceActions(replaceActions.filter((_, i) => i !== index));
  };

  const handleUpdateReplaceAction = (index: number, field: keyof ReplaceAction, value: string) => {
    const newActions = [...replaceActions];
    newActions[index] = { ...newActions[index], [field]: value };
    setReplaceActions(newActions);
  };

  const handleSubmit = () => {
    if (!ruleName) return;

    const rule: Rule = {
      id: selectedRule?.id || Date.now().toString(),
      name: ruleName,
      description: ruleDescription,
      action: action.type === 'replace' ? {
        type: 'replace',
        replaceActions: replaceActions
      } : action,
      active: selectedRule?.active ?? true,
    };

    onSave(rule);
    onClose();
  };

  const renderPresentationRules = () => (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">Apply to Dayparts</Label>
        <div className="flex flex-wrap gap-2">
          {['Breakfast', 'Lunch', 'Dinner', 'Late Night'].map(daypart => (
            <Button
              key={daypart}
              variant={action.presentationRules?.daypart?.includes(daypart) ? 'default' : 'outline'}
              onClick={() => {
                setAction(prev => ({
                  ...prev,
                  presentationRules: {
                    ...prev.presentationRules!,
                    daypart: prev.presentationRules?.daypart?.includes(daypart)
                      ? prev.presentationRules.daypart.filter(d => d !== daypart)
                      : [...(prev.presentationRules?.daypart || []), daypart],
                  },
                }));
              }}
              size="sm"
            >
              {action.presentationRules?.daypart?.includes(daypart) && (
                <Check className="mr-2 h-4 w-4" />
              )}
              {daypart}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Apply to Stations</Label>
        <div className="flex flex-wrap gap-2">
          {['Grill', 'Deli', 'Salad Bar', 'Pizza', 'International'].map(station => (
            <Button
              key={station}
              variant={action.presentationRules?.station?.includes(station) ? 'default' : 'outline'}
              onClick={() => {
                setAction(prev => ({
                  ...prev,
                  presentationRules: {
                    ...prev.presentationRules!,
                    station: prev.presentationRules?.station?.includes(station)
                      ? prev.presentationRules.station.filter(s => s !== station)
                      : [...(prev.presentationRules?.station || []), station],
                  },
                }));
              }}
              size="sm"
            >
              {action.presentationRules?.station?.includes(station) && (
                <Check className="mr-2 h-4 w-4" />
              )}
              {station}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="mb-2 block">Display Options</Label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'displayName', label: 'Show Name' },
            { key: 'displayDescription', label: 'Show Description' },
            { key: 'displayPrice', label: 'Show Price' },
            { key: 'displayCalories', label: 'Show Calories' },
            { key: 'displayAllergens', label: 'Show Allergens' },
            { key: 'displayNutrition', label: 'Show Nutrition' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={action.presentationRules?.[key as keyof NonNullable<RuleAction['presentationRules']>] ? 'default' : 'outline'}
              onClick={() => {
                setAction(prev => ({
                  ...prev,
                  presentationRules: {
                    ...prev.presentationRules!,
                    [key]: !prev.presentationRules?.[key as keyof NonNullable<RuleAction['presentationRules']>],
                  },
                }));
              }}
              className="justify-start"
            >
              {action.presentationRules?.[key as keyof NonNullable<RuleAction['presentationRules']>] && (
                <Check className="mr-2 h-4 w-4" />
              )}
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderComponentsAction = () => {
    if (!action.components) return null;

    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gray-50 dark:bg-gray-800/50">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Standard Attributes
            </h4>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
            {AVAILABLE_FIELDS.map(attr => (
              <div key={attr.id} className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex-1 flex items-center gap-3">
                  <Button
                    variant={action.components![attr.id]?.enabled ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleComponentToggle(attr.id)}
                    className="h-7 px-2"
                  >
                    <Toggle className="h-4 w-4" />
                  </Button>
                  <span className={`text-sm ${action.components![attr.id]?.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {attr.label}
                  </span>
                  {action.components![attr.id]?.alternates?.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {action.components![attr.id].alternates.length} variants
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddVariant(attr.id)}
                  className="h-7 px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {integrationSettings.customAttributeDefinitions?.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="py-3 px-4 bg-gray-50 dark:bg-gray-800/50">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Custom Attributes
              </h4>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
              {integrationSettings.customAttributeDefinitions.map(attr => (
                <div key={attr.id} className="group">
                  <div className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex-1 flex items-center gap-3">
                      <Button
                        variant={action.components![attr.id]?.enabled ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleComponentToggle(attr.id)}
                        className="h-7 px-2"
                      >
                        <Toggle className="h-4 w-4" />
                      </Button>
                      <span className={`text-sm ${action.components![attr.id]?.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {attr.label}
                      </span>
                      {action.components![attr.id]?.alternates?.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {action.components![attr.id].alternates.length} variants
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddVariant(attr.id)}
                      className="h-7 px-2"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {action.components![attr.id]?.alternates?.length > 0 && (
                    <div className="px-12 pb-3 space-y-2">
                      {action.components![attr.id].alternates.map((variant, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={variant}
                            onChange={(e) => handleUpdateVariant(attr.id, index, e.target.value)}
                            placeholder={`Variant ${index + 1}`}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVariant(attr.id, index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderReplaceActions = () => (
    <div className="space-y-2">
      {replaceActions.map((action, index) => (
        <Card key={index} className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Select
                value={action.field}
                onValueChange={(value) => handleUpdateReplaceAction(index, 'field', value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FIELDS.filter(field => field.id !== 'presentation').map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.label}
                    </SelectItem>
                  ))}
                  {integrationSettings.customAttributeDefinitions?.map((def) => (
                    <SelectItem key={def.id} value={`custom.${def.id}`}>
                      {def.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={action.target}
                onChange={(e) => handleUpdateReplaceAction(index, 'target', e.target.value)}
                placeholder="Find text"
                className="flex-1"
              />

              <Input
                value={action.value}
                onChange={(e) => handleUpdateReplaceAction(index, 'value', e.target.value)}
                placeholder="Replace with"
                className="flex-1"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveReplaceAction(index)}
                className="text-red-500 hover:text-red-600"
                disabled={replaceActions.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddReplaceAction}
        className="w-full mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Replace Action
      </Button>
    </div>
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 flex flex-col h-[90vh]">
        <CardHeader className="flex-shrink-0 p-6 border-b dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Rule
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

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input
                id="ruleName"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Enter rule name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ruleDescription">Description</Label>
              <Input
                id="ruleDescription"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="Enter rule description"
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <Label>Rule Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={action.type === 'presentation' ? 'default' : 'secondary'}
                  onClick={() => handleActionTypeChange('presentation')}
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Presentation
                </Button>
                <Button
                  variant={action.type === 'components' ? 'default' : 'secondary'}
                  onClick={() => handleActionTypeChange('components')}
                  className="flex-1"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Components
                </Button>
                <Button
                  variant={action.type === 'replace' ? 'default' : 'secondary'}
                  onClick={() => handleActionTypeChange('replace')}
                  className="flex-1"
                >
                  Replace
                </Button>
              </div>
            </div>

            {action.type === 'presentation' && renderPresentationRules()}
            {action.type === 'components' && renderComponentsAction()}
            {action.type === 'replace' && renderReplaceActions()}
          </div>
        </CardContent>

        <CardFooter className="flex-shrink-0 flex justify-end gap-2 p-6 border-t dark:border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!ruleName}>
            <Save className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}