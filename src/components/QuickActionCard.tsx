import type { ComponentType } from 'react';

interface QuickActionCardProps {
  icon: ComponentType<{ className?: string }>;
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
      className={`flex-shrink-0 rounded-lg px-4 py-3 min-w-[140px] shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group ${
        isActive
          ? 'bg-sky-50 dark:bg-sky-900/30 border-2 border-sky-500 dark:border-sky-400 ring-2 ring-sky-100 dark:ring-sky-900/50'
          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
      }`}
      aria-label={`View ${title.toLowerCase()}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 group-hover:scale-110 transition-transform ${iconColor}`} />
        <span className={`text-xs font-semibold transition-colors ${
          isActive
            ? 'text-sky-700 dark:text-sky-300'
            : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100'
        }`}>
          {title}
        </span>
      </div>
      <p className={`text-2xl font-bold transition-colors ${
        isActive
          ? 'text-sky-900 dark:text-sky-100'
          : 'text-slate-900 dark:text-slate-100'
      }`}>{count}</p>
      <p className={`text-xs transition-colors ${
        isActive
          ? 'text-sky-600 dark:text-sky-400'
          : 'text-slate-500 dark:text-slate-400'
      }`}>{subtitle}</p>
    </button>
  );
}
