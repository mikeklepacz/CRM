import { useEffect } from "react";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { normalizeLink } from "@shared/linkUtils";
import { getLinkValue } from "@/components/client-dashboard/region-utils";

interface UseClientDashboardInitEffectsProps {
  allCountries: string[];
  allStates: string[];
  citiesInSelectedStates: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  currentUser: any;
  darkColors: any;
  data: any[];
  defaultDarkColors: any;
  defaultLightColors: any;
  hasInitializedColors: boolean;
  headers: string[];
  lastProcessedVersion: string;
  lightColors: any;
  preferencesLoaded: boolean;
  preferencesQueryFetched: boolean;
  prefsVersion: string;
  selectedCountries: Set<string>;
  selectedStates: Set<string>;
  sheets: Array<{ id: string; sheetPurpose: string }>;
  statesVersion: string;
  userPreferences: any;
  voip: { makeCall: (phone: string) => void };
  visibleColumns: Record<string, boolean>;
  setColumnOrder: (value: any) => void;
  setColumnWidths: (value: any) => void;
  setDarkModeColors: (value: any) => void;
  setFontSize: (value: number) => void;
  setFreezeFirstColumn: (value: boolean) => void;
  setHasInitializedColors: (value: boolean) => void;
  setLastProcessedVersion: (value: string) => void;
  setLightModeColors: (value: any) => void;
  setLoadDefaultScriptTrigger: (value: any) => void;
  setPreferencesLoaded: (value: boolean) => void;
  setRowHeight: (value: number) => void;
  setSelectedCities: (value: Set<string>) => void;
  setSelectedCountries: (value: Set<string>) => void;
  setSelectedStates: (value: Set<string>) => void;
  setShowMyStoresOnly: (value: boolean) => void;
  setShowStateless: (value: boolean) => void;
  setShowUnclaimedOnly: (value: boolean) => void;
  setStoreDetailsDialog: (value: any) => void;
  setStoreSheetId: (value: string) => void;
  setTextAlign: (value: any) => void;
  setTrackerSheetId: (value: string) => void;
  setVerticalAlign: (value: any) => void;
  setViewAsAgent: (value: boolean) => void;
  setVisibleColumns: (value: any) => void;
}

export function useClientDashboardInitEffects(props: UseClientDashboardInitEffectsProps) {
  useEffect(() => {
    const lightChanged = JSON.stringify(props.lightColors) !== JSON.stringify(props.defaultLightColors);
    const darkChanged = JSON.stringify(props.darkColors) !== JSON.stringify(props.defaultDarkColors);

    if (!props.hasInitializedColors && (lightChanged || darkChanged)) {
      props.setLightModeColors(props.lightColors);
      props.setDarkModeColors(props.darkColors);
      props.setHasInitializedColors(true);
    }
  }, [props.lightColors, props.darkColors, props.hasInitializedColors, props.defaultLightColors, props.defaultDarkColors]);

  useEffect(() => {
    if (props.sheets.length > 0) {
      const storeSheet = props.sheets.find((sheet) => sheet.sheetPurpose === "Store Database");
      const trackerSheet = props.sheets.find((sheet) => sheet.sheetPurpose === "commissions");
      if (storeSheet) props.setStoreSheetId(storeSheet.id);
      if (trackerSheet) props.setTrackerSheetId(trackerSheet.id);
    }
  }, [props.sheets, props.setStoreSheetId, props.setTrackerSheetId]);

  useEffect(() => {
    if (props.headers.length === 0 || !props.preferencesQueryFetched) return;

    const currentVisible = { ...props.visibleColumns };
    const currentWidths = { ...props.columnWidths };
    const currentOrder = [...props.columnOrder];
    const hiddenColumns = ["title", "error"];

    const isAgentColumn = (column: string) => column.toLowerCase() === "agent" || column.toLowerCase() === "agent name";
    const shouldHideColumn = (column: string) => {
      if (isAgentColumn(column) && !canAccessAdminFeatures(props.currentUser)) {
        return true;
      }
      return hiddenColumns.includes(column.toLowerCase());
    };

    let savedPreferences = null as any;
    try {
      const cached = localStorage.getItem("crm_table_preferences");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
          savedPreferences = parsed;
        }
      }
    } catch (error) {
      console.warn("Failed to load from localStorage:", error);
    }

    if (!savedPreferences && props.userPreferences && Object.keys(props.userPreferences).length > 0) {
      savedPreferences = props.userPreferences;
    }

    if (savedPreferences && !props.preferencesLoaded) {
      if (savedPreferences.visibleColumns) {
        props.headers.forEach((header) => {
          currentVisible[header] = savedPreferences.visibleColumns[header] ?? !shouldHideColumn(header);
        });
      } else {
        props.headers.forEach((header) => {
          currentVisible[header] = !shouldHideColumn(header);
        });
      }

      if (savedPreferences.columnOrder && savedPreferences.columnOrder.length > 0) {
        const savedOrder = savedPreferences.columnOrder.filter((column: string) => props.headers.includes(column));
        const newColumns = props.headers.filter((header) => !savedOrder.includes(header));
        const finalOrder = [...savedOrder, ...newColumns].filter((column) => canAccessAdminFeatures(props.currentUser) || !isAgentColumn(column));
        props.setColumnOrder(finalOrder);
      } else {
        const finalOrder = props.headers.filter((column) => canAccessAdminFeatures(props.currentUser) || !isAgentColumn(column));
        props.setColumnOrder(finalOrder);
      }

      props.headers.forEach((header) => {
        currentWidths[header] = savedPreferences.columnWidths?.[header] || 200;
      });

      props.setVisibleColumns(currentVisible);
      props.setColumnWidths(currentWidths);

      if (props.userPreferences?.fontSize) props.setFontSize(props.userPreferences.fontSize);
      if (props.userPreferences?.rowHeight) props.setRowHeight(props.userPreferences.rowHeight);
      if (props.userPreferences?.textAlign) props.setTextAlign(props.userPreferences.textAlign);
      if (props.userPreferences?.verticalAlign) props.setVerticalAlign(props.userPreferences.verticalAlign);
      if (props.userPreferences?.freezeFirstColumn !== undefined) props.setFreezeFirstColumn(props.userPreferences.freezeFirstColumn);
      if (props.userPreferences?.showMyStoresOnly !== undefined) props.setShowMyStoresOnly(props.userPreferences.showMyStoresOnly);

      const userPrefsAny = props.userPreferences as any;
      if (userPrefsAny && userPrefsAny.showUnclaimedOnly !== undefined) {
        props.setShowUnclaimedOnly(userPrefsAny.showUnclaimedOnly);
      } else if (!userPrefsAny?.showMyStoresOnly) {
        props.setShowUnclaimedOnly(true);
      }
      if (userPrefsAny?.showStateless !== undefined) props.setShowStateless(userPrefsAny.showStateless);
      if (props.userPreferences?.viewAsAgent !== undefined) props.setViewAsAgent(props.userPreferences.viewAsAgent);

      props.setPreferencesLoaded(true);
      return;
    }

    if (!props.preferencesLoaded) {
      props.headers.forEach((header) => {
        currentVisible[header] = !shouldHideColumn(header);
        currentWidths[header] = 200;
      });
      props.setVisibleColumns(currentVisible);
      const finalOrder = props.headers.filter((column) => canAccessAdminFeatures(props.currentUser) || !isAgentColumn(column));
      props.setColumnOrder(finalOrder);
      props.setColumnWidths(currentWidths);
      props.setFontSize(14);
      props.setRowHeight(48);
      props.setTextAlign("left");
      props.setVerticalAlign("middle");
      props.setShowMyStoresOnly(false);
      props.setShowUnclaimedOnly(true);
      props.setPreferencesLoaded(true);
      return;
    }

    const newHeaders = props.headers.filter((header) => !currentOrder.includes(header));
    if (newHeaders.length > 0) {
      const headersToAdd = newHeaders.filter((column) => canAccessAdminFeatures(props.currentUser) || !isAgentColumn(column));
      props.setColumnOrder([...currentOrder, ...headersToAdd]);

      const updatedVisible = { ...currentVisible };
      const updatedWidths = { ...currentWidths };
      newHeaders.forEach((header) => {
        updatedVisible[header] = !shouldHideColumn(header);
        updatedWidths[header] = 200;
      });
      props.setVisibleColumns(updatedVisible);
      props.setColumnWidths(updatedWidths);
    }
  }, [props.headers, props.userPreferences, props.preferencesQueryFetched, props.preferencesLoaded, props.currentUser?.role]);

  useEffect(() => {
    if (!props.data || props.data.length === 0 || !props.preferencesLoaded) return;

    const urlParams = new URLSearchParams(window.location.search);
    const storeIdentifier = urlParams.get("store");
    const phoneNumber = urlParams.get("phone");
    const autoCall = urlParams.get("autoCall");
    if (!storeIdentifier) return;

    const matchingStore = props.data.find((row: any) => {
      const link = getLinkValue(row);
      if (!link) return false;
      return normalizeLink(link) === normalizeLink(storeIdentifier);
    });

    if (!matchingStore) return;

    props.setStoreDetailsDialog({ open: true, row: matchingStore });
    props.setLoadDefaultScriptTrigger((prev: number) => prev + 1);

    if (phoneNumber) {
      if (autoCall === "true") {
        const storeName = matchingStore["Name"] || matchingStore["name"] || matchingStore["Company"] || "Unknown Store";
        apiRequest("POST", "/api/call-history", { storeLink: storeIdentifier, phoneNumber, storeName }).catch((error) => {
          console.error("Failed to log call:", error);
        });
      }
      setTimeout(() => props.voip.makeCall(phoneNumber), 800);
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [props.data, props.preferencesLoaded]);

  useEffect(() => {
    if (props.allCountries.length > 0 && props.selectedCountries.size === 0) {
      props.setSelectedCountries(new Set(props.allCountries));
    }
  }, [props.allCountries, props.selectedCountries.size]);

  useEffect(() => {
    if (props.allStates.length === 0 || !props.preferencesLoaded) return;

    const combinedVersion = `${props.statesVersion}|${props.prefsVersion}`;
    if (combinedVersion === props.lastProcessedVersion) return;

    props.setLastProcessedVersion(combinedVersion);

    if (props.userPreferences?.selectedStates && props.userPreferences.selectedStates.length > 0) {
      const validPrefs = props.userPreferences.selectedStates.filter((state: string) => props.allStates.includes(state));
      if (validPrefs.length > 0) {
        props.setSelectedStates(new Set(validPrefs));
        return;
      }
    }

    const currentValidCount = Array.from(props.selectedStates).filter((state) => props.allStates.includes(state)).length;
    if (currentValidCount > 0) return;

    props.setSelectedStates(new Set(props.allStates));
  }, [props.allStates, props.statesVersion, props.prefsVersion, props.selectedStates, props.preferencesLoaded, props.userPreferences, props.lastProcessedVersion]);

  useEffect(() => {
    if (props.citiesInSelectedStates.length > 0) {
      props.setSelectedCities(new Set(props.citiesInSelectedStates));
    } else if (props.citiesInSelectedStates.length === 0) {
      props.setSelectedCities(new Set());
    }
  }, [props.citiesInSelectedStates.join(",")]);
}
