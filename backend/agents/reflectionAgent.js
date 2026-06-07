import { GeminiService } from '../services/geminiService.js';

/**
 * Agent that critiques proposed disaster response plans.
 */
export class ReflectionAgent {
    /**
     * @param {GeminiService} [geminiService]
     */
    constructor(geminiService = new GeminiService()) {
        this.geminiService = geminiService;
        this.agentName = 'ReflectionAgent';
    }

    /**
     * Review the proposed response plan and identify weaknesses, risks, and missing actions.
     * @param {object} currentEvent
     * @param {object[]} historicalMatches
     * @param {object} generatedPlan
     * @returns {Promise<object>}
     */
    async reviewPlan(currentEvent, historicalMatches, generatedPlan) {
        if (!currentEvent || !generatedPlan) {
            throw new Error('Current event and generated plan are required for reflection.');
        }

        const rawReflection = await this.geminiService.reviewResponsePlan(
            currentEvent,
            historicalMatches,
            generatedPlan
        );

        return this.validateAndNormalizeReflection(rawReflection);
    }

    /**
     * Ensure the reflection response from Gemini has the correct format.
     * @param {object} reflection
     * @returns {object}
     */
    validateAndNormalizeReflection(reflection) {
        if (!reflection || typeof reflection !== 'object') {
            throw new Error('Reflection agent received an invalid response object.');
        }

        const requiredFields = ['risks', 'weaknesses', 'missingActions', 'improvements', 'approved', 'confidence'];
        for (const field of requiredFields) {
            if (!(field in reflection)) {
                throw new Error(`Reflection agent response missing required field: ${field}`);
            }
        }

        return {
            risks: Array.isArray(reflection.risks) ? reflection.risks.map(String) : [],
            weaknesses: Array.isArray(reflection.weaknesses) ? reflection.weaknesses.map(String) : [],
            missingActions: Array.isArray(reflection.missingActions) ? reflection.missingActions.map(String) : [],
            improvements: Array.isArray(reflection.improvements) ? reflection.improvements.map(String) : [],
            approved: Boolean(reflection.approved),
            confidence: Number(reflection.confidence ?? 0.0),
            metadata: {
                agent: this.agentName,
                reviewedAt: new Date().toISOString(),
            },
        };
    }
}
