// Single source of location-level icon colors (see CLAUDE.md). Icons only — never
// names or rows. Emphasis follows how often a level is overridden: store is the
// lowest override level (most prominent), concept is the least used (most passive).
// Class strings are written out in full so Tailwind can find them.
// Placement and station are the same thing (MapPin) and share one color.
export type LocationLevel = 'concept' | 'company' | 'store' | 'placement';

const LEVEL_ICON_COLORS: Record<LocationLevel, string> = {
  concept: 'text-gray-400 dark:text-gray-500',
  company: 'text-brand',
  store: 'text-orange-500 dark:text-orange-400',
  placement: 'text-lime-600 dark:text-lime-400',
};

export function levelIconColor(level: LocationLevel): string {
  return LEVEL_ICON_COLORS[level];
}
