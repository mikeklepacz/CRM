import { CheckCircle2, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EhubPageHeaderProps {
  gmailConnected?: boolean;
}

export function EhubPageHeader(props: EhubPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">E-Hub</h1>
          <p className="text-muted-foreground">Email sequence automation system</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-muted/50 border">
              {props.gmailConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground font-medium">Gmail Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground font-medium">Gmail Not Connected</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {props.gmailConnected
              ? "Gmail is connected. Emails will be sent automatically."
              : "Gmail is not connected. Visit Settings to connect your Gmail account to enable email sending."}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
