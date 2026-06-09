import { ElasticSearchService } from './elastic-service.js';

export class ContradictionAnalysisService {
    constructor(elasticService = new ElasticSearchService()) {
        this.elasticService = elasticService;
    }

    async analyzeContradictions(eventFeatures) {
        // Find conflicting strategies
        const strategies = await this.elasticService.searchStrategies({ disasterType: eventFeatures.disasterType });
        
        const conflicts = [];

        for (const strategy of strategies) {
            const supporting = strategy.successCount || 0;
            const contradicting = strategy.failureCount || 0;
            
            if (supporting > 0 && contradicting > 0) {
                let conflictLevel = 'Low';
                const ratio = Math.min(supporting, contradicting) / Math.max(supporting, contradicting);
                if (ratio > 0.5) conflictLevel = 'High';
                else if (ratio > 0.2) conflictLevel = 'Medium';

                conflicts.push({
                    strategy: strategy.strategyId || strategy.strategyName,
                    supportingCases: supporting,
                    contradictingCases: contradicting,
                    conflictLevel,
                    details: 'Found opposing outcomes for this strategy in historical data.'
                });
            }
        }

        const resolutions = await this.elasticService.searchMemoryConflictResolutions();

        return {
            conflicts,
            resolutions
        };
    }
}
