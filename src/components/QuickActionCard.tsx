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
  iconColor = 'text-orange-500'
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-3 min-w-[140px] shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
      aria-label={`View ${title.toLowerCase()}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 group-hover:scale-110 transition-transform ${iconColor}`} />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
          {title}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </button>
  );
}
