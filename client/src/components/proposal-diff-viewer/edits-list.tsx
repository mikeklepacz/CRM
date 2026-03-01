import { ProposalEditCard } from "./edit-card";
import { Edit } from "./types";

interface EditsListProps {
  edits: Edit[];
  selectedEdits: Set<number>;
  failedEdits: Set<number>;
  isPendingStatus: boolean;
  isLocallyProcessing: boolean;
  approvePending: boolean;
  isRejecting?: boolean;
  inlineEdits: Map<number, string>;
  getNewText: (idx: number) => string;
  onToggleSelected: (idx: number) => void;
  onInlineEdit: (idx: number, value: string) => void;
  onApproveSingle: (idx: number) => void;
  onSkipSingle: (idx: number) => void;
}

export function ProposalEditsList({
  edits,
  selectedEdits,
  failedEdits,
  isPendingStatus,
  isLocallyProcessing,
  approvePending,
  isRejecting,
  inlineEdits,
  getNewText,
  onToggleSelected,
  onInlineEdit,
  onApproveSingle,
  onSkipSingle,
}: EditsListProps) {
  return (
    <div className="space-y-4">
      {edits.map((edit, idx) => (
        <ProposalEditCard
          key={idx}
          edit={edit}
          idx={idx}
          isSelected={selectedEdits.has(idx)}
          isFailed={failedEdits.has(idx)}
          isPendingStatus={isPendingStatus}
          isLocallyProcessing={isLocallyProcessing}
          approvePending={approvePending}
          isRejecting={isRejecting}
          isInlineEdited={inlineEdits.has(idx)}
          newText={getNewText(idx)}
          onToggleSelected={onToggleSelected}
          onInlineEdit={onInlineEdit}
          onApproveSingle={onApproveSingle}
          onSkipSingle={onSkipSingle}
        />
      ))}
    </div>
  );
}
