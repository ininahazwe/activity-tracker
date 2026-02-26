import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ─── HELPER FUNCTION ───
async function getReferenceData(category: string) {
    const validCategories = [
        'activityTypes',
        'thematicFocus',
        'funders',
        'targetGroups',
        'countries',
        'regions',
        'cities',
        'activity_type',
        'thematic_focus',
        'target_group',
        'programme_area',
        'funder',
        'country',
        'region',
        'city',
        'programme_area',
        'project',
    ];

    if (!validCategories.includes(category)) {
        throw new Error(`Invalid category: ${category}`);
    }

    return await prisma.referenceData.findMany({
        where: { category },
        orderBy: { name: 'asc' },
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/reference/:category
// Récupérer tous les items d'une catégorie
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:category', authenticate, async (req, res) => {
    try {
        const { category } = req.params;
        console.log(`[REFERENCE] GET /${category}`);

        const data = await getReferenceData(category);
        console.log(`[REFERENCE] Found ${data.length} items for category: ${category}`);

        res.json({ data });
    } catch (error: any) {
        console.error(`[REFERENCE] Error fetching ${req.params.category}:`, error.message);
        res.status(400).json({ error: 'Invalid category' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/reference/:category/:id
// Récupérer un item spécifique
// ═══════════════════════════════════════════════════════════════════════════

router.get('/:category/:id', authenticate, async (req, res) => {
    try {
        const { category, id } = req.params;

        const validCategories = [
            'activityTypes',
            'thematicFocus',
            'funders',
            'targetGroups',
            'countries',
            'regions',
            'cities',
            'activity_type',
            'thematic_focus',
            'target_group',
            'programme_area',
            'funder',
            'country',
            'region',
            'city',
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const item = await prisma.referenceData.findUnique({
            where: { id },
        });

        if (!item || item.category !== category) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json(item);
    } catch (error) {
        console.error('Error fetching reference item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/reference/:category
// Créer un nouvel item (Admin seulement)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/:category', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { category } = req.params;
        const { name, description, parentId } = req.body;

        // Validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Name is required and must be non-empty' });
        }

        const validCategories = [
            'activityTypes',
            'thematicFocus',
            'funders',
            'targetGroups',
            'countries',
            'regions',
            'cities',
            'activity_type',
            'thematic_focus',
            'target_group',
            'programme_area',
            'funder',
            'country',
            'region',
            'city',
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Vérifier que le nom n'existe pas déjà dans cette catégorie (MySQL ne supporte pas insensitive)
        const existing = await prisma.referenceData.findFirst({
            where: {
                category,
                name: name.trim(),
            },
        });

        if (existing) {
            return res.status(409).json({ error: `${name} already exists in ${category}` });
        }

        // Valider le parentId si fourni
        if (parentId) {
            const parent = await prisma.referenceData.findUnique({ where: { id: parentId } });
            if (!parent) {
                return res.status(400).json({ error: 'Parent item not found' });
            }
        }

        const item = await prisma.referenceData.create({
            data: {
                category,
                name: name.trim(),
                description: description?.trim() || null,
                parentId: parentId || null,
            },
        });

        res.status(201).json(item);
    } catch (error: any) {
        console.error('Error creating reference item:', error);
        // Check for unique constraint violation
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'This item already exists' });
        }
        res.status(500).json({ error: 'Failed to create item' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/reference/:category/:id
// Mettre à jour un item (Admin seulement)
// ═══════════════════════════════════════════════════════════════════════════

router.put('/:category/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { category, id } = req.params;
        const { name, description } = req.body;

        const validCategories = [
            'activityTypes',
            'thematicFocus',
            'funders',
            'targetGroups',
            'countries',
            'regions',
            'cities',
            'activity_type',
            'thematic_focus',
            'target_group',
            'programme_area',
            'funder',
            'country',
            'region',
            'city',
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Vérifier que l'item existe
        const item = await prisma.referenceData.findUnique({ where: { id } });

        if (!item || item.category !== category) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Vérifier que le nouveau nom n'existe pas déjà (sauf pour cet item)
        if (name) {
            const existing = await prisma.referenceData.findFirst({
                where: {
                    category,
                    id: { not: id },
                    name: name.trim(),
                },
            });

            if (existing) {
                return res.status(409).json({ error: `${name} already exists in ${category}` });
            }
        }

        const updated = await prisma.referenceData.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
            },
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Error updating reference item:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'This item already exists' });
        }
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/reference/:category/:id
// Supprimer un item (Admin seulement)
// ═══════════════════════════════════════════════════════════════════════════

router.delete('/:category/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { category, id } = req.params;

        const validCategories = [
            'activityTypes',
            'thematicFocus',
            'funders',
            'targetGroups',
            'countries',
            'regions',
            'cities',
            'activity_type',
            'thematic_focus',
            'target_group',
            'programme_area',
            'funder',
            'country',
            'region',
            'city',
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Vérifier que l'item existe
        const item = await prisma.referenceData.findUnique({ where: { id } });

        if (!item || item.category !== category) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Vérifier s'il y a des enfants (pour regions et cities)
        const children = await prisma.referenceData.count({
            where: { parentId: id },
        });

        if (children > 0) {
            return res.status(400).json({
                error: `Cannot delete item with ${children} child item(s). Delete children first.`,
            });
        }

        await prisma.referenceData.delete({
            where: { id },
        });

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting reference item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/reference/children/:parentId
// Récupérer les items enfants d'un parent (pour régions par pays, villes par région)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/children/:parentId', authenticate, async (req, res) => {
    try {
        const { parentId } = req.params;

        const children = await prisma.referenceData.findMany({
            where: { parentId },
            orderBy: { name: 'asc' },
        });

        res.json({ data: children });
    } catch (error) {
        console.error('Error fetching children items:', error);
        res.status(500).json({ error: 'Failed to fetch children' });
    }
});

export default router;