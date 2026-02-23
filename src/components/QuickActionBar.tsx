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
      subtitle: `${activeDevicesCount} online`,
      iconColor: 'bg-orange-500'
    },
    {
      id: 'groups' as QuickActionType,
      icon: Users,
      title: 'Groups',
      count: 1,
      subtitle: 'placement groups',
      iconColor: 'bg-cyan-500'
    },
    {
      id: 'signage' as QuickActionType,
      icon: Image,
      title: 'Signage',
      count: 0,
      subtitle: '0 online',
      iconColor: 'bg-blue-500'
    },
    {
      id: 'products' as QuickActionType,
      icon: Package,
      title: 'Products',
      count: menuItems.length,
      subtitle: `${activeProductsCount} active`,
      iconColor: 'bg-emerald-500'
    },
    {
      id: 'webview' as QuickActionType,
      icon: Globe,
      title: 'Webview Kiosks',
      count: 0,
      subtitle: '0 online',
      iconColor: 'bg-purple-500'
    },
    {
      id: 'activity' as QuickActionType,
      icon: Activity,
      title: 'Activity',
      count: 0,
      subtitle: 'recent actions',
      iconColor: 'bg-pink-500'
    }
  ];

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <QuickActionCard
            key={action.id}
            icon={action.icon}
            title={action.title}
            count={action.count}
            subtitle={action.subtitle}
            isActive={selectedAction === action.id}
            onClick={() => onActionSelect(action.id)}
            iconColor={action.iconColor}
          />
        ))}
        <button
          onClick={onCustomize}
          className="flex-shrink-0 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs font-semibold">Customize</span>
        </button>
      </div>
    </div>
  );
}
