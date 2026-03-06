import * as googleSheets from "../../../googleSheets";
import { storage } from "../../../storage";
import { buildDbStores, detectBrandNameByConsensus, matchParsedStores, type HeaderIndexes } from "./matcher";
import { parseWithOpenAI, parseWithRegex } from "./parseStrategies";
import { buildSheetRange } from "../../sheets/a1Range";

export class ParseMatchError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ParseAndMatchResponse = {
  matched: any[];
  unmatched: any[];
  brandName: string;
  summary: {
    total: number;
    matched: number;
    unmatched: number;
  };
};

export async function parseAndMatchStores(
  rawText: string,
  sheetId: string,
  tenantId: string
): Promise<ParseAndMatchResponse> {
  const sheet = await storage.getGoogleSheetById(sheetId, tenantId);
  if (!sheet) {
    throw new ParseMatchError(404, "Sheet not found");
  }

  const rows = await googleSheets.readSheetData(sheet.spreadsheetId, buildSheetRange(sheet.sheetName, "A:ZZ"));

  if (rows.length === 0) {
    return {
      matched: [],
      unmatched: [],
      brandName: "",
      summary: { total: 0, matched: 0, unmatched: 0 },
    };
  }

  const headers = rows[0];
  const indexes: HeaderIndexes = {
    nameIndex: headers.findIndex((h: string) => h.toLowerCase() === "name"),
    linkIndex: headers.findIndex((h: string) => h.toLowerCase() === "link"),
    cityIndex: headers.findIndex((h: string) => h.toLowerCase() === "city"),
    stateIndex: headers.findIndex((h: string) => h.toLowerCase() === "state"),
    addressIndex: headers.findIndex((h: string) => h.toLowerCase() === "address"),
    phoneIndex: headers.findIndex((h: string) => h.toLowerCase() === "phone"),
  };

  const dbStores = buildDbStores(rows, indexes);

  let { parsedStores, usedOpenAI } = await parseWithOpenAI(rawText, tenantId);
  if (parsedStores.length === 0) {
    parsedStores = parseWithRegex(rawText);
    usedOpenAI = false;
  }

  console.log(
    `[Parse-and-Match] Total parsed: ${parsedStores.length} stores (${usedOpenAI ? "OpenAI" : "regex"})`
  );

  const { matched, unmatched } = matchParsedStores(parsedStores, dbStores, indexes);
  const brandName = detectBrandNameByConsensus(matched, headers);

  return {
    matched,
    unmatched,
    brandName,
    summary: {
      total: parsedStores.length,
      matched: matched.length,
      unmatched: unmatched.length,
    },
  };
}
