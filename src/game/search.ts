import { ALL_COUNTRIES } from "./data";
import type { Country } from "./types";

const SUGGESTION_LIMIT = 6;

/** Lowercase and drop diacritics so "turkiye" finds "Türkiye" either way. */
function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

interface SearchOptions {
  /** Country ids to leave out: the round's target and names already picked. */
  exclude?: readonly string[];
  limit?: number;
}

/**
 * Countries whose name contains `query`. Prefix matches come first, then
 * alphabetical, so typing the first letters of a name puts it on top.
 */
export function searchCountries(
  query: string,
  options: SearchOptions = {},
): Country[] {
  const needle = normalizeName(query.trim());
  if (needle === "") return [];
  const exclude = new Set(options.exclude ?? []);
  const matches = ALL_COUNTRIES.filter(
    (country) =>
      !exclude.has(country.id) && normalizeName(country.name).includes(needle),
  );
  matches.sort((a, b) => {
    const aPrefix = normalizeName(a.name).startsWith(needle);
    const bPrefix = normalizeName(b.name).startsWith(needle);
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return matches.slice(0, options.limit ?? SUGGESTION_LIMIT);
}
