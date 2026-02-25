import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate, AuthPayload } from "../middleware/auth";

const prisma = new PrismaClient();
export const authRouter = Router();

// ──── POST /api/auth/login ────
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("[AUTH/LOGIN] Demande reçue");
    const { email, password } = req.body;
    console.log(`[AUTH/LOGIN] Email: ${email}, Password length: ${password?.length || 0}`);

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

    console.log("[AUTH/LOGIN] Création JWT...");
    const jwtSecret = process.env.JWT_SECRET;
    console.log(`[AUTH/LOGIN] JWT_SECRET présent: ${jwtSecret ? "OUI" : "NON"}`);

    if (!jwtSecret) {
      console.error("[AUTH/LOGIN] JWT_SECRET est undefined!");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    const refreshToken = jwt.sign(payload, jwtSecret, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    });

    console.log(`[AUTH/LOGIN] ✅ Login réussi pour ${email}`);

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
    res.status(500).json({ error: "Failed to login", details: String(error) });
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

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not defined");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const payload = jwt.verify(refreshToken, jwtSecret) as AuthPayload;

    const newToken = jwt.sign(
        { userId: payload.userId, email: payload.email, role: payload.role },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

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