import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "uploading":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
          Uploading
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
          Processing
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1 inline" />
          Ready
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1 inline" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
