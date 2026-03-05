import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ──── TYPES ────
export type Role = "ADMIN" | "MANAGER" | "FIELD";

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

// Déclaration globale pour TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ──── MIDDLEWARE: authenticate ────
// Valide le JWT token depuis Authorization header
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("[AUTH] JWT_SECRET not defined");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const payload = jwt.verify(token, jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    console.error("[AUTH] Token verification failed:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// ──── MIDDLEWARE: authorize ────
// Vérifie que l'utilisateur a l'un des rôles requis
export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
};

// ──── MIDDLEWARE: authorizeProject ────
// Vérifie que l'utilisateur a accès au projet
export const authorizeProject = (paramName: string = "projectId") => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Admin a accès à tout
    if (req.user.role === "ADMIN") {
      next();
      return;
    }

    // Récupérer projectId depuis params ou body
    const projectId = req.params[paramName] || req.body.projectId;

    // Si pas de projectId, on passe (c'est ok pour certaines routes)
    if (!projectId) {
      next();
      return;
    }

    try {
      const userHasAccess = await prisma.userProject.findUnique({
        where: {
          userId_projectId: {
            userId: req.user.userId,
            projectId: projectId,
          },
        },
      });

      if (!userHasAccess) {
        res.status(403).json({ error: "No access to this project" });
        return;
      }

      next();
    } catch (error) {
      console.error("[AUTH] Project authorization error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};