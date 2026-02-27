type FilterMyStoresRowsParams = {
  allCountries: string[];
  allStates: string[];
  citiesInSelectedStates: string[];
  cityFilter: string;
  data: any[];
  headers: string[];
  nameFilter: string;
  searchTerm: string;
  selectedCities: Set<string>;
  selectedCountries: Set<string>;
  selectedStates: Set<string>;
  selectedStatuses: Set<string>;
  showStateless: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  getStateName: (value: string) => string | null;
  isValidStateName: (value: string) => boolean;
};

export function filterMyStoresRows({
  allCountries,
  allStates,
  citiesInSelectedStates,
  cityFilter,
  data,
  headers,
  nameFilter,
  searchTerm,
  selectedCities,
  selectedCountries,
  selectedStates,
  selectedStatuses,
  showStateless,
  sortColumn,
  sortDirection,
  getStateName,
  isValidStateName,
}: FilterMyStoresRowsParams) {
  const stateColumnsMyStores = headers.filter((h: string) => {
    const lower = h.toLowerCase();
    return lower === "state" || lower.includes(", state");
  });
  const countryColumnsMyStores = headers.filter((h: string) => h.toLowerCase() === "country");

  const getRowStateNameMyStores = (row: any): string | null => {
    for (const col of stateColumnsMyStores) {
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

  const getRowCountryMyStores = (row: any): string | null => {
    for (const col of countryColumnsMyStores) {
      const value = row[col];
      if (value && String(value).trim()) {
        return String(value).trim();
      }
    }
    return null;
  };

  const hasNoStateSelectionsMyStores = allStates.length > 0 && selectedStates.size === 0;
  const hasNoCountrySelectionsMyStores = allCountries.length > 0 && selectedCountries.size === 0;
  if (hasNoStateSelectionsMyStores && hasNoCountrySelectionsMyStores) {
    return [];
  }

  let filtered = data.filter((row: any) => {
    const searchLower = searchTerm.toLowerCase();
    return headers.some((header: string) => {
      const value = row[header]?.toString().toLowerCase() || "";
      return value.includes(searchLower);
    });
  });

  filtered = filtered.filter((row: any) => row._hasTrackerData === true);

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
    const rowStateName = getRowStateNameMyStores(row);
    const rowCountry = getRowCountryMyStores(row);
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
        const rowStateName = getRowStateNameMyStores(row);
        return !rowStateName;
      });
    } else if (selectedCities.size < citiesInSelectedStates.length) {
      const cityColumnsForFilterMyStores = headers.filter((h: string) => h.toLowerCase() === "city");
      filtered = filtered.filter((row: any) => {
        const rowStateName = getRowStateNameMyStores(row);
        if (!rowStateName) {
          return true;
        }
        return cityColumnsForFilterMyStores.some((col: string) => {
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
