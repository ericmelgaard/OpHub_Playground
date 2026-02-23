import React from 'react';
import { Monitor, Package, Users, Image, Globe, Activity, Settings } from 'lucide-react';
import { QuickActionCard } from './QuickActionCard';
import { Button } from './ui/button';
import { Device, MenuItem } from '../types';

export type QuickActionType = 'smart-labels' | 'products' | 'groups' | 'signage' | 'webview' | 'activity';

interface QuickActionBarProps {
  selectedAction: QuickActionType;
  onActionSelect: (action: QuickActionType) => void;
  devices: Device[];
  menuItems: MenuItem[];
  onCustomize: () => void;
}

export function QuickActionBar({
  selectedAction,
  onActionSelect,
  devices,
  menuItems,
  onCustomize
}: QuickActionBarProps) {
  const activeDevicesCount = devices.filter(d => d.status === 'online').length;
  const activeProductsCount = menuItems.length;

  const actions = [
    {
      id: 'smart-labels' as QuickActionType,
      icon: Monitor,
      title: 'Smart Labels',
      count: devices.length,
      subtitle: `${activeDevicesCount} online`
    },
    {
      id: 'products' as QuickActionType,
      icon: Package,
      title: 'Products',
      count: menuItems.length,
      subtitle: `${activeProductsCount} active`
    },
    {
      id: 'groups' as QuickActionType,
      icon: Users,
      title: 'Groups',
      count: 0,
      subtitle: 'In progress'
    },
    {
      id: 'signage' as QuickActionType,
      icon: Image,
      title: 'Signage',
      count: 0,
      subtitle: 'Coming soon'
    },
    {
      id: 'webview' as QuickActionType,
      icon: Globe,
      title: 'Webview Kiosks',
      count: 0,
      subtitle: 'Coming soon'
    },
    {
      id: 'activity' as QuickActionType,
      icon: Activity,
      title: 'Activity',
      count: 0,
      subtitle: 'Coming soon'
    }
  ];

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-850 border-b border-gray-800 px-6 py-6">
      <div className="flex items-center gap-4 max-w-7xl mx-auto">
        <div className="flex-1 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {actions.map((action) => (
            <QuickActionCard
              key={action.id}
              icon={action.icon}
              title={action.title}
              count={action.count}
              subtitle={action.subtitle}
              isActive={selectedAction === action.id}
              onClick={() => onActionSelect(action.id)}
            />
          ))}
        </div>
        <Button
          onClick={onCustomize}
          className="flex-shrink-0 bg-gray-800 hover:bg-gray-750 text-gray-300 border border-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 mr-2" />
          Customize
        </Button>
      </div>
    </div>
  );
}
