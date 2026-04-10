import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import chatRoutes from './routes/chat';
import dotenv from "dotenv";

// ─── ROUTES IMPORTS ───
import authRouter from "./routes/auth";
import { activityRouter } from "./routes/activities";
import userRouter from "./routes/users";
import dashboardRouter from "./routes/dashboard";
import financeRouter from "./routes/finance";
import referenceRouter from './routes/reference';
import projectsRouter from './routes/projects';

import { authenticate } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// ─── RATE LIMITING ───

/*const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);*/

// ─── AI CHAT ───
app.use("/api", chatRoutes);

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
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || "http://localhost:5173"}\n`);
});

export default app;