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
import type { ApolloCompany, StoreContact } from "../types";

type EnrichedCompanyRow = ComponentProps<typeof ApolloEnrichedCompaniesTab>["companies"][number];

type ApolloMainTabsProps = {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  enrichedCount: number;
  notFoundCount: number;
  notFoundCompanies?: ApolloCompany[];
  notFoundLoading: boolean;
  companies: EnrichedCompanyRow[];
  companiesLoading: boolean;
  projectId?: string;
  projectName?: string;
  storeLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onOpenManualAdd: () => void;
  onPrescreenAll: () => void;
  isPrescreening: boolean;
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
};

export function ApolloMainTabs({
  activeTab,
  onActiveTabChange,
  enrichedCount,
  notFoundCount,
  notFoundCompanies,
  notFoundLoading,
  companies,
  companiesLoading,
  projectId,
  projectName,
  storeLoading,
  searchQuery,
  onSearchQueryChange,
  onOpenManualAdd,
  onPrescreenAll,
  isPrescreening,
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
}: ApolloMainTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onActiveTabChange}>
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
          </CardHeader>
          <CardContent>
            {!projectId ? (
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
                  No contacts to enrich for project "{projectName}". All contacts have been processed.
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
    </Tabs>
  );
}
