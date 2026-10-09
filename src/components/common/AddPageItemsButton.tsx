import React from 'react';
import { Plus, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AddPageItemsButtonProps {
  onAddItems: () => void;
  className?: string;
  isLoading?: boolean;
  wasRecentlyAdded?: boolean;
  duplicateCount?: number;
}

export function AddPageItemsButton({
  onAddItems,
  className = '',
  isLoading = false,
  wasRecentlyAdded = false,
  duplicateCount = 0,
}: AddPageItemsButtonProps) {
  return (
    <Button
      variant={
        wasRecentlyAdded ? (duplicateCount > 0 ? 'warning' : 'success') : 'info'
      }
      className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        wasRecentlyAdded
          ? duplicateCount > 0
            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/70'
            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/70'
          : isLoading
          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          : 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/50 hover:bg-sky-100 dark:hover:bg-sky-900/70'
      } ${className}`}
      onClick={onAddItems}
      disabled={isLoading}
    >
      {wasRecentlyAdded ? (
        <>
          {duplicateCount > 0 ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              {duplicateCount === 1
                ? '1 duplicate item ignored'
                : `${duplicateCount} duplicate items ignored`}
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Added Successfully
            </>
          )}
        </>
      ) : isLoading ? (
        <div className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Adding...
        </div>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-2" />
          Add Menu Items
        </>
      )}
    </Button>
  );
}
