import {
  clients,
  type Client,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function getFollowUpClientsStorage(userId: string, userRole: string): Promise<{
  claimedUntouched: Array<Client & { daysSinceContact: number }>;
  interestedGoingCold: Array<Client & { daysSinceContact: number }>;
  closedWonReorder: Array<Client & { daysSinceOrder: number }>;
}> {
  const now = new Date();

  const baseQuery =
    userRole === "admin"
      ? db.select().from(clients)
      : db.select().from(clients).where(eq(clients.assignedAgent, userId));

  const allClients = await baseQuery;

  const claimedUntouched = allClients
    .filter((c) => {
      const status = (c.data?.Status || c.data?.status || "").toLowerCase();

      if (status === "claimed" && !c.lastContactDate) {
        return true;
      }

      if (status === "contacted" && c.lastContactDate) {
        const daysSinceContact = Math.floor(
          (now.getTime() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceContact > 7;
      }

      return false;
    })
    .map((c) => ({
      ...c,
      daysSinceContact: c.lastContactDate
        ? Math.floor((now.getTime() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : c.claimDate
          ? Math.floor((now.getTime() - new Date(c.claimDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
    }));

  const interestedGoingCold = allClients
    .filter((c) => {
      const status = (c.data?.Status || c.data?.status || "").toLowerCase();
      return (
        c.lastContactDate &&
        !c.firstOrderDate &&
        (status === "interested" || status === "sample sent" || status === "follow up" || status === "warm")
      );
    })
    .map((c) => ({
      ...c,
      daysSinceContact: Math.floor((now.getTime() - new Date(c.lastContactDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

  const closedWonReorder = allClients
    .filter((c) => c.firstOrderDate && c.firstOrderDate === c.lastOrderDate)
    .map((c) => ({
      ...c,
      daysSinceOrder: Math.floor((now.getTime() - new Date(c.firstOrderDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

  return {
    claimedUntouched,
    interestedGoingCold,
    closedWonReorder,
  };
}
