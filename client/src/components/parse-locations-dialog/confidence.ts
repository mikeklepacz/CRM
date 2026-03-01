export const getConfidenceBadgeVariant = (confidence: number) => {
  if (confidence >= 80) return "default";
  if (confidence >= 60) return "secondary";
  return "outline";
};

export const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 80) return "High";
  if (confidence >= 60) return "Medium";
  return "Low";
};
