// Single source of daypart colors (see CLAUDE.md). Class strings are written out
// in full so Tailwind can find them.
export interface DaypartColor {
  text: string;     // daypart name / icon
  solid: string;    // filled dot, bar, or selected pill
  dot: string;      // softer accent strip
  ring: string;
  softBg: string;   // tinted header / panel
  border: string;
  chip: string;     // soft badge: bg + text + border
  hex: string;      // for inline styles (SVG, dynamic widths)
}

const DAYPART_COLORS: Record<string, DaypartColor> = {
  Breakfast: {
    text: 'text-amber-600 dark:text-amber-400',
    solid: 'bg-amber-500',
    dot: 'bg-amber-400',
    ring: 'ring-amber-400',
    softBg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    chip: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    hex: '#F59E0B',
  },
  Lunch: {
    text: 'text-emerald-600 dark:text-emerald-400',
    solid: 'bg-emerald-500',
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-400',
    softBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-300 dark:border-emerald-700',
    chip: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    hex: '#10B981',
  },
  Dinner: {
    text: 'text-blue-600 dark:text-blue-400',
    solid: 'bg-blue-500',
    dot: 'bg-blue-400',
    ring: 'ring-blue-400',
    softBg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    chip: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    hex: '#3B82F6',
  },
  'Late Night': {
    text: 'text-violet-600 dark:text-violet-400',
    solid: 'bg-violet-500',
    dot: 'bg-violet-400',
    ring: 'ring-violet-400',
    softBg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-300 dark:border-violet-700',
    chip: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    hex: '#8B5CF6',
  },
};

// All Day, Custom, and anything unknown
const NEUTRAL: DaypartColor = {
  text: 'text-gray-600 dark:text-gray-400',
  solid: 'bg-gray-500',
  dot: 'bg-gray-400',
  ring: 'ring-gray-400',
  softBg: 'bg-gray-50 dark:bg-gray-900/20',
  border: 'border-gray-300 dark:border-gray-600',
  chip: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  hex: '#6B7280',
};

const BY_LOWER = Object.fromEntries(
  Object.entries(DAYPART_COLORS).map(([k, v]) => [k.toLowerCase(), v])
);

export const daypartColor = (daypart: string | null | undefined): DaypartColor =>
  (daypart && BY_LOWER[daypart.toLowerCase()]) || NEUTRAL;
