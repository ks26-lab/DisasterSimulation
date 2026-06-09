import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH } from '../config/index.js';

const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_API_KEY,
    },
});

/**
 * Elasticsearch persistence layer for disaster reports and outcomes.
 */
export class ElasticSearchService {
    /**
     * @param {import('@elastic/elasticsearch').Client} [esClient]
     */
    constructor(esClient = client) {
        this.client = esClient;
        this.reportsIndex = ELASTICSEARCH.reportsIndex;
        this.outcomesIndex = ELASTICSEARCH.outcomesIndex;
        this.plansIndex = ELASTICSEARCH.plansIndex;
        this.strategyMemoryIndex = ELASTICSEARCH.strategyMemoryIndex;
        this.counterfactualMemoryIndex = ELASTICSEARCH.counterfactualMemoryIndex;
        this.dependencyMemoryIndex = ELASTICSEARCH.dependencyMemoryIndex;
        this.knowledgeGapMemoryIndex = ELASTICSEARCH.knowledgeGapMemoryIndex;
        this.causalMemoryIndex = ELASTICSEARCH.causalMemoryIndex;
        this.novelEventMemoryIndex = ELASTICSEARCH.novelEventMemoryIndex;
        this.recommendationMemoryIndex = ELASTICSEARCH.recommendationMemoryIndex;
        this.evidenceReliabilityMemoryIndex = ELASTICSEARCH.evidenceReliabilityMemoryIndex;
        this.memoryConflictResolutionIndex = ELASTICSEARCH.memoryConflictResolutionIndex;
        this.decisionLineageMemoryIndex = ELASTICSEARCH.decisionLineageMemoryIndex;
    }

    /**
     * Store a disaster observation report.
     * @param {object} report
     * @returns {Promise<object>}
     */
    async store(report) {
        return await this.client.index({
            index: this.reportsIndex,
            document: report,
        });
    }

    /**
     * Retrieve all stored disaster reports.
     * @param {number} [size]
     * @returns {Promise<object[]>}
     */
    async getAll(size = ELASTICSEARCH.defaultSearchSize) {
        const result = await this.client.search({
            index: this.reportsIndex,
            size,
            query: { match_all: {} },
        });

        return result.hits.hits;
    }

    /**
     * Search disaster reports using a historical analysis search payload.
     * @param {object} searchReport
     * @returns {Promise<object[]>}
     */
    async search(searchReport) {
        const features = searchReport.searchFeatures ?? searchReport;
        const result = await this.client.search({
            index: this.reportsIndex,
            size: ELASTICSEARCH.defaultSearchSize,
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                'disaster.type': features.disasterType,
                            },
                        },
                        {
                            match: {
                                'disaster.severity': features.severity,
                            },
                        },
                    ],
                },
            },
        });

        return result.hits.hits;
    }

    /**
     * Execute a weighted similarity search for historical disasters.
     * @param {object} params
     * @param {object} params.query - Elasticsearch bool query
     * @param {number} [params.size]
     * @returns {Promise<object[]>}
     */
    async searchSimilar({ query, size = ELASTICSEARCH.defaultSearchSize }) {
        const result = await this.client.search({
            index: this.reportsIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query,
        });

        return result.hits.hits.map((hit) => ({
            id: hit._id,
            score: hit._score,
            source: hit._source,
        }));
    }

    /**
     * Store a generated disaster response plan.
     * @param {object} planRecord
     * @param {string} planRecord.eventId
     * @param {object} planRecord.report
     * @param {object[]} planRecord.historicalMatches
     * @param {object|null} planRecord.learningInsights
     * @param {object} planRecord.generatedPlan
     * @param {object|null} planRecord.reflection
     * @param {object|null} [planRecord.workflowTrace]
     * @param {number|null} [planRecord.overallConfidence]
     * @param {string} [planRecord.createdAt]
     * @returns {Promise<object>}
     */
    async storePlan({
        eventId,
        report,
        historicalMatches,
        learningInsights,
        generatedPlan,
        reflection,
        workflowTrace = null,
        overallConfidence = null,
        createdAt = new Date().toISOString(),
    }) {
        return await this.client.index({
            index: this.plansIndex,
            id: eventId,
            document: {
                eventId,
                report,
                historicalMatches,
                learningInsights,
                generatedPlan,
                reflection,
                workflowTrace,
                overallConfidence,
                createdAt,
            },
        });
    }

    /**
     * Retrieve plans by a list of event IDs.
     * @param {string[]} eventIds
     * @returns {Promise<object[]>}
     */
    async getPlansByEventIds(eventIds) {
        if (!eventIds || eventIds.length === 0) return [];
        const result = await this.client.search({
            index: this.plansIndex,
            size: eventIds.length,
            query: {
                terms: {
                    eventId: eventIds,
                },
            },
        });
        return result.hits.hits.map((hit) => hit._source);
    }

    /**
     * Retrieve outcomes by a list of event IDs.
     * @param {string[]} eventIds
     * @returns {Promise<object[]>}
     */
    async getOutcomesByEventIds(eventIds) {
        if (!eventIds || eventIds.length === 0) return [];
        const result = await this.client.search({
            index: this.outcomesIndex,
            size: eventIds.length,
            query: {
                terms: {
                    eventId: eventIds,
                },
            },
        });
        return result.hits.hits.map((hit) => hit._source);
    }

    /**
     * Store a disaster response outcome.
     * @param {object} outcomeRecord
     * @param {string} outcomeRecord.eventId
     * @param {object|null} [outcomeRecord.outcome]
     * @param {number|null} [outcomeRecord.effectiveness]
     * @param {object|string|null} [outcomeRecord.lessonsLearned]
     * @param {string} [outcomeRecord.timestamp]
     * @returns {Promise<object>}
     */
    async storeOutcome({
        eventId,
        outcome = null,
        effectiveness = null,
        lessonsLearned = null,
        timestamp = new Date().toISOString(),
    }) {
        const result = await this.client.index({
            index: this.outcomesIndex,
            id: eventId,
            document: {
                eventId,
                outcome,
                effectiveness,
                lessonsLearned,
                timestamp,
                updatedAt: timestamp,
            },
        });
        await this.denormalizeOutcomeToReport(eventId, effectiveness, lessonsLearned);
        return result;
    }

    /**
     * Update an existing outcome record with post-event results.
     * @param {object} params
     * @param {string} params.eventId
     * @param {object} params.outcome
     * @param {number} params.effectiveness
     * @param {object|string|null} [params.lessonsLearned]
     * @returns {Promise<object>}
     */
    async updateOutcome({ eventId, outcome, effectiveness, lessonsLearned = null }) {
        const doc = {
            outcome,
            effectiveness,
            timestamp: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (lessonsLearned !== null && lessonsLearned !== undefined) {
            doc.lessonsLearned = lessonsLearned;
        }
        const result = await this.client.update({
            index: this.outcomesIndex,
            id: eventId,
            body: {
                doc,
                upsert: {
                    ...doc,
                    eventId,
                    timestamp: doc.updatedAt
                }
            }
        });
        await this.denormalizeOutcomeToReport(eventId, effectiveness, lessonsLearned);
        return result;
    }

    /**
     * Denormalizes outcome metrics to the corresponding report document to enable similarity search.
     * @param {string} eventId
     * @param {number} effectiveness
     * @param {any} lessonsLearned
     */
    async denormalizeOutcomeToReport(eventId, effectiveness, lessonsLearned) {
        if (effectiveness === null || effectiveness === undefined) return;
        try {
            const searchResult = await this.client.search({
                index: this.reportsIndex,
                query: {
                    bool: {
                        should: [
                            { term: { eventId } },
                            { term: { 'metadata.eventId': eventId } }
                        ],
                        minimum_should_match: 1
                    }
                }
            });

            if (searchResult.hits.hits.length > 0) {
                const reportId = searchResult.hits.hits[0]._id;
                let successfulStrategies = [];
                if (effectiveness >= 0.7) {
                    if (Array.isArray(lessonsLearned)) {
                        successfulStrategies = lessonsLearned;
                    } else if (typeof lessonsLearned === 'string') {
                        successfulStrategies = [lessonsLearned];
                    }
                }

                await this.client.update({
                    index: this.reportsIndex,
                    id: reportId,
                    doc: {
                        outcome: {
                            effectiveness,
                            successfulStrategies,
                        }
                    }
                });
            }
        } catch (error) {
            console.error(`[denormalizeOutcomeToReport] Failed for event ${eventId}:`, error.message);
        }
    }

    /**
     * Search stored disaster response outcomes.
     * @param {object} [params]
     * @param {string} [params.eventId]
     * @param {number} [params.minEffectiveness]
     * @param {number} [params.maxEffectiveness]
     * @param {number} [params.size]
     * @returns {Promise<object[]>}
     */
    async searchOutcomes({ eventId, minEffectiveness, maxEffectiveness, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const mustClauses = [];

        if (eventId) {
            mustClauses.push({ term: { eventId } });
        }
        if (minEffectiveness !== undefined) {
            mustClauses.push({ range: { effectiveness: { gte: minEffectiveness } } });
        }
        if (maxEffectiveness !== undefined) {
            mustClauses.push({ range: { effectiveness: { lte: maxEffectiveness } } });
        }

        const query = mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

        const result = await this.client.search({
            index: this.outcomesIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query,
            sort: [
                { timestamp: { order: 'desc', missing: '_last', unmapped_type: 'date' } },
                { updatedAt: { order: 'desc', missing: '_last', unmapped_type: 'date' } }
            ],
        });

        return result.hits.hits.map((hit) => ({
            id: hit._id,
            ...hit._source,
        }));
    }

    /**
     * Store or initialize a strategy memory document.
     * @param {object} strategyData
     * @returns {Promise<object>}
     */
    async storeStrategy(strategyData) {
        const id = strategyData.strategyId;
        return await this.client.index({
            index: this.strategyMemoryIndex,
            id,
            document: strategyData,
        });
    }

    /**
     * Search strategy memories by query parameters.
     * @param {object} [params]
     * @param {string} [params.disasterType]
     * @param {number} [params.minEffectiveness]
     * @param {number} [params.size]
     * @returns {Promise<object[]>}
     */
    async searchStrategies({ disasterType, minEffectiveness, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const mustClauses = [];

        if (disasterType) {
            mustClauses.push({ term: { applicableDisasters: disasterType } });
        }

        if (minEffectiveness !== undefined) {
            mustClauses.push({
                range: {
                    averageEffectiveness: {
                        gte: minEffectiveness
                    }
                }
            });
        }

        const baseQuery = mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

        const query = {
            function_score: {
                query: baseQuery,
                functions: [
                    {
                        exp: {
                            updatedAt: {
                                scale: "1825d",
                                decay: 0.77
                            }
                        }
                    }
                ],
                boost_mode: "multiply"
            }
        };

        const result = await this.client.search({
            index: this.strategyMemoryIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query,
        });

        return result.hits.hits.map((hit) => ({
            id: hit._id,
            ...hit._source,
        }));
    }


    /**
     * Update strategy effectiveness metrics based on post-event evaluation.
     * @param {object} params
     * @param {string} params.strategyId
     * @param {number} params.effectiveness
     * @param {string} [params.condition]
     * @param {string} [params.lessonsLearned]
     * @param {string} [params.eventId]
     * @returns {Promise<object>}
     */
    async updateStrategyEffectiveness({ strategyId, effectiveness, condition, lessonsLearned, eventId = null }) {
        let currentStrategy = null;
        try {
            const result = await this.client.get({
                index: this.strategyMemoryIndex,
                id: strategyId,
            });
            currentStrategy = result._source;
        } catch (error) {
            // Strategy document doesn't exist yet
        }

        const timesUsed = (currentStrategy?.timesUsed ?? 0) + 1;
        const oldAvg = currentStrategy?.averageEffectiveness ?? 0.0;
        const averageEffectiveness = Number(((oldAvg * (timesUsed - 1) + effectiveness) / timesUsed).toFixed(4));

        let successCount = currentStrategy?.successCount ?? 0;
        let failureCount = currentStrategy?.failureCount ?? 0;

        const supportingEvidence = currentStrategy?.supportingEvidence ?? [];
        const contradictingEvidence = currentStrategy?.contradictingEvidence ?? [];

        // Determine evidence label based on eventId
        let evidenceLabel = condition || `Event: ${eventId}`;
        if (eventId) {
            try {
                const reportSearch = await this.client.search({
                    index: this.reportsIndex,
                    query: {
                        bool: {
                            should: [
                                { term: { eventId } },
                                { term: { 'metadata.eventId': eventId } }
                            ],
                            minimum_should_match: 1
                        }
                    }
                });
                if (reportSearch.hits.hits.length > 0) {
                    const source = reportSearch.hits.hits[0]._source;
                    const type = source.disaster?.type || 'Disaster';
                    const ts = source.timestamp || source.metadata?.timestamp;
                    const year = ts ? new Date(ts).getFullYear() : new Date().getFullYear();
                    evidenceLabel = `${type} ${year}`;
                }
            } catch (err) {
                // Ignore
            }
        }

        if (effectiveness >= 0.7) {
            successCount += 1;
            if (!supportingEvidence.includes(evidenceLabel)) {
                supportingEvidence.push(evidenceLabel);
            }
        } else {
            failureCount += 1;
            if (!contradictingEvidence.includes(evidenceLabel)) {
                contradictingEvidence.push(evidenceLabel);
            }
        }

        // Bayesian-smoothed confidence estimation
        const confidenceScore = Number(((successCount + 1) / (successCount + failureCount + 2)).toFixed(4));

        const totalExecutions = successCount + failureCount;
        const stabilityScore = totalExecutions > 0 ? Number((successCount / totalExecutions).toFixed(4)) : 0;
        const stabilityHistory = currentStrategy?.stabilityHistory ?? [];
        stabilityHistory.push(stabilityScore);

        const lastUpdated = currentStrategy?.updatedAt ? new Date(currentStrategy.updatedAt).getTime() : Date.now();
        const ageDays = (Date.now() - lastUpdated) / (1000 * 60 * 60 * 24);
        const freshnessDecay = Math.exp(-0.01 * ageDays);
        const freshnessScore = Number((confidenceScore * freshnessDecay).toFixed(4));

        let conflictLevel = 'low';
        let conflictRatio = 0;
        if (totalExecutions > 0) {
            conflictRatio = Number((failureCount / totalExecutions).toFixed(4));
            if (successCount > 0 && failureCount > 0) {
                const ratio = Math.min(successCount, failureCount) / Math.max(successCount, failureCount);
                if (ratio > 0.3) conflictLevel = 'medium';
                if (ratio > 0.7) conflictLevel = 'high';
            }
        }

        const confidenceHistory = currentStrategy?.confidenceHistory ?? [];
        let confidenceTrend = 'Stable';
        if (confidenceHistory.length > 0) {
            const lastConf = confidenceHistory[confidenceHistory.length - 1];
            if (confidenceScore > lastConf + 0.005) {
                confidenceTrend = 'Increasing';
            } else if (confidenceScore < lastConf - 0.005) {
                confidenceTrend = 'Decreasing';
            }
        }
        const updatedHistory = [...confidenceHistory, confidenceScore];

        const successfulConditions = currentStrategy?.successfulConditions ?? [];
        const failureConditions = currentStrategy?.failureConditions ?? [];
        if (condition) {
            if (effectiveness >= 0.7) {
                if (!successfulConditions.includes(condition)) {
                    successfulConditions.push(condition);
                }
            } else {
                if (!failureConditions.includes(condition)) {
                    failureConditions.push(condition);
                }
            }
        }

        const lessons = currentStrategy?.lessonsLearned ?? [];
        if (lessonsLearned && !lessons.includes(lessonsLearned)) {
            lessons.push(lessonsLearned);
        }

        return await this.client.index({
            index: this.strategyMemoryIndex,
            id: strategyId,
            document: {
                strategyId,
                strategyName: currentStrategy?.strategyName ?? strategyId.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
                applicableDisasters: currentStrategy?.applicableDisasters ?? [],
                timesUsed,
                averageEffectiveness,
                successfulConditions,
                failureConditions,
                lessonsLearned: lessons,
                successCount,
                failureCount,
                supportingCases: successCount,
                contradictingCases: failureCount,
                conflictRatio,
                conflictLevel,
                supportingEvidence,
                contradictingEvidence,
                confidenceScore,
                stabilityScore,
                stabilityHistory,
                freshnessScore,
                confidenceHistory: updatedHistory,
                confidenceTrend,
                updatedAt: new Date().toISOString(),
            },
        });
    }

    /**
     * Search stored response plans.
     * @param {object} [params]
     * @param {string} [params.eventId]
     * @param {string} [params.priority]
     * @param {number} [params.minConfidence]
     * @param {number} [params.size]
     * @returns {Promise<object[]>}
     */
    async searchPlans({ eventId, priority, minConfidence, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const mustClauses = [];
        if (eventId) {
            mustClauses.push({ term: { eventId } });
        }
        if (priority) {
            mustClauses.push({ term: { 'generatedPlan.priority': priority } });
        }
        if (minConfidence !== undefined) {
            mustClauses.push({ range: { overallConfidence: { gte: minConfidence } } });
        }

        const query = mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

        const result = await this.client.search({
            index: this.plansIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query,
        });

        return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
    }

    /**
     * Store a generated counterfactual analysis with quality control filters.
     * @param {object} counterfactualData
     * @returns {Promise<object>}
     */
    async storeCounterfactual(counterfactualData) {
        const threshold = 0.6;
        const confidence = Number(counterfactualData.confidence ?? 0.0);

        let impactValue = 0.0;
        if (typeof counterfactualData.estimatedImpact === 'number') {
            impactValue = counterfactualData.estimatedImpact;
        } else if (counterfactualData.estimatedImpact && typeof counterfactualData.estimatedImpact === 'object') {
            impactValue = Number(counterfactualData.estimatedImpact.effectiveness || counterfactualData.estimatedImpact.impact || 0.0);
        } else if (Array.isArray(counterfactualData.estimatedImpact)) {
            impactValue = counterfactualData.estimatedImpact.length > 0 ? 0.7 : 0.0;
        }

        if (confidence < threshold && impactValue < threshold) {
            console.log(`[storeCounterfactual] Skipped persisting counterfactual due to quality controls (confidence: ${confidence}, impact: ${impactValue})`);
            return { skipped: true, reason: 'Confidence and impact below quality threshold (0.6)' };
        }

        return await this.client.index({
            index: this.counterfactualMemoryIndex,
            document: {
                ...counterfactualData,
                createdAt: new Date().toISOString()
            }
        });
    }

    /**
     * Store the full decision lineage chain.
     * @param {object} lineageData
     * @returns {Promise<object>}
     */
    async storeDecisionLineage(lineageData) {
        return await this.client.index({
            index: this.decisionLineageMemoryIndex,
            id: lineageData.eventId,
            document: {
                ...lineageData,
                createdAt: new Date().toISOString()
            }
        });
    }

    /**
     * Store and evolve a structured infrastructure dependency chain.
     * @param {object} chainData
     * @returns {Promise<object>}
     */
    async storeDependencyChain({ source, target, intermediateNodes = [], confidence: initialConf = null }) {
        let existingChain = null;
        let docId = `${source}_to_${target}`.replace(/\s+/g, '_');
        try {
            const res = await this.client.get({
                index: this.dependencyMemoryIndex,
                id: docId
            });
            existingChain = res._source;
        } catch (err) {
            // Not found
        }

        const observations = (existingChain?.observations ?? 0) + 1;
        const confidenceHistory = existingChain?.confidenceHistory ?? [];

        // Confidence evolution: increases over time with repeated observations
        const newConfidence = Number((1 - 1 / (observations + 1)).toFixed(4));

        let trend = 'Stable';
        if (confidenceHistory.length > 0) {
            const prevConf = confidenceHistory[confidenceHistory.length - 1];
            if (newConfidence > prevConf + 0.001) trend = 'Increasing';
            else if (newConfidence < prevConf - 0.001) trend = 'Decreasing';
        }

        const updatedHistory = [...confidenceHistory, newConfidence];

        const affectedNodes = 2 + intermediateNodes.length;
        const criticality = Number((affectedNodes * newConfidence).toFixed(4));

        const criticalityHistory = existingChain?.criticalityHistory ?? [];
        let criticalityTrend = 'Stable';
        if (criticalityHistory.length > 0) {
            const prevCrit = criticalityHistory[criticalityHistory.length - 1];
            if (criticality > prevCrit + 0.001) criticalityTrend = 'Increasing';
            else if (criticality < prevCrit - 0.001) criticalityTrend = 'Decreasing';
        }
        criticalityHistory.push(criticality);

        return await this.client.index({
            index: this.dependencyMemoryIndex,
            id: docId,
            document: {
                source,
                target,
                intermediateNodes,
                confidence: newConfidence,
                observations,
                criticality,
                criticalityTrend,
                criticalityHistory,
                confidenceHistory: updatedHistory,
                confidenceTrend: trend,
                updatedAt: new Date().toISOString()
            }
        });
    }

    /**
     * Store an identified actionable knowledge gap.
     * @param {object} gapData
     * @returns {Promise<object>}
     */
    async storeKnowledgeGap(gapData) {
        return await this.client.index({
            index: this.knowledgeGapMemoryIndex,
            document: {
                ...gapData,
                createdAt: new Date().toISOString()
            }
        });
    }

    /**
     * Search counterfactual records.
     * @param {object} params
     * @returns {Promise<object[]>}
     */
    async searchCounterfactuals({ eventId, minConfidence, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const mustClauses = [];
        if (eventId) mustClauses.push({ term: { eventId } });
        if (minConfidence !== undefined) mustClauses.push({ range: { confidence: { gte: minConfidence } } });

        const query = mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

        const result = await this.client.search({
            index: this.counterfactualMemoryIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query,
            sort: [{ createdAt: { order: 'desc' } }]
        });
        return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
    }

    /**
     * Search dependency chains.
     * @param {object} params
     * @returns {Promise<object[]>}
     */
    async searchDependencies({ source, target, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const mustClauses = [];
        if (source) mustClauses.push({ term: { source } });
        if (target) mustClauses.push({ term: { target } });

        const query = mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

        const result = await this.client.search({
            index: this.dependencyMemoryIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query,
            sort: [{ updatedAt: { order: 'desc' } }]
        });
        return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
    }

    /**
     * Search knowledge gaps.
     * @param {object} params
     * @returns {Promise<object[]>}
     */
    async searchKnowledgeGaps({ eventId, severity, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const mustClauses = [];
        if (eventId) mustClauses.push({ term: { eventId } });
        if (severity) mustClauses.push({ term: { severity } });

        const query = mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

        const result = await this.client.search({
            index: this.knowledgeGapMemoryIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query,
            sort: [{ createdAt: { order: 'desc' } }]
        });
        return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
    }

    /**
     * Store a causal relationship.
     */
    async storeCausalRelationship({ cause, effect, confidence }) {
        const docId = `${cause}_leads_to_${effect}`.replace(/\s+/g, '_');
        let existing = null;
        try {
            const res = await this.client.get({ index: this.causalMemoryIndex, id: docId });
            existing = res._source;
        } catch (e) {}

        const observations = (existing?.observations ?? 0) + 1;
        const contradictions = existing?.contradictions ?? 0;
        const confidenceHistory = existing?.confidenceHistory ?? [];
        const newConfidence = confidence ?? Number((1 - 1 / (observations + 1)).toFixed(4));
        
        let trend = 'Stable';
        if (confidenceHistory.length > 0) {
            const prevConf = confidenceHistory[confidenceHistory.length - 1];
            if (newConfidence > prevConf + 0.001) trend = 'Increasing';
            else if (newConfidence < prevConf - 0.001) trend = 'Decreasing';
        }

        return await this.client.index({
            index: this.causalMemoryIndex,
            id: docId,
            document: {
                cause,
                effect,
                observations,
                confidence: newConfidence,
                contradictions,
                confidenceHistory: [...confidenceHistory, newConfidence],
                trend,
                updatedAt: new Date().toISOString()
            }
        });
    }

    async searchCausalRelationships({ cause, effect, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const mustClauses = [];
        if (cause) mustClauses.push({ term: { cause } });
        if (effect) mustClauses.push({ term: { effect } });
        const query = mustClauses.length > 0 ? { bool: { must: mustClauses } } : { match_all: {} };

        const result = await this.client.search({
            index: this.causalMemoryIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query
        });
        return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
    }

    /**
     * Update evidence reliability.
     */
    async updateEvidenceReliability({ source, isCorrect }) {
        let existing = null;
        try {
            const res = await this.client.get({ index: this.evidenceReliabilityMemoryIndex, id: source });
            existing = res._source;
        } catch (e) {}

        let correct = existing?.correctPredictions ?? 0;
        let incorrect = existing?.incorrectPredictions ?? 0;
        
        if (isCorrect) correct += 1;
        else incorrect += 1;
        
        const reliabilityScore = Number(((correct + 1) / (correct + incorrect + 2)).toFixed(4));

        return await this.client.index({
            index: this.evidenceReliabilityMemoryIndex,
            id: source,
            document: {
                source,
                reliabilityScore,
                correctPredictions: correct,
                incorrectPredictions: incorrect,
                updatedAt: new Date().toISOString()
            }
        });
    }

    async getEvidenceReliability(source) {
        try {
            const res = await this.client.get({ index: this.evidenceReliabilityMemoryIndex, id: source });
            return res._source;
        } catch (e) {
            // Default baseline if unknown
            return { source, reliabilityScore: 0.5, correctPredictions: 0, incorrectPredictions: 0 };
        }
    }

    /**
     * Store a memory conflict resolution.
     */
    async storeMemoryConflictResolution(resolutionData) {
        return await this.client.index({
            index: this.memoryConflictResolutionIndex,
            document: {
                ...resolutionData,
                resolvedAt: new Date().toISOString()
            }
        });
    }

    async searchMemoryConflictResolutions({ strategy, size = ELASTICSEARCH.maxSearchSize } = {}) {
        const query = strategy ? { term: { strategy } } : { match_all: {} };
        const result = await this.client.search({
            index: this.memoryConflictResolutionIndex,
            size: Math.min(size, ELASTICSEARCH.maxSearchSize),
            query
        });
        return result.hits.hits.map(hit => ({ id: hit._id, ...hit._source }));
    }

    /**
     * Store a novel event detection record.
     */
    async storeNovelEvent(eventData) {
        return await this.client.index({
            index: this.novelEventMemoryIndex,
            document: {
                ...eventData,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Store recommendation audit.
     */
    async storeRecommendationAudit(auditData) {
        return await this.client.index({
            index: this.recommendationMemoryIndex,
            document: {
                ...auditData,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Migrates older outcomes to ensure they have both timestamp and updatedAt.
     */
    async migrateOutcomes() {
        try {
            await this.client.updateByQuery({
                index: this.outcomesIndex,
                body: {
                    script: {
                        source: `
                            if (ctx._source.timestamp == null && ctx._source.updatedAt != null) {
                                ctx._source.timestamp = ctx._source.updatedAt;
                            } else if (ctx._source.updatedAt == null && ctx._source.timestamp != null) {
                                ctx._source.updatedAt = ctx._source.timestamp;
                            } else if (ctx._source.timestamp == null && ctx._source.updatedAt == null) {
                                def now = new Date().toInstant().toString();
                                ctx._source.timestamp = now;
                                ctx._source.updatedAt = now;
                            }
                        `,
                        lang: 'painless'
                    },
                    query: {
                        bool: {
                            minimum_should_match: 1,
                            should: [
                                { bool: { must_not: { exists: { field: "timestamp" } } } },
                                { bool: { must_not: { exists: { field: "updatedAt" } } } }
                            ]
                        }
                    }
                }
            });
            console.log("Outcome schema migration completed.");
        } catch (error) {
            console.error("Failed to migrate outcomes:", error.message);
        }
    }
}
