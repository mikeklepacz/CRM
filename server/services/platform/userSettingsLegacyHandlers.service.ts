import { z } from "zod";

type PasswordDeps = {
  bcrypt: {
    compare: (value: string, encrypted: string) => Promise<boolean>;
    hash: (value: string, saltRounds: number) => Promise<string>;
  };
  storage: any;
};

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(1, "Username is required"),
  agentName: z.string().optional(),
  phone: z.string().optional(),
  meetingLink: z.string().url("Invalid URL").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const gmailSettingsSchema = z.object({
  signature: z.string().nullable().optional(),
  gmailLabels: z.array(z.string()).nullable().optional(),
  emailPreference: z.enum(["gmail_draft", "mailto"]).optional(),
});

const statusColorSchema = z
  .record(
    z.object({
      background: z.string(),
      text: z.string(),
    })
  )
  .optional();

const colorSchemaWithStatus = z
  .object({
    background: z.string(),
    text: z.string(),
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    border: z.string(),
    bodyBackground: z.string(),
    headerBackground: z.string(),
    statusColors: statusColorSchema,
  })
  .optional();

const userPreferencesSchema = z.object({
  visibleColumns: z.record(z.boolean()).optional(),
  columnOrder: z.array(z.string()).optional(),
  columnWidths: z.record(z.number()).optional(),
  selectedStates: z.array(z.string()).optional(),
  selectedCities: z.array(z.string()).optional(),
  fontSize: z.number().optional(),
  rowHeight: z.number().optional(),
  lightModeColors: colorSchemaWithStatus.nullable(),
  darkModeColors: colorSchemaWithStatus.nullable(),
  textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
  colorRowByStatus: z.boolean().optional(),
  colorPresets: z.array(z.object({ name: z.string(), color: z.string() })).nullable().optional(),
  showCanadaOnly: z.boolean().optional(),
  freezeFirstColumn: z.boolean().optional(),
  statusOptions: z.array(z.string()).optional(),
  showMyStoresOnly: z.boolean().optional(),
  loadingLogoUrl: z.string().nullable().optional(),
  timezone: z.string().optional(),
  defaultTimezoneMode: z.enum(["agent", "customer"]).optional(),
  timeFormat: z.enum(["12hr", "24hr"]).optional(),
  defaultCalendarReminders: z.array(z.object({ method: z.string(), minutes: z.number() })).optional(),
  autoKbAnalysis: z.boolean().optional(),
  kbAnalysisThreshold: z.number().optional(),
  blacklistCheckEnabled: z.boolean().optional(),
  followUpFilters: z
    .object({
      claimedDays: z.tuple([z.number(), z.number()]),
      interestedDays: z.tuple([z.number(), z.number()]),
      reorderDays: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  visibleModules: z.record(z.boolean()).optional(),
  defaultMapCountry: z.string().nullable().optional(),
  defaultMapView: z
    .object({
      lat: z.number(),
      lng: z.number(),
      zoom: z.number(),
    })
    .nullable()
    .optional(),
  cylinderPos: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
      scale: z.number(),
      cameraZ: z.number(),
      rotX: z.number(),
      rotY: z.number(),
    })
    .optional(),
  textureMapping: z
    .object({
      offsetX: z.number(),
      offsetY: z.number(),
      rotation: z.number(),
      scaleX: z.number(),
      scaleY: z.number(),
      centerX: z.number(),
      centerY: z.number(),
    })
    .optional(),
});

export function createUserProfileUpdateHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const validation = profileSchema.safeParse(req.body);
      if (!validation.success) return res.status(400).json({ message: validation.error.errors[0].message });

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { firstName, lastName, email, username, agentName, phone, meetingLink } = validation.data;
      const updated = await storage.updateUser(userId, { firstName, lastName, email, username, agentName, phone, meetingLink });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: error.message || "Failed to update profile" });
    }
  };
}

export function createUserPasswordUpdateHandler(deps: PasswordDeps) {
  const { bcrypt, storage } = deps;

  return async (req: any, res: any) => {
    try {
      const validation = passwordSchema.safeParse(req.body);
      if (!validation.success) return res.status(400).json({ message: validation.error.errors[0].message });

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { currentPassword, newPassword } = validation.data;
      const user = await storage.getUser(userId);
      if (!user?.passwordHash) return res.status(400).json({ message: "Password auth not enabled for this user" });

      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) return res.status(401).json({ message: "Current password is incorrect" });

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { passwordHash: newPasswordHash });
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: error.message || "Failed to update password" });
    }
  };
}

export function createUserGmailSettingsUpdateHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const validation = gmailSettingsSchema.safeParse(req.body);
      if (!validation.success) return res.status(400).json({ message: validation.error.errors[0].message });

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const { signature, gmailLabels, emailPreference } = validation.data;
      const updated = await storage.updateUser(userId, { signature, gmailLabels, emailPreference });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating Gmail settings:", error);
      res.status(500).json({ message: error.message || "Failed to update Gmail settings" });
    }
  };
}

export function createUserPreferencesGetHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = (req.user as any).tenantId;
      const preferences = await storage.getUserPreferences(userId, tenantId);
      res.json(preferences || null);
    } catch (error: any) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: error.message || "Failed to fetch preferences" });
    }
  };
}

export function createUserPreferencesUpdateHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const validation = userPreferencesSchema.safeParse(req.body);
      if (!validation.success) return res.status(400).json({ message: validation.error.errors[0].message });

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = (req.user as any).tenantId;
      const preferences = await storage.saveUserPreferences(userId, tenantId, validation.data);
      res.json(preferences);
    } catch (error: any) {
      console.error("Error saving user preferences:", error);
      res.status(500).json({ message: error.message || "Failed to save preferences" });
    }
  };
}

export function createUserUploadLoadingLogoHandler(storage: any) {
  return async (req: any, res: any) => {
    try {
      const { imageData } = req.body;
      if (!imageData || !imageData.startsWith("data:image/")) {
        return res.status(400).json({ message: "Invalid image data. Must be a base64-encoded image." });
      }

      const base64Length = imageData.length - (imageData.indexOf(",") + 1);
      const sizeInBytes = (base64Length * 3) / 4;
      if (sizeInBytes / (1024 * 1024) > 5) {
        return res.status(400).json({ message: "Image too large. Maximum size is 5MB." });
      }

      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const tenantId = (req.user as any).tenantId;
      const preferences = await storage.saveUserPreferences(userId, tenantId, { loadingLogoUrl: imageData });
      res.json({
        message: "Loading logo uploaded successfully",
        loadingLogoUrl: preferences.loadingLogoUrl,
      });
    } catch (error: any) {
      console.error("Error uploading loading logo:", error);
      res.status(500).json({ message: error.message || "Failed to upload logo" });
    }
  };
}
