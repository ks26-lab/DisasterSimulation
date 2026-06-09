export class ConfidenceAttributionService {
    /**
     * Calculates explainable confidence attribution based on various intelligence signals.
     * @param {object} params
     * @param {number} params.strategyConfidence
     * @param {number} params.evidenceReliability
     * @param {number} params.noveltyScore
     * @param {number} params.contradictionScore
     * @param {number} params.dependencyConfidence
     * @returns {object} { overallConfidence, confidenceBreakdown }
     */
    calculateConfidence({
        strategyConfidence = 0.5,
        evidenceReliability = 0.5,
        noveltyScore = 0.0,
        contradictionScore = 0.0,
        dependencyConfidence = 0.5
    }) {
        // Base weightings for different signals
        const WEIGHTS = {
            strategy: 0.4,
            evidence: 0.3,
            dependency: 0.3
        };

        // Penalties
        const noveltyPenalty = noveltyScore > 0.6 ? -(noveltyScore * 0.2) : 0;
        const contradictionPenalty = -(contradictionScore * 0.3);

        const strategyContribution = strategyConfidence * WEIGHTS.strategy;
        const evidenceContribution = evidenceReliability * WEIGHTS.evidence;
        const dependencyContribution = dependencyConfidence * WEIGHTS.dependency;

        let overallConfidence = strategyContribution + evidenceContribution + dependencyContribution;
        overallConfidence += noveltyPenalty + contradictionPenalty;

        // Bound between 0 and 1
        overallConfidence = Math.max(0, Math.min(1, overallConfidence));

        return {
            overallConfidence: Number(overallConfidence.toFixed(4)),
            confidenceBreakdown: {
                strategyMemory: Number(strategyContribution.toFixed(4)),
                evidenceReliability: Number(evidenceContribution.toFixed(4)),
                noveltyPenalty: Number(noveltyPenalty.toFixed(4)),
                contradictionPenalty: Number(contradictionPenalty.toFixed(4)),
                dependencySupport: Number(dependencyContribution.toFixed(4))
            }
        };
    }
}
