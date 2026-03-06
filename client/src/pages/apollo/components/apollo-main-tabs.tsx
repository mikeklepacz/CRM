import type { ComponentProps } from "react";
import { AlertCircle, Eye, Loader2, Plus, RefreshCw, Search, Sparkles, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApolloEnrichedCompaniesTab } from "@/components/apollo-enriched-companies-tab";
import { ApolloEnrichLeadsTable } from "@/components/apollo-enrich-leads-table";
import { ApolloNotFoundTab } from "@/components/apollo-not-found-tab";
import { ApolloPrescreenResultsTab } from "./apollo-prescreen-results-tab";
import type { ApolloCompany, ApolloLeadDiscoveryStats, ApolloPrescreenResultRow, StoreContact } from "../types";
type EnrichedCompanyRow = ComponentProps<typeof ApolloEnrichedCompaniesTab>["companies"][number];
type ApolloMainTabsProps = {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  enrichedCount: number;
  notFoundCount: number;
  prescreenCount: number;
  notFoundCompanies?: ApolloCompany[];
  notFoundLoading: boolean;
  companies: EnrichedCompanyRow[];
  companiesLoading: boolean;
  projectId?: string;
  projectName?: string;
  projectLoading?: boolean;
  storeLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onOpenManualAdd: () => void;
  onPrescreenAll: () => void;
  isPrescreening: boolean;
  prescreenProgress?: { current: number; total: number };
  contactsNeedingPrescreenCount: number;
  selectedLinksSize: number;
  onStartReviewQueue: () => void;
  reviewQueueLoading: boolean;
  isEnriching: boolean;
  onBulkEnrich: () => void;
  notEnrichedContacts: StoreContact[];
  selectedLinks: Set<string>;
  onToggleSelectAll: () => void;
  onToggleSelect: (link: string) => void;
  onPreview: (contact: StoreContact) => void;
  enrichmentStatus?: Record<string, string | null>;
  failedEnrichmentLinks: Set<string>;
  leadDiscoveryStats?: ApolloLeadDiscoveryStats;
  prescreenRows: ApolloPrescreenResultRow[];
  prescreenLoading: boolean;
  onSetPrescreenDecision: (candidateId: string, decision: "approved" | "rejected") => void;
  isSavingPrescreenDecision: boolean;
};
export function ApolloMainTabs({
  activeTab,
  onActiveTabChange,
  enrichedCount,
  notFoundCount,
  prescreenCount,
  notFoundCompanies,
  notFoundLoading,
  companies,
  companiesLoading,
  projectId,
  projectName,
  projectLoading = false,
  storeLoading,
  searchQuery,
  onSearchQueryChange,
  onOpenManualAdd,
  onPrescreenAll,
  isPrescreening,
  prescreenProgress,
  contactsNeedingPrescreenCount,
  selectedLinksSize,
  onStartReviewQueue,
  reviewQueueLoading,
  isEnriching,
  onBulkEnrich,
  notEnrichedContacts,
  selectedLinks,
  onToggleSelectAll,
  onToggleSelect,
  onPreview,
  enrichmentStatus,
  failedEnrichmentLinks,
  leadDiscoveryStats,
  prescreenRows,
  prescreenLoading,
  onSetPrescreenDecision,
  isSavingPrescreenDecision,
}: ApolloMainTabsProps) {
  const progressCurrent = prescreenProgress?.current || 0;
  const progressTotal = prescreenProgress?.total || 0;
  const progressPercent = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;
  const progressRemaining = progressTotal > 0 ? Math.max(0, progressTotal - progressCurrent) : 0;
  const approvedDecisionCount = prescreenRows.filter((row) => row.candidateStatus === "approved").length;
  const pendingDecisionCount = prescreenRows.filter((row) => row.candidateStatus === "pending").length;
  return (
    <Tabs value={activeTab} onValueChange={onActiveTabChange}>
      {isPrescreening && progressTotal > 0 && (
        <div className="mb-3 border rounded-md p-3 bg-muted/30">
          <div className="text-sm font-medium">
            Pre-screen running: {progressCurrent} / {progressTotal} checked ({progressPercent}%)
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Remaining: {progressRemaining}
          </div>
          <div className="h-1.5 bg-muted rounded overflow-hidden mt-2">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        </div>
      )}
      <TabsList>
        <TabsTrigger value="enrich" data-testid="tab-enrich">
          <Search className="h-4 w-4 mr-2" />
          Enrich Leads
        </TabsTrigger>
        <TabsTrigger value="enriched" data-testid="tab-enriched">
          <Users className="h-4 w-4 mr-2" />
          Enriched Contacts ({enrichedCount})
        </TabsTrigger>
        <TabsTrigger value="not-found" data-testid="tab-not-found">
          <AlertCircle className="h-4 w-4 mr-2" />
          Not Found ({notFoundCount})
        </TabsTrigger>
        <TabsTrigger value="prescreen" data-testid="tab-prescreen">
          <Eye className="h-4 w-4 mr-2" />
          Pre-screen ({prescreenCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="enrich" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Store Database Contacts</CardTitle>
                <CardDescription>
                  Select companies to enrich with Apollo contact data
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  onClick={onOpenManualAdd}
                  disabled={!projectId}
                  data-testid="button-manual-add"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manual Add
                </Button>
                <Input
                  placeholder="Search by name, email, or state..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="w-64"
                  data-testid="input-search"
                />
                <Button
                  variant="outline"
                  onClick={onPrescreenAll}
                  disabled={isPrescreening || contactsNeedingPrescreenCount === 0}
                  data-testid="button-prescreen-all"
                >
                  {isPrescreening ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Pre-screen All ({contactsNeedingPrescreenCount})
                </Button>
                {selectedLinksSize > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={onStartReviewQueue}
                      disabled={isEnriching || reviewQueueLoading}
                      data-testid="button-review-queue"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review {selectedLinksSize}
                    </Button>
                    <Button
                      onClick={onBulkEnrich}
                      disabled={isEnriching}
                      data-testid="button-bulk-enrich"
                    >
                      {isEnriching ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Enrich {selectedLinksSize} Selected
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isPrescreening && prescreenProgress && prescreenProgress.total > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-muted-foreground">
                  Pre-screen progress: {prescreenProgress.current} / {prescreenProgress.total} (
                  {Math.round((prescreenProgress.current / prescreenProgress.total) * 100)}%)
                </div>
                <div className="h-1.5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.round((prescreenProgress.current / prescreenProgress.total) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {projectLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !projectId ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a project from the top bar to view contacts for enrichment.
                </AlertDescription>
              </Alert>
            ) : storeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notEnrichedContacts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>No contacts to enrich for project "{projectName}".</div>
                  {leadDiscoveryStats?.source === "apollo_candidates" && pendingDecisionCount > 0 && (
                    <div className="mt-2 text-xs">
                      {approvedDecisionCount > 0
                        ? `Approved: ${approvedDecisionCount}. Pending pre-screen decisions: ${pendingDecisionCount}.`
                        : `Pre-screen decisions are still pending for ${pendingDecisionCount} companies. Mark rows as "Valid" in Pre-screen to move them into Enrich Leads.`}
                    </div>
                  )}
                  {leadDiscoveryStats && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div>
                        Source: {leadDiscoveryStats.source === "apollo_candidates"
                          ? "Apollo Candidate Queue"
                          : leadDiscoveryStats.source === "store_sheet"
                            ? "Store Database Sheet"
                            : leadDiscoveryStats.source === "qualification_leads"
                              ? "Qualification Leads"
                              : "None"}
                      </div>
                      <div>
                        Rows scanned: {leadDiscoveryStats.totalRows} | Eligible: {leadDiscoveryStats.eligibleRows} | After domain dedupe: {leadDiscoveryStats.deduplicatedRows}
                      </div>
                      <div>
                        Excluded - has email: {leadDiscoveryStats.excludedHasEmail}, missing link: {leadDiscoveryStats.excludedMissingLink}, already processed: {leadDiscoveryStats.excludedAlreadyProcessed}, category mismatch: {leadDiscoveryStats.excludedCategoryMismatch}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <ApolloEnrichLeadsTable
                contacts={notEnrichedContacts}
                selectedLinks={selectedLinks}
                onToggleSelectAll={onToggleSelectAll}
                onToggleSelect={onToggleSelect}
                onPreview={onPreview}
                enrichmentStatus={enrichmentStatus}
                failedEnrichmentLinks={failedEnrichmentLinks}
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="enriched" className="space-y-4">
        <ApolloEnrichedCompaniesTab
          companies={companies}
          isLoading={companiesLoading}
          projectId={projectId}
        />
      </TabsContent>
      <TabsContent value="not-found" className="space-y-4">
        <ApolloNotFoundTab companies={notFoundCompanies} isLoading={notFoundLoading} projectId={projectId} />
      </TabsContent>
      <TabsContent value="prescreen" className="space-y-4">
        <ApolloPrescreenResultsTab
          projectId={projectId}
          isLoading={prescreenLoading}
          rows={prescreenRows}
          onDecision={onSetPrescreenDecision}
          isSavingDecision={isSavingPrescreenDecision}
          isPrescreening={isPrescreening}
          prescreenProgress={prescreenProgress}
        />
      </TabsContent>
    </Tabs>
  );
}
