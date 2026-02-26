import type { Express } from "express";

type Deps = {
  isAuthenticatedCustom: any;
  handleOpenaiChat: (req: any, res: any) => Promise<void>;
};

export function registerOpenaiChatRoutes(app: Express, deps: Deps): void {
  app.post("/api/openai/chat", deps.isAuthenticatedCustom, deps.handleOpenaiChat);
}
