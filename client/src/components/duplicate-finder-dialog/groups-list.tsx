import { ScrollArea } from "@/components/ui/scroll-area";
import { type DuplicateGroup, type StatusHierarchy } from "@shared/duplicateUtils";
import { DuplicateGroupCard } from "./group-card";

interface GroupsListProps {
  groups: DuplicateGroup[];
  statusHierarchy?: StatusHierarchy;
  selectedForDeletion: Set<string>;
  markedAsNotDuplicate: Set<string>;
  onToggleSelection: (link: string, group: DuplicateGroup) => void;
  onToggleNotDuplicate: (link: string) => void;
}

export function DuplicateGroupsList({
  groups,
  statusHierarchy,
  selectedForDeletion,
  markedAsNotDuplicate,
  onToggleSelection,
  onToggleNotDuplicate,
}: GroupsListProps) {
  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-6">
        {groups.map((group, groupIndex) => (
          <DuplicateGroupCard
            key={groupIndex}
            group={group}
            groupIndex={groupIndex}
            statusHierarchy={statusHierarchy}
            selectedForDeletion={selectedForDeletion}
            markedAsNotDuplicate={markedAsNotDuplicate}
            onToggleSelection={onToggleSelection}
            onToggleNotDuplicate={onToggleNotDuplicate}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
