import { ExternalLink, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { ApolloPrescreenPeopleCell } from "./apollo-prescreen-people-cell";
import type { ApolloPrescreenPersonPreview, ApolloPrescreenResultRow } from "../types";

function decisionVariant(decision: string): "default" | "destructive" | "outline" {
  if (decision === "approved") return "default";
  if (decision === "rejected") return "destructive";
  return "outline";
}

export function ApolloPrescreenResultRowItem(props: {
  row: ApolloPrescreenResultRow;
  decision: string;
  apolloMatchText: string;
  showSourceLink: boolean;
  showAbout: boolean;
  showLinkedIn: boolean;
  showKeywords: boolean;
  peopleCount: number;
  peoplePreview: ApolloPrescreenPersonPreview[];
  hasPeopleMetadata: boolean;
  canOpenPeoplePreview: boolean;
  isSavingDecision: boolean;
  onOpenPeople: (row: ApolloPrescreenResultRow) => void;
  onDecision: (candidateId: string, decision: "approved" | "rejected") => void;
}) {
  const {
    row,
    decision,
    apolloMatchText,
    showSourceLink,
    showAbout,
    showLinkedIn,
    showKeywords,
    peopleCount,
    peoplePreview,
    hasPeopleMetadata,
    canOpenPeoplePreview,
    isSavingDecision,
    onOpenPeople,
    onDecision,
  } = props;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{row.cleanCompanyName}</div>
        {showSourceLink ? (
          <div className="text-xs text-muted-foreground max-w-[340px] truncate">{row.representativeLink}</div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {row.candidateDomain || "no-domain"} | {row.sourceCount} source{row.sourceCount === 1 ? "" : "s"}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium" title={row.apolloName || "-"}>
          {row.apolloName || "-"}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>{row.industry || "-"}</span>
          <Badge variant="outline" className="text-[10px]">{apolloMatchText}</Badge>
        </div>
        {showAbout && row.shortDescription ? (
          <div className="text-xs text-muted-foreground line-clamp-2 mt-1 max-w-[360px]" title={row.shortDescription}>
            {row.shortDescription}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        {row.websiteUrl ? (
          <a className="text-primary inline-flex items-center gap-1" href={row.websiteUrl} target="_blank" rel="noreferrer">
            Website <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      {showLinkedIn && (
        <TableCell>
          {row.linkedinUrl ? (
            <a className="text-primary inline-flex items-center gap-1" href={row.linkedinUrl} target="_blank" rel="noreferrer">
              LinkedIn <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
      {showKeywords && (
        <TableCell>
          <div className="flex flex-wrap gap-1 max-w-[260px]">
            {(row.keywords || []).slice(0, 4).map((keyword) => (
              <Badge key={keyword} variant="secondary" className="text-xs">{keyword}</Badge>
            ))}
            {(row.keywords || []).length > 4 ? (
              <Badge variant="outline" className="text-xs">+{(row.keywords || []).length - 4}</Badge>
            ) : null}
          </div>
        </TableCell>
      )}
      <TableCell>{row.employeeCount ?? "-"}</TableCell>
      <TableCell>
        {hasPeopleMetadata || row.apolloStatus === "not_found" ? (
          <ApolloPrescreenPeopleCell peopleCount={peopleCount} peoplePreview={peoplePreview} />
        ) : (
          <span className="text-xs text-muted-foreground">Open People to load</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={decisionVariant(decision)}>{decision === "pending" ? "Decision Pending" : decision}</Badge>
      </TableCell>
      <TableCell className="text-right sticky right-0 bg-background z-10 border-l">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={!canOpenPeoplePreview} onClick={() => onOpenPeople(row)}>
            <Users className="h-4 w-4 mr-1" />
            People ({peopleCount})
          </Button>
          <Button size="sm" variant="outline" disabled={isSavingDecision} onClick={() => onDecision(row.candidateId, "approved")}>
            <ThumbsUp className="h-4 w-4 mr-1" />
            Valid
          </Button>
          <Button size="sm" variant="outline" disabled={isSavingDecision} onClick={() => onDecision(row.candidateId, "rejected")}>
            <ThumbsDown className="h-4 w-4 mr-1" />
            Not Target
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
