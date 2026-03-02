import type { Express } from "express";
import { createEmailImage, deleteEmailImage, listEmailImages } from "../../services/docs/emailImagesService";

export function registerEmailImagesRoutes(app: Express): void {
  app.get("/api/email-images", async (req: any, res) => {
    try {
      const images = await listEmailImages(req.user?.tenantId);
      res.json(images);
    } catch (error: any) {
      if (error.message === "Not authenticated") {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/email-images", async (req: any, res) => {
    try {
      const image = await createEmailImage({
        tenantId: req.user?.tenantId,
        url: req.body?.url,
        label: req.body?.label,
      });
      res.json(image);
    } catch (error: any) {
      if (error.message === "Not authenticated") {
        return res.status(401).json({ error: error.message });
      }
      if (
        error.message === "A valid URL is required" ||
        error.message === "A label is required" ||
        error.message === "Label is too long"
      ) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/email-images/:id", async (req: any, res) => {
    try {
      const deleted = await deleteEmailImage({
        id: req.params.id,
        tenantId: req.user?.tenantId,
      });

      if (!deleted) {
        return res.status(404).json({ error: "Image not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      if (error.message === "Not authenticated") {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });
}
