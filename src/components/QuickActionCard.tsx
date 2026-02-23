import React from 'react';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  count: number;
  subtitle: string;
  isActive: boolean;
  onClick: () => void;
  iconColor?: string;
}

export function QuickActionCard({
  icon: Icon,
  title,
  count,
  subtitle,
  isActive,
  onClick,
  iconColor = 'bg-orange-500'
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-slate-700/80 ring-2 ring-cyan-500/50'
          : 'bg-slate-700/50 hover:bg-slate-700/70'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`${iconColor} p-2 rounded-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-300">{title}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold text-white">{count}</span>
            <span className="text-xs text-slate-400">{subtitle}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
