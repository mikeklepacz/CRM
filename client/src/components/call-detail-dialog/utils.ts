export const formatDuration = (secs: number | null) => {
  if (!secs) return "0:00";
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const getInterestLevelColor = (level: string | null) => {
  switch (level) {
    case "hot":
      return "destructive";
    case "warm":
      return "default";
    case "cold":
      return "secondary";
    case "not-interested":
      return "outline";
    default:
      return "secondary";
  }
};

export const getInterestLevelLabel = (level: string | null) => {
  if (!level) return "Unknown";
  return level
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getSentimentColor = (sentiment: string | undefined) => {
  switch (sentiment?.toLowerCase()) {
    case "positive":
      return "default";
    case "negative":
      return "destructive";
    case "neutral":
      return "secondary";
    default:
      return "outline";
  }
};
