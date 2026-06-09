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
 * Create the strategy-memory index.
 */
async function createStrategyMemoryIndex() {
    const indexName = ELASTICSEARCH.strategyMemoryIndex || 'strategy-memory';

    try {
        const exists = await client.indices.exists({ index: indexName });

        if (exists) {
            console.log(`Index "${indexName}" already exists. Skipping creation.`);
            return;
        }

        const response = await client.indices.create({
            index: indexName,
            mappings: {
                properties: {
                    strategyId: { type: 'keyword' },
                    strategyName: { type: 'keyword' },
                    applicableDisasters: { type: 'keyword' },
                    timesUsed: { type: 'integer' },
                    averageEffectiveness: { type: 'float' },
                    successfulConditions: { type: 'keyword' },
                    failureConditions: { type: 'keyword' },
                    lessonsLearned: { type: 'text' },
                    successCount: { type: 'integer' },
                    failureCount: { type: 'integer' },
                    supportingEvidence: { type: 'keyword' },
                    contradictingEvidence: { type: 'keyword' },
                    confidenceScore: { type: 'float' },
                    confidenceHistory: { type: 'float' },
                    confidenceTrend: { type: 'keyword' },
                },
            },
        });

        console.log(`Index "${indexName}" created successfully.`);
        console.log(response);
    } catch (error) {
        console.error(`Failed to create index "${indexName}":`, error);
        process.exit(1);
    }
}

createStrategyMemoryIndex();
