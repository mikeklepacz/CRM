export const getPipelineTypeBadgeVariant = (type: string) => {
  switch (type) {
    case "sales": return "default";
    case "qualification": return "secondary";
    case "support": return "outline";
    case "custom": return "outline";
    default: return "outline";
  }
};

export const getProjectStatusBadgeClass = (status: string) => {
  switch (status) {
    case "active": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "paused": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "archived": return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    default: return "";
  }
};

export const getProjectTypeBadgeVariant = (type: string) => {
  switch (type) {
    case "campaign": return "default";
    case "case": return "secondary";
    case "initiative": return "outline";
    case "custom": return "outline";
    default: return "outline";
  }
};

export const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "org_admin": return "default";
    case "agent": return "secondary";
    default: return "outline";
  }
};

export const getInviteStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "pending": return "secondary";
    case "accepted": return "default";
    case "expired":
    case "cancelled":
      return "destructive";
    default: return "outline";
  }
};
