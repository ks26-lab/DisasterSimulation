import { GeminiService } from './geminiService.js';
import { ElasticSearchService } from './elastic-service.js';

/**
 * Service to detect actionable knowledge gaps when analyzing a disaster.
 */
export class KnowledgeGapDetector {
    /**
     * @param {GeminiService} [geminiService]
     * @param {ElasticSearchService} [elasticService]
     */
    constructor(geminiService = new GeminiService(), elasticService = new ElasticSearchService()) {
        this.geminiService = geminiService;
        this.elasticService = elasticService;
        this.serviceName = 'KnowledgeGapDetector';
    }

    /**
     * Detect gaps for the current event compared to historical matches.
     * @param {object} currentEvent
     * @param {object[]} historicalMatches
     * @returns {Promise<object>}
     */
    async detectGaps(currentEvent, historicalMatches = []) {
        if (!currentEvent) {
            throw new Error('Current event is required for knowledge gap detection.');
        }

        const rawGaps = await this.geminiService.detectKnowledgeGaps(currentEvent, historicalMatches);
        const eventId = currentEvent.metadata?.eventId || currentEvent.eventId;

        const validated = this.validateAndNormalize(rawGaps, eventId);

        // Persist each gap in Elasticsearch
        const storePromises = validated.knowledgeGaps.map((gap) => 
            this.elasticService.storeKnowledgeGap({
                eventId,
                gap: gap.gap,
                severity: gap.severity,
                reason: gap.reason,
                recommendedData: gap.recommendedData,
                metadata: {
                    service: this.serviceName,
                    detectedAt: new Date().toISOString(),
                },
            })
        );

        await Promise.all(storePromises);

        return validated;
    }

    /**
     * Validate and normalize Gemini knowledge gap response.
     * @param {object} rawGaps
     * @param {string} eventId
     * @returns {object}
     */
    validateAndNormalize(rawGaps, eventId) {
        if (!rawGaps || typeof rawGaps !== 'object') {
            throw new Error('Knowledge gap detector received invalid response object.');
        }

        const requiredFields = ['knownPatterns', 'unknownPatterns', 'knowledgeGaps', 'confidence'];
        for (const field of requiredFields) {
            if (!(field in rawGaps)) {
                throw new Error(`Knowledge gap detector response missing required field: ${field}`);
            }
        }

        const gaps = Array.isArray(rawGaps.knowledgeGaps)
            ? rawGaps.knowledgeGaps.map((gap) => ({
                  gap: String(gap.gap || ''),
                  severity: String(gap.severity || 'MEDIUM').toUpperCase(),
                  reason: String(gap.reason || ''),
                  recommendedData: String(gap.recommendedData || ''),
              }))
            : [];

        return {
            eventId,
            knownPatterns: Array.isArray(rawGaps.knownPatterns) ? rawGaps.knownPatterns.map(String) : [],
            unknownPatterns: Array.isArray(rawGaps.unknownPatterns) ? rawGaps.unknownPatterns.map(String) : [],
            knowledgeGaps: gaps,
            confidence: Number(rawGaps.confidence ?? 0.8),
            metadata: {
                service: this.serviceName,
                detectedAt: new Date().toISOString(),
            },
        };
    }
}
