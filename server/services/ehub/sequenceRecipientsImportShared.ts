import { storage } from "../../storage";
import { invalidateCache } from "../ehubContactsService";

export class SequenceRecipientImportError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function isSequenceRecipientImportError(error: unknown): error is SequenceRecipientImportError {
  return error instanceof SequenceRecipientImportError;
}

export async function ensureImportableSequence(sequenceId: string, tenantId: string) {
  const sequence = await storage.getSequence(sequenceId, tenantId);
  if (!sequence) {
    throw new SequenceRecipientImportError(404, "Sequence not found");
  }

  const stepDelays = (sequence.stepDelays || []).map((d: string | number) => parseFloat(String(d)));
  if (stepDelays.length === 0) {
    throw new SequenceRecipientImportError(400, "Sequence has no steps configured");
  }

  return sequence;
}

export async function persistImportedRecipients(sequenceId: string, tenantId: string, sequence: any, recipients: any[]) {
  const created = await storage.addRecipients(recipients);

  for (const recipient of created) {
    await storage.updateRecipientStatus(recipient.id, {
      status: "in_sequence",
      currentStep: 0,
      nextSendAt: null,
    });
  }

  await storage.updateSequenceStats(sequenceId, tenantId, {
    totalRecipients: (sequence.totalRecipients || 0) + created.length,
  } as any);

  invalidateCache(tenantId);
  return created;
}

export function normalizeState(rawState: string): string | undefined {
  return rawState
    .replace(/\([^)]*\)/g, "")
    .split(/[-\u2013\u2014\/]/)
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "usa")[0]
    ?.toUpperCase();
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
