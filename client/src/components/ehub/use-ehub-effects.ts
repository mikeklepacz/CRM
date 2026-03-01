import { useEffect } from "react";
import type { RefObject } from "react";
import type { EhubSettings, Sequence } from "@/components/ehub/ehub.types";

interface UseEhubEffectsProps {
  contactStatusFilter: string;
  debouncedSearch: string;
  nukeDialogOpen: boolean;
  nukeEmailPattern: string;
  search: string;
  selectedSequenceId: string | null;
  sequences?: Sequence[];
  settings?: EhubSettings;
  setCountsError: (value: string | null) => void;
  setDebouncedSearch: (value: string) => void;
  setFinalizedStrategyEdit: (value: string) => void;
  setNukeCounts: (
    value: {
      messagesCount: number;
      recipientsCount: number;
      slotsCount: number;
      testEmailsCount: number;
    } | null,
  ) => void;
  setOriginalSettings: (value: EhubSettings | null) => void;
  setPage: (value: number) => void;
  setRepeatLastStep: (value: boolean) => void;
  setSequenceKeywords: (value: string) => void;
  setSettingsForm: (value: EhubSettings) => void;
  setStepDelays: (value: number[]) => void;
  setSyntheticPreview: (value: Array<{ body: string; stepNumber: number; subject: string }> | null) => void;
  strategyTranscript: any;
  scrollRef: RefObject<HTMLDivElement>;
}

export function useEhubEffects(props: UseEhubEffectsProps) {
  useEffect(() => {
    if (props.scrollRef.current) {
      props.scrollRef.current.scrollTop = props.scrollRef.current.scrollHeight;
    }
  }, [props.strategyTranscript, props.scrollRef]);

  useEffect(() => {
    const current = props.sequences?.find((s) => s.id === props.selectedSequenceId);
    props.setFinalizedStrategyEdit((current as any)?.finalizedStrategy || "");
  }, [props.selectedSequenceId, props.sequences, props.setFinalizedStrategyEdit]);

  useEffect(() => {
    if (props.selectedSequenceId && props.sequences) {
      const selectedSeq = props.sequences.find((s) => s.id === props.selectedSequenceId);
      if (selectedSeq && (selectedSeq as any).stepDelays) {
        props.setStepDelays((selectedSeq as any).stepDelays);
        props.setRepeatLastStep((selectedSeq as any).repeatLastStep || false);
      } else {
        props.setStepDelays([]);
        props.setRepeatLastStep(false);
      }
      const kw = (selectedSeq as any)?.keywords;
      props.setSequenceKeywords(Array.isArray(kw) ? kw.join(", ") : kw || "");
    } else {
      props.setStepDelays([]);
      props.setRepeatLastStep(false);
      props.setSequenceKeywords("");
    }
  }, [props.selectedSequenceId, props.sequences, props.setRepeatLastStep, props.setSequenceKeywords, props.setStepDelays]);

  useEffect(() => {
    if (props.settings) {
      props.setSettingsForm(props.settings);
      props.setOriginalSettings(props.settings);
    }
  }, [props.settings, props.setOriginalSettings, props.setSettingsForm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      props.setDebouncedSearch(props.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [props.search, props.setDebouncedSearch]);

  useEffect(() => {
    props.setPage(1);
  }, [props.debouncedSearch, props.contactStatusFilter, props.setPage]);

  useEffect(() => {
    props.setSyntheticPreview(null);
  }, [props.selectedSequenceId, props.setSyntheticPreview]);

  useEffect(() => {
    if (props.nukeDialogOpen) {
      const params = new URLSearchParams();
      if (props.nukeEmailPattern) {
        params.append("emailPattern", props.nukeEmailPattern);
      }
      const url = `/api/ehub/test-data/nuke/counts?${params.toString()}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          props.setNukeCounts(data);
          props.setCountsError(null);
        })
        .catch(() => {
          props.setCountsError("Failed to fetch counts");
        });
    }
  }, [props.nukeDialogOpen, props.nukeEmailPattern, props.setCountsError, props.setNukeCounts]);
}
