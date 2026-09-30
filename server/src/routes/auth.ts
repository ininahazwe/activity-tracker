import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authenticate, AuthPayload, signToken, verifyToken, loadActiveUser } from "../middleware/auth";
import { logAudit } from "../services/audit";

const prisma = new PrismaClient();
export const authRouter = Router();

// ──── POST /api/auth/login ────
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("[AUTH/LOGIN] Demande reçue");
        const { email, password } = req.body;
        console.log(`[AUTH/LOGIN] Email: ${email}`);

        if (!email || !password) {
            console.log("[AUTH/LOGIN] Email ou password manquant");
            res.status(400).json({ error: "Email and password are required" });
            return;
        }

        console.log("[AUTH/LOGIN] Recherche utilisateur...");
        const user = await prisma.user.findUnique({
            where: { email },
            include: { projects: { include: { project: true } } },
        });
        console.log(`[AUTH/LOGIN] User trouvé: ${user ? user.email : "NON"}`);

        if (!user) {
            console.log("[AUTH/LOGIN] Utilisateur non trouvé");
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        if (user.status !== "ACTIVE") {
            console.log(`[AUTH/LOGIN] User status: ${user.status} (pas ACTIVE)`);
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        console.log("[AUTH/LOGIN] Vérification mot de passe...");
        const valid = await bcrypt.compare(password, user.passwordHash);
        console.log(`[AUTH/LOGIN] Mot de passe valide: ${valid}`);

        if (!valid) {
            console.log("[AUTH/LOGIN] Mot de passe incorrect");
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const payload: AuthPayload = {
            userId: user.id,
            email: user.email,
            role: user.role as any,
        };

        const token = signToken(payload, "access");
        const refreshToken = signToken(payload, "refresh");

        console.log(`[AUTH/LOGIN] ✅ Login réussi pour ${email}`);
        await logAudit({ userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, ipAddress: req.ip });

        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                projects: user.projects.map((up) => ({
                    id: up.project.id,
                    name: up.project.name,
                    slug: up.project.slug,
                })),
            },
        });
    } catch (error) {
        console.error("[AUTH/LOGIN] ❌ Erreur:", error);
        res.status(500).json({ error: "Failed to login" });
    }
});

// ──── POST /api/auth/refresh ────
authRouter.post("/refresh", async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({ error: "Refresh token required" });
            return;
        }

        const payload = verifyToken(refreshToken, "refresh");

        // Le compte doit toujours être actif ; le rôle est relu en base
        const user = await loadActiveUser(payload.userId);
        if (!user) {
            res.status(401).json({ error: "Account inactive or not found" });
            return;
        }

        const newToken = signToken(user, "access");

        res.json({ token: newToken });
    } catch (error) {
        console.error("[AUTH] Refresh error:", error);
        res.status(401).json({ error: "Invalid refresh token" });
    }
});

// ──── GET /api/auth/me ────
authRouter.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ error: "User not found in token" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { projects: { include: { project: true } } },
        });

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            projects: user.projects.map((up) => ({
                id: up.project.id,
                name: up.project.name,
                slug: up.project.slug,
            })),
        });
    } catch (error) {
        console.error("[AUTH] Me error:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

export default authRouter;