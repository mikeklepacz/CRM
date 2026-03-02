import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { filterMyStoresRows } from "@/components/client-dashboard/client-dashboard-filter-my-stores";
import { filterRegularRows } from "@/components/client-dashboard/client-dashboard-filter-regular";
import { filterFranchiseRows } from "@/components/client-dashboard/client-dashboard-filter-franchise";
import {
  buildCitiesInSelectedStatesSummary,
  buildCountriesSummary,
  buildStatesSummary,
} from "@/components/client-dashboard/client-dashboard-derived-data";
import { getStateName, isValidStateName } from "@/components/client-dashboard/region-utils";

interface UseClientDashboardDerivedProps {
  cityFilter: string;
  columnOrder: string[];
  data: any[];
  editedCells: Record<string, any>;
  headers: string[];
  isRealAdmin: boolean;
  nameFilter: string;
  rowHeight: number;
  searchTerm: string;
  selectedCities: Set<string>;
  selectedCountries: Set<string>;
  selectedFranchise: any;
  selectedStates: Set<string>;
  selectedStatuses: Set<string>;
  showMyStoresOnly: boolean;
  showStateless: boolean;
  showUnclaimedOnly: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  tableContainerRef: React.RefObject<HTMLDivElement>;
  visibleColumns: Record<string, boolean>;
}

export function useClientDashboardDerived(props: UseClientDashboardDerivedProps) {
  const { allStates, stateCounts, statelessCount } = useMemo(
    () =>
      buildStatesSummary({
        headers: props.headers,
        data: props.data,
        getStateName,
        isValidStateName,
      }),
    [props.headers, props.data],
  );

  const { allCountries, countryCounts } = useMemo(
    () =>
      buildCountriesSummary({
        headers: props.headers,
        data: props.data,
      }),
    [props.headers, props.data],
  );

  const { citiesInSelectedStates, cityCounts } = useMemo(
    () =>
      buildCitiesInSelectedStatesSummary({
        headers: props.headers,
        data: props.data,
        selectedStates: props.selectedStates,
        getStateName,
      }),
    [props.headers, props.data, props.selectedStates],
  );

  const filteredData = useMemo(() => {
    if (props.selectedFranchise) {
      return filterFranchiseRows({
        data: props.data,
        headers: props.headers,
        searchTerm: props.searchTerm,
        selectedFranchise: props.selectedFranchise,
        sortColumn: props.sortColumn,
        sortDirection: props.sortDirection,
      });
    }

    if (props.showMyStoresOnly) {
      return filterMyStoresRows({
        allCountries,
        allStates,
        citiesInSelectedStates,
        cityFilter: props.cityFilter,
        data: props.data,
        headers: props.headers,
        nameFilter: props.nameFilter,
        searchTerm: props.searchTerm,
        selectedCities: props.selectedCities,
        selectedCountries: props.selectedCountries,
        selectedStates: props.selectedStates,
        selectedStatuses: props.selectedStatuses,
        showStateless: props.showStateless,
        sortColumn: props.sortColumn,
        sortDirection: props.sortDirection,
        getStateName,
        isValidStateName,
      });
    }

    return filterRegularRows({
      allCountries,
      allStates,
      citiesInSelectedStates,
      cityFilter: props.cityFilter,
      data: props.data,
      headers: props.headers,
      isRealAdmin: props.isRealAdmin,
      nameFilter: props.nameFilter,
      searchTerm: props.searchTerm,
      selectedCities: props.selectedCities,
      selectedCountries: props.selectedCountries,
      selectedStates: props.selectedStates,
      selectedStatuses: props.selectedStatuses,
      showMyStoresOnly: props.showMyStoresOnly,
      showStateless: props.showStateless,
      showUnclaimedOnly: props.showUnclaimedOnly,
      sortColumn: props.sortColumn,
      sortDirection: props.sortDirection,
      getStateName,
      isValidStateName,
    });
  }, [
    props.data,
    props.searchTerm,
    props.nameFilter,
    props.cityFilter,
    props.selectedStates,
    props.selectedCities,
    citiesInSelectedStates.length,
    allStates.length,
    props.selectedCountries,
    allCountries.length,
    props.headers,
    props.sortColumn,
    props.sortDirection,
    props.showMyStoresOnly,
    props.showUnclaimedOnly,
    props.isRealAdmin,
    props.selectedStatuses,
    props.selectedFranchise,
    props.showStateless,
  ]);

  const visibleHeaders = props.columnOrder.filter((header) => props.visibleColumns[header]);
  const hasUnsavedChanges = Object.keys(props.editedCells).length > 0;
  const estimatedRowHeight = props.rowHeight;

  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => props.tableContainerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10,
  });

  const statusColumns = props.headers.filter((header) => header.toLowerCase().includes("status"));

  return {
    allCountries,
    allStates,
    citiesInSelectedStates,
    cityCounts,
    countryCounts,
    filteredData,
    hasUnsavedChanges,
    stateCounts,
    statelessCount,
    statusColumns,
    visibleHeaders,
    rowVirtualizer,
  };
}
