import React from 'react';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  count: number;
  subtitle: string;
  isActive: boolean;
  onClick: () => void;
}

export function QuickActionCard({
  icon: Icon,
  title,
  count,
  subtitle,
  isActive,
  onClick
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-[160px] p-5 rounded-xl cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/50 scale-105'
          : 'bg-gray-800 hover:bg-gray-750 shadow-md hover:shadow-lg'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <Icon className={`w-10 h-10 ${isActive ? 'text-white' : 'text-gray-400'}`} />
        <div className="space-y-1">
          <div className={`text-3xl font-bold ${isActive ? 'text-white' : 'text-gray-200'}`}>
            {count}
          </div>
          <div className={`text-sm font-medium ${isActive ? 'text-blue-100' : 'text-gray-300'}`}>
            {title}
          </div>
          <div className={`text-xs ${isActive ? 'text-blue-200' : 'text-gray-500'}`}>
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  );
}
