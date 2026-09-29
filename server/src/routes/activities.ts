import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate, authorize, authorizeProject, hasProjectAccess, AuthPayload } from "../middleware/auth";
import { createActivitySchema, updateActivitySchema, validateActivitySchema, activityFilterSchema } from "../utils/validation";

const prisma = new PrismaClient();
export const activityRouter = Router();

activityRouter.use(authenticate);

// ─── RÈGLES D'ACCÈS ───
// Lecture   : ADMIN tout ; MANAGER les activités de ses projets ; FIELD ses propres activités
// Édition   : ADMIN tout ; MANAGER ses projets sauf activité VALIDATED ;
//             FIELD ses propres activités en DRAFT ou REJECTED
// Soumission: l'auteur (ou un ADMIN), depuis DRAFT ou REJECTED
// Validation: ADMIN, ou MANAGER du projet ; activité SUBMITTED ; un manager ne valide pas ses propres activités

type ActivityAccessRow = { id: string; projectId: string; createdById: string; status: string };

async function canViewActivity(user: AuthPayload, a: ActivityAccessRow): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "FIELD") return a.createdById === user.userId;
  return hasProjectAccess(user, a.projectId);
}

async function canEditActivity(user: AuthPayload, a: ActivityAccessRow): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "FIELD") {
    return a.createdById === user.userId && (a.status === "DRAFT" || a.status === "REJECTED");
  }
  return a.status !== "VALIDATED" && (await hasProjectAccess(user, a.projectId));
}

const accessSelect = { id: true, projectId: true, createdById: true, status: true } as const;

// ─── GET /api/activities ───
activityRouter.get("/", async (req: Request, res: Response) => {
  try {
    console.log("[ACTIVITIES] Raw query params:", req.query);
    const filters = activityFilterSchema.parse(req.query);
    console.log("[ACTIVITIES] Parsed filters:", filters);
    const { page, limit, sortBy, sortOrder, projectId, status, search, country, funder, thematic } = filters;
    console.log("[ACTIVITIES] Extracted search param:", search);

    const where: Prisma.ActivityWhereInput = {};

    if (req.user!.role === "FIELD") {
      where.createdById = req.user!.userId;
    } else if (req.user!.role === "MANAGER") {
      const userProjects = await prisma.userProject.findMany({
        where: { userId: req.user!.userId },
        select: { projectId: true },
      });
      where.projectId = { in: userProjects.map((up) => up.projectId) };
    }

    if (projectId) {
      if (req.user!.role === "MANAGER") {
        const hasAccess = await prisma.userProject.findUnique({
          where: { userId_projectId: { userId: req.user!.userId, projectId } }
        });
        if (!hasAccess) return res.status(403).json({ error: "No access to this project" });
      }
      where.projectId = projectId;
    }

    if (status) where.status = status as any;
    if (search && search.trim()) {
      console.log("[ACTIVITIES] Applying search filter:", search.trim());
      where.activityTitle = {
        startsWith: search.trim()
      } as any;
    }

    if (country) where.locations = { some: { countryId: country } };
    if (funder) where.funders = { some: { funderId: funder } };
    if (thematic) where.thematicFocus = { some: { thematicId: thematic } };

    // ✅ Utiliser directement where pour count (plus besoin de remove mode)
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          locations: { include: { country: true, region: true, city: true } },
          funders: { include: { funder: true } },
          activityTypes: { include: { activityType: true } },
          thematicFocus: { include: { thematic: true } },
          targetGroups: { include: { group: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      data: activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[ACTIVITIES] List error:", err);
    if (err instanceof z.ZodError) {
      console.error("[ACTIVITIES] Validation error details:", err.errors);
      return res.status(400).json({ error: "Invalid filters", details: err.errors });
    }
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// ─── GET /api/activities/:id ───
activityRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        locations: { include: { country: true, region: true, city: true } },
        funders: { include: { funder: true } },
        activityTypes: { include: { activityType: true } },
        thematicFocus: { include: { thematic: true } },
        targetGroups: { include: { group: true } }
      },
    });

    if (!activity) return res.status(404).json({ error: "Activity not found" });
    if (!(await canViewActivity(req.user!, activity))) {
      return res.status(403).json({ error: "No access to this activity" });
    }
    res.json(activity);
  } catch (err) {
    console.error("[ACTIVITIES] Get error:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// ─── POST /api/activities ───
activityRouter.post("/", authorizeProject("projectId", true), async (req: Request, res: Response) => {
  try {
    const data = createActivitySchema.parse(req.body);
    const {
      funders: funderIds = [],
      activityTypes: activityTypeIds = [],
      thematicFocus: thematicIds = [],
      targetGroups: groupIds = [],
      locations: locationData = [],
      ...basicData
    } = data as any;

    const activity = await prisma.activity.create({
      data: {
        ...basicData,
        createdById: req.user!.userId,
        activityStartDate: locationData[0]?.dateStart ? new Date(locationData[0].dateStart) : null,
        activityEndDate: locationData[0]?.dateEnd ? new Date(locationData[0].dateEnd) : null,
        funders: { create: funderIds.map((id: string) => ({ funder: { connect: { id } } })) },
        activityTypes: { create: activityTypeIds.map((id: string) => ({ activityType: { connect: { id } } })) },
        thematicFocus: { create: thematicIds.map((id: string) => ({ thematic: { connect: { id } } })) },
        targetGroups: { create: groupIds.map((id: string) => ({ group: { connect: { id } } })) },
        locations: {
          create: locationData.map((loc: any) => ({
            country: loc.countryId ? { connect: { id: loc.countryId } } : undefined,
            region: loc.regionId ? { connect: { id: loc.regionId } } : undefined,
            city: loc.cityId ? { connect: { id: loc.cityId } } : undefined
          }))
        }
      },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        locations: { include: { country: true, region: true, city: true } },
        funders: { include: { funder: true } },
        activityTypes: { include: { activityType: true } },
        thematicFocus: { include: { thematic: true } },
        targetGroups: { include: { group: true } }
      }
    });

    res.status(201).json(activity);
  } catch (err) {
    console.error("[ACTIVITIES] Create error:", err);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

// ─── PUT /api/activities/:id ───
activityRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await prisma.activity.findUnique({
      where: { id: req.params.id },
      select: accessSelect,
    });

    if (!existing) return res.status(404).json({ error: "Activity not found" });
    if (!(await canEditActivity(req.user!, existing))) {
      return res.status(403).json({ error: "You cannot edit this activity" });
    }

    const data = updateActivitySchema.parse(req.body);

    // Changement de projet : il faut aussi avoir accès au projet cible
    if (data.projectId && data.projectId !== existing.projectId) {
      if (!(await hasProjectAccess(req.user!, data.projectId))) {
        return res.status(403).json({ error: "No access to the target project" });
      }
    }

    const {
      projectId,
      projectName,
      projectTitle,
      consortium,
      implementingPartners,
      keyOutputs,
      meansOfVerification,
      evidenceAvailable,
      inclusionMarginalised,
      womenLeadership,
      locations: locationData = [],
      funders: funderIds = [],
      activityTypes: activityTypeIds = [],
      thematicFocus: thematicIds = [],
      targetGroups: groupIds = [],
      ...rest
    } = data as any;

    console.log("[PUT DEBUG] thematicIds reçus:", JSON.stringify(thematicIds));
    console.log("[PUT DEBUG] funderIds reçus:", JSON.stringify(funderIds));

    // ✅ Whitelist des champs valides du schema
    const validData = {
      activityTitle: rest.activityTitle,
      maleCount: rest.maleCount,
      femaleCount: rest.femaleCount,
      nonBinaryCount: rest.nonBinaryCount,
      ageUnder25: rest.ageUnder25,
      age25to40: rest.age25to40,
      age40plus: rest.age40plus,
      disabilityYes: rest.disabilityYes,
      disabilityNo: rest.disabilityNo,
      immediateOutcomes: rest.immediateOutcomes,
      skillsGained: rest.skillsGained,
      actionsTaken: rest.actionsTaken,
      policiesInfluenced: rest.policiesInfluenced,
      institutionalChanges: rest.institutionalChanges,
      commitmentsSecured: rest.commitmentsSecured,
      mediaMentions: rest.mediaMentions,
      publicationsProduced: rest.publicationsProduced,
      genderOutcomes: rest.genderOutcomes,
      newPartnerships: rest.newPartnerships,
      existingPartnerships: rest.existingPartnerships,
    };

    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        ...validData,
        project: projectId ? { connect: { id: projectId } } : undefined,
        activityStartDate: locationData[0]?.dateStart ? new Date(locationData[0].dateStart) : null,
        activityEndDate: locationData[0]?.dateEnd ? new Date(locationData[0].dateEnd) : null,
        funders: {
          deleteMany: {},
          create: funderIds.map((id: string) => ({ funder: { connect: { id } } }))
        },
        activityTypes: {
          deleteMany: {},
          create: activityTypeIds.map((id: string) => ({ activityType: { connect: { id } } }))
        },
        thematicFocus: {
          deleteMany: {},
          create: thematicIds.map((id: string) => ({ thematic: { connect: { id } } }))
        },
        targetGroups: {
          deleteMany: {},
          create: groupIds.map((id: string) => ({ group: { connect: { id } } }))
        },
        locations: {
          deleteMany: {},
          create: locationData.map((loc: any) => ({
            country: loc.countryId ? { connect: { id: loc.countryId } } : undefined,
            region: loc.regionId ? { connect: { id: loc.regionId } } : undefined,
            city: loc.cityId ? { connect: { id: loc.cityId } } : undefined
          }))
        }
      },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        locations: { include: { country: true, region: true, city: true } },
        funders: { include: { funder: true } },
        activityTypes: { include: { activityType: true } },
        thematicFocus: { include: { thematic: true } },
        targetGroups: { include: { group: true } }
      }
    });

    res.json(activity);
  } catch (err) {
    console.error("[ACTIVITIES] Update error:", err);
    res.status(500).json({ error: "Failed to update activity" });
  }
});

// ─── STATUS & DELETE ROUTES ───
activityRouter.post("/:id/submit", async (req, res) => {
  try {
    const existing = await prisma.activity.findUnique({ where: { id: req.params.id }, select: accessSelect });
    if (!existing) return res.status(404).json({ error: "Activity not found" });

    const isAuthor = existing.createdById === req.user!.userId;
    if (!isAuthor && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the author can submit this activity" });
    }
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return res.status(409).json({ error: `Activity cannot be submitted from status ${existing.status}` });
    }

    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: { status: "SUBMITTED", rejectionReason: null }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit activity" });
  }
});

activityRouter.post("/:id/validate", authorize("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { status, rejectionReason } = validateActivitySchema.parse(req.body);

    const existing = await prisma.activity.findUnique({ where: { id: req.params.id }, select: accessSelect });
    if (!existing) return res.status(404).json({ error: "Activity not found" });

    if (!(await hasProjectAccess(req.user!, existing.projectId))) {
      return res.status(403).json({ error: "No access to this project" });
    }
    if (req.user!.role !== "ADMIN" && existing.createdById === req.user!.userId) {
      return res.status(403).json({ error: "You cannot validate your own activity" });
    }
    if (existing.status !== "SUBMITTED") {
      return res.status(409).json({ error: "Only submitted activities can be validated or rejected" });
    }
    if (status === "REJECTED" && !rejectionReason?.trim()) {
      return res.status(400).json({ error: "A rejection reason is required" });
    }

    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: { status, validatedById: req.user!.userId, rejectionReason: status === "REJECTED" ? rejectionReason : null }
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid validation payload", details: err.errors });
    }
    console.error("[ACTIVITIES] Validate error:", err);
    res.status(500).json({ error: "Failed to validate activity" });
  }
});

activityRouter.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    await prisma.activity.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete activity" });
  }
});

export default activityRouter;