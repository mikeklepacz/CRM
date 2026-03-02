import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BlockedDay, HolidayToggle, NoSendDate } from "./types";

export function useHolidayCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: upcomingBlockedDays = [], isLoading: isLoadingUpcoming } = useQuery<BlockedDay[]>({
    queryKey: ["/api/no-send-dates/upcoming"],
  });

  const { data: customDates = [], isLoading: isLoadingCustom } = useQuery<NoSendDate[]>({
    queryKey: ["/api/no-send-dates"],
  });

  const { data: holidayToggles = [], isLoading: isLoadingToggles } = useQuery<HolidayToggle[]>({
    queryKey: ["/api/holidays/toggles"],
  });

  const toggleHolidayMutation = useMutation({
    mutationFn: async (data: { holidayId: string; holidayName: string; ignore: boolean }) => {
      return await apiRequest("POST", "/api/holidays/toggle", data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays/toggles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/no-send-dates/upcoming"] });
      toast({
        title: variables.ignore ? "Holiday Ignored" : "Holiday Blocking Enabled",
        description: variables.ignore
          ? `${variables.holidayName} will now allow outreach`
          : `${variables.holidayName} will now block outreach`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle holiday",
        variant: "destructive",
      });
    },
  });

  const addDateMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      return await apiRequest("POST", "/api/no-send-dates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/no-send-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/no-send-dates/upcoming"] });
      setSelectedDate(undefined);
      setReason("");
      toast({
        title: "Date Added",
        description: "Custom blocked date has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add blocked date",
        variant: "destructive",
      });
    },
  });

  const deleteDateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/no-send-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/no-send-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/no-send-dates/upcoming"] });
      toast({
        title: "Date Removed",
        description: "Custom blocked date has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete blocked date",
        variant: "destructive",
      });
    },
  });

  const customDateSet = new Set(customDates.map((d) => d.date));
  const isLoading = isLoadingUpcoming || isLoadingCustom || isLoadingToggles;

  const federalHolidays = holidayToggles.filter(
    (h) =>
      !h.holidayId.includes("eve") &&
      !h.holidayId.includes("weekend") &&
      !h.holidayId.includes("black_friday") &&
      !h.holidayId.includes("cyber_monday") &&
      !h.holidayId.includes("day_after"),
  );

  const extendedWindows = holidayToggles.filter(
    (h) =>
      h.holidayId.includes("eve") ||
      h.holidayId.includes("weekend") ||
      h.holidayId.includes("black_friday") ||
      h.holidayId.includes("cyber_monday") ||
      h.holidayId.includes("day_after"),
  );

  const handleToggle = (holiday: HolidayToggle) => {
    toggleHolidayMutation.mutate({
      holidayId: holiday.holidayId,
      holidayName: holiday.name,
      ignore: !holiday.isIgnored,
    });
  };

  const handleAddDate = () => {
    if (!selectedDate || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a date and provide a reason",
        variant: "destructive",
      });
      return;
    }

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    addDateMutation.mutate({ date: formattedDate, reason: reason.trim() });
  };

  const getCustomDateId = (dateStr: string): string | undefined => {
    const customDate = customDates.find((d) => d.date === dateStr);
    return customDate?.id;
  };

  const isCustomDate = (dateStr: string): boolean => {
    return customDateSet.has(dateStr);
  };

  return {
    addDateMutation,
    calendarOpen,
    deleteDateMutation,
    extendedWindows,
    federalHolidays,
    getCustomDateId,
    handleAddDate,
    handleToggle,
    isCustomDate,
    isLoading,
    reason,
    selectedDate,
    setCalendarOpen,
    setReason,
    setSelectedDate,
    toggleHolidayMutation,
    upcomingBlockedDays,
  };
}
