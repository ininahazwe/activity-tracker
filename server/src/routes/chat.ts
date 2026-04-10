// server/src/routes/chat.ts
import express, { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { chatWithActivities, formatActivitiesContext, testAIProviders } from '@/services/ai-providers';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/chat
 * Endpoint de chat pour interroger les activités avec IA
 * Groq en priorité, fallback Claude
 */
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message, projectId, activityId } = req.body;

        // Validation
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Message vide ou invalide',
            });
        }

        if (!projectId || typeof projectId !== 'string') {
            return res.status(400).json({
                error: 'projectId requis',
            });
        }

        console.log(
            `[CHAT] Nouvelle requête - projet: ${projectId}, message: "${message.substring(0, 50)}..."`
        );

        // Récupérer les activités du projet
        const activities = await prisma.activity.findMany({
            where: { projectId,
                    id: activityId ? activityId : undefined,
            },
            take: 50, // Limiter pour ne pas surcharger le contexte
            include: {
                activityTypes: true,        // ✅ Correct (au pluriel)
                targetGroups: true,         // ✅ Correct
                locations: true,            // ✅ Correct
                funders: true,              // ✅ Correct (au pluriel)
                thematicFocus: true,        // ✅ Correct
                programmeArea: true,        // ✅ Bonus: pour avoir plus de contexte
            },
            orderBy: { createdAt: 'desc' },
        });

        if (activities.length === 0) {
            console.log(`[CHAT] ⚠️ Aucune activité trouvée pour projet ${projectId}`);
            return res.status(404).json({
                error: 'Aucune activité trouvée pour ce projet',
            });
        }

        // Formatter le contexte
        const activitiesContext = formatActivitiesContext(activities);
        console.log(`[CHAT] ✅ ${activities.length} activités chargées`);

        // Appeler l'IA (Groq avec fallback Claude)
        // Appeler l'IA (Groq avec fallback Claude)
        const aiResponse = await chatWithActivities(activitiesContext, message);

        console.log(`[CHAT] ✅ Réponse générée - Provider: ${aiResponse.provider}`);

        // Répondre au client
        return res.json({
            success: true,
            reply: aiResponse.text,
            provider: aiResponse.provider,
            activitiesCount: activities.length,
        });
    } catch (error) {
        const errorMsg = (error as Error).message;
        console.error('[CHAT] ❌ Erreur:', errorMsg);

        return res.status(500).json({
            success: false,
            error: 'Erreur lors du traitement de la question',
            details: errorMsg,
        });
    }
});

/**
 * GET /api/chat/test
 * Endpoint pour tester la connexion aux APIs IA (Groq + Claude)
 * Utile pour vérifier que les clés API sont valides
 */
router.get('/chat/test', async (req: Request, res: Response) => {
    try {
        console.log('[CHAT TEST] Vérification des providers IA...');

        const testResult = await testAIProviders();

        const statusCode = testResult.groq || testResult.claude ? 200 : 500;

        return res.status(statusCode).json({
            success: testResult.groq || testResult.claude,
            groq: testResult.groq ? '✅ Working' : '❌ Failed',
            claude: testResult.claude ? '✅ Working' : '❌ Failed',
            message: testResult.message,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[CHAT TEST] ❌ Erreur:', (error as Error).message);

        return res.status(500).json({
            success: false,
            error: 'Erreur lors du test',
            details: (error as Error).message,
        });
    }
});

export default router;
