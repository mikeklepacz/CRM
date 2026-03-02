import type { CallScenario } from "@/components/call-manager/call-manager.types";

export const scenarioDescriptions: Record<CallScenario, string> = {
  cold_calls: "Claimed stores ready for outreach. Filter by agent to see specific agent's claimed stores.",
  follow_ups: "Stores marked as 'Interested' with scheduled follow-up dates approaching.",
  recovery: "Leads from other agents that have been inactive for 30+ days. Re-engagement opportunities.",
};

export const CANADIAN_PROVINCES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Northwest Territories",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];
