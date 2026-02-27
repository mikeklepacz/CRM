import type { Express } from "express";
import { z } from "zod";
import { importSequenceRecipientsFromSheet } from "../../services/ehub/sequenceRecipientsFromSheetService";
import { isSequenceRecipientImportError } from "../../services/ehub/sequenceRecipientsImportShared";
import type { EhubSequencesRecipientsWriteDeps } from "./sequencesRecipientsWrite.types";

const recipientsImportBodySchema = z.object({
  sheetId: z.string().min(1, "Google Sheet ID is required"),
});

export function registerSequencesRecipientsImportFromSheetRoute(app: Express, deps: EhubSequencesRecipientsWriteDeps): void {
  app.post("/api/sequences/:id/recipients", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const { sheetId } = recipientsImportBodySchema.parse(req.body);
      const result = await importSequenceRecipientsFromSheet({
        sequenceId: req.params.id,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        sheetId,
      });
      res.json(result);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      if (isSequenceRecipientImportError(error)) {
        return res.status(error.status).json({ message: error.message, details: error.details });
      }
      console.error("Error importing recipients from Google Sheet:", error);
      res.status(500).json({ message: error.message || "Failed to import recipients" });
    }
  });
}
