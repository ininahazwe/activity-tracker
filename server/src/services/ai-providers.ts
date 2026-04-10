// server/src/services/ai-providers.ts
import { groq } from '@ai-sdk/groq';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, streamText } from 'ai';

// Configuration des modèles
const getPrimaryModel = () => groq('llama-3.1-8b-instant');
const getFallbackModel = () => anthropic('claude-3-5-haiku-20241022');

interface ChatOptions {
    stream?: boolean;
}

interface AIResponse {
    text: string;
    provider: 'groq' | 'claude-fallback';
}

/**
 * Service IA avec fallback Groq → Claude
 * Groq = gratuit et ultra-rapide
 * Claude = fallback si Groq saturé
 */
export async function chatWithActivities(
    activitiesContext: string,
    userQuestion: string,
    options?: { maxTokens: number }
): Promise<AIResponse> {
    const systemPrompt = `Tu es un assistant spécialisé en activités de développement et d'advocacy pour une organisation NGO en Afrique de l'Ouest.
Tu aides l'équipe à interroger et analyser les données d'activités.

CONTEXTE DES ACTIVITÉS:
${activitiesContext}

INSTRUCTIONS:
- Réponds toujours en français
- Sois concis et utile
- Si tu ne trouves pas d'information pertinente dans le contexte, dis-le clairement
- Pour les statistiques, utilise uniquement les données fournies
- Aide à identifier les tendances, lacunes ou opportunités`;

    const messages = [
        {
            role: 'user' as const,
            content: userQuestion,
        },
    ];

    try {
        console.log(`[AI] 🚀 Essai Groq pour: "${userQuestion.substring(0, 50)}..."`);

        const result = await generateText({
            model: getPrimaryModel(),
            system: systemPrompt,
            messages,
        });

        console.log(`[AI] ✅ Groq OK`);
        return {
            text: result.text,
            provider: 'groq',
        };
    } catch (groqError) {
        const errorMsg = (groqError as Error).message;
        console.warn(`[AI] ⚠️ Groq échoué (${errorMsg}), fallback Claude...`);

        try {
            const result = await generateText({
                model: getFallbackModel(),
                system: systemPrompt,
                messages,
            });

            console.log(`[AI] ✅ Claude OK (fallback)`);
            return {
                text: result.text,
                provider: 'claude-fallback',
            };
        } catch (claudeError) {
            const claudeErrorMsg = (claudeError as Error).message;
            console.error(`[AI] ❌ Tous les providers échoués`);
            console.error(`    Groq: ${errorMsg}`);
            console.error(`    Claude: ${claudeErrorMsg}`);

            throw new Error(
                `Les deux providers ont échoué. Groq: ${errorMsg}, Claude: ${claudeErrorMsg}`
            );
        }
    }
}

/**
 * Formatter les activités pour le contexte IA
 */
export function formatActivitiesContext(activities: any[]): string {
    if (!activities || activities.length === 0) {
        return 'Aucune activité disponible.';
    }

    return activities
        .map(
            (activity) =>
                `• **${activity.activityTitle || activity.name}** (Status: ${activity.status || 'N/A'})
  Description: ${activity.description || 'N/A'}
  Bénéficiaires: ${activity.totalAttendees || 0}
  Dates: ${activity.activityStartDate ? new Date(activity.activityStartDate).toLocaleDateString('fr-FR') : 'N/A'} à ${activity.activityEndDate ? new Date(activity.activityEndDate).toLocaleDateString('fr-FR') : 'En cours'}
  Status: ${activity.status || 'N/A'}
  Démographique: ${activity.maleCount || 0} hommes, ${activity.femaleCount || 0} femmes`
        )
        .join('\n\n');
}

/**
 * Test de connexion aux APIs (pour debug)
 */
export async function testAIProviders(): Promise<{
    groq: boolean;
    claude: boolean;
    message?: string;
}> {
    console.log('[AI TEST] Vérification des providers...');

    let groqOk = false;
    let claudeOk = false;

    try {
        console.log('[AI TEST] 🧪 Groq...');
        const groqResult = await generateText({
            model: getPrimaryModel(),
            prompt: 'Dis simplement "Groq OK" en une phrase.',
        });
        console.log('[AI TEST] ✅ Groq: ' + groqResult.text);
        groqOk = true;
    } catch (e) {
        console.error('[AI TEST] ❌ Groq échoué:', (e as Error).message);
    }

    try {
        console.log('[AI TEST] 🧪 Claude...');
        const claudeResult = await generateText({
            model: getFallbackModel(),
            prompt: 'Dis simplement "Claude OK" en une phrase.',
        });
        console.log('[AI TEST] ✅ Claude: ' + claudeResult.text);
        claudeOk = true;
    } catch (e) {
        console.error('[AI TEST] ❌ Claude échoué:', (e as Error).message);
    }

    return {
        groq: groqOk,
        claude: claudeOk,
        message: groqOk ? '✅ Groq OK' : claudeOk ? '⚠️ Claude OK (Groq down)' : '❌ Tous échoués',
    };
}