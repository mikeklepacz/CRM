import { Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function ApolloPrescreenDisplayControls(props: {
  showNotFound: boolean;
  setShowNotFound: (value: boolean) => void;
  showOnlyWithPeople: boolean;
  setShowOnlyWithPeople: (value: boolean) => void;
  showSourceLink: boolean;
  setShowSourceLink: (value: boolean) => void;
  showLinkedIn: boolean;
  setShowLinkedIn: (value: boolean) => void;
  showAbout: boolean;
  setShowAbout: (value: boolean) => void;
  showKeywords: boolean;
  setShowKeywords: (value: boolean) => void;
  isRescreening: boolean;
  filteredRowCount: number;
  onRescreenVisible: () => void;
}) {
  const {
    showNotFound,
    setShowNotFound,
    showOnlyWithPeople,
    setShowOnlyWithPeople,
    showSourceLink,
    setShowSourceLink,
    showLinkedIn,
    setShowLinkedIn,
    showAbout,
    setShowAbout,
    showKeywords,
    setShowKeywords,
    isRescreening,
    filteredRowCount,
    onRescreenVisible,
  } = props;

  return (
    <div className="flex items-center flex-wrap gap-4 text-sm">
      <div className="font-medium inline-flex items-center gap-2">
        <Filter className="h-4 w-4" />
        Display
      </div>
      <label className="inline-flex items-center gap-2">
        <Checkbox checked={showNotFound} onCheckedChange={(v) => setShowNotFound(v === true)} />
        Show Not Found
      </label>
      <label className="inline-flex items-center gap-2">
        <Checkbox checked={showOnlyWithPeople} onCheckedChange={(v) => setShowOnlyWithPeople(v === true)} />
        Has People
      </label>
      <label className="inline-flex items-center gap-2">
        <Checkbox checked={showSourceLink} onCheckedChange={(v) => setShowSourceLink(v === true)} />
        Source URL
      </label>
      <label className="inline-flex items-center gap-2">
        <Checkbox checked={showLinkedIn} onCheckedChange={(v) => setShowLinkedIn(v === true)} />
        LinkedIn
      </label>
      <label className="inline-flex items-center gap-2">
        <Checkbox checked={showAbout} onCheckedChange={(v) => setShowAbout(v === true)} />
        About
      </label>
      <label className="inline-flex items-center gap-2">
        <Checkbox checked={showKeywords} onCheckedChange={(v) => setShowKeywords(v === true)} />
        Keywords
      </label>
      <Button size="sm" variant="outline" disabled={isRescreening || filteredRowCount === 0} onClick={onRescreenVisible}>
        {isRescreening ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Re-screen Visible ({filteredRowCount})
      </Button>
    </div>
  );
}
