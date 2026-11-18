import { createContext, useContext } from 'react';
import { WEEK_ORDER } from './weekSchedule';

// Settings for the site (see Site settings). Stored in site_settings as jsonb, so new settings
// are added here with a default and need no migration.
export interface SiteSettings {
  // Days the business is open (JS getDay() numbers). Empty slots on closed days aren't warnings;
  // closed days can still be edited and filled.
  openDays: number[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  openDays: [...WEEK_ORDER],
};

// One demo site for now; becomes the selected store when location selection is wired in
export const SITE_ID = 'default';

// Fill in defaults for anything missing or malformed in a stored row
export function withDefaults(stored: unknown): SiteSettings {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<SiteSettings>;
  const openDays = Array.isArray(s.openDays)
    ? WEEK_ORDER.filter(d => s.openDays!.includes(d))
    : DEFAULT_SITE_SETTINGS.openDays;
  return { ...DEFAULT_SITE_SETTINGS, ...s, openDays };
}

export const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SITE_SETTINGS);

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}

// The open days, in week order
export function useOpenDays(): number[] {
  return useSiteSettings().openDays;
}
