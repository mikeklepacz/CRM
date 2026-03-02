export interface FollowUpClient {
  id: string;
  data: Record<string, any>;
  claimDate: string | null;
  lastContactDate: string | null;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceContact?: number;
  daysSinceOrder?: number;
}

export interface FollowUpData {
  claimedUntouched: FollowUpClient[];
  interestedGoingCold: FollowUpClient[];
  closedWonReorder: FollowUpClient[];
}
