import type { Calendar } from "lucide-react";

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  status: "connected" | "disconnected";
  connectedEmail?: string | null;
  connectorId?: string;
}

export interface IntegrationStatusResponse {
  googleSheetsConnected: boolean;
  googleCalendarConnected: boolean;
  googleSheetsEmail: string | null;
  googleCalendarEmail: string | null;
}
