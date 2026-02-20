import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BulkPreviewDialog } from "./bulk-preview-dialog";
import { LeadReviewQueue } from "./lead-review-queue";
import { PreviewDialog } from "./preview-dialog";
import type { BulkPreviewItem, PreviewResult, StoreContact } from "../types";

type ApolloWorkflowDialogsProps = {
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
  selectedContact: StoreContact | null;
  previewResult: PreviewResult | null;
  previewLoading: boolean;
  onEnrichPreview: (selectedPersonIds: string[]) => void;
  previewEnriching: boolean;
  bulkPreviewOpen: boolean;
  onBulkPreviewOpenChange: (open: boolean) => void;
  bulkPreviewData: BulkPreviewItem[];
  bulkPreviewLoading: boolean;
  selectedLinksSize: number;
  selectedPeople: Set<string>;
  onToggleBulkPerson: (key: string) => void;
  onSelectAllBulkPeople: () => void;
  onDeselectAllBulkPeople: () => void;
  onBulkEnrichSelected: () => void;
  isEnriching: boolean;
  reviewQueueOpen: boolean;
  onReviewQueueOpenChange: (open: boolean) => void;
  reviewQueueData: BulkPreviewItem[];
  reviewQueueIndex: number;
  onReviewQueueIndexChange: (index: number) => void;
  reviewQueueLoading: boolean;
  reviewSelectedPeople: Set<string>;
  onReviewTogglePerson: (key: string) => void;
  onReviewSelectAll: () => void;
  onReviewDeselectAll: () => void;
  onReviewEnrich: () => void;
  onReviewSkip: () => void;
  onReviewReject: () => void;
  keywordsExpanded: boolean;
  onToggleKeywords: () => void;
};

export function ApolloWorkflowDialogs({
  previewOpen,
  onPreviewOpenChange,
  selectedContact,
  previewResult,
  previewLoading,
  onEnrichPreview,
  previewEnriching,
  bulkPreviewOpen,
  onBulkPreviewOpenChange,
  bulkPreviewData,
  bulkPreviewLoading,
  selectedLinksSize,
  selectedPeople,
  onToggleBulkPerson,
  onSelectAllBulkPeople,
  onDeselectAllBulkPeople,
  onBulkEnrichSelected,
  isEnriching,
  reviewQueueOpen,
  onReviewQueueOpenChange,
  reviewQueueData,
  reviewQueueIndex,
  onReviewQueueIndexChange,
  reviewQueueLoading,
  reviewSelectedPeople,
  onReviewTogglePerson,
  onReviewSelectAll,
  onReviewDeselectAll,
  onReviewEnrich,
  onReviewSkip,
  onReviewReject,
  keywordsExpanded,
  onToggleKeywords,
}: ApolloWorkflowDialogsProps) {
  return (
    <>
      <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview Apollo Data</DialogTitle>
            <DialogDescription>
              Review available contacts before enriching
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <PreviewDialog
              contact={selectedContact}
              preview={previewResult}
              isLoading={previewLoading}
              onEnrich={onEnrichPreview}
              isEnriching={previewEnriching}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkPreviewOpen} onOpenChange={onBulkPreviewOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview Available Contacts</DialogTitle>
            <DialogDescription>
              Select which people you want to enrich from {selectedLinksSize} {selectedLinksSize === 1 ? "company" : "companies"}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <BulkPreviewDialog
              data={bulkPreviewData}
              isLoading={bulkPreviewLoading}
              totalCompanies={selectedLinksSize}
              selectedPeople={selectedPeople}
              onTogglePerson={onToggleBulkPerson}
              onSelectAll={onSelectAllBulkPeople}
              onDeselectAll={onDeselectAllBulkPeople}
              onEnrich={onBulkEnrichSelected}
              isEnriching={isEnriching}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewQueueOpen} onOpenChange={onReviewQueueOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Lead Review Queue</DialogTitle>
            <DialogDescription>
              Review companies one at a time, enrich the right ones, reject the wrong ones
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <LeadReviewQueue
              data={reviewQueueData}
              currentIndex={reviewQueueIndex}
              onIndexChange={onReviewQueueIndexChange}
              isLoading={reviewQueueLoading}
              totalCompanies={selectedLinksSize}
              selectedPeople={reviewSelectedPeople}
              onTogglePerson={onReviewTogglePerson}
              onSelectAll={onReviewSelectAll}
              onDeselectAll={onReviewDeselectAll}
              onEnrich={onReviewEnrich}
              onSkip={onReviewSkip}
              onReject={onReviewReject}
              isEnriching={isEnriching}
              keywordsExpanded={keywordsExpanded}
              onToggleKeywords={onToggleKeywords}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
