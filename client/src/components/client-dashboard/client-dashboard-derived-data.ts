export function buildStatesSummary({
  headers,
  data,
  getStateName,
  isValidStateName,
}: {
  headers: string[];
  data: any[];
  getStateName: (state: string) => string | null;
  isValidStateName: (state: string) => boolean;
}) {
  const states = new Set<string>();
  const counts: Record<string, number> = {};

  // Look for columns named "state" OR containing ", state" (like "City, State")
  const stateColumns = headers.filter((h: string) => {
    const lower = h.toLowerCase();
    return lower === 'state' || lower.includes(', state');
  });

  data.forEach((row: any) => {
    stateColumns.forEach((col: string) => {
      const value = row[col];
      if (value && String(value).trim()) {
        // Extract just the state part if it's "City, State" format
        const valueStr = String(value).trim();
        let stateAbbrev = valueStr;

        // If format is "City, ST", extract just the state abbreviation
        if (valueStr.includes(',')) {
          const parts = valueStr.split(',');
          if (parts.length >= 2) {
            stateAbbrev = parts[parts.length - 1].trim();
          }
        }

        // Try to convert 2-letter codes to full names
        let stateName = stateAbbrev;
        if (stateAbbrev.length === 2) {
          const fullName = getStateName(stateAbbrev);
          if (fullName) {
            stateName = fullName;
          }
        }

        // Only add valid state names (filter out postal codes and garbage data with numbers)
        if (isValidStateName(stateName)) {
          states.add(stateName);
          counts[stateName] = (counts[stateName] || 0) + 1;
        }
      }
    });
  });

  let statelessCount = 0;
  const stateColumnsForCount = headers.filter((h: string) => {
    const lower = h.toLowerCase();
    return lower === 'state' || lower.includes(', state');
  });
  data.forEach((row: any) => {
    let hasValidState = false;
    stateColumnsForCount.forEach((col: string) => {
      const value = row[col];
      if (value && String(value).trim()) {
        const valueStr = String(value).trim();
        let stateAbbrev = valueStr;
        if (valueStr.includes(',')) {
          const parts = valueStr.split(',');
          if (parts.length >= 2) {
            stateAbbrev = parts[parts.length - 1].trim();
          }
        }
        let stateName = stateAbbrev;
        if (stateAbbrev.length === 2) {
          const fullName = getStateName(stateAbbrev);
          if (fullName) {
            stateName = fullName;
          }
        }
        if (isValidStateName(stateName)) {
          hasValidState = true;
        }
      }
    });
    if (!hasValidState) {
      statelessCount++;
    }
  });

  return {
    allStates: Array.from(states).sort(),
    stateCounts: counts,
    statelessCount,
  };
}

export function buildCountriesSummary({
  headers,
  data,
}: {
  headers: string[];
  data: any[];
}) {
  const countries = new Set<string>();
  const counts: Record<string, number> = {};

  // Look for columns named "country" (case-insensitive)
  const countryColumns = headers.filter((h: string) => h.toLowerCase() === 'country');

  data.forEach((row: any) => {
    countryColumns.forEach((col: string) => {
      const value = row[col];
      if (value && String(value).trim()) {
        const countryName = String(value).trim();
        countries.add(countryName);
        counts[countryName] = (counts[countryName] || 0) + 1;
      }
    });
  });

  return {
    allCountries: Array.from(countries).sort(),
    countryCounts: counts,
  };
}

export function buildCitiesInSelectedStatesSummary({
  headers,
  data,
  selectedStates,
  getStateName,
}: {
  headers: string[];
  data: any[];
  selectedStates: Set<string>;
  getStateName: (state: string) => string | null;
}) {
  if (selectedStates.size === 0) {
    return { citiesInSelectedStates: [], cityCounts: {} };
  }

  const cities = new Set<string>();
  const counts: Record<string, number> = {};

  const cityColumns = headers.filter((h: string) => h.toLowerCase() === 'city');
  const stateColumns = headers.filter((h: string) => {
    const lower = h.toLowerCase();
    return lower === 'state' || lower.includes(', state');
  });

  data.forEach((row: any) => {
    // Check if this row's state is in selected states
    const rowState = stateColumns.map((col: string) => {
      const value = row[col];
      if (value && String(value).trim()) {
        const valueStr = String(value).trim();
        let stateAbbrev = valueStr;

        if (valueStr.includes(',')) {
          const parts = valueStr.split(',');
          if (parts.length >= 2) {
            stateAbbrev = parts[parts.length - 1].trim();
          }
        }

        const stateName = getStateName(stateAbbrev);
        return stateName || stateAbbrev;
      }
      return null;
    }).find((state: string | null) => state && selectedStates.has(state));

    if (rowState) {
      cityColumns.forEach((col: string) => {
        const cityValue = row[col];
        if (cityValue && String(cityValue).trim()) {
          const city = String(cityValue).trim();
          cities.add(city);
          counts[city] = (counts[city] || 0) + 1;
        }
      });
    }
  });

  return {
    citiesInSelectedStates: Array.from(cities).sort(),
    cityCounts: counts,
  };
}
