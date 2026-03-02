type FilterRegularRowsParams = {
  allCountries: string[];
  allStates: string[];
  citiesInSelectedStates: string[];
  cityFilter: string;
  data: any[];
  headers: string[];
  isRealAdmin: boolean;
  nameFilter: string;
  searchTerm: string;
  selectedCities: Set<string>;
  selectedCountries: Set<string>;
  selectedStates: Set<string>;
  selectedStatuses: Set<string>;
  showMyStoresOnly: boolean;
  showStateless: boolean;
  showUnclaimedOnly: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  getStateName: (value: string) => string | null;
  isValidStateName: (value: string) => boolean;
};

export function filterRegularRows({
  allCountries,
  allStates,
  citiesInSelectedStates,
  cityFilter,
  data,
  headers,
  isRealAdmin,
  nameFilter,
  searchTerm,
  selectedCities,
  selectedCountries,
  selectedStates,
  selectedStatuses,
  showMyStoresOnly,
  showStateless,
  showUnclaimedOnly,
  sortColumn,
  sortDirection,
  getStateName,
  isValidStateName,
}: FilterRegularRowsParams) {
  if (!isRealAdmin && !showUnclaimedOnly && !showMyStoresOnly) {
    return [];
  }

  const stateColumns = headers.filter((h: string) => {
    const lower = h.toLowerCase();
    return lower === "state" || lower.includes(", state");
  });
  const countryColumns = headers.filter((h: string) => h.toLowerCase() === "country");

  const getRowStateName = (row: any): string | null => {
    for (const col of stateColumns) {
      const value = row[col];
      if (value && String(value).trim()) {
        const valueStr = String(value).trim();
        let stateAbbrev = valueStr;
        if (valueStr.includes(",")) {
          const parts = valueStr.split(",");
          if (parts.length >= 2) {
            stateAbbrev = parts[parts.length - 1].trim();
          }
        }
        const stateName = getStateName(stateAbbrev);
        if (stateName && isValidStateName(stateName)) {
          return stateName;
        }
      }
    }
    return null;
  };

  const getRowCountry = (row: any): string | null => {
    for (const col of countryColumns) {
      const value = row[col];
      if (value && String(value).trim()) {
        return String(value).trim();
      }
    }
    return null;
  };

  const hasNoStateSelections = allStates.length > 0 && selectedStates.size === 0;
  const hasNoCountrySelections = allCountries.length > 0 && selectedCountries.size === 0;
  if (hasNoStateSelections && hasNoCountrySelections) {
    return [];
  }

  let filtered = data.filter((row: any) => {
    const searchLower = searchTerm.toLowerCase();
    return headers.some((header: string) => {
      const value = row[header]?.toString().toLowerCase() || "";
      return value.includes(searchLower);
    });
  });

  if (showUnclaimedOnly && !isRealAdmin) {
    filtered = filtered.filter((row: any) => {
      const agentName = row["Agent Name"] || row["agent name"] || row["Agent"] || row["agent"] || "";
      const agentNameStr = agentName.toString().trim();
      return !agentNameStr;
    });
  }

  if (nameFilter.trim()) {
    const nameLower = nameFilter.toLowerCase();
    filtered = filtered.filter((row: any) => {
      const nameValue = (row["name"] || row["Name"] || row["Company"] || row["company"] || "").toString().toLowerCase();
      return nameValue.includes(nameLower);
    });
  }

  if (cityFilter.trim()) {
    const cityLower = cityFilter.toLowerCase();
    filtered = filtered.filter((row: any) => {
      const cityValue = (row["city"] || row["City"] || "").toString().toLowerCase();
      return cityValue.includes(cityLower);
    });
  }

  filtered = filtered.filter((row: any) => {
    const rowStateName = getRowStateName(row);
    const rowCountry = getRowCountry(row);
    void rowCountry;

    if (rowStateName) {
      if (selectedStates.size === 0) {
        return false;
      }
      if (selectedStates.size === allStates.length) {
        return true;
      }
      return selectedStates.has(rowStateName);
    } else {
      return showStateless;
    }
  });

  if (selectedStates.size > 0 && citiesInSelectedStates.length > 0) {
    if (selectedCities.size === 0) {
      filtered = filtered.filter((row: any) => {
        const rowStateName = getRowStateName(row);
        return !rowStateName;
      });
    } else if (selectedCities.size < citiesInSelectedStates.length) {
      const cityColumnsForFilter = headers.filter((h: string) => h.toLowerCase() === "city");
      filtered = filtered.filter((row: any) => {
        const rowStateName = getRowStateName(row);
        if (!rowStateName) {
          return true;
        }
        return cityColumnsForFilter.some((col: string) => {
          const value = row[col];
          if (value && String(value).trim()) {
            return selectedCities.has(String(value).trim());
          }
          return false;
        });
      });
    }
  }

  if (selectedStatuses.size > 0) {
    const statusColumns = headers.filter((h: string) => h.toLowerCase().includes("status"));
    filtered = filtered.filter((row: any) => {
      return statusColumns.some((col: string) => {
        const value = row[col];
        if (value && String(value).trim()) {
          return selectedStatuses.has(String(value).trim());
        }
        return false;
      });
    });
  }

  if (sortColumn) {
    filtered = [...filtered].sort((a: any, b: any) => {
      const aVal = String(a[sortColumn] || "");
      const bVal = String(b[sortColumn] || "");

      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }

  return filtered;
}
