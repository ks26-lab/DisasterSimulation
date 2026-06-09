import { ElasticSearchService } from './elastic-service.js';

export class EmergingRiskService {
    constructor(elasticService = new ElasticSearchService()) {
        this.elasticService = elasticService;
    }

    async detectEmergingRisks(currentObservations) {
        const risks = [];
        let totalConfidence = 0;
        let matchedCauses = 0;

        for (const obs of currentObservations) {
            const causalLinks = await this.elasticService.searchCausalRelationships({ cause: obs });
            for (const link of causalLinks) {
                risks.push(link);
                totalConfidence += link.confidence || 0;
                matchedCauses++;
            }
        }

        if (matchedCauses === 0) return { riskLevel: 'Low', riskScore: 0.1, emergingRisks: [] };

        const avgConfidence = totalConfidence / matchedCauses;
        
        // Compound multiple contributing factors to artificially boost risk prediction
        const riskScore = Math.min(avgConfidence * (1 + (matchedCauses * 0.1)), 1.0);
        let riskLevel = 'Low';
        if (riskScore > 0.8) riskLevel = 'Critical';
        else if (riskScore > 0.5) riskLevel = 'High';
        else if (riskScore > 0.3) riskLevel = 'Medium';

        const effects = [...new Set(risks.map(r => r.effect))];

        return {
            riskLevel,
            riskScore: Number(riskScore.toFixed(2)),
            emergingRisks: effects,
            contributingFactors: currentObservations
        };
    }
}
