import { useQuery } from "@tanstack/react-query";
import type { AllContactsResponse, EhubContact } from "@shared/schema";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import type { EhubSettings, EmailAccount, Recipient, Sequence, TestEmailSend } from "@/components/ehub/ehub.types";

interface UseEhubQueriesProps {
  activeTab: string;
  contactStatusFilter: string;
  contactedFilter: string;
  currentProjectId?: string;
  debouncedSearch: string;
  page: number;
  selectedSequenceId: string | null;
  user: any;
}

export function useEhubQueries(props: UseEhubQueriesProps) {
  const { data: sequences, isLoading } = useQuery<Sequence[]>({
    queryKey: ["/api/sequences", props.currentProjectId],
    queryFn: async () => {
      const url = new URL("/api/sequences", window.location.origin);
      if (props.currentProjectId) {
        url.searchParams.set("projectId", props.currentProjectId);
      }
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sequences");
      return response.json();
    },
  });

  const { data: userPreferences } = useQuery<{ blacklistCheckEnabled?: boolean }>({
    queryKey: ["/api/user/preferences"],
  });

  const { data: integrationStatus } = useQuery<{ googleCalendarConnected?: boolean }>({
    queryKey: ["/api/integrations/status"],
  });

  const { data: settings } = useQuery<EhubSettings>({
    queryKey: ["/api/ehub/settings"],
  });

  const { data: emailAccounts, isLoading: isLoadingEmailAccounts } = useQuery<EmailAccount[]>({
    queryKey: ["/api/email-accounts"],
  });

  const { data: upcomingBlockedDays } = useQuery<{ date: string; reason: string }[]>({
    queryKey: ["/api/no-send-dates/upcoming"],
  });

  const { data: allContactsData, isLoading: isLoadingContacts } = useQuery<AllContactsResponse>({
    queryKey: ["/api/ehub/all-contacts", props.page, props.debouncedSearch, props.contactStatusFilter, props.currentProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", props.page.toString());
      params.append("pageSize", "50");
      if (props.debouncedSearch) {
        params.append("search", props.debouncedSearch);
      }
      if (props.contactStatusFilter && props.contactStatusFilter !== "all") {
        params.append("statusFilter", props.contactStatusFilter);
      }
      if (props.currentProjectId) {
        params.append("projectId", props.currentProjectId);
      }
      const response = await fetch(`/api/ehub/all-contacts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      return response.json();
    },
  });

  const { data: strategyTranscript } = useQuery({
    queryKey: ["/api/sequences", props.selectedSequenceId, "strategy-chat"],
    enabled: !!props.selectedSequenceId,
    queryFn: async () => {
      const response = await fetch(`/api/sequences/${props.selectedSequenceId}/strategy-chat`);
      if (!response.ok) throw new Error("Failed to fetch strategy chat");
      return response.json();
    },
  });

  const { data: testEmailHistory, isLoading: isLoadingTestEmails } = useQuery<TestEmailSend[]>({
    queryKey: ["/api/test-email/history"],
    enabled: props.activeTab === "test-emails" && canAccessAdminFeatures(props.user),
  });

  const currentSequence = sequences?.find((s) => s.id === props.selectedSequenceId);

  const { data: sequenceSteps, refetch: refetchSteps } = useQuery<
    Array<{
      aiGuidance: string | null;
      bodyTemplate: string | null;
      delayDays: string;
      id: string;
      stepNumber: number;
      subjectTemplate: string | null;
    }>
  >({
    queryKey: ["/api/sequences", props.selectedSequenceId, "steps"],
    queryFn: async () => {
      if (!props.selectedSequenceId) return [];
      const res = await fetch(`/api/sequences/${props.selectedSequenceId}/steps`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch steps");
      return res.json();
    },
    enabled: !!props.selectedSequenceId,
  });

  const { data: recipients, isLoading: isLoadingRecipients, error: recipientsError } = useQuery<Recipient[]>({
    queryKey: ["/api/sequences", props.selectedSequenceId, "recipients", props.contactedFilter],
    enabled: !!props.selectedSequenceId,
    queryFn: () => {
      const params = new URLSearchParams();
      if (props.contactedFilter && props.contactedFilter !== "all") {
        params.append("contactedStatus", props.contactedFilter);
      }
      const url = `/api/sequences/${props.selectedSequenceId}/recipients?${params.toString()}`;
      return fetch(url).then((res) => {
        if (!res.ok) {
          if (res.status === 503) {
            return res.json().then((data) => {
              throw new Error(data.message || "Service unavailable");
            });
          }
          throw new Error("Failed to fetch recipients");
        }
        return res.json();
      });
    },
  });

  const gmailConnected = integrationStatus?.googleCalendarConnected;

  return {
    allContactsData,
    currentSequence,
    emailAccounts,
    gmailConnected,
    integrationStatus,
    isLoading,
    isLoadingContacts,
    isLoadingEmailAccounts,
    isLoadingRecipients,
    isLoadingTestEmails,
    recipients,
    recipientsError,
    refetchSteps,
    sequenceSteps,
    sequences,
    settings,
    strategyTranscript,
    testEmailHistory,
    upcomingBlockedDays,
    userPreferences,
  };
}
