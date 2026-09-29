import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ──── TYPES ────
export type Role = "ADMIN" | "MANAGER" | "FIELD";
export type TokenType = "access" | "refresh";

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

interface SignedPayload extends AuthPayload {
  typ?: TokenType;
}

// Déclaration globale pour TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ──── HELPERS JWT ────
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");
  return secret;
}

export function signToken(payload: AuthPayload, typ: TokenType): string {
  const expiresIn =
      typ === "access"
          ? process.env.JWT_EXPIRES_IN || "7d"
          : process.env.JWT_REFRESH_EXPIRES_IN || "30d";
  return jwt.sign(
      { userId: payload.userId, email: payload.email, role: payload.role, typ },
      getSecret(),
      { expiresIn } as jwt.SignOptions
  );
}

// Vérifie la signature ET le type du jeton (un refresh token ne peut pas servir d'access token)
export function verifyToken(token: string, expected: TokenType): AuthPayload {
  const payload = jwt.verify(token, getSecret()) as SignedPayload;
  if (payload.typ !== expected) {
    throw new Error(`Wrong token type (expected ${expected})`);
  }
  return { userId: payload.userId, email: payload.email, role: payload.role };
}

// Relit l'utilisateur en base : un compte désactivé ou supprimé perd l'accès immédiatement,
// et un changement de rôle est pris en compte sans attendre l'expiration du jeton.
export async function loadActiveUser(userId: string): Promise<AuthPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return { userId: user.id, email: user.email, role: user.role as Role };
}

// ──── MIDDLEWARE: authenticate ────
// Valide le JWT (Authorization: Bearer) puis l'état du compte en base
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
  // Déjà authentifié plus haut dans la chaîne (ex. app.use + router.use)
  if (req.user) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  let payload: AuthPayload;
  try {
    payload = verifyToken(authHeader.substring(7), "access");
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    const user = await loadActiveUser(payload.userId);
    if (!user) {
      res.status(401).json({ error: "Account inactive or not found" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("[AUTH] User lookup failed:", error);
    res.status(500).json({ error: "Internal server error" });
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

// ──── HELPER: accès à un projet ────
export async function hasProjectAccess(user: AuthPayload, projectId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const link = await prisma.userProject.findUnique({
    where: { userId_projectId: { userId: user.userId, projectId } },
  });
  return !!link;
}

// ──── MIDDLEWARE: authorizeProject ────
// Vérifie que l'utilisateur a accès au projet (params[paramName] ou body.projectId)
// required=true : refuse la requête si aucun projectId n'est fourni
export const authorizeProject = (paramName: string = "projectId", required: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectId = req.params[paramName] || req.body?.projectId;

    if (!projectId) {
      if (required) {
        res.status(400).json({ error: "projectId is required" });
        return;
      }
      next();
      return;
    }

    try {
      if (!(await hasProjectAccess(req.user, projectId))) {
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
