export type CookieCategory = "essential" | "analytics" | "functional" | "marketing";

export interface CookiePreferences {
  version: number;
  consentGiven: boolean;
  essential: true;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  timestamp: string;
}

export type CookieCategoryPreferences = Pick<
  CookiePreferences,
  "analytics" | "functional" | "marketing"
>;

const STORAGE_KEY = "peerlearn_cookie_consent";
const CURRENT_VERSION = 1;

const createPreferences = (
  categories: CookieCategoryPreferences,
  consentGiven = true,
): CookiePreferences => ({
  version: CURRENT_VERSION,
  consentGiven,
  essential: true,
  analytics: categories.analytics,
  functional: categories.functional,
  marketing: categories.marketing,
  timestamp: new Date().toISOString(),
});

export const getStoredConsent = (): CookiePreferences | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CookiePreferences;
    if (parsed.version !== CURRENT_VERSION || !parsed.consentGiven) {
      return null;
    }

    return {
      ...parsed,
      essential: true,
    };
  } catch {
    return null;
  }
};

export const saveConsent = (prefs: CookiePreferences): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

export const acceptAllPreferences = (): CookiePreferences =>
  createPreferences({
    analytics: true,
    functional: true,
    marketing: true,
  });

export const rejectNonEssentialPreferences = (): CookiePreferences =>
  createPreferences({
    analytics: false,
    functional: false,
    marketing: false,
  });

export const saveCustomPreferences = (
  categories: CookieCategoryPreferences,
): CookiePreferences => createPreferences(categories);

export const defaultCategoryPreferences = (): CookieCategoryPreferences => ({
  analytics: false,
  functional: false,
  marketing: false,
});
