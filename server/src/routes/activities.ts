import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticate, authorize, authorizeProject, hasProjectAccess, AuthPayload } from "../middleware/auth";
import { notifyActivitySubmitted, notifyActivityRejected } from "../services/activityNotifications";
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

function canSubmitActivity(user: AuthPayload, a: ActivityAccessRow): boolean {
  const isAuthor = a.createdById === user.userId;
  return (isAuthor || user.role === "ADMIN") && (a.status === "DRAFT" || a.status === "REJECTED");
}

async function canValidateActivity(user: AuthPayload, a: ActivityAccessRow): Promise<boolean> {
  if (user.role === "FIELD" || a.status !== "SUBMITTED") return false;
  if (user.role !== "ADMIN" && a.createdById === user.userId) return false;
  return hasProjectAccess(user, a.projectId);
}

// Actions autorisées, renvoyées au client pour afficher les bons boutons
async function getPermissions(user: AuthPayload, a: ActivityAccessRow) {
  return {
    canEdit: await canEditActivity(user, a),
    canSubmit: canSubmitActivity(user, a),
    canValidate: await canValidateActivity(user, a),
    canDelete: user.role === "ADMIN",
  };
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
        validatedBy: { select: { id: true, name: true } },
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
    res.json({ ...activity, permissions: await getPermissions(req.user!, activity) });
  } catch (err) {
    console.error("[ACTIVITIES] Get error:", err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// ─── HELPERS D'ÉCRITURE ───

const fullInclude = {
  project: true,
  createdBy: { select: { id: true, name: true, email: true } },
  locations: { include: { country: true, region: true, city: true } },
  funders: { include: { funder: true } },
  activityTypes: { include: { activityType: true } },
  thematicFocus: { include: { thematic: true } },
  targetGroups: { include: { group: true } },
} as const;

// Champs texte/numériques simples, recopiés tels quels s'ils sont présents dans la requête
const SCALAR_FIELDS = [
  "activityTitle", "projectName",
  "maleCount", "femaleCount", "nonBinaryCount",
  "ageUnder25", "age25to40", "age40plus",
  "disabilityYes", "disabilityNo",
  "keyOutputs", "immediateOutcomes", "skillsGained", "actionsTaken",
  "meansOfVerification", "evidenceAvailable",
  "policiesInfluenced", "institutionalChanges", "commitmentsSecured",
  "mediaMentions", "publicationsProduced",
  "genderOutcomes", "inclusionChallenges", "womenLeadership",
  "newPartnerships", "existingPartnerships",
] as const;

function pickScalars(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of SCALAR_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

// "2026-09-29" → Date ; chaîne vide, null ou date invalide → null
function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

type LocationInput = { countryId: string; regionId?: string | null; cityId?: string | null; dateStart?: string | null; dateEnd?: string | null };

function buildLocations(locations: LocationInput[]) {
  return locations.map((loc) => ({
    country: loc.countryId ? { connect: { id: loc.countryId } } : undefined,
    region: loc.regionId ? { connect: { id: loc.regionId } } : undefined,
    city: loc.cityId ? { connect: { id: loc.cityId } } : undefined,
    dateStart: toDate(loc.dateStart),
    dateEnd: toDate(loc.dateEnd),
  }));
}

// Période de l'activité = du début le plus tôt à la fin la plus tardive de ses lieux
function activityPeriod(locations: LocationInput[]) {
  const starts = locations.map((l) => toDate(l.dateStart)).filter((d): d is Date => !!d);
  const ends = locations.map((l) => toDate(l.dateEnd) ?? toDate(l.dateStart)).filter((d): d is Date => !!d);
  return {
    activityStartDate: starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null,
    activityEndDate: ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null,
  };
}

// ─── POST /api/activities ───
activityRouter.post("/", authorizeProject("projectId", true), async (req: Request, res: Response) => {
  try {
    const data = createActivitySchema.parse(req.body);

    const activity = await prisma.activity.create({
      data: {
        ...pickScalars(data),
        activityTitle: data.activityTitle,
        project: { connect: { id: data.projectId } },
        createdBy: { connect: { id: req.user!.userId } },
        totalAttendees: (data.maleCount || 0) + (data.femaleCount || 0) + (data.nonBinaryCount || 0),
        ...activityPeriod(data.locations),
        funders: { create: data.funders.map((id) => ({ funder: { connect: { id } } })) },
        activityTypes: { create: data.activityTypes.map((id) => ({ activityType: { connect: { id } } })) },
        thematicFocus: { create: data.thematicFocus.map((id) => ({ thematic: { connect: { id } } })) },
        targetGroups: { create: data.targetGroups.map((id) => ({ group: { connect: { id } } })) },
        locations: { create: buildLocations(data.locations) },
      },
      include: fullInclude,
    });

    res.status(201).json(activity);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid activity data", details: err.errors });
    }
    console.error("[ACTIVITIES] Create error:", err);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

// ─── PUT /api/activities/:id ───
// Mise à jour partielle : seuls les champs présents dans la requête sont modifiés ;
// une relation (lieux, bailleurs…) n'est remplacée que si elle est envoyée.
activityRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await prisma.activity.findUnique({
      where: { id: req.params.id },
      select: { ...accessSelect, maleCount: true, femaleCount: true, nonBinaryCount: true },
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

    const counts = {
      male: data.maleCount ?? existing.maleCount ?? 0,
      female: data.femaleCount ?? existing.femaleCount ?? 0,
      nonBinary: data.nonBinaryCount ?? existing.nonBinaryCount ?? 0,
    };

    const replace = <T,>(items: T[] | undefined, build: (items: T[]) => any[]) =>
        items === undefined ? undefined : { deleteMany: {}, create: build(items) };

    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        ...pickScalars(data),
        project: data.projectId ? { connect: { id: data.projectId } } : undefined,
        totalAttendees: counts.male + counts.female + counts.nonBinary,
        ...(data.locations !== undefined ? activityPeriod(data.locations) : {}),
        locations: replace(data.locations, buildLocations),
        funders: replace(data.funders, (ids) => ids.map((id) => ({ funder: { connect: { id } } }))),
        activityTypes: replace(data.activityTypes, (ids) => ids.map((id) => ({ activityType: { connect: { id } } }))),
        thematicFocus: replace(data.thematicFocus, (ids) => ids.map((id) => ({ thematic: { connect: { id } } }))),
        targetGroups: replace(data.targetGroups, (ids) => ids.map((id) => ({ group: { connect: { id } } }))),
      },
      include: fullInclude,
    });

    res.json(activity);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || "Invalid activity data", details: err.errors });
    }
    console.error("[ACTIVITIES] Update error:", err);
    res.status(500).json({ error: "Failed to update activity" });
  }
});

// ─── STATUS & DELETE ROUTES ───
activityRouter.post("/:id/submit", async (req, res) => {
  try {
    const existing = await prisma.activity.findUnique({ where: { id: req.params.id }, select: accessSelect });
    if (!existing) return res.status(404).json({ error: "Activity not found" });

    if (existing.createdById !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the author can submit this activity" });
    }
    if (!canSubmitActivity(req.user!, existing)) {
      return res.status(409).json({ error: `Activity cannot be submitted from status ${existing.status}` });
    }

    const updated = await prisma.activity.update({
      where: { id: req.params.id },
      data: { status: "SUBMITTED", rejectionReason: null }
    });
    // E-mail aux valideurs, sans attendre (ne bloque pas la réponse)
    void notifyActivitySubmitted(updated.id);
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
    if (status === "REJECTED") {
      void notifyActivityRejected(updated.id, req.user!.userId, rejectionReason!.trim());
    }
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