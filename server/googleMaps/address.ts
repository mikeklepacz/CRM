import { STATE_ABBREVIATIONS } from "./constants";

export function parseCityStateFromAddress(formattedAddress: string): { city: string; state: string } {
  const parts = formattedAddress.split(",").map((p) => p.trim());

  if (parts.length >= 3) {
    const city = parts[parts.length - 3] || "";
    const stateZip = parts[parts.length - 2] || "";
    const stateParts = stateZip.split(" ");
    const stateAbbr = stateParts[0] || "";
    const state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || stateAbbr;

    return { city, state };
  }

  return { city: "", state: "" };
}

export function parseAddressComponents(formattedAddress: string): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  const parts = formattedAddress.split(",").map((p) => p.trim());

  if (parts.length >= 3) {
    const street = parts[0] || "";
    const city = parts[parts.length - 3] || "";
    const stateZip = parts[parts.length - 2] || "";
    const stateParts = stateZip.split(" ");
    const stateAbbr = stateParts[0] || "";
    const zip = stateParts[1] || "";
    const state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || stateAbbr;

    return { street, city, state, zip };
  }

  return { street: "", city: "", state: "", zip: "" };
}

export function extractAddressFromComponents(
  addressComponents: Array<{ long_name: string; short_name: string; types: string[] }> | undefined,
  formattedAddress: string,
): {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
} {
  if (!addressComponents || addressComponents.length === 0) {
    const legacy = parseAddressComponents(formattedAddress);
    return { ...legacy, country: "" };
  }

  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";
  let country = "";

  for (const component of addressComponents) {
    const types = component.types || [];

    if (types.includes("street_number")) {
      streetNumber = component.long_name;
    } else if (types.includes("route")) {
      route = component.long_name;
    } else if (types.includes("locality") || types.includes("postal_town")) {
      city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      const stateAbbr = component.short_name;
      state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || component.long_name;
    } else if (types.includes("postal_code")) {
      zip = component.long_name;
    } else if (types.includes("country")) {
      country = component.long_name;
    }
  }

  if (!city) {
    for (const component of addressComponents) {
      const types = component.types || [];
      if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("neighborhood")) {
        city = component.long_name;
        break;
      }
    }
  }

  let street = "";
  if (streetNumber && route) {
    const euroCountries = [
      "Germany",
      "France",
      "Netherlands",
      "Belgium",
      "Austria",
      "Switzerland",
      "Poland",
      "Czech Republic",
      "Spain",
      "Italy",
    ];
    if (euroCountries.includes(country)) {
      street = `${route} ${streetNumber}`;
    } else {
      street = `${streetNumber} ${route}`;
    }
  } else if (route) {
    street = route;
  } else if (streetNumber) {
    street = streetNumber;
  }

  return { street, city, state, zip, country };
}
