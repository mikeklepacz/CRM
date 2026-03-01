import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface Summary {
  total: number;
  matched: number;
  unmatched: number;
  googleVerified: number;
}

interface SummaryBarProps {
  summary: Summary;
  isSearchingGoogle: boolean;
}

export const SummaryBar = ({ summary, isSearchingGoogle }: SummaryBarProps) => {
  return (
    <div className="flex items-center gap-4 p-3 bg-muted rounded-md">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <span className="font-medium">{summary.matched} Database Match</span>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-blue-600" />
        <span className="font-medium">{summary.googleVerified} From Google</span>
      </div>
      <div className="flex items-center gap-2">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="font-medium">{summary.unmatched} Unmatched</span>
      </div>
      <div className="ml-auto text-sm text-muted-foreground">Total: {summary.total}</div>
      {isSearchingGoogle && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching Google...
        </div>
      )}
    </div>
  );
};
