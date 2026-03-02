import type { Express } from "express";

export interface DbaRouteDeps {
  app: Express;
  storage: any;
  googleSheets: any;
  isAuthenticatedCustom: any;
  clearUserCache: (userId: string) => void;
}
