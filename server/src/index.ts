// Charge .env AVANT les autres imports : certains services lisent process.env au chargement
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// ─── ROUTES IMPORTS ───
import authRouter from "./routes/auth";
import { activityRouter } from "./routes/activities";
import userRouter from "./routes/users";
import dashboardRouter from "./routes/dashboard";
import financeRouter from "./routes/finance";
import referenceRouter from './routes/reference';
import projectsRouter from './routes/projects';
import programmesRouter from './routes/programmes';
import chatRoutes from './routes/chat';

import { authenticate } from "./middleware/auth";

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5174",
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// ─── RATE LIMITING ───
// L'API tourne derrière le proxy Apache de cPanel : on fait confiance au premier proxy
// pour que l'IP réelle du client soit utilisée.
app.set("trust proxy", 1);

// Limite générale, volontairement large (les bureaux partagent souvent une même IP)
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  // Variable dédiée : l'ancienne RATE_LIMIT_MAX (100) est trop basse pour une application monopage
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

// Anti force brute sur la connexion et l'activation de compte (seuls les échecs comptent)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

// Chat IA : limité par utilisateur pour maîtriser le coût des appels
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.userId || req.ip || "anonymous",
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many chat requests, please wait a few minutes" },
});

app.use("/api/", globalLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/users/accept-invitation", loginLimiter);

// ─── AI CHAT (authentification obligatoire) ───
app.use("/api/chat", authenticate, chatLimiter, chatRoutes);

// ─── ROUTES ───

// Auth routes (NO authentication required)
app.use("/api/auth", authRouter);

// ✅ Route publique accept-invitation
app.post("/api/users/accept-invitation", (req, res, next) => {
  req.url = "/accept-invitation";
  userRouter(req, res, next);
});

// ─── HEALTH CHECK ───

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Activity Tracker Pro API is running"
  });
});

// ─── PROTECTED ROUTES (require authentication) ───

// Activity routes
app.use("/api/activities", authenticate, activityRouter);

// User routes
app.use("/api/users", authenticate, userRouter);

// Programme routes
app.use('/api/programmes', authenticate, programmesRouter);

// Project routes
app.use('/api/projects', authenticate, projectsRouter);

// Dashboard routes
app.use("/api/dashboard", authenticate, dashboardRouter);

// Finance routes
app.use("/api/finance", authenticate, financeRouter);

// Reference routes
app.use('/api/reference', authenticate, referenceRouter);

// ─── ERROR HANDLER ───

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ─── 404 HANDLER ───

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// ─── START SERVER ───

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || "http://localhost:5174"}\n`);
});


export default app;