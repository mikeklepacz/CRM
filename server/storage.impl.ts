import { coreUserTenantMethods } from "./storage-methods/coreUserTenantMethods";
import { elevenLabsCallAiMethods } from "./storage-methods/elevenLabsCallAiMethods";
import { integrationSalesImportMethods } from "./storage-methods/integrationSalesImportMethods";
import { kbAssistantVoiceMethods } from "./storage-methods/kbAssistantVoiceMethods";
import { mapStatusTicketFollowupMethods } from "./storage-methods/mapStatusTicketFollowupMethods";
import { pipelineProjectBlueprintMethods } from "./storage-methods/pipelineProjectBlueprintMethods";
import { reminderCollaborationMethods } from "./storage-methods/reminderCollaborationMethods";
import { schedulingQualificationEmailMethods } from "./storage-methods/schedulingQualificationEmailMethods";
import { sequenceRecipientMethods } from "./storage-methods/sequenceRecipientMethods";
import { sequenceSchedulingSenderMethods } from "./storage-methods/sequenceSchedulingSenderMethods";
import type { IStorage } from "./storage.contract";
import type { StorageRuntimeContract } from "./storage.runtime-contract";

export type { IStorage } from "./storage.contract";
export type { StorageRuntimeContract } from "./storage.runtime-contract";

type MethodGroup = Partial<StorageRuntimeContract>;

const METHOD_GROUPS: MethodGroup[] = [
  coreUserTenantMethods,
  pipelineProjectBlueprintMethods,
  integrationSalesImportMethods,
  reminderCollaborationMethods,
  mapStatusTicketFollowupMethods,
  elevenLabsCallAiMethods,
  kbAssistantVoiceMethods,
  sequenceRecipientMethods,
  sequenceSchedulingSenderMethods,
  schedulingQualificationEmailMethods,
];

function attachStorageMethodGroup(group: MethodGroup): void {
  for (const [methodName, method] of Object.entries(group)) {
    if (!method) {
      continue;
    }

    Object.defineProperty(DatabaseStorage.prototype, methodName, {
      value: method,
      configurable: true,
      writable: true,
    });
  }
}

export class DatabaseStorage {}

export interface DatabaseStorage extends StorageRuntimeContract {}

for (const methodGroup of METHOD_GROUPS) {
  attachStorageMethodGroup(methodGroup);
}

export const storage: StorageRuntimeContract = new DatabaseStorage();
