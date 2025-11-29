// Replit Auth setup - from javascript_log_in_with_replit blueprint
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

export const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["given_name"],
    lastName: claims["family_name"],
    profileImageUrl: claims["picture"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: any, cb) => {
    // Store the entire user object in session
    cb(null, user);
  });
  
  passport.deserializeUser(async (user: any, cb) => {
    // For password auth users, we need to fetch the full user data
    if (user.isPasswordAuth) {
      try {
        const fullUser = await storage.getUser(user.id);
        if (!fullUser) {
          return cb(new Error('User not found'));
        }
        // Fetch tenant context for the user
        const tenantContext = await storage.getUserDefaultTenant(user.id);
        // Return password auth user with fresh data and a flag to skip token expiry checks
        cb(null, { 
          ...user, 
          role: fullUser.role,
          hasVoiceAccess: fullUser.hasVoiceAccess ?? false,
          isSuperAdmin: fullUser.isSuperAdmin ?? false,
          tenantId: tenantContext?.tenantId,
          roleInTenant: tenantContext?.roleInTenant,
          skipTokenCheck: true 
        });
      } catch (error) {
        console.error('Error deserializing password auth user:', error);
        cb(error);
      }
    } else {
      // For Replit Auth users, fetch fresh user data as well
      try {
        const fullUser = await storage.getUser(user.claims?.sub);
        if (fullUser) {
          // Fetch tenant context for the user
          const tenantContext = await storage.getUserDefaultTenant(fullUser.id);
          cb(null, { 
            ...user, 
            role: fullUser.role,
            hasVoiceAccess: fullUser.hasVoiceAccess ?? false,
            isSuperAdmin: fullUser.isSuperAdmin ?? false,
            tenantId: tenantContext?.tenantId,
            roleInTenant: tenantContext?.roleInTenant
          });
        } else {
          // If can't find user, return session data as-is
          cb(null, user);
        }
      } catch (error) {
        console.error('Error deserializing Replit auth user:', error);
        // On error, return session data as-is instead of failing
        cb(null, user);
      }
    }
  });

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// Role hierarchy: super_admin > org_admin > agent
// super_admin: Platform-wide access (isSuperAdmin flag on user)
// org_admin: Tenant-level admin (roleInTenant = 'org_admin')
// agent: Regular user (roleInTenant = 'agent')

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Password auth users don't have token expiry checks
  if (user.skipTokenCheck) {
    return next();
  }

  // Replit Auth users need token expiry checks
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Route guard: Requires super admin (platform-wide access)
export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  const user = req.user as any;
  if (!user?.isSuperAdmin) {
    return res.status(403).json({ message: "Forbidden: Super admin access required" });
  }
  return next();
};

// Route guard: Requires org admin or higher (tenant-level admin)
export const requireOrgAdmin: RequestHandler = (req, res, next) => {
  const user = req.user as any;
  // Super admins can access org admin routes
  if (user?.isSuperAdmin) {
    return next();
  }
  // Check tenant-level role
  if (user?.roleInTenant !== 'org_admin') {
    return res.status(403).json({ message: "Forbidden: Organization admin access required" });
  }
  return next();
};

// Route guard: Requires agent or higher (any authenticated user in tenant)
// This is essentially the same as isAuthenticated but validates tenant context
export const requireAgent: RequestHandler = (req, res, next) => {
  const user = req.user as any;
  // Super admins can access all agent routes
  if (user?.isSuperAdmin) {
    return next();
  }
  // Check that user has valid tenant context
  if (!user?.tenantId || !user?.roleInTenant) {
    return res.status(403).json({ message: "Forbidden: No valid tenant context" });
  }
  return next();
};

// Helper to check if user can access admin features (org_admin or super_admin)
export const canAccessAdminFeatures = (user: any): boolean => {
  if (!user) return false;
  return user.isSuperAdmin || user.roleInTenant === 'org_admin' || user.role === 'admin';
};

// Helper to check if user is super admin
export const isSuperAdmin = (user: any): boolean => {
  return user?.isSuperAdmin === true;
};
