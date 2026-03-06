import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ApolloPrescreenDisplayControls } from "./apollo-prescreen-display-controls";
import { ApolloPrescreenPeopleDialog } from "./apollo-prescreen-people-dialog";
import { ApolloPrescreenResultRowItem } from "./apollo-prescreen-result-row";
import type { ApolloPrescreenPersonPreview, ApolloPrescreenResultRow } from "../types";

export function ApolloPrescreenResultsTab(props: {
  isLoading: boolean;
  rows: ApolloPrescreenResultRow[];
  projectId?: string;
  onDecision: (candidateId: string, decision: "approved" | "rejected") => void;
  isSavingDecision: boolean;
  isPrescreening?: boolean;
  prescreenProgress?: { current: number; total: number };
}) {
  const { isLoading, rows, projectId, onDecision, isSavingDecision, isPrescreening = false, prescreenProgress } = props;
  const [showNotFound, setShowNotFound] = useState(false);
  const [showOnlyWithPeople, setShowOnlyWithPeople] = useState(false);
  const [showSourceLink, setShowSourceLink] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(true);
  const [showAbout, setShowAbout] = useState(true);
  const [showKeywords, setShowKeywords] = useState(true);
  const [peopleDialogOpen, setPeopleDialogOpen] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | undefined>(undefined);
  const [peopleContextName, setPeopleContextName] = useState<string | undefined>(undefined);
  const [peoplePreviewCompany, setPeoplePreviewCompany] = useState<any>(null);
  const [peoplePreviewContacts, setPeoplePreviewContacts] = useState<any[]>([]);
  const [peoplePreviewTotal, setPeoplePreviewTotal] = useState(0);
  const [isRescreening, setIsRescreening] = useState(false);
  const [peopleOverrides, setPeopleOverrides] = useState<Record<string, { count: number; preview: ApolloPrescreenPersonPreview[] }>>({});
  if (!projectId) {
    return <div className="text-center py-8 text-muted-foreground">Select a project to view pre-screen results</div>;
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!rows.length) {
    return <div className="text-center py-8 text-muted-foreground">No pre-screen results yet for this project</div>;
  }
  const getPeopleCount = (row: ApolloPrescreenResultRow) => {
    const override = peopleOverrides[row.candidateId];
    if (override) return override.count;
    return Math.max(0, row.prescreenContactCount || 0);
  };
  const getPeoplePreview = (row: ApolloPrescreenResultRow) => {
    const override = peopleOverrides[row.candidateId];
    if (override) return override.preview;
    return Array.isArray(row.prescreenPeoplePreview) ? row.prescreenPeoplePreview : [];
  };
  const hasPeopleMetadata = (row: ApolloPrescreenResultRow) => row.prescreenContactCount !== null;
  const filteredRows = useMemo(() => {
    let visibleRows = showNotFound ? rows : rows.filter((row) => row.apolloStatus !== "not_found");
    if (showOnlyWithPeople) {
      visibleRows = visibleRows.filter((row) => getPeopleCount(row) > 0);
    }
    return visibleRows;
  }, [rows, showNotFound, showOnlyWithPeople, peopleOverrides]);
  const metrics = useMemo(() => {
    const normalizeApolloStatus = (value: string | null | undefined) => (value || "").toLowerCase().trim();
    const resolvedDecision = (row: ApolloPrescreenResultRow) => {
      if (normalizeApolloStatus(row.apolloStatus) === "not_found" && row.candidateStatus === "pending") {
        return "rejected";
      }
      return row.candidateStatus;
    };

    const total = rows.length;
    const matched = rows.filter((row) => {
      const status = normalizeApolloStatus(row.apolloStatus);
      return status === "prescreened" || status === "enriched";
    }).length;
    const notFound = rows.filter((row) => normalizeApolloStatus(row.apolloStatus) === "not_found").length;

    const processed = rows.filter((row) => {
      const status = normalizeApolloStatus(row.apolloStatus);
      return !!status && status !== "unchecked" && status !== "pending";
    }).length;
    const unchecked = total - processed;

    const approved = rows.filter((row) => resolvedDecision(row) === "approved").length;
    const rejected = rows.filter((row) => resolvedDecision(row) === "rejected").length;
    const pendingDecision = rows.filter((row) => resolvedDecision(row) === "pending").length;

    return { total, matched, notFound, unchecked, approved, rejected, pendingDecision, processed };
  }, [rows]);
  const apolloMatchLabel = (row: ApolloPrescreenResultRow) => {
    if (row.apolloStatus === "not_found") return "Not Found";
    if (row.apolloStatus === "prescreened") return "Matched";
    if (row.apolloStatus === "enriched") return "Enriched";
    return "Unchecked";
  };
  const displayDecision = (row: ApolloPrescreenResultRow) => {
    if (row.apolloStatus === "not_found" && row.candidateStatus === "pending") {
      return "rejected";
    }
    return row.candidateStatus;
  };
  const toPreviewPeople = (contacts: any[]): ApolloPrescreenPersonPreview[] => (
    (contacts || []).slice(0, 5).map((person) => ({
      id: person.id,
      firstName: person.first_name || null,
      lastName: person.last_name || null,
      title: person.title || null,
      seniority: person.seniority || null,
      hasEmail: !!person.has_email,
      linkedinUrl: person.linkedin_url || null,
    }))
  );
  const toPreviewWebsite = (row: ApolloPrescreenResultRow): string | undefined => {
    if (row.websiteUrl) return row.websiteUrl;
    const domain = row.apolloDomain || row.candidateDomain;
    return domain ? `https://${domain}` : undefined;
  };
  const openPeoplePreview = async (row: ApolloPrescreenResultRow) => {
    setPeopleDialogOpen(true);
    setPeopleLoading(true);
    setPeopleError(undefined);
    setPeopleContextName(row.apolloName || row.cleanCompanyName);
    setPeoplePreviewCompany(null);
    setPeoplePreviewContacts([]);
    setPeoplePreviewTotal(0);
    try {
      const response = await fetch("/api/apollo/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          domain: row.apolloDomain || row.candidateDomain || undefined,
          companyName: row.apolloName || row.cleanCompanyName,
          googleSheetLink: row.representativeLink,
          projectId,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to fetch people preview");
      }
      const preview = await response.json();
      setPeoplePreviewCompany(preview.company || null);
      setPeoplePreviewContacts(preview.contacts || []);
      setPeoplePreviewTotal(preview.totalContacts || 0);
      setPeopleOverrides((prev) => ({
        ...prev,
        [row.candidateId]: {
          count: Math.max(0, preview.totalContacts || 0),
          preview: toPreviewPeople(preview.contacts || []),
        },
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/prescreen-results", projectId] });
    } catch (error: any) {
      setPeopleError(error?.message || "Failed to load pre-screen people preview");
    } finally {
      setPeopleLoading(false);
    }
  };
  const handleRescreenFiltered = async () => {
    const contacts = filteredRows
      .filter((row) => row.representativeLink)
      .map((row) => ({
        link: row.representativeLink,
        website: toPreviewWebsite(row),
        name: row.apolloName || row.cleanCompanyName,
      }));

    if (contacts.length === 0) return;
    setIsRescreening(true);
    try {
      await apiRequest("POST", "/api/apollo/bulk-prescreen", {
        contacts,
        forceRescreen: true,
        projectId,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/apollo/prescreen-results", projectId] });
    } finally {
      setIsRescreening(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground border rounded-md p-2 flex items-center justify-between">
        {isPrescreening && (prescreenProgress?.total || 0) > 0 ? (
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking in progress: {prescreenProgress?.current || 0} / {prescreenProgress?.total || 0} (remaining{" "}
            {Math.max(0, (prescreenProgress?.total || 0) - (prescreenProgress?.current || 0))})
          </div>
        ) : (
          <div>Status: Idle. Use Pre-screen All in Enrich Leads to check remaining unchecked rows.</div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 text-xs">
        <Badge variant="outline">Total {metrics.total}</Badge>
        <Badge variant="outline">Processed {metrics.processed}</Badge>
        <Badge variant="outline">Matched {metrics.matched}</Badge>
        <Badge variant="outline">Not Found {metrics.notFound}</Badge>
        <Badge variant="outline">Unchecked {metrics.unchecked}</Badge>
        <Badge variant="outline">Pending Decision {metrics.pendingDecision}</Badge>
        <Badge variant="outline">Approved {metrics.approved}</Badge>
        <Badge variant="outline">Rejected {metrics.rejected}</Badge>
      </div>

      <ApolloPrescreenDisplayControls
        showNotFound={showNotFound}
        setShowNotFound={setShowNotFound}
        showOnlyWithPeople={showOnlyWithPeople}
        setShowOnlyWithPeople={setShowOnlyWithPeople}
        showSourceLink={showSourceLink}
        setShowSourceLink={setShowSourceLink}
        showLinkedIn={showLinkedIn}
        setShowLinkedIn={setShowLinkedIn}
        showAbout={showAbout}
        setShowAbout={setShowAbout}
        showKeywords={showKeywords}
        setShowKeywords={setShowKeywords}
        isRescreening={isRescreening}
        filteredRowCount={filteredRows.length}
        onRescreenVisible={handleRescreenFiltered}
      />

      <div className="border rounded-md overflow-auto max-h-[62vh] min-h-[500px]">
          <Table className="w-max min-w-[1450px]">
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Apollo Match</TableHead>
                <TableHead>Website</TableHead>
                {showLinkedIn && <TableHead>LinkedIn</TableHead>}
                {showKeywords && <TableHead>Keywords</TableHead>}
                <TableHead>Employees</TableHead>
                <TableHead>People</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead className="text-right sticky right-0 bg-background z-20 border-l">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const decision = displayDecision(row);
                const peopleCount = getPeopleCount(row);
                const peoplePreview = getPeoplePreview(row);
                const canOpenPeoplePreview = row.apolloStatus !== "not_found";

                return (
                  <ApolloPrescreenResultRowItem
                    key={row.candidateId}
                    row={row}
                    decision={decision}
                    apolloMatchText={apolloMatchLabel(row)}
                    showSourceLink={showSourceLink}
                    showAbout={showAbout}
                    showLinkedIn={showLinkedIn}
                    showKeywords={showKeywords}
                    peopleCount={peopleCount}
                    peoplePreview={peoplePreview}
                    hasPeopleMetadata={hasPeopleMetadata(row)}
                    canOpenPeoplePreview={canOpenPeoplePreview}
                    isSavingDecision={isSavingDecision}
                    onOpenPeople={openPeoplePreview}
                    onDecision={onDecision}
                  />
                );
              })}
            </TableBody>
          </Table>
      </div>
      <div className="text-xs text-muted-foreground">
        Showing {filteredRows.length} of {rows.length} pre-screen rows
      </div>
      <ApolloPrescreenPeopleDialog
        open={peopleDialogOpen}
        onOpenChange={setPeopleDialogOpen}
        loading={peopleLoading}
        error={peopleError}
        companyName={peopleContextName}
        previewCompany={peoplePreviewCompany}
        people={peoplePreviewContacts}
        totalContacts={peoplePreviewTotal}
      />
    </div>
  );
}
