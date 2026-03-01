const STATE_MAP: Record<string, string> = {
  al: "alabama",
  alabama: "al",
  ak: "alaska",
  alaska: "ak",
  az: "arizona",
  arizona: "az",
  ar: "arkansas",
  arkansas: "ar",
  ca: "california",
  california: "ca",
  co: "colorado",
  colorado: "co",
  ct: "connecticut",
  connecticut: "ct",
  de: "delaware",
  delaware: "de",
  fl: "florida",
  florida: "fl",
  ga: "georgia",
  georgia: "ga",
  hi: "hawaii",
  hawaii: "hi",
  id: "idaho",
  idaho: "id",
  il: "illinois",
  illinois: "il",
  in: "indiana",
  indiana: "in",
  ia: "iowa",
  iowa: "ia",
  ks: "kansas",
  kansas: "ks",
  ky: "kentucky",
  kentucky: "ky",
  la: "louisiana",
  louisiana: "la",
  me: "maine",
  maine: "me",
  md: "maryland",
  maryland: "md",
  ma: "massachusetts",
  massachusetts: "ma",
  mi: "michigan",
  michigan: "mi",
  mn: "minnesota",
  minnesota: "mn",
  ms: "mississippi",
  mississippi: "ms",
  mo: "missouri",
  missouri: "mo",
  mt: "montana",
  montana: "mt",
  ne: "nebraska",
  nebraska: "ne",
  nv: "nevada",
  nevada: "nv",
  nh: "new hampshire",
  "new hampshire": "nh",
  nj: "new jersey",
  "new jersey": "nj",
  nm: "new mexico",
  "new mexico": "nm",
  ny: "new york",
  "new york": "ny",
  nc: "north carolina",
  "north carolina": "nc",
  nd: "north dakota",
  "north dakota": "nd",
  oh: "ohio",
  ohio: "oh",
  ok: "oklahoma",
  oklahoma: "ok",
  or: "oregon",
  oregon: "or",
  pa: "pennsylvania",
  pennsylvania: "pa",
  ri: "rhode island",
  "rhode island": "ri",
  sc: "south carolina",
  "south carolina": "sc",
  sd: "south dakota",
  "south dakota": "sd",
  tn: "tennessee",
  tennessee: "tn",
  tx: "texas",
  texas: "tx",
  ut: "utah",
  utah: "ut",
  vt: "vermont",
  vermont: "vt",
  va: "virginia",
  virginia: "va",
  wa: "washington",
  washington: "wa",
  wv: "west virginia",
  "west virginia": "wv",
  wi: "wisconsin",
  wisconsin: "wi",
  wy: "wyoming",
  wyoming: "wy",
};

const STREET_SUFFIX_MAP: Record<string, string[]> = {
  avenue: ["ave", "av", "avenue"],
  boulevard: ["blvd", "boul", "boulevard"],
  circle: ["cir", "circ", "circle"],
  court: ["ct", "court"],
  drive: ["dr", "drv", "drive"],
  highway: ["hwy", "highway"],
  lane: ["ln", "lane"],
  parkway: ["pkwy", "parkway", "pky"],
  place: ["pl", "place"],
  road: ["rd", "road"],
  square: ["sq", "square"],
  street: ["st", "str", "street"],
  terrace: ["ter", "terr", "terrace"],
  trail: ["trl", "trail"],
  way: ["way"],
};

const DIRECTIONAL_MAP: Record<string, string[]> = {
  north: ["n", "north", "no"],
  south: ["s", "south", "so"],
  east: ["e", "east"],
  west: ["w", "west"],
  northeast: ["ne", "northeast"],
  northwest: ["nw", "northwest"],
  southeast: ["se", "southeast"],
  southwest: ["sw", "southwest"],
};

export type ParsedAddressLine = {
  buildingNumber: string | null;
  streetName: string;
  city: string;
  state: string;
};

export function normalizeState(state: string): string {
  const normalized = state.toLowerCase().trim();
  return STATE_MAP[normalized] || normalized;
}

export function statesMatch(state1: string, state2: string): boolean {
  const norm1 = normalizeState(state1);
  const norm2 = normalizeState(state2);
  return norm1 === norm2 || STATE_MAP[norm1] === norm2 || STATE_MAP[norm2] === norm1;
}

export function extractStreetNumber(address: string): string | null {
  const match = address.match(/^\s*(\d{1,6})\s+/);
  return match ? match[1] : null;
}

export function normalizeAddressComponent(component: string): string {
  let normalized = component.toLowerCase().trim();

  for (const [full, variations] of Object.entries(DIRECTIONAL_MAP)) {
    for (const variation of variations) {
      const regex = new RegExp(`\\b${variation}\\.?\\b`, "gi");
      normalized = normalized.replace(regex, full);
    }
  }

  for (const [full, variations] of Object.entries(STREET_SUFFIX_MAP)) {
    for (const variation of variations) {
      const regex = new RegExp(`\\b${variation}\\.?\\b`, "gi");
      normalized = normalized.replace(regex, full);
    }
  }

  return normalized;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function extractPhone(line: string): string | null {
  const match = line.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return match ? normalizePhone(match[0]) : null;
}

export function parseAddressLine(line: string): ParsedAddressLine | null {
  const buildingMatch = line.match(/^\s*(\d{1,6})\s+/);
  const buildingNumber = buildingMatch ? buildingMatch[1] : null;

  const stateMatch = line.match(/,?\s*([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/i);
  if (!stateMatch) return null;

  const state = stateMatch[1].toUpperCase();

  let middle = line;
  if (buildingMatch) {
    middle = line.substring(buildingMatch[0].length);
  }

  const stateIndexInMiddle = middle.lastIndexOf(stateMatch[0]);
  if (stateIndexInMiddle === -1) return null;
  middle = middle.substring(0, stateIndexInMiddle).trim();

  const streetSuffixes = [
    "street",
    "st",
    "st.",
    "avenue",
    "ave",
    "ave.",
    "road",
    "rd",
    "rd.",
    "boulevard",
    "blvd",
    "blvd.",
    "drive",
    "dr",
    "dr.",
    "lane",
    "ln",
    "ln.",
    "court",
    "ct",
    "ct.",
    "circle",
    "cir",
    "cir.",
    "highway",
    "hwy",
    "hwy.",
    "parkway",
    "pkwy",
    "pkwy.",
    "place",
    "pl",
    "pl.",
    "terrace",
    "ter",
    "ter.",
    "way",
    "trail",
    "trl",
    "trl.",
  ];

  let lastSuffixEnd = -1;
  for (const suffix of streetSuffixes) {
    const regex = new RegExp(`\\b${suffix}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(middle)) !== null) {
      lastSuffixEnd = match.index + match[0].length;
    }
  }

  let streetName = "";
  let city = "";

  if (lastSuffixEnd > -1) {
    streetName = middle.substring(0, lastSuffixEnd).trim();
    let cityPart = middle.substring(lastSuffixEnd).trim();
    cityPart = cityPart.replace(/^[,\s]+/, "");
    const cityWords = cityPart.split(/\s+/).filter((w) => w.length > 0);
    city = cityWords.slice(0, 3).join(" ");
  } else {
    const parts = middle.split(",");
    if (parts.length >= 2) {
      streetName = parts[0].trim();
      city = parts[1].trim();
    } else {
      const words = middle.split(/\s+/).filter((w) => w.length > 0);
      if (words.length >= 3) {
        city = words.slice(-2).join(" ");
        streetName = words.slice(0, -2).join(" ");
      } else {
        streetName = middle;
        city = "";
      }
    }
  }

  return {
    buildingNumber,
    streetName: streetName.toLowerCase(),
    city: city.toLowerCase(),
    state: state.toLowerCase(),
  };
}
