import React, { useState } from 'react';
import { Database, ArrowLeft, Wand2 } from 'lucide-react';
import { IntegrationSettings, Theme } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SettingsPageProps {
  onClose: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  integrationSettings: IntegrationSettings;
  setIntegrationSettings: (settings: IntegrationSettings) => void;
  onOpenRules?: () => void;
}

export function SettingsPage({
  onClose,
  theme,
  setTheme,
  integrationSettings,
  setIntegrationSettings,
  onOpenRules,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<'integrations' | 'rules'>('integrations');

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50">
      {/* Header */}
      <div className="border-b dark:border-gray-700">
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
              <Button
                variant={activeSection === 'integrations' ? 'secondary' : 'ghost'}
                onClick={() => setActiveSection('integrations')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                  activeSection === 'integrations'
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-50 hover:dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Database className="h-4 w-4" />
                Integrations
              </Button>
              <Button
                variant={activeSection === 'rules' ? 'secondary' : 'ghost'}
                onClick={() => setActiveSection('rules')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                  activeSection === 'rules'
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-50 hover:dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Wand2 className="h-4 w-4" />
                Manage Rules
              </Button>
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
            ) : (
            <Card className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
              <CardContent className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Integration Settings
                </h2>

                <div className="space-y-6">
                  {/* Enable/Disable Integration */}
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
                      {/* Business Unit */}
                      <div>
                        <Label
                          htmlFor="businessUnit"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Business Unit
                        </Label>
                        <Input
                          id="businessUnit"
                          type="text"
                          value={integrationSettings.businessUnit}
                          onChange={(e) =>
                            setIntegrationSettings({
                              ...integrationSettings,
                              businessUnit: e.target.value,
                            })
                          }
                          placeholder="Enter business unit"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <Label
                          htmlFor="location"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Location
                        </Label>
                        <Input
                          id="location"
                          type="text"
                          value={integrationSettings.location}
                          onChange={(e) =>
                            setIntegrationSettings({
                              ...integrationSettings,
                              location: e.target.value,
                            })
                          }
                          placeholder="Enter location"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      {/* Status */}
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
