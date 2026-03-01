import type { FieldDefinition } from "@/components/qualification-campaign-management/types";

export function generateKnowledgeBasePrompt(fields: FieldDefinition[]): string {
  if (fields.length === 0) return "";

  let prompt = "";

  fields.forEach((field, index) => {
    prompt += `${index + 1}. Question: "${field.label}"\n`;
    prompt += `   → Store answer in: {{${field.key}}}\n`;
    prompt += `   → Type: ${field.type}`;
    if (field.required) prompt += " (Required)";
    if (field.isKnockout) prompt += " [KNOCKOUT - must match expected answer]";
    prompt += "\n";

    if (field.options && field.options.length > 0) {
      prompt += `   → Valid options: ${field.options.join(", ")}\n`;
    }

    if (field.isKnockout && field.knockoutAnswer !== undefined) {
      const answer = Array.isArray(field.knockoutAnswer) ? field.knockoutAnswer.join(" or ") : String(field.knockoutAnswer);
      prompt += `   → Expected answer to qualify: ${answer}\n`;
    }

    prompt += "\n";
  });

  return prompt.trim();
}
