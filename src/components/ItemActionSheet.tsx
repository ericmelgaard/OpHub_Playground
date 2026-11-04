import React, { useEffect, useRef } from 'react';
import { ArrowLeftRight, Trash2, X, Undo2, RefreshCw } from 'lucide-react';
import { ResolvedItem } from '../types';
import { labelName } from '../lib/labelDisplay';

interface ItemActionSheetProps {
  resolvedItem: ResolvedItem;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  onSubstitute: () => void;
  onEndSubstitution: () => void;
  onRemove: () => void;
  canSubstitute: boolean;
}

export function ItemActionSheet({
  resolvedItem,
  anchorRect,
  isOpen,
  onClose,
  onSubstitute,
  onEndSubstitution,
  onRemove,
  canSubstitute,
}: ItemActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('touchstart', handle);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDesktop = window.innerWidth >= 1024;
  const { isSubstituted } = resolvedItem;
  const itemName = resolvedItem.item.name;

  if (isDesktop && anchorRect) {
    const top = anchorRect.bottom + 6;
    const left = Math.max(8, anchorRect.left);
    return (
      <div className="fixed inset-0 z-[70]">
        <div
          ref={sheetRef}
          style={{ top, left, minWidth: 220 }}
          className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{itemName}</p>
            {isSubstituted && resolvedItem.originalItem && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Substituting {labelName(resolvedItem.originalItem)}</p>
            )}
          </div>
          <div className="py-1">
            {isSubstituted ? (
              <>
                <ActionButton icon={<Undo2 className="h-4 w-4" />} label="End Substitution" onClick={onEndSubstitution} variant="amber" />
                <ActionButton icon={<RefreshCw className="h-4 w-4" />} label="Re-substitute" onClick={onSubstitute} disabled={!canSubstitute} />
              </>
            ) : (
              <>
                <ActionButton icon={<ArrowLeftRight className="h-4 w-4" />} label="Substitute" onClick={onSubstitute} disabled={!canSubstitute} variant="primary" />
                {!canSubstitute && (
                  <p className="px-3 py-1 text-[10px] text-gray-400 dark:text-gray-500">Select a specific day first</p>
                )}
              </>
            )}
            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
            <ActionButton icon={<Trash2 className="h-4 w-4" />} label="Remove from page" onClick={onRemove} variant="danger" />
          </div>
        </div>
      </div>
    );
  }

  // Mobile: bottom sheet
  return (
    <div className="fixed inset-0 z-[70] flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative w-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-200 pb-safe"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{itemName}</p>
              {isSubstituted && resolvedItem.originalItem && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Substituting {labelName(resolvedItem.originalItem)}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="px-2 pb-4 space-y-1">
          {isSubstituted ? (
            <>
              <MobileAction icon={<Undo2 className="h-5 w-5" />} label="End Substitution" subtitle="Restore original item" onClick={onEndSubstitution} variant="amber" />
              <MobileAction icon={<RefreshCw className="h-5 w-5" />} label="Re-substitute" subtitle="Choose a different replacement" onClick={onSubstitute} disabled={!canSubstitute} />
            </>
          ) : (
            <MobileAction
              icon={<ArrowLeftRight className="h-5 w-5" />}
              label="Substitute"
              subtitle={canSubstitute ? 'Replace this item for the selected day' : 'Select a specific day first'}
              onClick={onSubstitute}
              disabled={!canSubstitute}
              variant="primary"
            />
          )}
          <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2" />
          <MobileAction icon={<Trash2 className="h-5 w-5" />} label="Remove from page" onClick={onRemove} variant="danger" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, variant, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; variant?: 'primary' | 'danger' | 'amber'; disabled?: boolean;
}) {
  const colors = variant === 'danger'
    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
    : variant === 'primary'
    ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 font-medium'
    : variant === 'amber'
    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium'
    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${colors} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileAction({ icon, label, subtitle, onClick, variant, disabled }: {
  icon: React.ReactNode; label: string; subtitle?: string; onClick: () => void; variant?: 'primary' | 'danger' | 'amber'; disabled?: boolean;
}) {
  const colors = variant === 'danger'
    ? 'text-red-600 dark:text-red-400'
    : variant === 'primary'
    ? 'text-sky-600 dark:text-sky-400'
    : variant === 'amber'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-700 dark:text-gray-300';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className={colors}>{icon}</div>
      <div className="text-left">
        <p className={`text-sm font-medium ${colors}`}>{label}</p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </button>
  );
}
