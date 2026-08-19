import { useMemo } from 'react';
import {
  X,
  Check,
  Settings,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickActionConfig, QuickActionType } from './QuickActionBar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  quickActionConfigs: QuickActionConfig[];
  selectedQuickAction: QuickActionType;
  onActionSelect: (action: QuickActionType) => void;
}

export function Sidebar({
  isOpen,
  onClose,
  onOpenSettings,
  quickActionConfigs,
  selectedQuickAction,
  onActionSelect,
}: SidebarProps) {
  const allActions = useMemo(
    () => [...quickActionConfigs].sort((a, b) => a.order - b.order),
    [quickActionConfigs],
  );

  const handleActionClick = (actionId: QuickActionType) => {
    onActionSelect(actionId);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-20 flex transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="w-80 flex flex-col bg-white dark:bg-gray-800 border-r dark:border-gray-700">
          {/* WAND Digital Brand Header */}
          <div className="px-6 pt-6 pb-5 border-b dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-700 max-w-[180px]">
                  <img
                    src="/wand-digital-41-years-and-counting_(1).png"
                    alt="WAND Digital"
                    className="block w-full h-auto"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0 -mt-1 -mr-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                Operator Hub
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                WAND Digital operations workspace
              </p>
            </div>
          </div>

          {/* Action Fallback List — all actions including hidden ones */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-2">
                All Pages
              </p>
            </div>
            <div className="px-4 space-y-1">
              {allActions.map((action) => {
                const Icon = action.icon;
                const isActive = selectedQuickAction === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={isActive ? { backgroundColor: 'rgb(0, 173, 240)' } : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{action.name}</span>
                    {!action.visible && (
                      <EyeOff className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                    {isActive && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer: Version + Settings */}
          <div className="border-t dark:border-gray-700 p-4 space-y-3">
            <p className="text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500 px-1">
              v0.0.0
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full flex justify-start gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={onClose}
        />
      )}
    </>
  );
}
