import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatTimezoneDisplay } from "@shared/timezoneUtils";
import { TimezoneAutocomplete } from "./timezone-autocomplete";
import { useToast } from "@/hooks/use-toast";

interface TimezoneDetectorProps {
  userTimezone: string | null | undefined;
  isLoading?: boolean;
}

export function TimezoneDetector({ userTimezone, isLoading }: TimezoneDetectorProps) {
  const [open, setOpen] = useState(false);
  const [detectedTimezone, setDetectedTimezone] = useState<string>("");
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only show dialog if preferences are loaded AND user doesn't have a timezone set
    if (!isLoading && userTimezone === null) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDetectedTimezone(detected);
        setSelectedTimezone(detected);
        setOpen(true);
      } catch (error) {
        // Default to UTC if detection fails
        setDetectedTimezone("UTC");
        setSelectedTimezone("UTC");
        setOpen(true);
      }
    }
  }, [userTimezone, isLoading]);

  const saveTimezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      return await apiRequest("PUT", "/api/user/preferences", { timezone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      setOpen(false);
      toast({
        title: "Timezone saved",
        description: "Your timezone preference has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUseDetected = () => {
    saveTimezoneMutation.mutate(detectedTimezone);
  };

  const handleLetMeChoose = () => {
    setShowManualSelect(true);
  };

  const handleSaveManual = () => {
    if (selectedTimezone) {
      saveTimezoneMutation.mutate(selectedTimezone);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-testid="timezone-detector-dialog">
        <DialogHeader>
          <DialogTitle>Set Your Timezone</DialogTitle>
          <DialogDescription>
            {showManualSelect
              ? "Select your timezone from the list below"
              : "We'll use this to schedule reminders and show times correctly"}
          </DialogDescription>
        </DialogHeader>

        {!showManualSelect ? (
          <div className="space-y-4">
            <p className="text-sm">
              We detected your timezone as{" "}
              <span className="font-semibold">
                {formatTimezoneDisplay(detectedTimezone)}
              </span>
              . Is this correct?
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Timezone</label>
              <TimezoneAutocomplete
                value={selectedTimezone}
                onChange={setSelectedTimezone}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {!showManualSelect ? (
            <>
              <Button
                variant="outline"
                onClick={handleLetMeChoose}
                data-testid="button-choose-timezone"
                disabled={saveTimezoneMutation.isPending}
              >
                Let me choose
              </Button>
              <Button
                onClick={handleUseDetected}
                data-testid="button-use-detected"
                disabled={saveTimezoneMutation.isPending}
              >
                {saveTimezoneMutation.isPending ? "Saving..." : "Yes, use this"}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSaveManual}
              data-testid="button-save-manual"
              disabled={saveTimezoneMutation.isPending || !selectedTimezone}
            >
              {saveTimezoneMutation.isPending ? "Saving..." : "Save Timezone"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
