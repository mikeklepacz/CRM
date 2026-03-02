import {
  countApolloCandidates,
  listApolloCandidates,
  rebuildApolloCandidatesFromStoreSheet,
} from "../../services/apolloCandidateService";

export type LeadDiscoveryResponse = {
  contacts: Array<{
    name: string;
    email: string;
    state: string;
    link: string;
    website: string;
    domain?: string | null;
    allLinks?: string[];
    candidateId?: string;
    sourceCount?: number;
  }>;
  stats: {
    source: "apollo_candidates" | "store_sheet" | "qualification_leads" | "none";
    totalRows: number;
    eligibleRows: number;
    deduplicatedRows: number;
    excludedHasEmail: number;
    excludedMissingLink: number;
    excludedAlreadyProcessed: number;
    excludedCategoryMismatch: number;
  };
};

export async function loadCandidateQueueLeadDiscovery(
  tenantId: string,
  projectId: string
): Promise<LeadDiscoveryResponse | null> {
  let candidateCount = await countApolloCandidates(tenantId, projectId);
  let queueStats:
    | {
        totalRows: number;
        keptRows: number;
        candidates: number;
        excludedHasEmail: number;
        excludedMissingLink: number;
        excludedCategoryMismatch: number;
        excludedMissingIdentity: number;
      }
    | null = null;

  if (candidateCount === 0) {
    queueStats = await rebuildApolloCandidatesFromStoreSheet(tenantId, projectId);
    candidateCount = queueStats.candidates;
  }

  if (candidateCount === 0) {
    return null;
  }

  const candidates = await listApolloCandidates(tenantId, projectId);

  return {
    contacts: candidates.map((candidate) => ({
      name: candidate.cleanCompanyName,
      email: "",
      state: "",
      link: candidate.representativeLink,
      website: candidate.domain ? `https://${candidate.domain}` : "",
      domain: candidate.domain,
      allLinks: [candidate.representativeLink],
      candidateId: candidate.id,
      sourceCount: candidate.sourceCount,
    })),
    stats: {
      source: "apollo_candidates",
      totalRows: queueStats?.totalRows ?? candidateCount,
      eligibleRows: queueStats?.keptRows ?? candidateCount,
      deduplicatedRows: candidateCount,
      excludedHasEmail: queueStats?.excludedHasEmail ?? 0,
      excludedMissingLink: queueStats?.excludedMissingLink ?? 0,
      excludedAlreadyProcessed: 0,
      excludedCategoryMismatch: queueStats?.excludedCategoryMismatch ?? 0,
    },
  };
}
