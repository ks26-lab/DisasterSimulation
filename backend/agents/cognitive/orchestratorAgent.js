import { randomUUID } from 'node:crypto';
import { ElasticSearchService } from '../../services/elastic-service.js';
import { HistoricalRetrievalAgent } from '../memory/historicalRetrievalAgent.js';
import { PlanningAgent } from './planningAgent.js';
import { LearningAgent } from './learningAgent.js';
import { ReflectionAgent } from './reflectionAgent.js';
import { KnowledgeGapDetector } from '../../services/knowledgeGapDetector.js';
import { DependencyDiscoveryService } from '../../services/dependencyDiscoveryService.js';
import { OperationalIntelligenceService } from '../../services/operationalIntelligenceService.js';

/**
 * Helper utility to pace execution streams and prevent 400/429 concurrency spikes on Gemini Free Tier (5 RPM limit)
 * @param {number} ms 
 * @returns {Promise<void>}
 */
const pace = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Coordinates the full disaster-response agent workflow end to end.
 */
export class OrchestratorAgent {
    /**
     * @param {object} [dependencies]
     * @param {ElasticSearchService} [dependencies.elasticService]
     * @param {HistoricalRetrievalAgent} [dependencies.historicalRetrievalAgent]
     * @param {PlanningAgent} [dependencies.planningAgent]
     * @param {LearningAgent} [dependencies.learningAgent]
     * @param {ReflectionAgent} [dependencies.reflectionAgent]
     * @param {KnowledgeGapDetector} [dependencies.knowledgeGapDetector]
     * @param {DependencyDiscoveryService} [dependencies.dependencyDiscoveryService]
     * @param {OperationalIntelligenceService} [dependencies.operationalIntelligenceService]
     */
    constructor({
        elasticService = new ElasticSearchService(),
        historicalRetrievalAgent = new HistoricalRetrievalAgent(elasticService),
        planningAgent = new PlanningAgent(),
        learningAgent = new LearningAgent(),
        reflectionAgent = new ReflectionAgent(),
        knowledgeGapDetector = new KnowledgeGapDetector(undefined, elasticService),
        dependencyDiscoveryService = new DependencyDiscoveryService(undefined, elasticService),
        operationalIntelligenceService = new OperationalIntelligenceService(elasticService),
    } = {}) {
        this.elasticService = elasticService;
        this.historicalRetrievalAgent = historicalRetrievalAgent;
        this.planningAgent = planningAgent;
        this.learningAgent = learningAgent;
        this.reflectionAgent = reflectionAgent;
        this.knowledgeGapDetector = knowledgeGapDetector;
        this.dependencyDiscoveryService = dependencyDiscoveryService;
        this.operationalIntelligenceService = operationalIntelligenceService;
        this.agentName = 'OrchestratorAgent';
    }

    /**
     * Execute the legacy multi-agent disaster response workflow.
     * @param {object} observationReport
     * @returns {Promise<object>}
     */
    async runWorkflow(observationReport) {
        if (!observationReport || typeof observationReport !== 'object') {
            throw new Error('Observation report is required to run the agent workflow.');
        }

        const eventId = observationReport.metadata?.eventId ?? randomUUID();
        const report = {
            ...observationReport,
            metadata: {
                ...observationReport.metadata,
                eventId,
            },
        };

        const retrievalResult = await this.historicalRetrievalAgent.retrieve(report);
        const historicalMatches = retrievalResult.matches;

        // Give a minor delay before calling the next agent to stagger API usage
        await pace(5000);

        console.log(
    '[Workflow] Running Planning Agent'
);

const generatedPlan =
    await this.planningAgent.generatePlan(
        report,
        historicalMatches
    );

        await this.elasticService.storePlan({
            eventId,
            report,
            historicalMatches,
            learningInsights: null,
            generatedPlan,
            reflection: null,
            createdAt: new Date().toISOString(),
        });

        return {
            eventId,
            report,
            historicalMatches,
            generatedPlan,
            workflow: {
                agent: this.agentName,
                completedAt: new Date().toISOString(),
                steps: [
                    'historical_retrieval',
                    'planning',
                    'plan_storage',
                ],
            },
        };
    }

    /**
     * Execute the full multi-agent disaster response workflow with learning, reflection, and tracing.
     * @param {object} observationReport
     * @returns {Promise<object>}
     */
    async runFullWorkflow(observationReport) {
        if (!observationReport || typeof observationReport !== 'object') {
            throw new Error('Observation report is required to run the agent workflow.');
        }

        const eventId = observationReport.metadata?.eventId ?? randomUUID();
        const report = {
            ...observationReport,
            metadata: {
                ...observationReport.metadata,
                eventId,
            },
        };

        const workflowTrace = {
            eventId,
            workflow: [
                'HistoricalRetrievalAgent',
                'LearningAgent',
                'PlanningAgent',
                'ReflectionAgent',
            ],
            timestamps: {
                retrievalStarted: null,
                retrievalFinished: null,
                learningStarted: null,
                learningFinished: null,
                planningStarted: null,
                planningFinished: null,
                reflectionStarted: null,
                reflectionFinished: null,
            },
        };

        // 1. Historical Retrieval
        workflowTrace.timestamps.retrievalStarted = new Date().toISOString();
        const retrievalResult = await this.historicalRetrievalAgent.retrieve(report);
        workflowTrace.timestamps.retrievalFinished = new Date().toISOString();
        const historicalMatches = retrievalResult.matches || [];

        const retrievalQuality = historicalMatches.length > 0 ? historicalMatches[0].similarity : 0.5;

        const historicalEventIds = historicalMatches
            .map((m) => m.source?.metadata?.eventId)
            .filter(Boolean);

        // Keep local DB and Elastic lookups asynchronous (parallelized)
        const [historicalPlans, historicalOutcomes, strategyMemory] = await Promise.all([
            this.elasticService.getPlansByEventIds(historicalEventIds),
            this.elasticService.getOutcomesByEventIds(historicalEventIds),
            this.elasticService.searchStrategies({ disasterType: report.disaster?.type }).catch(() => []),
        ]);

        // Stagger downstream LLM evaluations to satisfy the 5 requests-per-minute threshold
        await pace(5000);
        const detectedGaps = await this.knowledgeGapDetector.detectGaps(report, historicalMatches).catch(() => null);
        
        await pace(5000);
        const discoveredDependencies = await this.dependencyDiscoveryService.discoverAndStoreDependencies(report, historicalMatches).catch(() => null);
        
        await pace(5000);
        const operationalIntelligence = await this.operationalIntelligenceService.generateIntelligence(report).catch(() => null);

        // 2. Learning Agent
        await pace(5000);
        workflowTrace.timestamps.learningStarted = new Date().toISOString();
       console.log(
    '[Workflow] Running Learning Agent'
);

let rawLearningInsights;

try {
    rawLearningInsights =
        await this.learningAgent.learn(
            historicalMatches.map(
                (m) => m.source
            ),
            historicalPlans,
            historicalOutcomes
        );
} catch (error) {
    console.error(
        '[LearningAgent Failed]',
        error
    );

    rawLearningInsights = {
        successfulStrategies: [],
        failedStrategies: [],
        recommendations: [],
        confidence: 0.1,
        error: error.message
    };
}

        const learningInsights = {
            ...rawLearningInsights,
            detectedGaps,
            discoveredDependencies,
            strategyMemory,
            operationalIntelligence,
        };
        workflowTrace.timestamps.learningFinished = new Date().toISOString();

        // 3. Planning Agent (with learning insights compiled)
        await pace(5000);
        workflowTrace.timestamps.planningStarted = new Date().toISOString();
        let generatedPlan;

try {
    generatedPlan =
        await this.planningAgent.generatePlan(
            report,
            historicalMatches,
            learningInsights
        );
} catch (error) {
    console.error(
        '[PlanningAgent Failed]',
        error
    );

    generatedPlan = {
        summary:
            'Fallback plan generated because Gemini failed.',
        recommendedActions: [],
        priority: 'MEDIUM',
        reasoning: error.message,
        confidence: 0.1,
        metadata: {
            fallback: true,
            generatedAt:
                new Date().toISOString()
        }
    };
}
        workflowTrace.timestamps.planningFinished = new Date().toISOString();

        // 4. Reflection Agent
        await pace(5000);
        workflowTrace.timestamps.reflectionStarted = new Date().toISOString();
        console.log(
    '[Workflow] Running Reflection Agent'
);

let reflection;

try {
    reflection =
        await this.reflectionAgent.reviewPlan(
            report,
            historicalMatches,
            generatedPlan
        );
} catch (error) {
    console.error(
        '[ReflectionAgent Failed]',
        error
    );

    reflection = {
        risks: [],
        weaknesses: [],
        missingActions: [],
        improvements: [],
        approved: false,
        confidence: 0.1,
        error: error.message
    };
}

        // 5. Compute overall confidence metrics
        const lConf = learningInsights.confidence ?? 0.8;
        const pConf = generatedPlan.confidence ?? 0.8;
        const rConf = reflection.confidence ?? 0.8;
        let overallConfidence = Number(
            ((retrievalQuality + lConf + pConf + rConf) / 4).toFixed(4)
        );

        const confidencePenalty = operationalIntelligence?.confidencePenalty ?? 0;
        overallConfidence = Math.max(0, Number((overallConfidence - confidencePenalty).toFixed(4)));

        // 6. Persistence Layers
        await this.elasticService.storePlan({
            eventId,
            report,
            historicalMatches,
            learningInsights,
            generatedPlan,
            reflection,
            workflowTrace,
            overallConfidence,
            createdAt: new Date().toISOString(),
        });

        await this.elasticService.storeRecommendationAudit({
            eventId,
            event: report,
            recommendation: generatedPlan,
            confidence: overallConfidence,
            supportingEvidence: historicalMatches.map(m => m.source?.disaster?.type || 'Historical Match'),
            contradictingEvidence: operationalIntelligence?.conflicts || [],
            dependencyChains: operationalIntelligence?.dependencyChains || [],
            knowledgeGaps: detectedGaps || [],
        });

        // 7. Return Result
        return {
            success: true,
            eventId,
            report,
            historicalMatches,
            learningInsights,
            generatedPlan,
            reflection,
            workflowTrace,
            overallConfidence,
        };
    }
}