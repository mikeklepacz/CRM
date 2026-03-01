import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, GripVertical, Trash2 } from "lucide-react";
import { FIELD_TYPES } from "@/components/qualification-campaign-management/constants";
import { FieldKeySelector } from "@/components/qualification-campaign-management/field-key-selector";
import { KnockoutSettings } from "@/components/qualification-campaign-management/knockout-settings";

export function QualificationFieldEditorCard(props: any) {
  return (
    <Card className={props.editingFieldIndex !== null ? "border-primary" : ""}>
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{props.editingFieldIndex !== null ? "Edit Field" : "Add New Field"}</CardTitle>
        {props.editingFieldIndex !== null && (
          <Button variant="ghost" size="sm" onClick={props.resetFieldForm} data-testid="button-cancel-edit-field">
            Cancel
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {props.fieldDefinitions.length > 0 && (
          <div className="space-y-2">
            {props.fieldDefinitions.map((field: any, index: number) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${
                  props.editingFieldIndex === index ? "bg-primary/10 border-primary" : "bg-muted/30 hover-elevate"
                }`}
                onClick={() => props.startEditField(index)}
                data-testid={`field-item-${index}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{field.label}</span>
                  <code className="text-muted-foreground ml-2 text-sm bg-muted/50 px-1 rounded">{`{{${field.key}}}`}</code>
                </div>
                <Badge variant="outline">{field.type}</Badge>
                {field.required && <Badge variant="secondary">Required</Badge>}
                {field.isKnockout && <Badge variant="destructive">Knockout</Badge>}
                {field.weight && field.weight > 1 && <Badge variant="secondary">Weight: {field.weight}</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.removeField(index);
                  }}
                  data-testid={`button-remove-field-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="field-label">Question Label</Label>
            <Input
              id="field-label"
              value={props.newField.label}
              onChange={(e) => props.setNewField((prev: any) => ({ ...prev, label: e.target.value }))}
              placeholder="Did you purchase tyres?"
              data-testid="input-field-label"
            />
          </div>
          <div className="space-y-1">
            <Label>Field Key (Placeholder)</Label>
            <FieldKeySelector {...props} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="field-type">Type</Label>
            <Select
              value={props.newField.type}
              onValueChange={(value: any) =>
                props.setNewField((prev: any) => ({
                  ...prev,
                  type: value,
                  options: value === "choice" || value === "multichoice" ? prev.options || [] : undefined,
                  knockoutAnswer: undefined,
                }))
              }
            >
              <SelectTrigger data-testid="select-field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="field-weight">Weight (1-10)</Label>
            <Input
              id="field-weight"
              type="number"
              min={1}
              max={10}
              value={props.newField.weight}
              onChange={(e) => props.setNewField((prev: any) => ({ ...prev, weight: parseInt(e.target.value) || 1 }))}
              data-testid="input-field-weight"
            />
          </div>
          <div className="space-y-1 flex items-end">
            <div className="flex items-center gap-2">
              <Switch
                id="field-required"
                checked={props.newField.required}
                onCheckedChange={(checked) => props.setNewField((prev: any) => ({ ...prev, required: checked }))}
                data-testid="switch-field-required"
              />
              <Label htmlFor="field-required">Required</Label>
            </div>
          </div>
        </div>

        {(props.newField.type === "choice" || props.newField.type === "multichoice") && (
          <div className="space-y-2">
            <Label>Options</Label>
            <div className="flex gap-2">
              <Input
                value={props.newOption}
                onChange={(e) => props.setNewOption(e.target.value)}
                placeholder="Add option"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), props.addOption())}
                data-testid="input-option"
              />
              <Button type="button" variant="outline" onClick={props.addOption} data-testid="button-add-option">
                Add
              </Button>
            </div>
            {props.newField.options && props.newField.options.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {props.newField.options.map((opt: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => props.removeOption(idx)}>
                    {opt} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="field-knockout"
              checked={props.newField.isKnockout}
              onCheckedChange={(checked) =>
                props.setNewField((prev: any) => ({
                  ...prev,
                  isKnockout: checked,
                  knockoutAnswer: checked ? (prev.type === "boolean" ? true : "") : undefined,
                }))
              }
              data-testid="switch-field-knockout"
            />
            <Label htmlFor="field-knockout" className="font-medium">
              Knockout Question
            </Label>
          </div>
          {props.newField.isKnockout && (
            <p className="text-xs text-muted-foreground">
              If the answer doesn't match the expected value, the lead will be disqualified.
            </p>
          )}
          <KnockoutSettings {...props} />
        </div>

        <Button
          type="button"
          onClick={props.saveField}
          className="w-full"
          variant={props.editingFieldIndex !== null ? "default" : "outline"}
          data-testid="button-save-field"
        >
          {props.editingFieldIndex !== null ? (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Update Field
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
