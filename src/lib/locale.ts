// Auto-detect user locale for currency & date formatting
// Uses navigator.languages (full preference list) for better detection

const userLanguages: readonly string[] =
  typeof navigator !== "undefined" && navigator.languages?.length
    ? navigator.languages
    : typeof navigator !== "undefined" && navigator.language
      ? [navigator.language]
      : ["en-US"];

// Map locale to currency
const localeCurrencyMap: Record<string, string> = {
  "da": "DKK", "da-DK": "DKK",
  "sv": "SEK", "sv-SE": "SEK",
  "no": "NOK", "nb": "NOK", "nn": "NOK", "nb-NO": "NOK",
  "en-US": "USD", "en": "USD",
  "en-GB": "GBP",
  "de": "EUR", "de-DE": "EUR",
  "fr": "EUR", "fr-FR": "EUR",
  "ja": "JPY", "ja-JP": "JPY",
};

const euroLocales = ["de", "fr", "es", "it", "nl", "pt", "fi", "el", "ie", "at", "be", "ee", "lv", "lt", "lu", "mt", "sk", "si"];

function detectLocaleAndCurrency(): { locale: string; currency: string } {
  // Walk through the user's full language preference list
  for (const lang of userLanguages) {
    if (localeCurrencyMap[lang]) {
      return { locale: lang, currency: localeCurrencyMap[lang] };
    }
    const base = lang.split("-")[0];
    if (localeCurrencyMap[base]) {
      return { locale: lang, currency: localeCurrencyMap[base] };
    }
    if (euroLocales.includes(base)) {
      return { locale: lang, currency: "EUR" };
    }
  }
  // Fallback
  const fallback = userLanguages[0] || "en-US";
  return { locale: fallback, currency: "USD" };
}

const { locale: userLocale, currency: detectedCurrency } = detectLocaleAndCurrency();

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(userLocale, {
    style: "currency",
    currency: detectedCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat(userLocale).format(amount);
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(userLocale, options || {
    weekday: "long", month: "short", day: "numeric",
  }).format(d);
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(userLocale, { month: "short", day: "numeric" }).format(d);
}

export { userLocale, detectedCurrency };
