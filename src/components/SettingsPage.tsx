import React, { useState, useEffect, useCallback } from 'react';
import { Database, ArrowLeft, Wand2, Settings2, Tag, Monitor, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { IntegrationSettings, Theme, Brand, Device } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '../services/api';
import { SUGGESTED_GROUP_TEMPLATES, GroupTemplate } from '../lib/groupTemplates';
import { BrandAvatar } from './GroupsPage';

interface SettingsPageProps {
  onClose: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  integrationSettings: IntegrationSettings;
  setIntegrationSettings: (settings: IntegrationSettings) => void;
  onOpenRules?: () => void;
  devices?: Device[];
}

export function SettingsPage({
  onClose,
  theme,
  setTheme,
  integrationSettings,
  setIntegrationSettings,
  onOpenRules,
  devices = [],
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<'integrations' | 'rules' | 'demo'>('integrations');

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 overflow-y-auto">
      {/* Header */}
      <div className="border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Navigation */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              <SettingsNavButton
                active={activeSection === 'integrations'}
                onClick={() => setActiveSection('integrations')}
                icon={<Database className="h-4 w-4" />}
                label="Integrations"
              />
              <SettingsNavButton
                active={activeSection === 'rules'}
                onClick={() => setActiveSection('rules')}
                icon={<Wand2 className="h-4 w-4" />}
                label="Manage Rules"
              />
              <SettingsNavButton
                active={activeSection === 'demo'}
                onClick={() => setActiveSection('demo')}
                icon={<Settings2 className="h-4 w-4" />}
                label="Manage Demo"
              />
            </nav>
          </div>

          {/* Settings Panel */}
          <div className="md:col-span-2">
            {activeSection === 'rules' ? (
              <Card className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Manage Rules
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Create and edit presentation rules that control how menu items appear across devices and dayparts.
                  </p>
                  <Button
                    onClick={() => {
                      onClose();
                      onOpenRules?.();
                    }}
                    className="flex items-center gap-2 text-white"
                    style={{ backgroundColor: 'rgb(0, 173, 240)' }}
                  >
                    <Wand2 className="h-4 w-4" />
                    Open Rule Builder
                  </Button>
                </CardContent>
              </Card>
            ) : activeSection === 'demo' ? (
              <ManageDemoSection devices={devices} />
            ) : (
              <Card className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                    Integration Settings
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <Label className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          checked={integrationSettings.enabled}
                          onChange={(e) =>
                            setIntegrationSettings({
                              ...integrationSettings,
                              enabled: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Enable Webtrition Integration
                        </span>
                      </Label>
                    </div>

                    {integrationSettings.enabled && (
                      <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <Label htmlFor="businessUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Business Unit
                          </Label>
                          <Input
                            id="businessUnit"
                            type="text"
                            value={integrationSettings.businessUnit}
                            onChange={(e) =>
                              setIntegrationSettings({ ...integrationSettings, businessUnit: e.target.value })
                            }
                            placeholder="Enter business unit"
                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Location
                          </Label>
                          <Input
                            id="location"
                            type="text"
                            value={integrationSettings.location}
                            onChange={(e) =>
                              setIntegrationSettings({ ...integrationSettings, location: e.target.value })
                            }
                            placeholder="Enter location"
                            className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Database className="h-4 w-4" />
                            <span>Webtrition</span>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/50 rounded-full">
                            Connected
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-50 hover:dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      {label}
    </Button>
  );
}

// --- Manage Demo Section ---

function ManageDemoSection({ devices }: { devices: Device[] }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stationPatterns, setStationPatterns] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedBrand, setExpandedBrand] = useState<number | null>(null);
  const [newPatternText, setNewPatternText] = useState<Record<number, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [b, sp] = await Promise.all([api.getBrands(), api.getBrandStationPatterns()]);
    setBrands(b);
    setStationPatterns(sp);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPattern = async (brandId: number) => {
    const pattern = (newPatternText[brandId] || '').trim();
    if (!pattern) return;
    if (await api.addBrandStationPattern(brandId, pattern)) {
      setNewPatternText((prev) => ({ ...prev, [brandId]: '' }));
      await loadData();
    }
  };

  const handleRemovePattern = async (brandId: number, pattern: string) => {
    if (await api.removeBrandStationPattern(brandId, pattern)) {
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-[rgb(0,173,240)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brands and Meal Stations */}
      <Card className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="h-5 w-5 text-[rgb(0,173,240)]" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Brands & Meal Stations</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            View all brands and manage which meal station patterns each brand maps to.
          </p>

          <div className="space-y-2">
            {brands.map((brand) => {
              const patterns = stationPatterns[brand.id] || [];
              const isExpanded = expandedBrand === brand.id;
              return (
                <div
                  key={brand.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedBrand(isExpanded ? null : brand.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <BrandAvatar brand={brand} size="sm" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 text-left">{brand.displayName}</span>
                    <Badge variant="secondary" className="text-xs">{patterns.length} stations</Badge>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {patterns.length === 0 ? (
                          <p className="text-xs text-gray-400 italic mb-2">No station patterns assigned</p>
                        ) : (
                          patterns.map((p, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                            >
                              {p}
                              <button
                                onClick={() => handleRemovePattern(brand.id, p)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Input
                          placeholder="Add station pattern (e.g. grill - hot sandwiches)"
                          value={newPatternText[brand.id] || ''}
                          onChange={(e) => setNewPatternText((prev) => ({ ...prev, [brand.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPattern(brand.id)}
                          className="text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddPattern(brand.id)}
                          className="bg-[rgb(0,173,240)] hover:bg-[rgb(0,153,220)] text-white text-xs gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Suggested Group Templates */}
      <Card className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="h-5 w-5 text-[rgb(0,173,240)]" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Suggested Group Templates</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            These templates appear when creating a new group. Each template pre-fills with relevant brands.
          </p>

          <div className="space-y-3">
            {SUGGESTED_GROUP_TEMPLATES.map((template) => {
              const matchedBrands = brands.filter((b) => template.brandKeys.includes(b.key));
              return (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{template.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">{matchedBrands.length} brands</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {matchedBrands.map((b) => {
                      return (
                        <div
                          key={b.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                          title={b.displayName}
                        >
                          <BrandAvatar brand={b} size="sm" />
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 max-w-[70px] truncate">{b.displayName}</span>
                        </div>
                      );
                    })}
                    {matchedBrands.length === 0 && (
                      <span className="text-xs text-gray-400 italic">No matching brands in database</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Devices Overview */}
      <Card className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Monitor className="h-5 w-5 text-[rgb(0,173,240)]" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Demo Devices</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Devices available for assignment to groups in this demo.
          </p>

          {devices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No devices loaded</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="h-8 w-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                    <Monitor className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{d.name}</span>
                    <span className="text-xs text-gray-400 truncate block">{d.location} · {d.labelSize}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
