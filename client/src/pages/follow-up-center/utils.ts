import type { FollowUpClient } from "./types";

export function getClientName(client: FollowUpClient) {
  return client.data?.Name || client.data?.name || client.data?.Company || client.data?.company || "Unknown";
}

export function getClientPhone(client: FollowUpClient) {
  return client.data?.Phone || client.data?.phone || "No phone";
}
