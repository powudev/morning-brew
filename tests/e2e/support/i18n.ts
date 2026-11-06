import { getDictionary } from "../../../lib/dictionary";
import { htmlLang, localePath, locales, type Locale } from "../../../lib/i18n";

export { getDictionary, htmlLang, localePath, locales, type Locale };

/** 兩語系都跑同一組測試 */
export function eachLocale(fn: (locale: Locale) => void) {
  for (const locale of locales) fn(locale);
}

/**
 * 把 "{time} ({n} left)" 轉成可放進 RegExp 的片段:{time} 換成指定時間(或省略),{n} 換成 \d+,其餘字元跳脫
 */
export function interpolateForTest(template: string, time: string): string {
  const escaped = template.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  return escaped.replace("{time}", time).replace("{n}", "\\d+");
}
