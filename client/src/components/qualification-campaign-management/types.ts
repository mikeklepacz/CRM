export interface FieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "choice" | "multichoice" | "date" | "boolean";
  options?: string[];
  required?: boolean;
  weight?: number;
  order?: number;
  isKnockout?: boolean;
  knockoutAnswer?: string | string[] | boolean;
}
