import * as isoCountries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

const COUNTRY_LANGUAGE = 'en';

isoCountries.registerLocale(enLocale);

export function resolveCountryAlpha2(rawValue: unknown): string {
  const value = compactCountryValue(rawValue);
  if (!value) {
    return '';
  }

  const possibleCode = value.toUpperCase();
  if (isoCountries.isValid(possibleCode)) {
    return possibleCode.length === 2
      ? possibleCode
      : isoCountries.toAlpha2(possibleCode) ?? '';
  }

  return isoCountries.getAlpha2Code(value, COUNTRY_LANGUAGE) ?? '';
}

export function normalizeCountryLabel(rawValue: unknown): string {
  const value = compactCountryValue(rawValue);
  const alpha2 = resolveCountryAlpha2(value);
  return alpha2
    ? isoCountries.getName(alpha2, COUNTRY_LANGUAGE, { select: 'official' }) ?? value
    : value;
}

export function toCountryKey(rawValue: unknown): string {
  const alpha2 = resolveCountryAlpha2(rawValue);
  return alpha2.toLowerCase() || normalizeCountryText(rawValue);
}

export function isKnownCountryLabel(rawValue: unknown): boolean {
  return Boolean(resolveCountryAlpha2(rawValue));
}

export function splitCountryValues(rawValue: unknown): string[] {
  const value = compactCountryValue(rawValue);
  if (!value) {
    return [];
  }

  if (isKnownCountryLabel(value)) {
    return [value];
  }

  return value
    .split(/[,;|]/g)
    .map((entry) => compactCountryValue(entry))
    .filter(Boolean);
}

function compactCountryValue(rawValue: unknown): string {
  return typeof rawValue === 'string'
    ? rawValue.replace(/\s+/g, ' ').trim()
    : '';
}

function normalizeCountryText(rawValue: unknown): string {
  return compactCountryValue(rawValue)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
