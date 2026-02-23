import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';

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
    <Card
      className={`flex-shrink-0 w-[160px] p-4 cursor-pointer transition-all hover:shadow-md ${
        isActive
          ? 'bg-blue-50 border-blue-500 border-2'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center space-y-2">
        <Icon className={`w-8 h-8 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
        <div>
          <div className={`text-2xl font-bold ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
            {count}
          </div>
          <div className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
            {title}
          </div>
          <div className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
            {subtitle}
          </div>
        </div>
      </div>
    </Card>
  );
}
