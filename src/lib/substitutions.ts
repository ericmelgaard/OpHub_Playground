import { MenuItem, Substitution, SubstitutionKey, ResolvedItem } from '../types';

export function buildSubstitutionMap(substitutions: Substitution[]): Map<SubstitutionKey, Substitution> {
  const map = new Map<SubstitutionKey, Substitution>();
  for (const sub of substitutions) {
    const key: SubstitutionKey = `${sub.pageId}:${sub.originalItemId}:${sub.dayOfWeek}`;
    map.set(key, sub);
  }
  return map;
}

export function resolveItemsForDay(
  itemOrder: number[],
  assignedItems: MenuItem[],
  pageId: string,
  dayOfWeek: number | null,
  substitutionMap: Map<SubstitutionKey, Substitution>,
): ResolvedItem[] {
  return itemOrder
    .map(itemId => {
      const originalItem = assignedItems.find(i => i.id === itemId);
      if (!originalItem) return null;

      if (dayOfWeek !== null) {
        const key: SubstitutionKey = `${pageId}:${itemId}:${dayOfWeek}`;
        const sub = substitutionMap.get(key);
        if (sub) {
          return {
            item: sub.substituteItem,
            isSubstituted: true,
            substitution: sub,
            originalItem,
            originalItemId: itemId,
          };
        }
      }

      return {
        item: originalItem,
        isSubstituted: false,
        originalItemId: itemId,
      };
    })
    .filter((r): r is ResolvedItem => r !== null);
}

export function hasSubstitutionOnAnyDay(
  pageId: string,
  itemId: number,
  substitutionMap: Map<SubstitutionKey, Substitution>,
): boolean {
  for (let d = 0; d < 7; d++) {
    const key: SubstitutionKey = `${pageId}:${itemId}:${d}`;
    if (substitutionMap.has(key)) return true;
  }
  return false;
}
