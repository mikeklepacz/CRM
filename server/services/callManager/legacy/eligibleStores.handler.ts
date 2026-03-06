import * as googleSheets from "../../../googleSheets";
import { buildSheetRange } from "../../sheets/a1Range";
import { resolveStoreDatabaseSheet } from "../../sheets/storeDatabaseResolver";

type Deps = {
  storage: any;
  checkAdminAccess: (user: any, tenantId: string) => Promise<boolean>;
  parseHoursToStructured: (hours: string, state: string) => Array<{
    day: string;
    hours: string;
    isToday: boolean;
    isClosed: boolean;
  }>;
  checkIfStoreOpen: (hours: string, state: string) => boolean;
};

export function createEligibleStoresHandler(deps: Deps) {
  const { storage, checkAdminAccess, parseHoursToStructured, checkIfStoreOpen } = deps;

  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdminUser = await checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const { scenario } = req.params;
      const tenantId = (req.user as any).tenantId;
      const projectId = req.query.projectId as string | undefined;

      const commissionSheet = await storage.getGoogleSheetByPurpose("commissions", tenantId);
      const storeSheet = await resolveStoreDatabaseSheet({
        tenantId,
        projectId,
        preferProjectMatch: true,
        requireProjectMatch: !!projectId,
      });
      const hasSheetsConfigured = commissionSheet && storeSheet;

      let commissionData: any[] = [];
      let storeData: any[] = [];

      if (hasSheetsConfigured) {
        const commissionRange = buildSheetRange(commissionSheet.sheetName, "A:ZZ");
        const commissionRows = await googleSheets.readSheetData(commissionSheet.spreadsheetId, commissionRange);
        if (commissionRows.length > 0) {
          const commissionHeaders = commissionRows[0];
          commissionData = commissionRows.slice(1).map((row: any[]) => {
            const obj: any = {};
            commissionHeaders.forEach((header: string, i: number) => {
              obj[header] = row[i] || "";
            });
            return obj;
          });
        }

        const storeRange = buildSheetRange(storeSheet.sheetName, "A:ZZ");
        const storeRows = await googleSheets.readSheetData(storeSheet.spreadsheetId, storeRange);
        if (storeRows.length > 0) {
          const storeHeaders = storeRows[0];
          storeData = storeRows.slice(1).map((row: any[]) => {
            const obj: any = {};
            storeHeaders.forEach((header: string, i: number) => {
              obj[header] = row[i] || "";
            });
            return obj;
          });
        }
      }

      const storeMap = new Map();
      storeData.forEach((store: any) => {
        const link = store["Link"] || store["link"];
        if (link) {
          storeMap.set(link, store);
        }
      });

      const stores = commissionData
        .map((commission: any) => {
          const link = commission["Link"] || commission["link"];
          const storeDetails = storeMap.get(link) || {};
          return {
            ...commission,
            ...storeDetails,
            Link: link,
          };
        })
        .filter((store: any) => store.Link);

      let projectFilteredStores = stores;

      if (projectId) {
        const projectCategories = await storage.getAllCategories(tenantId, projectId);
        const projectCategoryNames = new Set(projectCategories.map((c: any) => c.name.toLowerCase()));

        if (projectCategoryNames.size > 0) {
          projectFilteredStores = stores.filter((store: any) => {
            const storeCategory = (store["Category"] || store["category"] || "").toLowerCase().trim();
            return storeCategory && projectCategoryNames.has(storeCategory);
          });
        } else {
          projectFilteredStores = [];
        }
      }

      let eligibleStores = projectFilteredStores;
      if (scenario === "cold_calls") {
        eligibleStores = projectFilteredStores.filter((store: any) => {
          const status = store["Status"] || store["status"] || "";
          return status.toLowerCase() === "claimed";
        });
      } else if (scenario === "follow_ups") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        eligibleStores = projectFilteredStores.filter((store: any) => {
          const status = store["Status"] || store["status"] || "";
          const followUpDate = store["Follow-up Date"] || store["follow_up_date"] || store["followUpDate"] || "";
          if (status.toLowerCase() !== "interested" || !followUpDate) {
            return false;
          }

          try {
            const followUpDateTime = new Date(followUpDate);
            followUpDateTime.setHours(0, 0, 0, 0);
            return followUpDateTime <= today;
          } catch {
            return false;
          }
        });
      } else if (scenario === "recovery") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        eligibleStores = projectFilteredStores.filter((store: any) => {
          const agentName = store["Agent Name"] || store["agent_name"] || store["agentName"] || "";
          const lastContact =
            store["Last Contact"] || store["last_contact_date"] || store["lastContactDate"] || "";

          if (!agentName || agentName === user?.agentName) {
            return false;
          }
          if (!lastContact) {
            return true;
          }

          try {
            const lastContactDate = new Date(lastContact);
            return lastContactDate < thirtyDaysAgo;
          } catch {
            return true;
          }
        });
      }

      const storesWithHours = eligibleStores
        .map((store: any) => {
          const name = store["Name"] || "";
          const phone = store["Phone"] || "";
          const hours = store["Hours"] || "";
          const state = store["State"] || "";
          const link = store["Link"] || "";

          const agentName = store["Agent Name"] || "";
          const status = store["Status"] || "";

          return {
            link,
            businessName: name,
            state,
            phone,
            hours,
            hoursSchedule: parseHoursToStructured(hours, state),
            isOpen: checkIfStoreOpen(hours, state),
            agentName,
            status,
            source: "sheets" as const,
          };
        })
        .filter((store: any) => store.businessName && store.businessName.trim().length > 0);

      let qualificationLeadsContacts: any[] = [];
      if (scenario === "cold_calls" || scenario === "qualification" || scenario === "follow_ups") {
        const { leads } = await storage.listQualificationLeads(tenantId, { limit: 1000 });

        let callableLeads: any[] = [];
        if (scenario === "follow_ups") {
          const now = new Date();
          callableLeads = leads.filter((lead: any) => {
            const hasPhone = lead.pocPhone && lead.pocPhone.trim().length > 0;
            if (!hasPhone || lead.followUpNeeded !== true || !lead.followUpDate) {
              return false;
            }

            try {
              const followUpDateTime = new Date(lead.followUpDate);
              return followUpDateTime <= now;
            } catch {
              return false;
            }
          });
        } else {
          callableLeads = leads.filter((lead: any) => lead.pocPhone && lead.pocPhone.trim().length > 0);
        }

        let filteredLeads = callableLeads;
        if (projectId) {
          const projectCategories = await storage.getAllCategories(tenantId, projectId);
          const projectCategoryNames = new Set(projectCategories.map((c: any) => c.name.toLowerCase()));

          if (projectCategoryNames.size > 0) {
            filteredLeads = callableLeads.filter((lead: any) => {
              const leadCategory = (lead.category || "").toLowerCase().trim();
              return !leadCategory || projectCategoryNames.has(leadCategory);
            });
          }
        }

        qualificationLeadsContacts = filteredLeads.map((lead: any) => ({
          link: `lead:${lead.id}`,
          leadId: lead.id,
          businessName: lead.company || "Unknown Company",
          state: lead.state || lead.country || "",
          country: lead.country || "",
          phone: lead.pocPhone || "",
          hours: "",
          hoursSchedule: [],
          isOpen: true,
          agentName: "",
          status: scenario === "follow_ups" ? "follow_up" : lead.callStatus || "pending",
          pocName: lead.pocName || "",
          website: lead.website || "",
          source: "leads" as const,
          callbackNote: lead.callbackNote || "",
          followUpDate: lead.followUpDate || null,
        }));
      }

      res.json([...storesWithHours, ...qualificationLeadsContacts]);
    } catch (error: any) {
      console.error("Error fetching eligible stores:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  };
}
