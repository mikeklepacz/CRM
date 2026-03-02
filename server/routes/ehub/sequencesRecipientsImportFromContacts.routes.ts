import type { Express } from "express";
import { z } from "zod";
import { importSequenceRecipientsFromContacts } from "../../services/ehub/sequenceRecipientsFromContactsService";
import { isSequenceRecipientImportError } from "../../services/ehub/sequenceRecipientsImportShared";
import type { EhubSequencesRecipientsWriteDeps } from "./sequencesRecipientsWrite.types";

const contactsImportBodySchema = z.object({
  contacts: z.array(z.any()).optional(),
  selectAll: z.boolean().optional(),
  search: z.string().optional(),
  statusFilter: z.string().optional(),
});

export function registerSequencesRecipientsImportFromContactsRoute(app: Express, deps: EhubSequencesRecipientsWriteDeps): void {
  app.post("/api/sequences/:id/contacts", deps.isAuthenticatedCustom, deps.isAdmin, async (req: any, res) => {
    try {
      const body = contactsImportBodySchema.parse(req.body);
      const result = await importSequenceRecipientsFromContacts({
        sequenceId: req.params.id,
        tenantId: req.user.tenantId,
        contacts: body.contacts,
        selectAll: body.selectAll,
        search: body.search,
        statusFilter: body.statusFilter,
      });
      res.json(result);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      if (isSequenceRecipientImportError(error)) {
        return res.status(error.status).json({ message: error.message, details: error.details });
      }
      console.error("Error importing recipients from contacts:", error);
      res.status(500).json({ message: error.message || "Failed to import recipients" });
    }
  });
}
