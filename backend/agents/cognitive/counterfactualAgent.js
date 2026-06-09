import { GeminiService } from '../../services/geminiService.js';
import { ElasticSearchService } from '../../services/elastic-service.js';

/**
 * Agent that performs counterfactual analysis (hindsight analysis) on disaster outcomes.
 */
export class CounterfactualAgent {
    /**
     * @param {GeminiService} [geminiService]
     * @param {ElasticSearchService} [elasticService]
     */
    constructor(geminiService = new GeminiService(), elasticService = new ElasticSearchService()) {
        this.geminiService = geminiService;
        this.elasticService = elasticService;
        this.agentName = 'CounterfactualAgent';
    }

    /**
     * Run counterfactual analysis and persist to memory if quality threshold is met.
     * @param {object} event
     * @param {object} responsePlan
     * @param {object} outcome
     * @returns {Promise<object>}
     */
    async analyze(event, responsePlan, outcome) {
        if (!event || !responsePlan || !outcome) {
            throw new Error('Event, responsePlan, and outcome are all required for counterfactual analysis.');
        }

        const rawAnalysis = await this.geminiService.generateCounterfactualAnalysis(event, responsePlan, outcome);
        const eventId = event.metadata?.eventId || event.eventId || responsePlan.eventId || outcome.eventId;
        
        const validated = this.validateAndNormalize(rawAnalysis, eventId);
        const storageResult = await this.elasticService.storeCounterfactual(validated);

        return {
            ...validated,
            stored: !storageResult.skipped,
            storageResult,
        };
    }

    /**
     * Validate and normalize Gemini counterfactual response.
     * @param {object} analysis
     * @param {string} eventId
     * @returns {object}
     */
    validateAndNormalize(analysis, eventId) {
        if (!analysis || typeof analysis !== 'object') {
            throw new Error('Counterfactual agent received an invalid analysis object.');
        }

        const requiredFields = ['alternativeActions', 'estimatedImpact', 'reasoning', 'confidence'];
        for (const field of requiredFields) {
            if (!(field in analysis)) {
                throw new Error(`Counterfactual agent response missing required field: ${field}`);
            }
        }

        return {
            eventId,
            alternativeActions: Array.isArray(analysis.alternativeActions)
                ? analysis.alternativeActions.map(String)
                : [],
            estimatedImpact: typeof analysis.estimatedImpact === 'object' && analysis.estimatedImpact !== null && !Array.isArray(analysis.estimatedImpact)
                ? analysis.estimatedImpact
                : { description: String(analysis.estimatedImpact || '') },
            reasoning: String(analysis.reasoning || ''),
            confidence: Number(analysis.confidence ?? 0.85),
            metadata: {
                agent: this.agentName,
                analyzedAt: new Date().toISOString(),
            },
        };
    }
}
