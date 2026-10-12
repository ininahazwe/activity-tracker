import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { logAudit, diffChanges } from '../services/audit';

const router = Router();
const prisma = new PrismaClient();

// ─── CATÉGORIES ───
// Noms canoniques stockés en base (colonne `category`) + alias historiques acceptés
// (le client a longtemps utilisé "countries", "funders"… en plus des noms canoniques).
const CANONICAL = [
    'activity_type',
    'thematic_focus',
    'funder',
    'target_group',
    'country',
    'region',
    'city',
    'programme_area',
] as const;
type Category = (typeof CANONICAL)[number];

const ALIASES: Record<string, Category> = {
    activityTypes: 'activity_type',
    thematicFocus: 'thematic_focus',
    funders: 'funder',
    targetGroups: 'target_group',
    countries: 'country',
    regions: 'region',
    cities: 'city',
    programmeArea: 'programme_area',
    programme_areas: 'programme_area',
};

// Hiérarchie : une région dépend d'un pays, une ville d'une région
const PARENT_CATEGORY: Partial<Record<Category, Category>> = {
    region: 'country',
    city: 'region',
};

function resolveCategory(raw: string): Category | null {
    if ((CANONICAL as readonly string[]).includes(raw)) return raw as Category;
    return ALIASES[raw] ?? null;
}

// Nombre d'usages d'un élément (activités, lieux…) : sert à refuser une suppression
// qui effacerait silencieusement des données (les liens sont en onDelete: Cascade).
async function countUsages(id: string): Promise<number> {
    const r = await prisma.referenceData.findUnique({
        where: { id },
        select: {
            _count: {
                select: {
                    activitiesProgrammeArea: true,
                    activityLocationsCountry: true,
                    activityLocationsRegion: true,
                    activityLocationsCity: true,
                    activityFunders: true,
                    activityActivityTypes: true,
                    activityThematicFocus: true,
                    activityTargetGroups: true,
                },
            },
        },
    });
    if (!r) return 0;
    return Object.values(r._count).reduce((sum, n) => sum + n, 0);
}

const bad = (res: Response, status: number, error: string) => res.status(status).json({ error });

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/reference/children/:parentId   (déclaré AVANT /:category/:id, sinon masqué)
// ═══════════════════════════════════════════════════════════════════════════
router.get('/children/:parentId', authenticate, async (req: Request, res: Response) => {
    try {
        const children = await prisma.referenceData.findMany({
            where: { parentId: req.params.parentId, isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        res.json({ data: children });
    } catch (error) {
        console.error('[REFERENCE] children error:', error);
        bad(res, 500, 'Failed to fetch children');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/reference/:category[?includeInactive=true]
// Les éléments désactivés ne sont visibles que de l'ADMIN, sur demande (écran Settings).
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:category', authenticate, async (req: Request, res: Response) => {
    const category = resolveCategory(req.params.category);
    if (!category) return bad(res, 400, 'Invalid category');

    try {
        const requester = req.user as any;
        const includeInactive = req.query.includeInactive === 'true' && requester?.role === 'ADMIN';

        const data = await prisma.referenceData.findMany({
            where: { category, ...(includeInactive ? {} : { isActive: true }) },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        res.json({ data });
    } catch (error) {
        console.error(`[REFERENCE] Error fetching ${category}:`, error);
        bad(res, 500, 'Failed to fetch items');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/reference/:category/:id
// ═══════════════════════════════════════════════════════════════════════════
router.get('/:category/:id', authenticate, async (req: Request, res: Response) => {
    const category = resolveCategory(req.params.category);
    if (!category) return bad(res, 400, 'Invalid category');

    try {
        const item = await prisma.referenceData.findUnique({ where: { id: req.params.id } });
        if (!item || item.category !== category) return bad(res, 404, 'Item not found');
        res.json(item);
    } catch (error) {
        console.error('[REFERENCE] Error fetching item:', error);
        bad(res, 500, 'Failed to fetch item');
    }
});

// Valide le parent attendu pour une catégorie hiérarchique. Renvoie un message d'erreur ou null.
async function checkParent(category: Category, parentId: string | null | undefined): Promise<string | null> {
    const expected = PARENT_CATEGORY[category];
    if (!expected) {
        return parentId ? `A ${category} cannot have a parent` : null;
    }
    if (!parentId) return `A parent ${expected} is required`;
    const parent = await prisma.referenceData.findUnique({ where: { id: parentId } });
    if (!parent || parent.category !== expected) return `Parent must be an existing ${expected}`;
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/reference/:category   (ADMIN)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/:category', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
    const category = resolveCategory(req.params.category);
    if (!category) return bad(res, 400, 'Invalid category');

    try {
        const { name, description, parentId, sortOrder } = req.body ?? {};

        if (typeof name !== 'string' || name.trim().length === 0) {
            return bad(res, 400, 'Name is required and must be non-empty');
        }
        if (name.trim().length > 191) return bad(res, 400, 'Name is too long (191 characters max)');

        const parentError = await checkParent(category, parentId);
        if (parentError) return bad(res, 400, parentError);

        // Unicité par catégorie ET par parent : deux villes de même nom dans deux régions sont légitimes
        const existing = await prisma.referenceData.findFirst({
            where: { category, name: name.trim(), parentId: parentId || null },
        });
        if (existing) return bad(res, 409, `"${name.trim()}" already exists`);

        const item = await prisma.referenceData.create({
            data: {
                category,
                name: name.trim(),
                description: typeof description === 'string' ? description.trim() || null : null,
                parentId: parentId || null,
                ...(Number.isInteger(sortOrder) && { sortOrder }),
            },
        });

        await logAudit({
            userId: (req.user as any).userId,
            action: 'CREATE',
            entityType: 'ReferenceData',
            entityId: item.id,
            changes: { category, name: item.name, parentId: item.parentId },
            ipAddress: req.ip,
        });

        res.status(201).json(item);
    } catch (error: any) {
        console.error('[REFERENCE] Error creating item:', error);
        bad(res, 500, 'Failed to create item');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/reference/:category/:id   (ADMIN) — mise à jour partielle
// ═══════════════════════════════════════════════════════════════════════════
router.put('/:category/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
    const category = resolveCategory(req.params.category);
    if (!category) return bad(res, 400, 'Invalid category');

    try {
        const { id } = req.params;
        const { name, description, parentId, isActive, sortOrder } = req.body ?? {};

        const item = await prisma.referenceData.findUnique({ where: { id } });
        if (!item || item.category !== category) return bad(res, 404, 'Item not found');

        const data: Record<string, unknown> = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) return bad(res, 400, 'Name must be non-empty');
            if (name.trim().length > 191) return bad(res, 400, 'Name is too long (191 characters max)');
            data.name = name.trim();
        }
        if (description !== undefined) {
            data.description = typeof description === 'string' ? description.trim() || null : null;
        }
        if (isActive !== undefined) {
            if (typeof isActive !== 'boolean') return bad(res, 400, 'isActive must be a boolean');
            data.isActive = isActive;
        }
        if (sortOrder !== undefined) {
            if (!Number.isInteger(sortOrder)) return bad(res, 400, 'sortOrder must be an integer');
            data.sortOrder = sortOrder;
        }
        if (parentId !== undefined) {
            const parentError = await checkParent(category, parentId);
            if (parentError) return bad(res, 400, parentError);
            if (parentId === id) return bad(res, 400, 'An item cannot be its own parent');
            data.parentId = parentId || null;
        }

        // Unicité dans (catégorie, parent) pour la valeur finale
        const finalName = (data.name as string) ?? item.name;
        const finalParent = data.parentId !== undefined ? (data.parentId as string | null) : item.parentId;
        const duplicate = await prisma.referenceData.findFirst({
            where: { category, id: { not: id }, name: finalName, parentId: finalParent },
        });
        if (duplicate) return bad(res, 409, `"${finalName}" already exists`);

        const updated = await prisma.referenceData.update({ where: { id }, data });

        await logAudit({
            userId: (req.user as any).userId,
            action: 'UPDATE',
            entityType: 'ReferenceData',
            entityId: id,
            changes: diffChanges(item as any, updated as any, ['name', 'description', 'parentId', 'isActive', 'sortOrder']),
            ipAddress: req.ip,
        });

        res.json(updated);
    } catch (error: any) {
        console.error('[REFERENCE] Error updating item:', error);
        bad(res, 500, 'Failed to update item');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/reference/:category/:id   (ADMIN)
// Refusé si l'élément a des enfants ou s'il est utilisé : on propose de le désactiver.
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/:category/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
    const category = resolveCategory(req.params.category);
    if (!category) return bad(res, 400, 'Invalid category');

    try {
        const { id } = req.params;
        const item = await prisma.referenceData.findUnique({ where: { id } });
        if (!item || item.category !== category) return bad(res, 404, 'Item not found');

        const children = await prisma.referenceData.count({ where: { parentId: id } });
        if (children > 0) {
            return bad(res, 409, `Cannot delete: it has ${children} child item(s). Delete or move them first.`);
        }

        const usages = await countUsages(id);
        if (usages > 0) {
            return bad(
                res,
                409,
                `Cannot delete: it is used in ${usages} activity record(s). Deactivate it instead to hide it from new entries while keeping the history.`
            );
        }

        await prisma.referenceData.delete({ where: { id } });

        await logAudit({
            userId: (req.user as any).userId,
            action: 'DELETE',
            entityType: 'ReferenceData',
            entityId: id,
            changes: { category, name: item.name },
            ipAddress: req.ip,
        });

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('[REFERENCE] Error deleting item:', error);
        bad(res, 500, 'Failed to delete item');
    }
});

export default router;
