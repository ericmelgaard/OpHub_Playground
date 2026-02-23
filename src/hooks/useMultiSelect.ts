import { useState, useCallback } from 'react';
import { MenuItem } from '../types';

export function useMultiSelect() {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const toggleSelection = useCallback((item: MenuItem) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const getSelectedItems = useCallback((items: MenuItem[]) => {
    return items.filter(item => selectedItems.has(item.id));
  }, [selectedItems]);

  return {
    selectedItems,
    toggleSelection,
    clearSelection,
    getSelectedItems,
    isSelected: (item: MenuItem) => selectedItems.has(item.id)
  };
}