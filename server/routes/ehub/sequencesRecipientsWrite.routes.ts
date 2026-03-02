import type { Express } from "express";
import type { EhubSequencesRecipientsWriteDeps as Deps } from "./sequencesRecipientsWrite.types";
import { registerSequencesRecipientsImportFromSheetRoute } from "./sequencesRecipientsImportFromSheet.routes";
import { registerSequencesRecipientsImportFromContactsRoute } from "./sequencesRecipientsImportFromContacts.routes";

export function registerEhubSequencesRecipientsWriteRoutes(app: Express, deps: Deps): void {
  registerSequencesRecipientsImportFromSheetRoute(app, deps);
  registerSequencesRecipientsImportFromContactsRoute(app, deps);
}
