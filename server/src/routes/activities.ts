import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authenticate, authorize, authorizeProject } from "../middleware/auth";
import { createActivitySchema, updateActivitySchema, validateActivitySchema, activityFilterSchema } from "../utils/validation";
import { logAudit, diffChanges } from "../services/audit";
import emailService from "../services/emailService";

const prisma = new PrismaClient();
export const activityRouter = Router();

// Toutes les routes nécessitent l'authentification
activityRouter.use(authenticate);

// ─── GET /api/activities ───
// Lister les activités avec filtres et pagination

activityRouter.get("/", async (req: Request, res: Response) => {
  try {
    const filters = activityFilterSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, projectId, status, search, country, funder, thematic, dateFrom, dateTo } = filters;

    const where: Prisma.ActivityWhereInput = {};

    // Filtrage basé sur le rôle: FIELD users ne voient que les leurs
    if (req.user!.role === "FIELD") {
      where.createdById = req.user!.userId;
    } else if (req.user!.role === "MANAGER") {
      // Managers voient les activités de leurs projets
      const userProjects = await prisma.userProject.findMany({
        where: { userId: req.user!.userId },
        select: { projectId: true },
      });
      where.projectId = { in: userProjects.map((up) => up.projectId) };
    }
    // ADMIN voit tout

    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (search) {
      where.activityTitle = { contains: search, mode: "insensitive" };
    }

    // Filtrage JSON (locations, funders, thematicFocus)
    if (country) {
      // @ts-ignore
      where.locations = { path: "$[*].country", array_contains: country };
    }
    if (funder) where.funders = { array_contains: funder };
    if (thematic) where.thematicFocus = { array_contains: thematic };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          validatedBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[ACTIVITIES] List error:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// ─── GET /api/activities/:id ───
// Récupérer une activité spécifique

activityRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        validatedBy: { select: { id: true, name: true } },
      },
    });

    if (!activity) return res.status(404).json({ error: "Activity not found" });

    res.json(activity);
  } catch (err) {
    console.error("[ACTIVITIES] Get error:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// ─── POST /api/activities ───
// Créer une nouvelle activité avec notifications Resend

activityRouter.post("/", authorizeProject(), async (req: Request, res: Response) => {
  try {
    const data = createActivitySchema.parse(req.body);

    const activity = await prisma.activity.create({
      data: {
        ...data,
        createdById: req.user!.userId,
        status: "DRAFT",
      },
      include: { project: true, createdBy: { select: { id: true, name: true } } },
    });

    // Enregistrer dans l'audit
    await logAudit({
      userId: req.user!.userId,
      action: "CREATE",
      entityType: "Activity",
      entityId: activity.id,
    });

    // ✨ NOTIFIER LES MANAGERS AVEC RESEND
    try {
      // Récupérer tous les managers et admins actifs (sauf le créateur)
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'MANAGER'] },
          status: 'ACTIVE',
          NOT: { id: req.user!.userId }
        }
      });

      if (managers.length > 0) {
        // Déterminer la date de l'activité
        let activityDate = new Date().toLocaleDateString('fr-FR');
        if ((data as any).startDate) {
          activityDate = new Date((data as any).startDate).toLocaleDateString('fr-FR');
        }

        // Déterminer le lieu
        let location = 'À confirmer';
        if ((data as any).locations && Array.isArray((data as any).locations) && (data as any).locations.length > 0) {
          location = (data as any).locations[0].city || (data as any).locations[0].region || 'À confirmer';
        }

        // Calculer le nombre de participants
        let participantCount = 0;
        if ((data as any).maleCount) participantCount += (data as any).maleCount;
        if ((data as any).femaleCount) participantCount += (data as any).femaleCount;
        if ((data as any).nonBinaryCount) participantCount += (data as any).nonBinaryCount;

        // Envoyer les emails en parallèle (non-bloquant)
        for (const manager of managers) {
          emailService.sendActivityNotification({
            recipientEmail: manager.email,
            recipientName: manager.name,
            activityTitle: data.activityTitle,
            projectName: activity.project?.name || 'Non spécifié',
            activityDate,
            location,
            participantCount
          }).catch(err => {
            console.warn(`⚠️ Email notification failed for ${manager.email}:`, err);
          });
        }

        console.log(`✅ ${managers.length} notifications d'activité envoyées`);
      }
    } catch (notificationError) {
      console.warn('⚠️ Erreur lors de l\'envoi des notifications d\'activité:', notificationError);
      // Ne pas bloquer la création d'activité si les notifications échouent
    }

    res.status(201).json(activity);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return res.status(400).json({ error: "Validation error", details: err });
    }
    console.error("[ACTIVITIES] Create error:", err);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

// ─── PUT /api/activities/:id ───
// Mettre à jour une activité

activityRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Activity not found" });

    // Seul le créateur ou un manager/admin peut éditer
    if (req.user!.role === "FIELD" && existing.createdById !== req.user!.userId) {
      return res.status(403).json({ error: "Can only edit your own activities" });
    }

    // Les activités validées ne peuvent pas être éditées (sauf par admin)
    if (existing.status === "VALIDATED" && req.user!.role !== "ADMIN") {
      return res.status(400).json({ error: "Cannot edit validated activities" });
    }

    const data = updateActivitySchema.parse(req.body);
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data,
      include: { project: true, createdBy: { select: { id: true, name: true } } },
    });

    const changes = diffChanges(existing as any, data as any, Object.keys(data));
    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "Activity",
      entityId: activity.id,
      changes,
    });

    res.json(activity);
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return res.status(400).json({ error: "Validation error", details: err });
    }
    console.error("[ACTIVITIES] Update error:", err);
    res.status(500).json({ error: "Failed to update activity" });
  }
});

// ─── POST /api/activities/:id/submit ───
// Soumettre une activité pour révision

activityRouter.post("/:id/submit", async (req: Request, res: Response) => {
  try {
    const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    // Seuls les brouillons ou activités rejetées peuvent être soumis
    if (activity.status !== "DRAFT" && activity.status !== "REJECTED") {
      return res.status(400).json({ error: "Only drafts or rejected activities can be submitted" });
    }

    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: { status: "SUBMITTED" },
    });

    await logAudit({
      userId: req.user!.userId,
      action: "UPDATE",
      entityType: "Activity",
      entityId: activity.id
    });

    res.json(updated);
  } catch (err) {
    console.error("[ACTIVITIES] Submit error:", err);
    res.status(500).json({ error: "Failed to submit activity" });
  }
});

// ─── POST /api/activities/:id/validate ───
// Manager/Admin valide ou rejette une activité

activityRouter.post("/:id/validate", authorize("ADMIN", "MANAGER"), async (req: Request, res: Response) => {
  try {
    const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    // Seules les activités soumises peuvent être validées
    if (activity.status !== "SUBMITTED") {
      return res.status(400).json({ error: "Only submitted activities can be validated" });
    }

    const { status, rejectionReason } = validateActivitySchema.parse(req.body);

    if (status === "REJECTED" && !rejectionReason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        status,
        validatedById: req.user!.userId,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
    });

    await logAudit({
      userId: req.user!.userId,
      action: status === "VALIDATED" ? "VALIDATE" : "REJECT",
      entityType: "Activity",
      entityId: activity.id,
    });

    res.json(updated);
  } catch (err) {
    console.error("[ACTIVITIES] Validate error:", err);
    res.status(500).json({ error: "Failed to validate activity" });
  }
});

// ─── DELETE /api/activities/:id ───
// Admin supprime une activité

activityRouter.delete("/:id", authorize("ADMIN"), async (req: Request, res: Response) => {
  try {
    await prisma.activity.delete({ where: { id: req.params.id } });

    await logAudit({
      userId: req.user!.userId,
      action: "DELETE",
      entityType: "Activity",
      entityId: req.params.id
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[ACTIVITIES] Delete error:", err);
    res.status(500).json({ error: "Failed to delete activity" });
  }
});

export default activityRouter;