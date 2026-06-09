import { ElasticSearchService } from './elastic-service.js';
import { ContradictionAnalysisService } from './contradictionAnalysisService.js';
import { EmergingRiskService } from './emergingRiskService.js';
import { ConfidenceAttributionService } from './confidenceAttributionService.js';

export class OperationalIntelligenceService {
    constructor(elasticService) {
        this.elasticService = elasticService || new ElasticSearchService();
        this.contradictionService = new ContradictionAnalysisService(this.elasticService);
        this.emergingRiskService = new EmergingRiskService(this.elasticService);
        this.confidenceAttributionService = new ConfidenceAttributionService();
    }

    async generateIntelligence(event) {
        const disasterType = event.disaster?.type || 'Unknown';
        const severity = event.disaster?.severity || 'Unknown';
        const observations = event.observations || [];

        // 1. Contradictions
        const contradictionData = await this.contradictionService.analyzeContradictions({ disasterType });

        // 2. Emerging Risks
        const emergingRiskData = await this.emergingRiskService.detectEmergingRisks(observations);

        // 3. Multi-Hop Dependency Graph
        const dependencyGraph = await this.buildDependencyGraph(observations, 3);

        // 4. Causal Chains
        const causalChains = await this.buildCausalChains(observations);

        // 5. Novelty Score
        const historicalMatches = await this.elasticService.search({ disasterType, severity });
        let noveltyScore = 0.9;
        if (historicalMatches.length > 0) {
            noveltyScore = Math.max(0, 1.0 - (historicalMatches.length * 0.1));
        }

        let confidencePenalty = 0;
        if (noveltyScore > 0.8) confidencePenalty = 0.25;
        else if (noveltyScore > 0.6) confidencePenalty = 0.15;

        // Store Novel Event
        if (noveltyScore > 0.6) {
            await this.elasticService.storeNovelEvent({
                eventType: disasterType,
                noveltyScore,
                reason: `High novelty compared to historical matches. Found ${historicalMatches.length} similar events.`,
                confidencePenalty
            });
        }

        const strategies = await this.elasticService.searchStrategies({ disasterType }).catch(() => []);
        const strategyConfidence = strategies.length > 0
            ? strategies.reduce((sum, strategy) => sum + Number(strategy.confidenceScore ?? 0.5), 0) / strategies.length
            : 0.5;

        const evidenceReliabilityRecords = await Promise.all(
            observations.map((source) => this.elasticService.getEvidenceReliability(source).catch(() => null))
        );
        const knownReliability = evidenceReliabilityRecords
            .filter(Boolean)
            .map((record) => Number(record.reliabilityScore ?? 0.5));
        const evidenceReliability = knownReliability.length > 0
            ? knownReliability.reduce((sum, score) => sum + score, 0) / knownReliability.length
            : 0.5;

        // Calculate confidence attribution
        const contradictionScore = contradictionData.conflicts?.length > 0 ? 0.8 : 0;
        const attribution = this.confidenceAttributionService.calculateConfidence({
            strategyConfidence,
            evidenceReliability,
            noveltyScore,
            contradictionScore,
            dependencyConfidence: dependencyGraph.estimatedImpactScore || 0.5
        });

        return {
            noveltyScore: Number(noveltyScore.toFixed(2)),
            emergingRiskProbability: emergingRiskData.riskScore || 0.5,
            dependencyChains: dependencyGraph.edges || [],
            knowledgeGaps: [],
            conflicts: contradictionData.conflicts || [],
            causalRelationships: causalChains || [],
            confidencePenalty,
            overallConfidence: attribution.overallConfidence,
            confidenceBreakdown: attribution.confidenceBreakdown,
            strategyMemory: strategies,
            evidenceReliability: evidenceReliabilityRecords.filter(Boolean),
            recommendedActions: emergingRiskData.emergingRisks || []
        };
    }

    async buildDependencyGraph(startingNodes, maxDepth = 3) {
        const graph = { nodes: new Set(), edges: [] };
        let currentLevel = [...startingNodes];
        
        for (let depth = 0; depth < maxDepth; depth++) {
            if (currentLevel.length === 0) break;
            const nextLevel = [];
            
            for (const node of currentLevel) {
                graph.nodes.add(node);
                const dependencies = await this.elasticService.searchDependencies({ source: node });
                for (const dep of dependencies) {
                    graph.edges.push({ source: dep.source, target: dep.target, confidence: dep.confidence });
                    if (!graph.nodes.has(dep.target)) {
                        nextLevel.push(dep.target);
                    }
                }
            }
            currentLevel = nextLevel;
        }

        return {
            cascadeDepth: maxDepth,
            affectedSystems: Array.from(graph.nodes),
            edges: graph.edges,
            estimatedImpactScore: Math.min(graph.nodes.size * 0.1, 1.0)
        };
    }

    async buildCausalChains(observations) {
        const chains = [];
        for (const obs of observations) {
            const causalLinks = await this.elasticService.searchCausalRelationships({ cause: obs });
            chains.push(...causalLinks);
        }
        return chains;
    }
}
