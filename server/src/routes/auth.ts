import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate, AuthPayload, signToken, verifyToken, loadActiveUser } from "../middleware/auth";
import { logAudit } from "../services/audit";
import { emailService } from "../services/gmailService";

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

// ──── RÉINITIALISATION DU MOT DE PASSE ────
// Jeton signé avec JWT_SECRET + empreinte du mot de passe actuel :
// - à usage unique (dès que le mot de passe change, le jeton n'est plus vérifiable),
// - sans colonne supplémentaire en base.
const RESET_TTL = "1h";
const MIN_PASSWORD_LENGTH = 8;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://tracker.mfwa.org";

function resetSecret(passwordHash: string): string {
    const base = process.env.JWT_SECRET;
    if (!base) throw new Error("JWT_SECRET not defined");
    return `${base}:reset:${passwordHash}`;
}

// Anti-bombardement d'e-mails : 3 demandes par adresse et par heure (mémoire du processus)
const resetRequests = new Map<string, number[]>();
function tooManyResetRequests(email: string): boolean {
    const now = Date.now();
    const recent = (resetRequests.get(email) || []).filter((t) => now - t < 60 * 60 * 1000);
    if (recent.length >= 3) {
        resetRequests.set(email, recent);
        return true;
    }
    recent.push(now);
    resetRequests.set(email, recent);
    return false;
}

// ──── POST /api/auth/forgot-password ────
// Réponse identique que le compte existe ou non (pas d'énumération des comptes)
authRouter.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
    const generic = { message: "If an account exists for this email, a reset link has been sent." };
    try {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        if (!email) {
            res.status(400).json({ error: "Email is required" });
            return;
        }

        const user = await prisma.user.findFirst({ where: { email } });

        // Seuls les comptes actifs avec un mot de passe peuvent réinitialiser (un invité utilise son lien d'invitation)
        if (user && user.status === "ACTIVE" && user.passwordHash && !tooManyResetRequests(email)) {
            const token = jwt.sign({ userId: user.id, purpose: "password-reset" }, resetSecret(user.passwordHash), {
                expiresIn: RESET_TTL,
            } as jwt.SignOptions);
            const link = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
            try {
                await emailService.sendPasswordReset({ email: user.email, name: user.name }, link);
            } catch (mailError: any) {
                console.error("[AUTH/FORGOT] Envoi de l'e-mail impossible:", mailError?.message || mailError);
            }
        }

        res.json(generic);
    } catch (error) {
        console.error("[AUTH/FORGOT] ❌ Erreur:", error);
        res.status(500).json({ error: "Failed to process the request" });
    }
});

// ──── POST /api/auth/reset-password ────
authRouter.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
    const invalid = { error: "This reset link is invalid or has expired. Please request a new one." };
    try {
        const { token, password } = req.body ?? {};
        if (typeof token !== "string" || typeof password !== "string") {
            res.status(400).json({ error: "Token and password are required" });
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
            return;
        }

        // Identifier l'utilisateur sans faire confiance au jeton, puis vérifier la signature avec SON secret
        const unverified = jwt.decode(token) as { userId?: string; purpose?: string } | null;
        if (!unverified?.userId || unverified.purpose !== "password-reset") {
            res.status(400).json(invalid);
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: unverified.userId } });
        if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
            res.status(400).json(invalid);
            return;
        }

        try {
            const verified = jwt.verify(token, resetSecret(user.passwordHash)) as { userId: string; purpose: string };
            if (verified.userId !== user.id || verified.purpose !== "password-reset") throw new Error("mismatch");
        } catch {
            res.status(400).json(invalid);
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

        await logAudit({
            userId: user.id,
            action: "UPDATE",
            entityType: "User",
            entityId: user.id,
            changes: { passwordReset: true },
            ipAddress: req.ip,
        });

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("[AUTH/RESET] ❌ Erreur:", error);
        res.status(500).json({ error: "Failed to reset password" });
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