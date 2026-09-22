import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageActionBarProps {
  onQuickAdd: () => void;
  onClearPage: () => void;
  hasItems: boolean;
  canQuickAdd: boolean;
}

export function PageActionBar({ onQuickAdd, onClearPage, hasItems, canQuickAdd }: PageActionBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 flex-shrink-0">
      {canQuickAdd && (
        <Button
          variant="outline"
          size="sm"
          onClick={onQuickAdd}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs h-8 border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Quick Add
        </Button>
      )}
      {hasItems && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearPage}
          className="flex items-center gap-1.5 text-xs h-8 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
