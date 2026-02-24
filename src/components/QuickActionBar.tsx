import React from 'react';
import { Monitor, Package, Layers, Tv, Globe, Activity, PenLine, Tag } from 'lucide-react';
import { QuickActionCard } from './QuickActionCard';
import { Device, MenuItem } from '../types';

export type QuickActionType = 'smart-labels' | 'products' | 'groups' | 'signage' | 'webview' | 'activity';

export interface QuickActionConfig {
  id: QuickActionType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  iconColor: string;
  visible: boolean;
  order: number;
}

interface QuickActionBarProps {
  selectedAction: QuickActionType;
  onActionSelect: (action: QuickActionType) => void;
  devices: Device[];
  menuItems: MenuItem[];
  onCustomize: () => void;
  actionConfigs?: QuickActionConfig[];
}

export function QuickActionBar({
  selectedAction,
  onActionSelect,
  devices,
  menuItems,
  onCustomize,
  actionConfigs
}: QuickActionBarProps) {
  const onlineDevicesCount = devices.filter(d => d.status.wifiStrength > 0).length;
  const totalDevicesCount = devices.length;

  const getActionData = (id: QuickActionType) => {
    switch (id) {
      case 'groups':
        return { count: 2, subtitle: 'placement groups' };
      case 'signage':
        return { count: 9, subtitle: '4 online' };
      case 'products':
        return { count: menuItems.length, subtitle: `${menuItems.length} active` };
      case 'webview':
        return { count: 0, subtitle: '0 online' };
      case 'smart-labels':
        return { count: totalDevicesCount, subtitle: `${onlineDevicesCount} online` };
      case 'activity':
        return { count: 0, subtitle: 'recent actions' };
    }
  };

  const visibleActions = actionConfigs
    ? actionConfigs.filter(a => a.visible).sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar bg-white dark:bg-slate-800 max-h-[180px] md:max-h-none">
      {visibleActions.map((action) => {
        const data = getActionData(action.id);
        return (
          <QuickActionCard
            key={action.id}
            icon={action.icon}
            title={action.name}
            count={data.count}
            subtitle={data.subtitle}
            isActive={selectedAction === action.id}
            onClick={() => onActionSelect(action.id)}
            iconColor={action.iconColor}
          />
        );
      })}
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
