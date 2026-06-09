import { GeminiService } from '../../services/geminiService.js';

/**
 * Agent that learns from previous disaster reports, plans, and outcomes.
 */
export class LearningAgent {
    /**
     * @param {GeminiService} [geminiService]
     */
    constructor(geminiService = new GeminiService()) {
        this.geminiService = geminiService;
        this.agentName = 'LearningAgent';
    }

    /**
     * Analyze previous outcomes to extract successful, failed, and recommended strategies.
     * @param {object[]} historicalReports
     * @param {object[]} historicalPlans
     * @param {object[]} historicalOutcomes
     * @returns {Promise<object>}
     */
    async learn(historicalReports, historicalPlans, historicalOutcomes) {
        // If there's no historical data, we return empty insights with high default or lower confidence
        if (!historicalReports || historicalReports.length === 0) {
            return {
                successfulStrategies: [],
                failedStrategies: [],
                recommendations: ['No historical context available yet. Generate plans to build historical context.'],
                confidence: 0.5,
                metadata: {
                    agent: this.agentName,
                    analyzedAt: new Date().toISOString(),
                    reportsAnalyzedCount: 0,
                },
            };
        }

        const rawInsights = await this.geminiService.generateLearningInsights(
            historicalReports,
            historicalPlans,
            historicalOutcomes
        );

        return this.validateAndNormalizeInsights(rawInsights, historicalReports.length);
    }

    /**
     * Validate and normalize Gemini learning response.
     * @param {object} insights
     * @param {number} reportsCount
     * @returns {object}
     */
    validateAndNormalizeInsights(insights, reportsCount) {
        if (!insights || typeof insights !== 'object') {
            throw new Error('Learning agent received an invalid response object.');
        }

        const requiredFields = ['successfulStrategies', 'failedStrategies', 'recommendations', 'confidence'];
        for (const field of requiredFields) {
            if (!(field in insights)) {
                throw new Error(`Learning agent response missing required field: ${field}`);
            }
        }

        return {
            successfulStrategies: Array.isArray(insights.successfulStrategies)
                ? insights.successfulStrategies.map(String)
                : [],
            failedStrategies: Array.isArray(insights.failedStrategies)
                ? insights.failedStrategies.map(String)
                : [],
            recommendations: Array.isArray(insights.recommendations)
                ? insights.recommendations.map(String)
                : [],
            supportingEvidence: Array.isArray(insights.supportingEvidence)
                ? insights.supportingEvidence.map(String)
                : [],
            contradictingEvidence: Array.isArray(insights.contradictingEvidence)
                ? insights.contradictingEvidence.map(String)
                : [],
            confidenceScores: (insights.confidenceScores && typeof insights.confidenceScores === 'object')
                ? insights.confidenceScores
                : {},
            knowledgeGaps: Array.isArray(insights.knowledgeGaps)
                ? insights.knowledgeGaps.map(String)
                : [],
            dependencyPatterns: Array.isArray(insights.dependencyPatterns)
                ? insights.dependencyPatterns.map(String)
                : [],
            confidence: Number(insights.confidence ?? 0.0),
            metadata: {
                agent: this.agentName,
                analyzedAt: new Date().toISOString(),
                reportsAnalyzedCount: reportsCount,
            },
        };
    }
}
