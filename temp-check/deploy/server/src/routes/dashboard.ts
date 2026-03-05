import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

async function getDashboardWhere(req: Request): Promise<Prisma.ActivityWhereInput> {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { dateFrom, dateTo, countries, funders, thematicFocus } = req.query;

    const conditions: Prisma.ActivityWhereInput[] = [];

    // 1. Sécurité par rôle (Inchangé)
    if (userRole === "FIELD") {
        conditions.push({ createdById: userId });
    } else if (userRole === "MANAGER") {
        const userProjects = await prisma.userProject.findMany({
            where: { userId },
            select: { projectId: true },
        });
        const projectIds = userProjects.map((up) => up.projectId);
        if (projectIds.length > 0) {
            conditions.push({ projectId: { in: projectIds } });
        }
    }

    // 2. Filtres de dates (Correction : utilisation de activityStartDate ou createdAt)
    if (dateFrom || dateTo) {
        const dateFilter: any = {};
        if (typeof dateFrom === 'string' && dateFrom.trim() !== "") {
            dateFilter.gte = new Date(dateFrom);
        }
        if (typeof dateTo === 'string' && dateTo.trim() !== "") {
            dateFilter.lte = new Date(dateTo);
        }
        if (Object.keys(dateFilter).length > 0) {
            // Utiliser activityStartDate pour être plus précis par rapport aux activités
            conditions.push({ activityStartDate: dateFilter });
        }
    }

    // 3. Filtre par Pays (Relation Many-to-Many via activity_locations)
    if (countries) {
        const countryIds = Array.isArray(countries) ? countries : [countries];
        conditions.push({
            locations: {
                some: {
                    countryId: { in: countryIds as string[] }
                }
            }
        });
    }

    // 4. Filtre par Bailleurs (Relation Many-to-Many via activity_funders)
    if (funders) {
        const funderIds = Array.isArray(funders) ? funders : [funders];
        conditions.push({
            funders: {
                some: {
                    funderId: { in: funderIds as string[] }
                }
            }
        });
    }

    // 5. Filtre par Thématique (Relation Many-to-Many via activity_thematic_focus)
    if (thematicFocus) {
        const thematicIds = Array.isArray(thematicFocus) ? thematicFocus : [thematicFocus];
        conditions.push({
            thematicFocus: {
                some: {
                    thematicId: { in: thematicIds as string[] }
                }
            }
        });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
}

// ─── ROUTES ───

router.get("/stats", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[DASHBOARD/STATS] Request from user:', req.user?.userId);
        const where = await getDashboardWhere(req);
        console.log('[DASHBOARD/STATS] Filters:', where);

        const [total, draft, submitted, validated, rejected] = await Promise.all([
            prisma.activity.count({ where }),
            prisma.activity.count({ where: { ...where, status: "DRAFT" } }),
            prisma.activity.count({ where: { ...where, status: "SUBMITTED" } }),
            prisma.activity.count({ where: { ...where, status: "VALIDATED" } }),
            prisma.activity.count({ where: { ...where, status: "REJECTED" } }),
        ]);

        const activities = await prisma.activity.findMany({
            where,
            select: { maleCount: true, femaleCount: true, nonBinaryCount: true },
        });

        const totalParticipants = activities.reduce(
            (sum, a) => sum + (a.maleCount || 0) + (a.femaleCount || 0) + (a.nonBinaryCount || 0),
            0
        );

        const result = {
            totalActivities: total,
            draftActivities: draft,
            submittedActivities: submitted,
            validatedActivities: validated,
            rejectedActivities: rejected,
            totalParticipants,
        };

        console.log('[DASHBOARD/STATS] Result:', result);
        res.json(result);
    } catch (error) {
        console.error("[DASHBOARD/STATS ERROR]", error);
        res.status(500).json({ error: "Failed to fetch stats", details: error instanceof Error ? error.message : String(error) });
    }
});

router.get("/activities-by-status", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[DASHBOARD/STATUS] Request');
        const where = await getDashboardWhere(req);

        const data = await prisma.activity.groupBy({
            by: ["status"],
            where,
            _count: true,
        });

        const result = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"].map(status => ({
            status,
            count: data.find(d => d.status === status)?._count || 0
        }));

        console.log('[DASHBOARD/STATUS] Result:', result);
        res.json(result);
    } catch (error) {
        console.error("[DASHBOARD/STATUS ERROR]", error);
        res.status(500).json({ error: "Failed to fetch status data", details: error instanceof Error ? error.message : String(error) });
    }
});

router.get("/participants-by-gender", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[DASHBOARD/GENDER] Request');
        const where = await getDashboardWhere(req);

        const activities = await prisma.activity.findMany({
            where,
            select: { maleCount: true, femaleCount: true, nonBinaryCount: true },
        });

        const result = [
            { gender: "Male", count: activities.reduce((sum, a) => sum + (a.maleCount || 0), 0) },
            { gender: "Female", count: activities.reduce((sum, a) => sum + (a.femaleCount || 0), 0) },
            { gender: "Non-Binary", count: activities.reduce((sum, a) => sum + (a.nonBinaryCount || 0), 0) },
        ];

        console.log('[DASHBOARD/GENDER] Result:', result);
        res.json(result);
    } catch (error) {
        console.error("[DASHBOARD/GENDER ERROR]", error);
        res.status(500).json({ error: "Failed to fetch gender data", details: error instanceof Error ? error.message : String(error) });
    }
});

router.get("/activities-trend", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[DASHBOARD/TREND] Request');
        const where = await getDashboardWhere(req);

        const activities = await prisma.activity.findMany({
            where,
            select: { createdAt: true },
        });

        const trendMap = new Map<string, number>();
        activities.forEach((activity) => {
            const date = new Date(activity.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            trendMap.set(monthKey, (trendMap.get(monthKey) || 0) + 1);
        });

        const result = Array.from(trendMap.entries())
            .sort()
            .map(([month, count]) => ({ month, count }));

        console.log('[DASHBOARD/TREND] Result:', result);
        res.json(result);
    } catch (error) {
        console.error("[DASHBOARD/TREND ERROR]", error);
        res.status(500).json({ error: "Failed to fetch trend data", details: error instanceof Error ? error.message : String(error) });
    }
});

export default router;