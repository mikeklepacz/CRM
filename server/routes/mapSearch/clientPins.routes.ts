import type { Express } from "express";
import { buildClientPins } from "../../services/mapSearch/clientPinsService";
import { resolveStoreDatabaseSheet } from "../../services/sheets/storeDatabaseResolver";

type Deps = {
  isAuthenticatedCustom: any;
  geocodeAddress: (address: string) => Promise<{ lat: number; lng: number } | null>;
  primeGeocodeCache: (address: string, coords: { lat: number; lng: number }) => void;
};

export function registerMapSearchClientPinsRoutes(app: Express, deps: Deps): void {
  app.post("/api/maps/client-pins", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { storeSheetId, trackerSheetId, joinColumn, state, city, projectId } = req.body;

      const resolvedStoreSheet = await resolveStoreDatabaseSheet({
        tenantId: req.user?.tenantId,
        projectId,
        sheetId: storeSheetId,
        preferProjectMatch: true,
      });

      const effectiveStoreSheetId = resolvedStoreSheet?.id || storeSheetId;
      if (!effectiveStoreSheetId || !trackerSheetId || !joinColumn || !state) {
        return res.status(400).json({ message: "storeSheetId or projectId, trackerSheetId, joinColumn, and state are required" });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims?.sub;
      const pins = await buildClientPins(
        {
          storeSheetId: effectiveStoreSheetId,
          trackerSheetId,
          joinColumn,
          state,
          city,
          tenantId: req.user?.tenantId,
          userId,
        },
        {
          geocodeAddress: deps.geocodeAddress,
          primeGeocodeCache: deps.primeGeocodeCache,
        }
      );

      res.json({ pins });
    } catch (error: any) {
      if (error.message === "One or both sheets not found") {
        return res.status(404).json({ message: "One or both sheets not found" });
      }
      console.error("Error fetching client pins:", error);
      res.status(500).json({ message: error.message || "Failed to fetch client pins" });
    }
  });
}
