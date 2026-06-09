import { Router } from 'express';
import { ElasticSearchService } from '../services/elastic-service.js';
import { OrchestratorAgent } from '../agents/cognitive/orchestratorAgent.js';
import { CounterfactualAgent } from '../agents/cognitive/counterfactualAgent.js';
import { KnowledgeGapDetector } from '../services/knowledgeGapDetector.js';
import { DependencyDiscoveryService } from '../services/dependencyDiscoveryService.js';
import { OperationalIntelligenceService } from '../services/operationalIntelligenceService.js';

const router = Router();
const elasticService = new ElasticSearchService();
const orchestratorAgent = new OrchestratorAgent({ elasticService });
const counterfactualAgent = new CounterfactualAgent(undefined, elasticService);
const knowledgeGapDetector = new KnowledgeGapDetector(undefined, elasticService);
const dependencyDiscoveryService = new DependencyDiscoveryService(undefined, elasticService);
const operationalIntelligenceService = new OperationalIntelligenceService(elasticService);

/**
 * Store a disaster observation report in Elasticsearch.
 */
router.post('/store-report', async (req, res) => {
    try {
        const result = await elasticService.store(req.body);
        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[store-report]', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * Search historical disasters using a historical analysis payload.
 */
router.post('/search-disasters', async (req, res) => {
    try {
        const result = await elasticService.search(req.body);
        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[search-disasters]', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * Run the full multi-agent disaster response workflow.
 */
router.post('/run-agent', async (req, res) => {
    try {
        const { observationReport } = req.body;

        if (!observationReport) {
            return res.status(400).json({
                success: false,
                error: 'observationReport is required in the request body.',
            });
        }

        const workflowResult = await orchestratorAgent.runWorkflow(observationReport);

        res.json({
            success: true,
            data: {
                eventId: workflowResult.eventId,
                report: workflowResult.report,
                historicalMatches: workflowResult.historicalMatches,
                plan: workflowResult.generatedPlan,
            },
        });
    } catch (error) {
        console.error('[run-agent]', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * Store or update the outcome of a disaster response plan.
 */
router.post('/store-outcome', async (req, res) => {
    try {
        const { eventId, outcome, effectiveness, lessonsLearned } = req.body;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                error: 'eventId is required in the request body.',
            });
        }

        if (outcome === undefined || effectiveness === undefined) {
            return res.status(400).json({
                success: false,
                error: 'outcome and effectiveness are required in the request body.',
            });
        }

        const result = await elasticService.updateOutcome({
            eventId,
            outcome,
            effectiveness,
            lessonsLearned,
        });

        // Dynamically update strategy memory for each strategy in lessonsLearned
        if (lessonsLearned) {
            const strategies = Array.isArray(lessonsLearned)
                ? lessonsLearned
                : [lessonsLearned];
            for (const strat of strategies) {
                if (typeof strat === 'string' && strat.trim() !== '') {
                    await elasticService.updateStrategyEffectiveness({
                        strategyId: strat,
                        effectiveness,
                        lessonsLearned: `Learned from outcome of event ${eventId}`,
                        eventId,
                    }).catch(err => {
                        console.error(`[store-outcome] failed to update strategy ${strat}:`, err.message);
                    });
                }
            }
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[store-outcome]', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * Run counterfactual analysis (hindsight analysis) on disaster outcomes.
 */
router.post('/run-counterfactual', async (req, res) => {
    try {
        const { event, responsePlan, outcome } = req.body;
        if (!event || !responsePlan || !outcome) {
            return res.status(400).json({
                success: false,
                error: 'event, responsePlan, and outcome are all required in request body.'
            });
        }
        const result = await counterfactualAgent.analyze(event, responsePlan, outcome);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[run-counterfactual]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Run knowledge gap detection on current event compared to historical matches.
 */
router.post('/detect-gaps', async (req, res) => {
    try {
        const { currentEvent, historicalMatches } = req.body;
        if (!currentEvent) {
            return res.status(400).json({
                success: false,
                error: 'currentEvent is required in request body.'
            });
        }
        const result = await knowledgeGapDetector.detectGaps(currentEvent, historicalMatches || []);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[detect-gaps]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Run dependency discovery on current event compared to historical data.
 */
router.post('/discover-dependencies', async (req, res) => {
    try {
        const { currentEvent, historicalMatches } = req.body;
        if (!currentEvent) {
            return res.status(400).json({
                success: false,
                error: 'currentEvent is required in request body.'
            });
        }
        const result = await dependencyDiscoveryService.discoverAndStoreDependencies(currentEvent, historicalMatches || []);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[discover-dependencies]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Run the full multi-agent disaster response workflow with learning, planning, and reflection.
 */
router.post('/run-full-workflow', async (req, res) => {
    try {
        const { observationReport } = req.body;

        if (!observationReport) {
            return res.status(400).json({
                success: false,
                error: 'observationReport is required in the request body.',
            });
        }

        const workflowResult = await orchestratorAgent.runFullWorkflow(observationReport);

        res.json({
            success: true,
            data: {
                eventId: workflowResult.eventId,
                report: workflowResult.report,
                historicalMatches: workflowResult.historicalMatches,
                learningInsights: workflowResult.learningInsights,
                generatedPlan: workflowResult.generatedPlan,
                reflection: workflowResult.reflection,
                workflowTrace: workflowResult.workflowTrace,
                overallConfidence: workflowResult.overallConfidence,
            },
        });
    } catch (error) {
        console.error('[run-full-workflow]', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * Retrieve stored disaster response outcomes.
 */
router.get('/outcomes', async (req, res) => {
    try {
        const { eventId, size } = req.query;
        const outcomes = await elasticService.searchOutcomes({
            eventId,
            size: size ? Number(size) : undefined,
        });

        res.json({
            success: true,
            count: outcomes.length,
            data: outcomes,
        });
    } catch (error) {
        console.error('[outcomes]', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * Run Operational Intelligence on a given event.
 */
router.post('/operational-intelligence', async (req, res) => {
    try {
        const { event } = req.body;
        if (!event) {
            return res.status(400).json({ success: false, error: 'event is required in the request body.' });
        }

        const result = await operationalIntelligenceService.generateIntelligence(event);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[operational-intelligence]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Store the full decision lineage chain.
 */
router.post('/store-decision-lineage', async (req, res) => {
    try {
        const { eventId, event, strategyUsed, supportingEvidence, contradictingEvidence, outcome, counterfactuals, confidenceAtDecision } = req.body;
        
        if (!eventId) {
            return res.status(400).json({ success: false, error: 'eventId is required.' });
        }

        const lineageData = {
            eventId,
            event,
            strategyUsed,
            supportingEvidence,
            contradictingEvidence,
            outcome,
            counterfactuals,
            confidenceAtDecision
        };

        const result = await elasticService.storeDecisionLineage(lineageData);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[store-decision-lineage]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
