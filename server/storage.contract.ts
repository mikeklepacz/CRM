import type { PlatformStorageContract } from "./storage-contracts/platform.contract";
import type { OrganizationStorageContract } from "./storage-contracts/organization.contract";
import type { AdminStorageContract } from "./storage-contracts/admin.contract";
import type { DashboardStorageContract } from "./storage-contracts/dashboard.contract";
import type { ClientsStorageContract } from "./storage-contracts/clients.contract";
import type { FollowUpStorageContract } from "./storage-contracts/followup.contract";
import type { MapSearchStorageContract } from "./storage-contracts/map-search.contract";
import type { SalesStorageContract } from "./storage-contracts/sales.contract";
import type { AssistantStorageContract } from "./storage-contracts/assistant.contract";
import type { DocsStorageContract } from "./storage-contracts/docs.contract";
import type { CallManagerStorageContract } from "./storage-contracts/call-manager.contract";
import type { ApolloStorageContract } from "./storage-contracts/apollo.contract";
import type { EhubStorageContract } from "./storage-contracts/ehub.contract";
import type { QualificationStorageContract } from "./storage-contracts/qualification.contract";

export interface IStorage extends
  PlatformStorageContract,
  OrganizationStorageContract,
  AdminStorageContract,
  DashboardStorageContract,
  ClientsStorageContract,
  FollowUpStorageContract,
  MapSearchStorageContract,
  SalesStorageContract,
  AssistantStorageContract,
  DocsStorageContract,
  CallManagerStorageContract,
  ApolloStorageContract,
  EhubStorageContract,
  QualificationStorageContract {}
