import { storage } from "../../storage";

export async function requireSuperAdminFromSession(req: any, res: any) {
    const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user?.isSuperAdmin) {
        res.status(403).json({ message: "Super admin access required" });
        return null;
    }
    return user;
}
