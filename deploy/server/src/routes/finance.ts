import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ──── GET /api/finance ────
// Récupérer les données financières (depuis la table Finance, pas Project.budget)
router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("[FINANCE] GET / - User:", req.user?.userId);

        const userId = req.user?.userId;
        const userRole = req.user?.role;

        console.log(`[FINANCE] userRole: ${userRole}`);

        let where: any = {};

        if (userRole === "ADMIN") {
            console.log("[FINANCE] User is ADMIN, fetching all finance records");
        } else if (userRole === "MANAGER") {
            console.log("[FINANCE] User is MANAGER, fetching user projects finance");
            const userProjects = await prisma.userProject.findMany({
                where: { userId },
                select: { projectId: true },
            });
            where.projectId = { in: userProjects.map((up) => up.projectId) };
        } else {
            console.log("[FINANCE] User is FIELD, cannot view finance");
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }

        console.log("[FINANCE] Fetching finance records from database...");
        const finances = await prisma.finance.findMany({
            where,
            include: {
                project: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        console.log(`[FINANCE] Found ${finances.length} finance records`);
        console.log("[FINANCE] ✅ Success");

        res.json(finances);
    } catch (error) {
        console.error("[FINANCE] ❌ Error:", error);
        res.status(500).json({
            error: "Failed to fetch finance data",
            details: String(error)
        });
    }
});

// ──── GET /api/finance/budget-overview ────
// Résumé des budgets - somme des finance records
router.get("/budget-overview", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("[FINANCE] GET /budget-overview");

        const userId = req.user?.userId;
        const userRole = req.user?.role;

        let where: any = {};

        if (userRole === "ADMIN") {
            console.log("[FINANCE] User is ADMIN");
        } else if (userRole === "MANAGER") {
            console.log("[FINANCE] User is MANAGER");
            const userProjects = await prisma.userProject.findMany({
                where: { userId },
                select: { projectId: true },
            });
            where.projectId = { in: userProjects.map((up) => up.projectId) };
        } else {
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }

        const finances = await prisma.finance.findMany({
            where,
            select: { amount: true },
        });

        const totalBudget = finances.reduce((sum, f) => sum + (f.amount || 0), 0);
        const averageBudget = finances.length > 0 ? totalBudget / finances.length : 0;

        console.log("[FINANCE] ✅ Budget overview success");
        res.json({
            totalBudget,
            averageBudget: parseFloat(averageBudget.toFixed(2)),
            recordCount: finances.length,
        });
    } catch (error) {
        console.error("[FINANCE] Budget overview error:", error);
        res.status(500).json({
            error: "Failed to fetch budget overview",
            details: String(error)
        });
    }
});

export default router;