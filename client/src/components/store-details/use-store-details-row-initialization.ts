import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getRowValueFromRecord } from "@/components/store-details/store-details-dialog-utils";

interface UseStoreDetailsRowInitializationParams {
  row: any;
  open: boolean;
  storeSheetId: string | undefined;
  franchiseContext?: { brandName: string; allLocations: any[] };
  dbaStores: any[] | undefined;
  multiLocationMode: boolean;
  dbaName: string;
  setFormData: Dispatch<SetStateAction<any>>;
  setInitialData: Dispatch<SetStateAction<any>>;
  setMultiLocationMode: Dispatch<SetStateAction<boolean>>;
  setDbaName: Dispatch<SetStateAction<string>>;
  setCurrentDbaStores: Dispatch<SetStateAction<Array<{ link: string; name: string }>>>;
  setSelectedStores: Dispatch<SetStateAction<Array<{ link: string; name: string }>>>;
  activeRowLink: string | null;
  setActiveRowLink: Dispatch<SetStateAction<string | null>>;
}

export function useStoreDetailsRowInitialization({
  row,
  open,
  storeSheetId,
  franchiseContext,
  dbaStores,
  multiLocationMode,
  dbaName,
  setFormData,
  setInitialData,
  setMultiLocationMode,
  setDbaName,
  setCurrentDbaStores,
  setSelectedStores,
  activeRowLink,
  setActiveRowLink,
}: UseStoreDetailsRowInitializationParams) {
  const [preservedFranchiseContext, setPreservedFranchiseContext] = useState<{
    brandName: string;
    allLocations: any[];
  } | null>(null);

  useEffect(() => {
    if (row && open) {
      if (franchiseContext) {
        setPreservedFranchiseContext(franchiseContext);
      }

      const getValue = (fieldNames: string[]) => getRowValueFromRecord(row, fieldNames);

      const populatedData = {
        name: getValue(["Name", "name"]),
        type: getValue(["Type", "type"]),
        link: getValue(["Link", "link"]),
        address: getValue(["Address", "address"]),
        city: getValue(["City", "city"]),
        state: getValue(["State", "state"]),
        phone: getValue(["Phone", "phone"]),
        website: getValue(["Website", "website"]),
        email: getValue(["Email", "email"]),
        sales_ready_summary: getValue(["Sales-ready Summary", "sales_ready_summary", "Vibe Score"]),
        notes: getValue(["Notes", "notes"]),
        point_of_contact: getValue(["Point of Contact", "point_of_contact", "POC"]),
        poc_email: getValue(["POC Email", "poc_email"]),
        poc_phone: getValue(["POC Phone", "poc_phone"]),
        status: getValue(["Status", "status"]),
        follow_up_date: getValue(["Follow-Up Date", "follow_up_date"]),
        next_action: getValue(["Next Action", "next_action"]),
        open: getValue(["Open", "open"]) || "TRUE",
        automated_line: getValue(["Automated Line", "automated_line"]) || "FALSE",
        dba: getValue(["DBA", "dba"]),
        parent_link: getValue(["Parent Link", "parent_link"]),
        is_parent: getValue(["Is Parent", "is_parent"]),
        head_office_link: getValue(["Head Office Link", "head_office_link"]),
      };
      setFormData(populatedData);
      setInitialData(populatedData);

      const currentLink = getValue(["Link", "link"]);
      setActiveRowLink(currentLink);

      const existingDba = getValue(["DBA", "dba"]);
      const activeFranchiseContext = preservedFranchiseContext || franchiseContext;

      if (activeFranchiseContext && activeFranchiseContext.allLocations && activeFranchiseContext.allLocations.length > 0) {
        setMultiLocationMode(true);
        setDbaName(activeFranchiseContext.brandName);
        const validLocations = activeFranchiseContext.allLocations
          .map((loc: any) => {
            const link = loc.link || loc.Link;
            const name = loc.name || loc.Name;
            return link && name ? { link, name } : null;
          })
          .filter((loc): loc is { link: string; name: string } => loc !== null);

        if (validLocations.length > 0) {
          setSelectedStores(validLocations);
        } else {
          setSelectedStores([]);
        }
        setCurrentDbaStores([]);
      } else if (existingDba && existingDba.trim()) {
        setMultiLocationMode(true);
        setDbaName(existingDba.trim());
        setCurrentDbaStores([]);
        setSelectedStores([]);
      } else {
        setMultiLocationMode(false);
        setDbaName("");
        setCurrentDbaStores([]);
        setSelectedStores([]);
      }
    } else if (!open) {
      setActiveRowLink(null);
      setPreservedFranchiseContext(null);
    }
  }, [row, open, storeSheetId, franchiseContext]);

  useEffect(() => {
    if (dbaStores && Array.isArray(dbaStores) && multiLocationMode && activeRowLink && dbaName) {
      setCurrentDbaStores(dbaStores.map((s: any) => ({ link: s.link, name: s.name })));
      setSelectedStores([]);
    }
  }, [dbaStores, multiLocationMode, activeRowLink]);

}
