import { Badge } from "@/components/ui/badge";

type QueueStatus = "sent" | "scheduled" | "overdue" | "open";

export function EhubStepBadge({ stepNumber }: { stepNumber: number }) {
  // Queue data uses zero-based step progress (current_step).
  // Display one-based human step labels in the UI.
  const displayStep = Math.max(1, stepNumber + 1);

  if (displayStep === 1) {
    return (
      <Badge className="bg-slate-100 text-slate-800 border border-slate-300">
        Step 1
      </Badge>
    );
  }

  if (displayStep === 2) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
        Step 2
      </Badge>
    );
  }

  if (displayStep === 3) {
    return (
      <Badge className="bg-violet-100 text-violet-800 border border-violet-300">
        Step 3
      </Badge>
    );
  }

  if (displayStep === 4) {
    return (
      <Badge className="bg-amber-100 text-amber-900 border border-amber-300">
        Step 4
      </Badge>
    );
  }

  return (
    <Badge className="bg-rose-100 text-rose-800 border border-rose-300">
      Step {displayStep}
    </Badge>
  );
}

export function EhubStatusBadge({ status }: { status: QueueStatus }) {
  if (status === "sent") {
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-300">
        sent
      </Badge>
    );
  }

  if (status === "scheduled") {
    return (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
        scheduled
      </Badge>
    );
  }

  if (status === "overdue") {
    return (
      <Badge className="bg-red-100 text-red-800 border border-red-300">
        overdue
      </Badge>
    );
  }

  return (
    <Badge className="bg-slate-100 text-slate-700 border border-slate-300">
      open
    </Badge>
  );
}
