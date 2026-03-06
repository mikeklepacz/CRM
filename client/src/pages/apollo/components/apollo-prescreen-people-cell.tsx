import { Badge } from "@/components/ui/badge";
import type { ApolloPrescreenPersonPreview } from "../types";

function getPersonLabel(person: ApolloPrescreenPersonPreview): string {
  const fullName = `${person.firstName || ""} ${person.lastName || ""}`.trim();
  if (person.title) {
    return `${fullName || "Unknown"} - ${person.title}`;
  }
  return fullName || "Unknown";
}

export function ApolloPrescreenPeopleCell(props: {
  peopleCount: number;
  peoplePreview: ApolloPrescreenPersonPreview[];
}) {
  const { peopleCount, peoplePreview } = props;

  if (peopleCount <= 0) {
    return <span className="text-xs text-muted-foreground">No people found</span>;
  }

  const emailReadyCount = peoplePreview.filter((person) => person.hasEmail).length;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{peopleCount} people</Badge>
        <span className="text-xs text-muted-foreground">{emailReadyCount} with email</span>
      </div>
      {peoplePreview.length > 0 ? (
        <div className="max-w-[270px] text-xs text-muted-foreground space-y-0.5">
          {peoplePreview.slice(0, 3).map((person) => (
            <div key={person.id} className="truncate" title={getPersonLabel(person)}>
              {getPersonLabel(person)}
            </div>
          ))}
          {peopleCount > peoplePreview.length ? <div className="truncate">+{peopleCount - peoplePreview.length} more</div> : null}
        </div>
      ) : null}
    </div>
  );
}
