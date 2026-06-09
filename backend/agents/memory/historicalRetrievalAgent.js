import { SEARCH_WEIGHTS, AGENTS } from '../../config/index.js';

/**
 * Retrieves ranked historical disasters similar to a current observation report.
 */
export class HistoricalRetrievalAgent {
    /**
     * @param {import('../../services/elastic-service.js').ElasticSearchService} elasticService
     */
    constructor(elasticService) {
        this.elasticService = elasticService;
        this.agentName = 'HistoricalRetrievalAgent';
    }

    /**
     * Retrieve and rank similar historical disasters for an observation report.
     * @param {object} observationReport
     * @returns {Promise<object>}
     */
    async retrieve(observationReport) {
        const searchConfig = this.extractSearchConfig(observationReport);
        const query = this.buildWeightedQuery(searchConfig);
        const rawMatches = await this.elasticService.searchSimilar({
            query,
            size: searchConfig.size,
        });

        const rankedMatches = this.rankAndFilter(
            rawMatches,
            searchConfig.minimumSimilarity
        );

        const retrievalQuality = rankedMatches.length > 0 ? rankedMatches[0].similarity : 0.5;

        return {
            matches: rankedMatches,
            retrievalQuality,
            metadata: {
                agent: this.agentName,
                timestamp: new Date().toISOString(),
                matchCount: rankedMatches.length,
            },
            searchConfig,
        };
    }

    /**
     * Extract searchable features from an observation report.
     * @param {object} observationReport
     * @returns {object}
     */
    extractSearchConfig(observationReport) {
        const disaster = observationReport.disaster ?? {};
        const environment = observationReport.environment ?? {};
        const population = observationReport.population ?? {};
        const infrastructure = observationReport.infrastructure ?? {};
        const searchFeatures = observationReport.searchFeatures ?? {};
        const historicalSearchRequest =
            observationReport.historicalSearchRequest ?? {};

        const disasterType =
            disaster.type ?? searchFeatures.disasterType ?? '';
        const severity =
            disaster.severity ?? searchFeatures.severity ?? '';
        const trend =
            environment.trend ?? searchFeatures.trend ?? '';
        const rainfall =
            environment.rainfall ?? searchFeatures.rainfall ?? 0;
        const waterLevel =
            environment.waterLevel ?? searchFeatures.waterLevel ?? 0;
        const affectedPopulation =
            population.affectedPopulation ??
            searchFeatures.affectedPopulation ??
            0;
        const criticalPopulation =
            population.criticalPopulation ??
            searchFeatures.criticalPopulation ??
            0;
        const roadsAffected =
            infrastructure.roadsAffected ??
            searchFeatures.roadsAffected ??
            0;
        const bridgesAffected =
            infrastructure.bridgesAffected ??
            searchFeatures.bridgesAffected ??
            0;
        const hospitalsAffected =
            infrastructure.hospitalsAffected ??
            searchFeatures.hospitalsAffected ??
            0;
        const outcomeEffectiveness =
            searchFeatures.outcomeEffectiveness ?? 0.8;
        const successfulStrategies =
            searchFeatures.successfulStrategies ?? [];

        return {
            disasterType,
            severity,
            trend,
            rainfall,
            waterLevel,
            affectedPopulation,
            criticalPopulation,
            roadsAffected,
            bridgesAffected,
            hospitalsAffected,
            outcomeEffectiveness,
            successfulStrategies,
            lookbackYears:
                historicalSearchRequest.lookbackYears ??
                AGENTS.defaultLookbackYears,
            minimumSimilarity:
                historicalSearchRequest.minimumSimilarity ??
                AGENTS.defaultMinimumSimilarity,
            size: 10,
        };
    }

    /**
     * Build a weighted Elasticsearch bool query for similarity search.
     * @param {object} config
     * @returns {object}
     */
    buildWeightedQuery(config) {
        const shouldClauses = [];

        if (config.disasterType) {
            shouldClauses.push({
                match: {
                    'disaster.type': {
                        query: config.disasterType,
                        boost: SEARCH_WEIGHTS.disasterType,
                    },
                },
            });
        }

        if (config.severity) {
            shouldClauses.push({
                match: {
                    'disaster.severity': {
                        query: config.severity,
                        boost: SEARCH_WEIGHTS.severity,
                    },
                },
            });
        }

        if (config.trend) {
            shouldClauses.push({
                match: {
                    'environment.trend': {
                        query: config.trend,
                        boost: SEARCH_WEIGHTS.trend,
                    },
                },
            });
        }

        if (config.rainfall > 0) {
            shouldClauses.push({
                range: {
                    'environment.rainfall': {
                        gte: Math.floor(config.rainfall * 0.5),
                        lte: Math.ceil(config.rainfall * 1.5),
                        boost: SEARCH_WEIGHTS.rainfall,
                    },
                },
            });
        }

        if (config.waterLevel > 0) {
            shouldClauses.push({
                range: {
                    'environment.waterLevel': {
                        gte: Math.floor(config.waterLevel * 0.5),
                        lte: Math.ceil(config.waterLevel * 1.5),
                        boost: SEARCH_WEIGHTS.waterLevel,
                    },
                },
            });
        }

        if (config.affectedPopulation > 0) {
            const rangeFactor = AGENTS.populationRangeFactor;
            const lowerBound = Math.floor(
                config.affectedPopulation * (1 - rangeFactor)
            );
            const upperBound = Math.ceil(
                config.affectedPopulation * (1 + rangeFactor)
            );

            shouldClauses.push({
                range: {
                    'population.affectedPopulation': {
                        gte: lowerBound,
                        lte: upperBound,
                        boost: SEARCH_WEIGHTS.affectedPopulation,
                    },
                },
            });
        }

        if (config.criticalPopulation > 0) {
            shouldClauses.push({
                range: {
                    'population.criticalPopulation': {
                        gte: Math.floor(config.criticalPopulation * 0.5),
                        lte: Math.ceil(config.criticalPopulation * 1.5),
                        boost: SEARCH_WEIGHTS.affectedPopulation,
                    },
                },
            });
        }

        if (config.roadsAffected > 0 || config.bridgesAffected > 0 || config.hospitalsAffected > 0) {
            shouldClauses.push({
                range: {
                    'infrastructure.roadsAffected': {
                        gte: 0,
                        boost: SEARCH_WEIGHTS.infrastructureDamage,
                    },
                },
            });
            shouldClauses.push({
                range: {
                    'infrastructure.bridgesAffected': {
                        gte: 0,
                        boost: SEARCH_WEIGHTS.infrastructureDamage,
                    },
                },
            });
            shouldClauses.push({
                range: {
                    'infrastructure.hospitalsAffected': {
                        gte: 0,
                        boost: SEARCH_WEIGHTS.infrastructureDamage,
                    },
                },
            });
        }

        // Boost historical disasters that were solved with high effectiveness
        shouldClauses.push({
            range: {
                'outcome.effectiveness': {
                    gte: config.outcomeEffectiveness,
                    boost: SEARCH_WEIGHTS.outcomeEffectiveness,
                },
            },
        });

        // Boost historical disasters that successfully used strategies
        if (config.successfulStrategies && config.successfulStrategies.length > 0) {
            shouldClauses.push({
                terms: {
                    'outcome.successfulStrategies': config.successfulStrategies,
                    boost: SEARCH_WEIGHTS.successfulStrategies,
                },
            });
        }

        const boolQuery = {
            bool: {
                should: shouldClauses,
                minimum_should_match: shouldClauses.length > 0 ? 1 : 0,
            },
        };

        if (config.lookbackYears > 0) {
            const lookbackDate = new Date();
            lookbackDate.setFullYear(
                lookbackDate.getFullYear() - config.lookbackYears
            );

            boolQuery.bool.filter = [
                {
                    bool: {
                        should: [
                            {
                                range: {
                                    'metadata.timestamp': {
                                        gte: lookbackDate.toISOString(),
                                    },
                                },
                            },
                            {
                                range: {
                                    timestamp: {
                                        gte: lookbackDate.toISOString(),
                                    },
                                },
                            },
                        ],
                        minimum_should_match: 1,
                    },
                },
            ];
        }

        return boolQuery;
    }

    /**
     * Normalize scores and filter matches below the minimum similarity threshold.
     * @param {object[]} matches
     * @param {number} minimumSimilarity
     * @returns {object[]}
     */
    rankAndFilter(matches, minimumSimilarity) {
        if (matches.length === 0) {
            return [];
        }

        const maxScore = Math.max(...matches.map((match) => match.score ?? 0));

        return matches
            .map((match) => {
                const normalizedScore =
                    maxScore > 0 ? (match.score ?? 0) / maxScore : 0;

                return {
                    id: match.id,
                    score: match.score,
                    similarity: Number(normalizedScore.toFixed(4)),
                    source: match.source,
                };
            })
            .filter((match) => match.similarity >= minimumSimilarity)
            .sort((a, b) => b.similarity - a.similarity);
    }
}
