import type { IndividualSend } from "@/components/ehub/ehub-queue.types";

export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "Not scheduled";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) return "Overdue";
  if (diffMins < 60) return `in ${diffMins}m`;
  if (diffMins < 1440) return `in ${Math.floor(diffMins / 60)}h`;
  return `in ${Math.floor(diffMins / 1440)}d`;
};

export const formatTimestamp = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const getRowBgColor = (status: IndividualSend["status"]) => {
  if (status === "sent") {
    return "bg-green-50 dark:bg-green-900/20";
  }
  if (status === "overdue") {
    return "bg-red-50 dark:bg-red-900/20";
  }
  if (status === "open") {
    return "bg-gray-50 dark:bg-gray-900/20";
  }
  return "bg-blue-50 dark:bg-blue-900/20";
};
