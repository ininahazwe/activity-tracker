import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {authenticate, authorize} from "@/middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// GET /api/programmes
// Récupérer tous les programmes (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const programmes = await prisma.programme.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        projects: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        res.json(programmes);
    } catch (error) {
        console.error("[PROGRAMMES] List error:", error);
        res.status(500).json({ error: "Failed to fetch programmes" });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/programmes/:id
// Récupérer un programme spécifique
// ═══════════════════════════════════════════════════════════════

router.get("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const programme = await prisma.programme.findUnique({
            where: { id },
            include: {
                projects: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        isActive: true,
                    },
                },
                _count: {
                    select: { projects: true },
                },
            },
        });

        if (!programme) {
            res.status(404).json({ error: "Programme not found" });
            return;
        }

        res.json(programme);
    } catch (error) {
        console.error("[PROGRAMMES] Get error:", error);
        res.status(500).json({ error: "Failed to fetch programme" });
    }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/programmes
// Créer un nouveau programme (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, description, isActive } = req.body;

            if (!name?.trim()) {
                res.status(400).json({ error: "Name is required" });
                return;
            }

            const existing = await prisma.programme.findUnique({
                where: { name: name.trim() },
            });

            if (existing) {
                res.status(409).json({ error: "A programme with this name already exists" });
                return;
            }

            const programme = await prisma.programme.create({
                data: {
                    name: name.trim(),
                    description: description?.trim() || null,
                    isActive: isActive ?? true,
                },
            });

            res.status(201).json(programme);
        } catch (error) {
            console.error("[PROGRAMMES] Create error:", error);
            res.status(500).json({ error: "Failed to create programme" });
        }
    }
);

// ═══════════════════════════════════════════════════════════════
// PUT /api/programmes/:id
// Mettre à jour un programme (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.put(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const { name, description, isActive } = req.body;

            const programme = await prisma.programme.findUnique({ where: { id } });

            if (!programme) {
                res.status(404).json({ error: "Programme not found" });
                return;
            }

            // Si le nom change, vérifier l'unicité
            if (name && name.trim() !== programme.name) {
                const existing = await prisma.programme.findUnique({
                    where: { name: name.trim() },
                });
                if (existing) {
                    res.status(409).json({ error: "A programme with this name already exists" });
                    return;
                }
            }

            const updated = await prisma.programme.update({
                where: { id },
                data: {
                    ...(name && { name: name.trim() }),
                    ...(description !== undefined && { description: description?.trim() || null }),
                    ...(isActive !== undefined && { isActive }),
                },
            });

            res.json(updated);
        } catch (error) {
            console.error("[PROGRAMMES] Update error:", error);
            res.status(500).json({ error: "Failed to update programme" });
        }
    }
);

// ═══════════════════════════════════════════════════════════════
// DELETE /api/programmes/:id
// Supprimer un programme (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;

            const programme = await prisma.programme.findUnique({
                where: { id },
                include: {
                    _count: { select: { projects: true } },
                },
            });

            if (!programme) {
                res.status(404).json({ error: "Programme not found" });
                return;
            }

            if (programme._count.projects > 0) {
                res.status(400).json({
                    error: `Cannot delete programme with ${programme._count.projects} associated projects`,
                });
                return;
            }

            await prisma.programme.delete({ where: { id } });

            res.json({ message: "Programme deleted successfully" });
        } catch (error) {
            console.error("[PROGRAMMES] Delete error:", error);
            res.status(500).json({ error: "Failed to delete programme" });
        }
    }
);

export default router;