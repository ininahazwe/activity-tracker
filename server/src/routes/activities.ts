import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authenticate, authorize, authorizeProject } from "../middleware/auth";
import { createActivitySchema, updateActivitySchema, validateActivitySchema, activityFilterSchema } from "../utils/validation";

const prisma = new PrismaClient();
export const activityRouter = Router();

activityRouter.use(authenticate);

// ─── GET /api/activities ───
activityRouter.get("/", async (req: Request, res: Response) => {
  try {
    const filters = activityFilterSchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, projectId, status, search, country, funder, thematic } = filters;

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
    if (search) {
      where.activityTitle = { contains: search, mode: "insensitive" } as any;
    }

    if (country) where.locations = { some: { countryId: country } };
    if (funder) where.funders = { some: { funderId: funder } };
    if (thematic) where.thematicFocus = { some: { thematicId: thematic } };

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
    res.json(activity);
  } catch (err) {
    console.error("[ACTIVITIES] Get error:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// ─── POST /api/activities ───
activityRouter.post("/", authorizeProject(), async (req: Request, res: Response) => {
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
      where: { id: req.params.id }
    });

    if (!existing) return res.status(404).json({ error: "Activity not found" });

    const data = updateActivitySchema.parse(req.body);

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
    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: { status: "SUBMITTED" }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit activity" });
  }
});

activityRouter.post("/:id/validate", authorize("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const { status, rejectionReason } = validateActivitySchema.parse(req.body);
    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: { status, validatedById: req.user!.userId, rejectionReason: status === "REJECTED" ? rejectionReason : null }
    });
    res.json(updated);
  } catch (err) {
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