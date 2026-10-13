// Single source of location-level icon colors (see CLAUDE.md). Icons only — never
// names or rows. Store is the lowest override level (most prominent). Concept is the
// most passive; its gray icon is a placeholder for a future brand-specific icon.
// Class strings are written out in full so Tailwind can find them.
// Placement and station are the same thing (MapPin) and share one color.
export type LocationLevel = 'concept' | 'company' | 'store' | 'placement';

const LEVEL_ICON_COLORS: Record<LocationLevel, string> = {
  concept: 'text-gray-400 dark:text-gray-500',
  company: 'text-brand',
  store: 'text-brand-magenta dark:text-brand-magenta-light',
  placement: 'text-lime-600 dark:text-lime-400',
};

export function levelIconColor(level: LocationLevel): string {
  return LEVEL_ICON_COLORS[level];
}
