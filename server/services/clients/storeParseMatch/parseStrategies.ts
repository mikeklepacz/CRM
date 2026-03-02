import { storage } from "../../../storage";
import {
  extractPhone,
  normalizeAddressComponent,
  normalizeState,
  parseAddressLine,
} from "./addressUtils";

export type ParsedStore = {
  rawText: string;
  name: string;
  buildingNumber: string | null;
  streetName: string;
  city: string;
  state: string;
  stateNormalized: string;
  address: string;
  addressNormalized: string;
  phone: string;
};

type OpenAIParseResult = {
  parsedStores: ParsedStore[];
  usedOpenAI: boolean;
};

export async function parseWithOpenAI(rawText: string, tenantId: string): Promise<OpenAIParseResult> {
  try {
    const openaiSettings = await storage.getOpenaiSettings(tenantId);

    if (!openaiSettings?.apiKey) {
      console.log("[Parse-and-Match] No OpenAI API key configured, using regex parsing");
      return { parsedStores: [], usedOpenAI: false };
    }

    console.log("[Parse-and-Match] Using OpenAI to clean and extract store locations...");

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

    const prompt = `Extract store/dispensary locations from this messy text. Return ONLY a JSON object with this exact structure:

{
  "stores": [
    {
      "name": "Store Name",
      "address": "123 Main St",
      "city": "CityName",
      "state": "IL",
      "phone": "5551234567"
    }
  ]
}

Rules:
1. Extract the actual store NAME (not noise like "SHOP NOW", "Outlet Store", "Store Info")
2. Extract full street ADDRESS with building number
3. Extract CITY name
4. Extract STATE (use 2-letter abbreviation)
5. Extract PHONE number (digits only, no formatting)
6. Skip duplicate entries, noise lines, and marketing text
7. Return ONLY the JSON object with a "stores" array, no markdown, no explanations

INPUT TEXT:
${rawText}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a data extraction expert. Extract structured location data from messy text with 100% accuracy. Return only valid JSON arrays.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    console.log("[Parse-and-Match] OpenAI raw response:", responseText.substring(0, 200));

    const openaiData = JSON.parse(responseText);
    const stores = Array.isArray(openaiData) ? openaiData : openaiData.stores || openaiData.locations || [];

    if (stores.length === 0) {
      console.log("[Parse-and-Match] OpenAI returned empty array, falling back to regex");
      return { parsedStores: [], usedOpenAI: false };
    }

    const parsedStores: ParsedStore[] = stores.map((s: any) => {
      const addressParts = parseAddressLine(s.address || "");
      return {
        rawText: `${s.name}\n${s.address}${s.phone ? `\n${s.phone}` : ""}`,
        name: s.name || "",
        buildingNumber: addressParts?.buildingNumber || null,
        streetName: addressParts?.streetName || "",
        city: s.city?.toLowerCase() || "",
        state: s.state?.toLowerCase() || "",
        stateNormalized: normalizeState(s.state || ""),
        address: s.address?.toLowerCase() || "",
        addressNormalized: normalizeAddressComponent(s.address || ""),
        phone: s.phone?.replace(/\D/g, "") || "",
      };
    });

    console.log(`[Parse-and-Match] \u2713 OpenAI extracted ${parsedStores.length} clean stores`);
    return { parsedStores, usedOpenAI: true };
  } catch (error: any) {
    console.error("[Parse-and-Match] OpenAI parsing failed, falling back to regex:", error.message);
    return { parsedStores: [], usedOpenAI: false };
  }
}

export function parseWithRegex(rawText: string): ParsedStore[] {
  console.log("[Parse-and-Match] Using regex fallback parsing");
  const lines = rawText
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line);

  console.log(`[Parse-and-Match] Processing ${lines.length} lines of raw text`);

  const noiseWords = [
    "SHOP NOW",
    "MORE INFO",
    "DELIVERY",
    "CLICK HERE",
    "VIEW DETAILS",
    "CHOOSE DISPENSARY",
    "CLOSED TILL",
    "OPEN NOW",
    "CLOSED NOW",
    "OPENS AT",
    "CLOSES AT",
    "VIEW MENU",
    "ORDER ONLINE",
    "PICKUP",
    "CURBSIDE",
    "IN-STORE",
    "DISPENSARY INFO",
    "STORE INFO",
    "SHOP",
    "WE DELIVER",
    "DELIVERY AVAILABLE",
    "FREE DELIVERY",
    "OUTLET STORE",
    "\uFFFC",
  ];

  const isNoiseLine = (line: string): boolean => {
    const upper = line.toUpperCase().trim();
    return (
      noiseWords.some((noise) => upper === noise || upper.includes(noise)) ||
      line.trim() === "" ||
      line.trim() === "\uFFFC"
    );
  };

  const parsedStores: ParsedStore[] = [];
  let previousLine = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isNoiseLine(line)) {
      continue;
    }

    const addressParts = parseAddressLine(line);

    if (addressParts && addressParts.state) {
      let storeName = previousLine || "";

      if (!storeName) {
        storeName = `${addressParts.city || "Unknown"} Location`.toUpperCase();
      }

      let parsedPhone = "";
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        const phone = extractPhone(nextLine);
        if (phone) {
          parsedPhone = phone;
          break;
        }
        if (parseAddressLine(nextLine)) {
          break;
        }
      }

      const addressNormalized = normalizeAddressComponent(line);

      parsedStores.push({
        rawText: `${storeName}\n${line}${parsedPhone ? `\n${parsedPhone}` : ""}`,
        name: storeName,
        buildingNumber: addressParts.buildingNumber,
        streetName: addressParts.streetName,
        city: addressParts.city,
        state: addressParts.state,
        stateNormalized: normalizeState(addressParts.state),
        address: line.trim(),
        addressNormalized,
        phone: parsedPhone,
      });

      console.log(`[Parse-and-Match] Parsed store: "${storeName}" at ${line.substring(0, 50)}...`);
      previousLine = "";
    } else {
      previousLine = line;
    }
  }

  console.log(
    `[Parse-and-Match] Successfully parsed ${parsedStores.length} stores from input (using regex fallback)`
  );

  return parsedStores;
}
