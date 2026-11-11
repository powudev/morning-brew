import { getDictionary } from "../../../lib/dictionary";
import { htmlLang, localePath, locales, type Locale } from "../../../lib/i18n";

export { getDictionary, htmlLang, localePath, locales, type Locale };

export function eachLocale(fn: (locale: Locale) => void) {
  for (const locale of locales) fn(locale);
}

export function interpolateForTest(template: string, time: string): string {
  const escaped = template.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  return escaped.replace("{time}", time).replace("{n}", "\\d+");
}
