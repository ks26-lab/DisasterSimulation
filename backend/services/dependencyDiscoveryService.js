import { GeminiService } from './geminiService.js';
import { ElasticSearchService } from './elastic-service.js';

/**
 * Service to discover and trace multi-hop infrastructure dependency chains and risk propagation paths.
 */
export class DependencyDiscoveryService {
    /**
     * @param {GeminiService} [geminiService]
     * @param {ElasticSearchService} [elasticService]
     */
    constructor(geminiService = new GeminiService(), elasticService = new ElasticSearchService()) {
        this.geminiService = geminiService;
        this.elasticService = elasticService;
        this.serviceName = 'DependencyDiscoveryService';
    }

    /**
     * Search historical plans/outcomes for infrastructure keywords, discover dependency chains, and store/evolve them.
     * @param {object} currentEvent
     * @param {object[]} historicalMatches
     * @returns {Promise<object>}
     */
    async discoverAndStoreDependencies(currentEvent, historicalMatches = []) {
        if (!currentEvent) {
            throw new Error('Current event is required for dependency discovery.');
        }

        const keywords = [
            'power', 'grid', 'electricity', 'water', 'pump', 'levee', 'communication',
            'telecom', 'roads', 'bridge', 'hospital', 'network', 'generator', 'backup',
            'fuel', 'substation', 'transport', 'highway'
        ];

        // Query plans index for infrastructure keyword matches
        const planResult = await this.elasticService.client.search({
            index: this.elasticService.plansIndex,
            size: 15,
            query: {
                bool: {
                    should: keywords.map(kw => ({
                        multi_match: {
                            query: kw,
                            fields: [
                                'generatedPlan.reasoning',
                                'generatedPlan.recommendedActions.action',
                                'generatedPlan.recommendedActions.rationale',
                                'summary'
                            ]
                        }
                    }))
                }
            }
        }).catch((err) => {
            console.error('[DependencyDiscoveryService] plan search failed:', err.message);
            return { hits: { hits: [] } };
        });

        // Query outcomes index for infrastructure keyword matches
        const outcomeResult = await this.elasticService.client.search({
            index: this.elasticService.outcomesIndex,
            size: 15,
            query: {
                bool: {
                    should: keywords.map(kw => ({
                        multi_match: {
                            query: kw,
                            fields: ['outcome.outcome', 'lessonsLearned']
                        }
                    }))
                }
            }
        }).catch((err) => {
            console.error('[DependencyDiscoveryService] outcome search failed:', err.message);
            return { hits: { hits: [] } };
        });

        // Extract raw text context from the matches
        const historicalTexts = [];
        for (const hit of planResult.hits.hits) {
            const src = hit._source;
            if (src.generatedPlan?.reasoning) historicalTexts.push(src.generatedPlan.reasoning);
            if (src.summary) historicalTexts.push(src.summary);
            if (src.generatedPlan?.recommendedActions) {
                for (const act of src.generatedPlan.recommendedActions) {
                    if (act.action) historicalTexts.push(act.action);
                    if (act.rationale) historicalTexts.push(act.rationale);
                }
            }
        }
        for (const hit of outcomeResult.hits.hits) {
            const src = hit._source;
            if (src.outcome) historicalTexts.push(JSON.stringify(src.outcome));
            if (src.lessonsLearned) {
                if (Array.isArray(src.lessonsLearned)) {
                    historicalTexts.push(...src.lessonsLearned.map(String));
                } else {
                    historicalTexts.push(String(src.lessonsLearned));
                }
            }
        }

        // Call Gemini to analyze dependencies
        const rawDependencies = await this.geminiService.discoverDependencies(
            currentEvent,
            historicalMatches,
            historicalTexts
        );

        const validated = this.validateAndNormalize(rawDependencies);

        // Store / evolve each dependency chain in Elasticsearch
        const storePromises = validated.dependencies.map((dep) =>
            this.elasticService.storeDependencyChain({
                source: dep.source,
                target: dep.target,
                intermediateNodes: dep.intermediateNodes,
                confidence: dep.confidence
            })
        );

        await Promise.all(storePromises);

        return validated;
    }

    /**
     * Validate and normalize Gemini dependency discovery response.
     * @param {object} rawDeps
     * @returns {object}
     */
    validateAndNormalize(rawDeps) {
        if (!rawDeps || typeof rawDeps !== 'object') {
            throw new Error('Dependency discovery service received invalid response object.');
        }

        const requiredFields = ['dependencies', 'riskChains', 'confidence'];
        for (const field of requiredFields) {
            if (!(field in rawDeps)) {
                throw new Error(`Dependency discovery response missing required field: ${field}`);
            }
        }

        const deps = Array.isArray(rawDeps.dependencies)
            ? rawDeps.dependencies.map((dep) => ({
                  source: String(dep.source || ''),
                  target: String(dep.target || ''),
                  intermediateNodes: Array.isArray(dep.intermediateNodes)
                      ? dep.intermediateNodes.map(String)
                      : [],
                  confidence: Number(dep.confidence ?? 0.8),
                  observations: Number(dep.observations ?? 1),
              }))
            : [];

        return {
            dependencies: deps,
            riskChains: Array.isArray(rawDeps.riskChains) ? rawDeps.riskChains.map(String) : [],
            confidence: Number(rawDeps.confidence ?? 0.8),
            metadata: {
                service: this.serviceName,
                discoveredAt: new Date().toISOString(),
            },
        };
    }
}
