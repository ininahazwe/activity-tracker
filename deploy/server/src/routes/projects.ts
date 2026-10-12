import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// GET /api/projects
// Récupérer tous les projets (avec filtrage selon le rôle)
// ═══════════════════════════════════════════════════════════════

router.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    let where: any = {};

    // Les ADMIN voient tous les projets
    // Les MANAGER et FIELD ne voient que leurs projets
    if (userRole !== "ADMIN") {
      where = {
        users: {
          some: {
            userId: userId,
          },
        },
      };
    }

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            activities: true,
            users: true,
            finances: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(projects);
  } catch (error) {
    console.error("[PROJECTS] List error:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/projects/:id
// Récupérer un projet spécifique
// ═══════════════════════════════════════════════════════════════

router.get("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            activities: true,
            finances: true,
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Vérifier l'accès
    if (userRole !== "ADMIN") {
      const hasAccess = project.users.some((up) => up.userId === userId);
      if (!hasAccess) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

    res.json(project);
  } catch (error) {
    console.error("[PROJECTS] Get error:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/projects
// Créer un nouveau projet (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { name, slug, description, isActive } = req.body;

        // Validation
        if (!name || !slug) {
          res.status(400).json({ error: "Name and slug are required" });
          return;
        }

        // Vérifier que le slug est unique
        const existing = await prisma.project.findUnique({
          where: { slug },
        });

        if (existing) {
          res.status(409).json({ error: "Project with this slug already exists" });
          return;
        }

        const project = await prisma.project.create({
          data: {
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            description: description?.trim() || null,
            isActive: isActive ?? true,
          },
        });

        res.status(201).json(project);
      } catch (error) {
        console.error("[PROJECTS] Create error:", error);
        res.status(500).json({ error: "Failed to create project" });
      }
    }
);

// ═══════════════════════════════════════════════════════════════
// PUT /api/projects/:id
// Mettre à jour un projet (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.put(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const { name, slug, description, isActive } = req.body;

        // Vérifier que le projet existe
        const project = await prisma.project.findUnique({
          where: { id },
        });

        if (!project) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        // Si le slug change, vérifier qu'il est unique
        if (slug && slug !== project.slug) {
          const existing = await prisma.project.findUnique({
            where: { slug },
          });

          if (existing) {
            res.status(409).json({ error: "Project with this slug already exists" });
            return;
          }
        }

        const updated = await prisma.project.update({
          where: { id },
          data: {
            ...(name && { name: name.trim() }),
            ...(slug && { slug: slug.trim().toLowerCase() }),
            ...(description !== undefined && { description: description?.trim() || null }),
            ...(isActive !== undefined && { isActive }),
          },
        });

        res.json(updated);
      } catch (error) {
        console.error("[PROJECTS] Update error:", error);
        res.status(500).json({ error: "Failed to update project" });
      }
    }
);

// ═══════════════════════════════════════════════════════════════
// DELETE /api/projects/:id
// Supprimer un projet (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;

        // Vérifier que le projet existe
        const project = await prisma.project.findUnique({
          where: { id },
          include: {
            _count: {
              select: { activities: true },
            },
          },
        });

        if (!project) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        // Vérifier qu'il n'y a pas d'activités associées
        if (project._count.activities > 0) {
          res.status(400).json({
            error: `Cannot delete project with ${project._count.activities} associated activities`,
          });
          return;
        }

        // Supprimer d'abord les associations utilisateurs
        await prisma.userProject.deleteMany({
          where: { projectId: id },
        });

        // Puis supprimer le projet
        await prisma.project.delete({
          where: { id },
        });

        res.json({ message: "Project deleted successfully" });
      } catch (error) {
        console.error("[PROJECTS] Delete error:", error);
        res.status(500).json({ error: "Failed to delete project" });
      }
    }
);

// ═══════════════════════════════════════════════════════════════
// POST /api/projects/:id/users
// Ajouter un utilisateur à un projet (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.post(
    "/:id/users",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
          res.status(400).json({ error: "userId is required" });
          return;
        }

        // Vérifier que le projet existe
        const project = await prisma.project.findUnique({
          where: { id },
        });

        if (!project) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        // Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        // Vérifier que l'utilisateur n'est pas déjà associé
        const existing = await prisma.userProject.findUnique({
          where: {
            userId_projectId: {
              userId,
              projectId: id,
            },
          },
        });

        if (existing) {
          res.status(409).json({ error: "User is already associated with this project" });
          return;
        }

        // Ajouter l'utilisateur au projet
        const userProject = await prisma.userProject.create({
          data: {
            userId,
            projectId: id,
          },
        });

        res.status(201).json(userProject);
      } catch (error) {
        console.error("[PROJECTS] Add user error:", error);
        res.status(500).json({ error: "Failed to add user to project" });
      }
    }
);

// ═══════════════════════════════════════════════════════════════
// DELETE /api/projects/:id/users/:userId
// Supprimer un utilisateur d'un projet (Admin seulement)
// ═══════════════════════════════════════════════════════════════

router.delete(
    "/:id/users/:userId",
    authenticate,
    authorize("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id, userId } = req.params;

        await prisma.userProject.delete({
          where: {
            userId_projectId: {
              userId,
              projectId: id,
            },
          },
        });

        res.json({ message: "User removed from project" });
      } catch (error) {
        console.error("[PROJECTS] Remove user error:", error);
        res.status(500).json({ error: "Failed to remove user from project" });
      }
    }
);

export default router;