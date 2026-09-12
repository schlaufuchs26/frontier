import { describe, expect, test } from "bun:test";
import { searchCountries } from "../src/game/search";

function names(query: string, exclude: string[] = []): string[] {
  return searchCountries(query, { exclude }).map((c) => c.name);
}

describe("searchCountries", () => {
  test("finds countries by prefix and ranks them above mid-word matches", () => {
    const hits = names("guinea");
    expect(hits[0]).toBe("Guinea");
    expect(hits).toContain("Equatorial Guinea");
    expect(hits).toContain("Papua New Guinea");
  });

  test("is case-insensitive and ignores diacritics", () => {
    expect(names("TURK")).toContain("Türkiye");
    expect(names("sao tome")).toContain("São Tomé and Príncipe");
  });

  test("finds by partial word anywhere in the name", () => {
    expect(names("korea")).toEqual(["North Korea", "South Korea"]);
  });

  test("leaves out the target and already picked names", () => {
    expect(names("germany", ["DEU"])).toEqual([]);
    expect(names("france", ["DEU"])).toEqual(["France"]);
  });

  test("caps the list and returns nothing for an empty query", () => {
    expect(searchCountries("a").length).toBeLessThanOrEqual(6);
    expect(searchCountries("a", { limit: 3 })).toHaveLength(3);
    expect(names("")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });
});
