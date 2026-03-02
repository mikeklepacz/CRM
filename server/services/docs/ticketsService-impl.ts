import { insertTicketReplySchema, insertTicketSchema } from "@shared/schema";
import { notifyNewTicket, notifyTicketReply } from "../../gmail";
import { storage } from "../../storage";

export type CheckAdminAccess = (user: any, tenantId: string | undefined) => Promise<boolean>;

class TicketHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "TicketHttpError";
  }
}

function getUserId(authUser: any): string {
  return authUser.isPasswordAuth ? authUser.id : authUser.claims.sub;
}

function isTenantAdminForTicket(user: any, ticketTenantId: string | null, actorTenantId: string | undefined): boolean {
  const isTenantAdmin = user?.roleInTenant === "org_admin" || user?.role === "admin";
  return Boolean(isTenantAdmin && ticketTenantId === actorTenantId);
}

export function isTicketHttpError(error: unknown): error is { status: number; message: string } {
  return error instanceof TicketHttpError;
}

export async function getUnreadTicketCount(params: {
  authUser: any;
  checkAdminAccess: CheckAdminAccess;
}): Promise<number> {
  const { authUser, checkAdminAccess } = params;
  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);
  const tenantId = authUser.tenantId;

  const isAdminUser = await checkAdminAccess(user, tenantId);
  if (!isAdminUser) {
    return 0;
  }

  const allTickets = await storage.getAllTickets();
  if (user?.isSuperAdmin) {
    return allTickets.filter((ticket) => ticket.isUnreadByAdmin).length;
  }
  return allTickets.filter((ticket) => ticket.tenantId === tenantId && ticket.isUnreadByAdmin).length;
}

export async function getAdminTickets(params: {
  authUser: any;
  checkAdminAccess: CheckAdminAccess;
}): Promise<any[]> {
  const { authUser, checkAdminAccess } = params;
  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);
  const tenantId = authUser.tenantId;

  const isAdminUser = await checkAdminAccess(user, tenantId);
  if (!isAdminUser) {
    throw new TicketHttpError(403, "Admin access required");
  }

  const allTickets = await storage.getAllTickets();
  const ticketsToShow = user?.isSuperAdmin
    ? allTickets
    : allTickets.filter((ticket) => ticket.tenantId === tenantId);

  return Promise.all(
    ticketsToShow.map(async (ticket) => {
      const ticketUser = await storage.getUser(ticket.userId);
      let tenantName: string | undefined;

      if (user?.isSuperAdmin && ticket.tenantId) {
        const tenant = await storage.getTenantById(ticket.tenantId);
        tenantName = tenant?.name;
      }

      return {
        ...ticket,
        userEmail: ticketUser?.email,
        userName:
          ticketUser?.firstName && ticketUser?.lastName
            ? `${ticketUser.firstName} ${ticketUser.lastName}`
            : undefined,
        tenantName,
      };
    })
  );
}

export async function getTicketsForActor(authUser: any): Promise<any[]> {
  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);
  const tenantId = authUser.tenantId;

  if (user?.roleInTenant === "org_admin" || user?.role === "admin") {
    const allTickets = await storage.getAllTickets();
    return allTickets.filter((ticket) => ticket.tenantId === tenantId);
  }
  return storage.getUserTickets(userId);
}

export async function getTicketDetails(params: {
  authUser: any;
  ticketId: string;
}): Promise<{ ticket: any; replies: any[] }> {
  const { authUser, ticketId } = params;
  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);

  const ticket = await storage.getTicket(ticketId);
  if (!ticket) {
    throw new TicketHttpError(404, "Ticket not found");
  }

  const isSuperAdminUser = user?.isSuperAdmin;
  const isTicketOwner = ticket.userId === userId;
  const isAdminForTicketTenant = isTenantAdminForTicket(user, ticket.tenantId, authUser.tenantId);
  if (!isSuperAdminUser && !isAdminForTicketTenant && !isTicketOwner) {
    throw new TicketHttpError(403, "Access denied");
  }

  const replies = await storage.getTicketReplies(ticketId);
  const repliesWithUserInfo = await Promise.all(
    replies.map(async (reply) => {
      const replyUser = await storage.getUser(reply.userId);
      return {
        ...reply,
        userEmail: replyUser?.email,
        userName:
          replyUser?.firstName && replyUser?.lastName
            ? `${replyUser.firstName} ${replyUser.lastName}`
            : undefined,
      };
    })
  );

  let tenantName = "Unknown Tenant";
  if (ticket.tenantId) {
    const tenant = await storage.getTenantById(ticket.tenantId);
    tenantName = tenant?.name || "Unknown Tenant";
  }

  const ticketUser = await storage.getUser(ticket.userId);
  const ticketWithInfo = {
    ...ticket,
    tenantName,
    userEmail: ticketUser?.email,
    userName:
      ticketUser?.firstName && ticketUser?.lastName
        ? `${ticketUser.firstName} ${ticketUser.lastName}`
        : undefined,
  };

  if (isSuperAdminUser || isAdminForTicketTenant) {
    await storage.markTicketReadByAdmin(ticketId);
  } else if (isTicketOwner) {
    await storage.markTicketReadByUser(ticketId);
  }

  return {
    ticket: ticketWithInfo,
    replies: repliesWithUserInfo,
  };
}

export async function createTicket(params: {
  authUser: any;
  body: any;
}): Promise<any> {
  const { authUser, body } = params;
  const userId = getUserId(authUser);
  const tenantId = authUser.tenantId;

  const validated = insertTicketSchema.parse({
    ...body,
    userId,
    tenantId,
  });

  const ticket = await storage.createTicket(validated);
  const user = await storage.getUser(userId);
  if (user) {
    notifyNewTicket(
      ticket.id,
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "User",
      user.email || "no-email",
      ticket.subject,
      ticket.message
    ).catch((error) => console.error("Failed to send new ticket email:", error));
  }

  return ticket;
}

export async function createTicketReply(params: {
  authUser: any;
  ticketId: string;
  message: any;
}): Promise<any> {
  const { authUser, ticketId, message } = params;
  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);

  const ticket = await storage.getTicket(ticketId);
  if (!ticket) {
    throw new TicketHttpError(404, "Ticket not found");
  }

  const isSuperAdminUser = user?.isSuperAdmin;
  const isAdminForTicketTenant = isTenantAdminForTicket(user, ticket.tenantId, authUser.tenantId);
  const isTicketOwner = ticket.userId === userId;
  if (!isSuperAdminUser && !isAdminForTicketTenant && !isTicketOwner) {
    throw new TicketHttpError(403, "Access denied");
  }

  const validated = insertTicketReplySchema.parse({
    ticketId,
    userId,
    message,
  });
  const reply = await storage.createTicketReply(validated);

  if (isSuperAdminUser || isAdminForTicketTenant) {
    await storage.updateTicket(ticketId, { isUnreadByUser: true });
    const ticketOwner = await storage.getUser(ticket.userId);
    if (ticketOwner?.email) {
      notifyTicketReply(ticketOwner.email, ticket.subject, message).catch((error) =>
        console.error("Failed to send reply email:", error)
      );
    }
  } else {
    await storage.updateTicket(ticketId, { isUnreadByAdmin: true });
    notifyNewTicket(
      ticket.id,
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "User",
      user?.email || "no-email",
      `Follow-up: ${ticket.subject}`,
      message
    ).catch((error) => console.error("Failed to send follow-up email:", error));
  }

  return reply;
}

export async function updateTicketStatus(params: {
  authUser: any;
  ticketId: string;
  status: string;
}): Promise<any> {
  const { authUser, ticketId, status } = params;
  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);

  const ticket = await storage.getTicket(ticketId);
  if (!ticket) {
    throw new TicketHttpError(404, "Ticket not found");
  }

  const isSuperAdminUser = user?.isSuperAdmin;
  const isAdminForTicketTenant = isTenantAdminForTicket(user, ticket.tenantId, authUser.tenantId);
  if (!isSuperAdminUser && !isAdminForTicketTenant) {
    throw new TicketHttpError(403, "Admin access required");
  }

  if (!["open", "in-progress", "replied", "closed"].includes(status)) {
    throw new TicketHttpError(400, "Invalid status");
  }

  return storage.updateTicket(ticketId, { status });
}

export async function markTicketRead(params: {
  authUser: any;
  ticketId: string;
  checkAdminAccess: CheckAdminAccess;
}): Promise<void> {
  const { authUser, ticketId, checkAdminAccess } = params;
  const userId = getUserId(authUser);
  const user = await storage.getUser(userId);

  const ticket = await storage.getTicket(ticketId);
  if (!ticket) {
    throw new TicketHttpError(404, "Ticket not found");
  }

  if (user?.isSuperAdmin) {
    await storage.markTicketReadByAdmin(ticketId);
    return;
  }

  const isAdminForTicketTenant = await checkAdminAccess(user, ticket.tenantId || undefined);
  if (!isAdminForTicketTenant) {
    throw new TicketHttpError(403, "Access denied");
  }

  await storage.markTicketReadByAdmin(ticketId);
}
