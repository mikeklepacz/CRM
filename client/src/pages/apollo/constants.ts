import { extractDomain as extractDomainFromInput } from "@/lib/extract-domain";

export const SENIORITY_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-Suite" },
  { value: "partner", label: "Partner" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
];

export const DEFAULT_TITLES = ["Owner", "Manager", "Director", "Buyer", "Purchasing Manager", "Store Manager"];

export function extractDomain(url: string | undefined): string | null {
  return extractDomainFromInput(url);
}
