import React from 'react';
import { Monitor, Package, Layers, Tv, Globe, Activity, PenLine, Tag } from 'lucide-react';
import { QuickActionCard } from './QuickActionCard';
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
      id: 'groups' as QuickActionType,
      icon: Layers,
      title: 'Groups',
      count: 2,
      subtitle: 'placement groups',
      iconColor: 'text-cyan-500'
    },
    {
      id: 'signage' as QuickActionType,
      icon: Tv,
      title: 'Signage',
      count: 9,
      subtitle: '4 online',
      iconColor: 'text-blue-500'
    },
    {
      id: 'products' as QuickActionType,
      icon: Package,
      title: 'Products',
      count: 0,
      subtitle: '0 active',
      iconColor: 'text-emerald-500'
    },
    {
      id: 'webview' as QuickActionType,
      icon: Globe,
      title: 'Webview Kiosks',
      count: 0,
      subtitle: '0 online',
      iconColor: 'text-violet-500'
    },
    {
      id: 'smart-labels' as QuickActionType,
      icon: Tag,
      title: 'Smart Labels',
      count: 0,
      subtitle: '0 online',
      iconColor: 'text-amber-500'
    },
    {
      id: 'activity' as QuickActionType,
      icon: Activity,
      title: 'Activity',
      count: 0,
      subtitle: 'recent actions',
      iconColor: 'text-violet-500'
    }
  ];

  return (
    <div className="px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar bg-white dark:bg-slate-800 max-h-[180px] md:max-h-none">
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
        className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 cursor-pointer group flex items-center justify-center"
        aria-label="Customize quick actions"
      >
        <div className="flex flex-col items-center gap-2">
          <PenLine className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">
            Customize
          </span>
        </div>
      </button>
    </div>
  );
}
