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
      className={`flex-shrink-0 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-slate-700/80 ring-2 ring-cyan-500/50'
          : 'bg-slate-700/50 hover:bg-slate-700/70'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`${iconColor} p-1.5 rounded-md`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="text-xs font-semibold text-slate-300">{title}</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-white leading-none">{count}</span>
            <span className="text-[10px] text-slate-400">{subtitle}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
