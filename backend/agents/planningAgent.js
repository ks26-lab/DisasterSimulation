import { GeminiService } from '../services/geminiService.js';

/**
 * Generates structured disaster response plans using Gemini reasoning.
 */
export class PlanningAgent {
    /**
     * @param {GeminiService} [geminiService]
     */
    constructor(geminiService = new GeminiService()) {
        this.geminiService = geminiService;
        this.agentName = 'PlanningAgent';
    }

    /**
     * Generate a structured response plan from current and historical context.
     * @param {object} currentReport
     * @param {object[]} historicalMatches
     * @param {object|null} [learningInsights]
     * @returns {Promise<object>}
     */
    async generatePlan(currentReport, historicalMatches, learningInsights = null) {
        const rawPlan = await this.geminiService.generateResponsePlan(
            currentReport,
            historicalMatches,
            learningInsights
        );

        return this.validateAndNormalizePlan(rawPlan);
    }

    /**
     * Ensure the Gemini response conforms to the expected plan schema.
     * @param {object} plan
     * @returns {object}
     */
    validateAndNormalizePlan(plan) {
        if (!plan || typeof plan !== 'object') {
            throw new Error('Planning agent received an invalid plan object.');
        }

        const requiredFields = ['summary', 'recommendedActions', 'priority', 'reasoning', 'confidence'];
        for (const field of requiredFields) {
            if (!(field in plan)) {
                throw new Error(`Planning agent response missing required field: ${field}`);
            }
        }

        if (!Array.isArray(plan.recommendedActions)) {
            throw new Error('Planning agent response recommendedActions must be an array.');
        }

        return {
            summary: String(plan.summary),
            recommendedActions: plan.recommendedActions.map((action) => ({
                action: String(action.action ?? ''),
                priority: String(action.priority ?? 'MEDIUM'),
                rationale: String(action.rationale ?? ''),
                supportingEvidence: Array.isArray(action.supportingEvidence)
                    ? action.supportingEvidence.map(String)
                    : [],
                contradictingEvidence: Array.isArray(action.contradictingEvidence)
                    ? action.contradictingEvidence.map(String)
                    : [],
                confidenceScore: Number(action.confidenceScore ?? 0.85),
                knowledgeGaps: Array.isArray(action.knowledgeGaps)
                    ? action.knowledgeGaps.map(String)
                    : [],
            })),
            priority: String(plan.priority),
            reasoning: String(plan.reasoning),
            confidence: Number(plan.confidence ?? 0.85),
            metadata: {
                agent: this.agentName,
                generatedAt: new Date().toISOString(),
            },
        };
    }
}
