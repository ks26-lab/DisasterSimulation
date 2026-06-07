/**
 * Centralized configuration for the disaster-response backend.
 */

export const SERVER = {
    port: Number(process.env.PORT) || 3000,
};

export const ELASTICSEARCH = {
    reportsIndex: process.env.ES_REPORTS_INDEX || 'disaster-reports',
    outcomesIndex: process.env.ES_OUTCOMES_INDEX || 'disaster-outcomes',
    plansIndex: process.env.ES_PLANS_INDEX || 'disaster-plans',
    strategyMemoryIndex: process.env.ES_STRATEGY_MEMORY_INDEX || 'strategy-memory',
    counterfactualMemoryIndex: process.env.ES_COUNTERFACTUAL_INDEX || 'counterfactual-memory',
    dependencyMemoryIndex: process.env.ES_DEPENDENCY_INDEX || 'dependency-memory',
    knowledgeGapMemoryIndex: process.env.ES_KNOWLEDGE_GAP_INDEX || 'knowledge-gap-memory',
    causalMemoryIndex: process.env.ES_CAUSAL_MEMORY_INDEX || 'causal-memory',
    novelEventMemoryIndex: process.env.ES_NOVEL_EVENT_INDEX || 'novel-event-memory',
    recommendationMemoryIndex: process.env.ES_RECOMMENDATION_INDEX || 'recommendation-memory',
    evidenceReliabilityMemoryIndex: process.env.ES_EVIDENCE_RELIABILITY_INDEX || 'evidence-reliability-memory',
    memoryConflictResolutionIndex: process.env.ES_MEMORY_CONFLICT_RESOLUTION_INDEX || 'memory-conflict-resolution',
    decisionLineageMemoryIndex: process.env.ES_DECISION_LINEAGE_INDEX || 'decision-lineage-memory',
    defaultSearchSize: Number(process.env.ES_SEARCH_SIZE) || 10,
    maxSearchSize: Number(process.env.ES_MAX_SEARCH_SIZE) || 50,
};

/**
 * Boost weights for historical disaster similarity scoring.
 * Higher values increase influence on relevance ranking.
 */
export const SEARCH_WEIGHTS = {
    disasterType: Number(process.env.SEARCH_WEIGHT_DISASTER_TYPE) || 3.0,
    severity: Number(process.env.SEARCH_WEIGHT_SEVERITY) || 2.5,
    trend: Number(process.env.SEARCH_WEIGHT_TREND) || 1.5,
    affectedPopulation: Number(process.env.SEARCH_WEIGHT_POPULATION) || 1.0,
    rainfall: Number(process.env.SEARCH_WEIGHT_RAINFALL) || 1.5,
    waterLevel: Number(process.env.SEARCH_WEIGHT_WATER_LEVEL) || 1.5,
    infrastructureDamage: Number(process.env.SEARCH_WEIGHT_INFRASTRUCTURE) || 2.0,
    outcomeEffectiveness: Number(process.env.SEARCH_WEIGHT_EFFECTIVENESS) || 2.0,
    successfulStrategies: Number(process.env.SEARCH_WEIGHT_STRATEGIES) || 2.5,
};

export const GEMINI = {
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
};

export const AGENTS = {
    defaultLookbackYears: Number(process.env.DEFAULT_LOOKBACK_YEARS) || 10,
    defaultMinimumSimilarity: Number(process.env.DEFAULT_MIN_SIMILARITY) || 0.1,
    populationRangeFactor: Number(process.env.POPULATION_RANGE_FACTOR) || 0.5,
};
