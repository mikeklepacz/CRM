import { storage } from "../../storage";

export async function getActiveUsers() {
  const users = await storage.getAllUsers();
  return users.filter((user) => user.isActive !== false);
}
