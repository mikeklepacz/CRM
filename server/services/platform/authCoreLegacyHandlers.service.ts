type AuthDeps = {
  bcrypt: {
    compare: (value: string, encrypted: string) => Promise<boolean>;
    hash: (value: string, saltRounds: number) => Promise<string>;
  };
  storage: any;
};

export function createAuthLoginHandler(deps: AuthDeps) {
  const { bcrypt, storage } = deps;

  return async (req: any, res: any) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.login({ id: user.id, isPasswordAuth: true }, (err: any) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Session save failed" });
          }
          res.json({
            message: "Login successful",
            user: {
              id: user.id,
              username: user.username,
              role: user.role,
              hasVoiceAccess: user.hasVoiceAccess ?? false,
            },
          });
        });
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message || "Login failed" });
    }
  };
}

export function createAuthRegisterHandler(deps: AuthDeps) {
  const { bcrypt, storage } = deps;

  return async (req: any, res: any) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createPasswordUser({
        username,
        passwordHash,
        email: email || `${username}@example.com`,
        firstName: username,
        lastName: "",
      });

      res.json({
        message: "Registration successful",
        user: { id: user.id, username: user.username },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  };
}

export function createEventsHandler(eventGateway: { addClient: (clientId: string, res: any, userId: string) => void }) {
  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const clientId = `${userId}-${Date.now()}`;
      eventGateway.addClient(clientId, res, userId);
    } catch (error: any) {
      console.error("[SSE] Error setting up event stream:", error);
      res.status(500).json({ message: "Failed to establish event stream" });
    }
  };
}
