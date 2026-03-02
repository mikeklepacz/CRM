type CreateUserDeps = {
  bcrypt: {
    hash: (value: string, saltRounds: number) => Promise<string>;
  };
  storage: any;
};

type UpdateVoiceAccessDeps = {
  db: any;
  eq: any;
  users: any;
};

type ResetPasswordDeps = {
  bcrypt: {
    hash: (value: string, saltRounds: number) => Promise<string>;
  };
  db: any;
  eq: any;
  storage: any;
  users: any;
};

export function createGetAgentsHandler(storage: any) {
  return async (_req: any, res: any) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (error: any) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: error.message || "Failed to fetch agents" });
    }
  };
}

export function createListUsersHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const tenantUsers = await storage.listTenantUsers(tenantId);
      const allOrders = await storage.getAllOrders(tenantId);

      const usersWithMetrics = tenantUsers.map((user: any) => {
        let totalSales = 0;
        let grossIncome = 0;

        if (user.agentName) {
          const userOrders = allOrders.filter((order: any) => {
            if (!order.salesAgentName) return false;
            return order.salesAgentName.toLowerCase().trim() === user.agentName.toLowerCase().trim();
          });

          totalSales = userOrders.length;
          grossIncome = userOrders.reduce((sum: number, order: any) => {
            return sum + parseFloat(order.total || "0");
          }, 0);
        }

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          agentName: user.agentName,
          role: user.role,
          roleInTenant: user.roleInTenant,
          isActive: user.isActive ?? (user as any).is_active ?? true,
          hasVoiceAccess: user.hasVoiceAccess ?? false,
          totalSales,
          grossIncome: grossIncome.toFixed(2),
          createdAt: user.createdAt,
          referredBy: user.referredBy,
        };
      });

      res.json({ users: usersWithMetrics });
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
  };
}

export function createCreateUserHandler(deps: CreateUserDeps) {
  const { bcrypt, storage } = deps;

  return async (req: any, res: any) => {
    try {
      const { email, firstName, lastName, agentName, password, role, selectedCategory, referredBy } = req.body;
      const tenantId = req.user.tenantId;

      if (!email || !agentName || !password) {
        return res.status(400).json({ message: "Email, agent name, and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        const tenantUsers = await storage.listTenantUsers(tenantId);
        const alreadyMember = tenantUsers.some((u: any) => u.id === existingUser.id);
        if (alreadyMember) {
          return res.status(400).json({ message: "User is already a member of this organization" });
        }
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const username = email;

      const newUser = await storage.createUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        agentName,
        username,
        passwordHash,
        role: role || "agent",
        referredBy: referredBy || null,
      });

      const roleInTenant = role === "admin" || role === "org_admin" ? "org_admin" : "agent";
      await storage.addUserToTenant(newUser.id, tenantId, roleInTenant, true);

      if (selectedCategory) {
        await storage.setSelectedCategory(newUser.id, tenantId, selectedCategory);
      }

      res.json({ user: newUser });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  };
}

export function createUpdateVoiceAccessHandler(deps: UpdateVoiceAccessDeps) {
  const { db, eq, users } = deps;

  return async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { hasVoiceAccess } = req.body;

      if (typeof hasVoiceAccess !== "boolean") {
        return res.status(400).json({ message: "hasVoiceAccess must be a boolean" });
      }

      const [updatedUser] = await db
        .update(users)
        .set({ hasVoiceAccess, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error: any) {
      console.error("Error updating voice access:", error);
      res.status(500).json({ message: error.message || "Failed to update voice access" });
    }
  };
}

export function createResetUserPasswordHandler(deps: ResetPasswordDeps) {
  const { bcrypt, db, eq, storage, users } = deps;

  return async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || typeof newPassword !== "string") {
        return res.status(400).json({ message: "New password is required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      const [updatedUser] = await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      res.json({
        message: "Password reset successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          agentName: updatedUser.agentName,
        },
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: error.message || "Failed to reset password" });
    }
  };
}
