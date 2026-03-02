import {
  extractStreetNumber,
  normalizeAddressComponent,
  normalizeState,
  statesMatch,
} from "./addressUtils";
import type { ParsedStore } from "./parseStrategies";

export type HeaderIndexes = {
  nameIndex: number;
  linkIndex: number;
  cityIndex: number;
  stateIndex: number;
  addressIndex: number;
  phoneIndex: number;
};

export type DbStore = {
  name: string;
  link: string;
  city: string;
  state: string;
  stateNormalized: string;
  address: string;
  addressNormalized: string;
  streetNumber: string | null;
  phone: string;
  originalRow: any[];
};

export type MatchedStore = {
  parsed: ParsedStore;
  match: any;
  confidence: number;
};

export function buildDbStores(rows: any[][], indexes: HeaderIndexes): DbStore[] {
  return rows
    .slice(1)
    .filter((row: any[]) => row[indexes.linkIndex])
    .map((row: any[]) => {
      const address = indexes.addressIndex !== -1 ? (row[indexes.addressIndex] || "").trim() : "";
      const state = indexes.stateIndex !== -1 ? (row[indexes.stateIndex] || "").trim() : "";

      return {
        name: indexes.nameIndex !== -1 ? row[indexes.nameIndex] || "" : "",
        link: indexes.linkIndex !== -1 ? row[indexes.linkIndex] || "" : "",
        city: indexes.cityIndex !== -1 ? (row[indexes.cityIndex] || "").trim().toLowerCase() : "",
        state: state.toLowerCase(),
        stateNormalized: normalizeState(state),
        address: address.toLowerCase(),
        addressNormalized: normalizeAddressComponent(address),
        streetNumber: extractStreetNumber(address),
        phone: indexes.phoneIndex !== -1 ? (row[indexes.phoneIndex] || "").replace(/\D/g, "") : "",
        originalRow: row,
      };
    });
}

export function matchParsedStores(
  parsedStores: ParsedStore[],
  dbStores: DbStore[],
  indexes: HeaderIndexes
): { matched: MatchedStore[]; unmatched: ParsedStore[] } {
  const matched: MatchedStore[] = [];
  const unmatched: ParsedStore[] = [];

  console.log(
    `[Parse-and-Match] Matching ${parsedStores.length} parsed stores against ${dbStores.length} database entries`
  );

  for (const parsed of parsedStores) {
    let bestMatch: any = null;
    let bestConfidence = 0;

    for (const dbStore of dbStores) {
      let confidence = 0;
      const scoreBreakdown: string[] = [];

      if (
        parsed.buildingNumber &&
        dbStore.streetNumber &&
        parsed.buildingNumber === dbStore.streetNumber &&
        parsed.state &&
        statesMatch(parsed.state, dbStore.state)
      ) {
        confidence += 70;
        scoreBreakdown.push(`Building#(${parsed.buildingNumber})+State: 70`);
      }

      if (parsed.streetName && dbStore.addressNormalized && confidence >= 70) {
        const normalizedParsedStreet = normalizeAddressComponent(parsed.streetName);
        const dbStreetPart = dbStore.addressNormalized.split(",")[0].trim();
        const parsedWords = normalizedParsedStreet.split(/\s+/).filter((w) => w.length > 3);
        const matchedWords = parsedWords.filter((word) => dbStreetPart.includes(word));

        if (matchedWords.length > 0) {
          confidence += 20;
          scoreBreakdown.push(`Street(${matchedWords.join(" ")}): 20`);
        }
      }

      if (parsed.phone && dbStore.phone && parsed.phone === dbStore.phone) {
        confidence += 10;
        scoreBreakdown.push("Phone: 10");
      }

      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = {
          ...dbStore,
          name: dbStore.originalRow[indexes.nameIndex] || dbStore.name,
          city: dbStore.originalRow[indexes.cityIndex] || dbStore.city,
          state: dbStore.originalRow[indexes.stateIndex] || dbStore.state,
          address: dbStore.originalRow[indexes.addressIndex] || dbStore.address,
          scoreBreakdown: scoreBreakdown.join(", "),
        };
      }
    }

    if (bestConfidence >= 70) {
      matched.push({
        parsed,
        match: bestMatch,
        confidence: bestConfidence,
      });
      console.log(
        `[Parse-and-Match] \u2713 MATCHED: "${parsed.name}" -> "${bestMatch.name}" (confidence: ${bestConfidence}%)`
      );
    } else {
      unmatched.push(parsed);
      console.log(
        `[Parse-and-Match] \u2717 UNMATCHED: "${parsed.name}" at ${parsed.address} (best score: ${bestConfidence}%)`
      );
    }
  }

  console.log(`[Parse-and-Match] Results: ${matched.length} matched, ${unmatched.length} unmatched`);

  return { matched, unmatched };
}

export function detectBrandNameByConsensus(matched: MatchedStore[], headers: string[]): string {
  let detectedBrand = "";

  if (matched.length === 0) return detectedBrand;

  const dbaIndex = headers.findIndex((h: string) => h.toLowerCase() === "dba");
  if (dbaIndex === -1) return detectedBrand;

  const brandCounts = new Map<string, number>();
  matched.forEach((m) => {
    const dbaValue = m.match.originalRow[dbaIndex]?.trim();
    if (dbaValue) {
      brandCounts.set(dbaValue, (brandCounts.get(dbaValue) || 0) + 1);
    }
  });

  if (brandCounts.size > 0) {
    let maxCount = 0;
    brandCounts.forEach((count, brand) => {
      if (count > maxCount) {
        maxCount = count;
        detectedBrand = brand;
      }
    });

    console.log(
      `[Parse-and-Match] Detected brand by consensus: "${detectedBrand}" (${maxCount}/${matched.length} matches)`
    );
  }

  return detectedBrand;
}
