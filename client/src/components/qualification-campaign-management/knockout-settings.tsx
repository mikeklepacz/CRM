import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function KnockoutSettings(props: any) {
  if (!props.newField.isKnockout) return null;

  return (
    <div className="space-y-2 p-3 border rounded-md bg-destructive/5">
      <Label>Expected Answer (to qualify)</Label>
      {props.newField.type === "boolean" && (
        <Select
          value={String(props.newField.knockoutAnswer)}
          onValueChange={(value) => props.setNewField((prev: any) => ({ ...prev, knockoutAnswer: value === "true" }))}
        >
          <SelectTrigger data-testid="select-knockout-answer">
            <SelectValue placeholder="Select expected answer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      )}
      {props.newField.type === "choice" && props.newField.options && props.newField.options.length > 0 && (
        <Select
          value={String(props.newField.knockoutAnswer || "")}
          onValueChange={(value) => props.setNewField((prev: any) => ({ ...prev, knockoutAnswer: value }))}
        >
          <SelectTrigger data-testid="select-knockout-answer">
            <SelectValue placeholder="Select expected answer" />
          </SelectTrigger>
          <SelectContent>
            {props.newField.options.map((opt: string) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {props.newField.type === "multichoice" && props.newField.options && props.newField.options.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Select options that qualify (at least one must match):</p>
          <div className="flex flex-wrap gap-2">
            {props.newField.options.map((opt: string) => {
              const selected = Array.isArray(props.newField.knockoutAnswer) && props.newField.knockoutAnswer.includes(opt);
              return (
                <Badge
                  key={opt}
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const current = Array.isArray(props.newField.knockoutAnswer) ? props.newField.knockoutAnswer : [];
                    const updated = selected ? current.filter((v: string) => v !== opt) : [...current, opt];
                    props.setNewField((prev: any) => ({ ...prev, knockoutAnswer: updated }));
                  }}
                >
                  {opt}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
      {(props.newField.type === "text" || props.newField.type === "number" || props.newField.type === "date") && (
        <Input
          value={String(props.newField.knockoutAnswer || "")}
          onChange={(e) => props.setNewField((prev: any) => ({ ...prev, knockoutAnswer: e.target.value }))}
          placeholder={props.newField.type === "number" ? "Minimum value" : "Expected value or pattern"}
          data-testid="input-knockout-answer"
        />
      )}
    </div>
  );
}
