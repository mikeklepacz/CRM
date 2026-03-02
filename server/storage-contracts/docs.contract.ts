import type {
  Ticket,
  InsertTicket,
  TicketReply,
  InsertTicketReply,
  DriveFolder,
  InsertDriveFolder,
  KbFile,
  InsertKbFile,
  KbFileVersion,
  InsertKbFileVersion,
  KbChangeProposal,
  InsertKbChangeProposal,
} from "./shared-types";

export interface DocsStorageContract {
  // Ticket operations
  getAllTickets(): Promise<Ticket[]>;
  getUserTickets(userId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<InsertTicket>): Promise<Ticket>;
  getUnreadAdminCount(): Promise<number>;
  markTicketReadByAdmin(id: string): Promise<Ticket>;
  markTicketReadByUser(id: string): Promise<Ticket>;

  // Ticket Reply operations
  getTicketReplies(ticketId: string): Promise<TicketReply[]>;
  createTicketReply(reply: InsertTicketReply): Promise<TicketReply>;

  // Drive Folder operations
  getAllDriveFolders(): Promise<DriveFolder[]>;
  getDriveFolder(id: string): Promise<DriveFolder | undefined>;
  getDriveFolderByName(name: string): Promise<DriveFolder | undefined>;
  createDriveFolder(folder: InsertDriveFolder): Promise<DriveFolder>;
  updateDriveFolder(id: string, updates: Partial<InsertDriveFolder>): Promise<DriveFolder>;
  deleteDriveFolder(id: string): Promise<void>;

  // KB Management operations
  getAllKbFiles(tenantId: string, projectId?: string): Promise<KbFile[]>;
  getKbFileById(id: string, tenantId: string): Promise<KbFile | undefined>;
  getKbFileByFilename(filename: string, tenantId: string): Promise<KbFile | undefined>;
  getKbFileByElevenLabsDocId(docId: string, tenantId: string): Promise<KbFile | undefined>;
  createKbFile(file: InsertKbFile): Promise<KbFile>;
  updateKbFile(id: string, tenantId: string, updates: Partial<InsertKbFile>): Promise<KbFile>;
  deleteKbFile(id: string, tenantId: string): Promise<boolean>;
  createKbFileVersion(version: InsertKbFileVersion): Promise<KbFileVersion>;
  getKbFileVersions(fileId: string, tenantId: string): Promise<KbFileVersion[]>;
  getKbFileVersion(id: string, tenantId: string): Promise<KbFileVersion | undefined>;
  createKbProposal(proposal: InsertKbChangeProposal): Promise<KbChangeProposal>;
  getKbProposals(tenantId: string, filters?: { status?: string; kbFileId?: string }): Promise<KbChangeProposal[]>;
  getKbProposalById(id: string, tenantId: string): Promise<KbChangeProposal | undefined>;
  updateKbProposal(id: string, tenantId: string, updates: Partial<InsertKbChangeProposal>): Promise<KbChangeProposal>;
  deleteKbProposal(id: string, tenantId: string): Promise<boolean>;
  deleteAllKbProposals(tenantId: string): Promise<number>;

}
