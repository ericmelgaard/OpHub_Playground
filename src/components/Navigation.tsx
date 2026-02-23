import React, { useState } from 'react';
import {
  Bell,
  Settings,
  Plus,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  CheckCircle,
  Package,
  Monitor,
  Tag,
  Tv,
  Receipt,
  Wand2,
  MapPin,
} from 'lucide-react';
import { Theme } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NavigationProps {
  notifications: number;
  setNotifications: (count: number) => void;
  onCreateItem: () => void;
  onCreateRule: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onMenuClick: () => void;
  selectedPage?: 'products' | 'devices' | 'channels';
  selectedChannel?: string | null;
  selectedLocation?: {
    concept?: string;
    company?: string;
    store?: string;
  };
}

const CHANNEL_INFO = {
  'shelf-labels': { name: 'Smart Labels', icon: Tag },
  'digital-signage': { name: 'Signage', icon: Tv },
  'order-confirmation': { name: 'Order Confirmation', icon: Receipt },
};

const PAGE_INFO = {
  products: { name: 'Operator Hub', icon: Package },
  devices: { name: 'Devices', icon: Monitor },
  channels: { name: 'Channels', icon: Tag },
};

export function Navigation({
  notifications,
  setNotifications,
  onCreateItem,
  onCreateRule,
  theme,
  setTheme,
  onMenuClick,
  selectedPage,
  selectedChannel,
  selectedLocation,
}: NavigationProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [showDismissAllConfirm, setShowDismissAllConfirm] = useState(false);

  const themeOptions = [
    { value: 'light', label: 'Light Mode', icon: Sun },
    { value: 'dark', label: 'Dark Mode', icon: Moon },
    { value: 'system', label: 'System Theme', icon: Laptop },
  ] as const;

  const currentThemeIcon =
    themeOptions.find((option) => option.value === theme)?.icon || Sun;

  // Get the current context (page/channel) for display
  const getCurrentContext = () => {
    if (!selectedPage) return null;

    const pageInfo = PAGE_INFO[selectedPage];
    const PageIcon = pageInfo.icon;

    if (selectedPage === 'channels' && selectedChannel) {
      const channelInfo = CHANNEL_INFO[selectedChannel];
      const ChannelIcon = channelInfo.icon;
      
      return (
        <div className="flex items-center gap-2">
          <ChannelIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {channelInfo.name}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <PageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        <span className="font-medium text-indigo-600 dark:text-indigo-400">
          {pageInfo.name}
        </span>
      </div>
    );
  };

  // Get the current location name (only the last selected level)
  const getCurrentLocation = () => {
    if (!selectedLocation) return null;
    return selectedLocation.store || selectedLocation.company || selectedLocation.concept || null;
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm fixed w-full z-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </Button>
            
            <div className="hidden sm:flex items-center gap-4">
              {getCurrentContext()}
              {getCurrentLocation() && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getCurrentLocation()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-6">
            <div className="flex items-center gap-2 sm:gap-4">
              {selectedPage !== 'devices' && (
                <Button
                  variant="secondary"
                  onClick={onCreateRule}
                  className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition-colors"
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Manage Rules</span>
                </Button>
              )}
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            <div className="relative">
              <Button
                variant="ghost"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              >
                <Bell
                  className={`h-6 w-6 ${
                    notifications > 0
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                />
                {notifications > 0 && (
                  <Badge
                    variant="default"
                    className="absolute top-0 right-0 h-4 w-4 rounded-full bg-amber-500 text-xs text-white text-center"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>

              {showNotificationsMenu && notifications > 0 && (
                <Card className="fixed sm:absolute right-0 sm:right-0 mt-2 w-full sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Notifications
                      </h3>
                      {notifications > 0 && !showDismissAllConfirm && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNotifications(0);
                            setShowDismissAllConfirm(true);
                            setTimeout(() => setShowDismissAllConfirm(false), 2000);
                          }}
                          className="px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        >
                          Dismiss All
                        </Button>
                      )}
                      {showDismissAllConfirm && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            All Dismissed
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              >
                {React.createElement(currentThemeIcon, {
                  className: 'h-6 w-6 text-gray-600 dark:text-gray-300',
                })}
              </Button>

              {showSettingsMenu && (
                <Card className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-2">
                    <div className="px-3 py-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Theme
                      </h3>
                    </div>
                    <div className="mt-1">
                      {themeOptions.map(({ value, label, icon: Icon }) => (
                        <Button
                          key={value}
                          variant={theme === value ? 'secondary' : 'ghost'}
                          onClick={() => {
                            setTheme(value as Theme);
                            setShowSettingsMenu(false);
                          }}
                          className={`flex justify-start gap-2 w-full px-3 py-2 text-sm rounded-md ${
                            theme === value
                              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 hover:bg-indigo-50 hover:dark:bg-indigo-900/50'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}