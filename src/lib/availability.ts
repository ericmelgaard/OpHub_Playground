import { MenuItem } from '../types';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function isItemActiveForDaypart(item: MenuItem, daypart: string, currentDayOfWeek?: number): boolean {
  const today = currentDayOfWeek ?? new Date().getDay();

  if (!item.activeDays || item.activeDays.length === 0) {
    return true;
  }

  const isDayActive = item.activeDays.includes(today);

  if (!isDayActive) {
    return false;
  }

  if (daypart === 'Custom' || daypart === 'All Day') {
    return true;
  }

  if (!item.activeMealPeriods || item.activeMealPeriods.length === 0) {
    return true;
  }

  const normalizedDaypart = daypart.toLowerCase().trim();
  const hasMatchingMealPeriod = item.activeMealPeriods.some(
    mp => mp.toLowerCase().trim() === normalizedDaypart
  );

  return hasMatchingMealPeriod;
}

export function getActiveDaysDisplay(activeDays: number[]): string {
  if (!activeDays || activeDays.length === 0) {
    return 'No data';
  }

  if (activeDays.length === 7) {
    return 'Every day';
  }

  const weekdays = [1, 2, 3, 4, 5];
  const weekends = [0, 6];

  const hasAllWeekdays = weekdays.every(day => activeDays.includes(day));
  const hasAllWeekends = weekends.every(day => activeDays.includes(day));

  if (hasAllWeekdays && !hasAllWeekends) {
    return 'Weekdays';
  }

  if (hasAllWeekends && !hasAllWeekdays) {
    return 'Weekends';
  }

  return activeDays.map(day => DAY_ABBR[day]).join(', ');
}

export function getDayOfWeekBadgeColor(dayOfWeek: number, isActive: boolean): string {
  if (!isActive) {
    return 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
  }

  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
}
