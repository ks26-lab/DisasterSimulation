import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH } from '../config/index.js';

const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_API_KEY,
    },
});

async function createRecommendationIndex() {
    const indexName = ELASTICSEARCH.recommendationMemoryIndex || 'recommendation-memory';
    try {
        const exists = await client.indices.exists({ index: indexName });
        if (exists) {
            console.log(`Index "${indexName}" already exists. Skipping creation.`);
            return;
        }
        await client.indices.create({
            index: indexName,
            mappings: {
                properties: {
                    eventId: { type: 'keyword' },
                    event: { type: 'object', enabled: false },
                    recommendation: { type: 'object', enabled: false },
                    confidence: { type: 'float' },
                    supportingEvidence: { type: 'keyword' },
                    contradictingEvidence: { type: 'keyword' },
                    dependencyChains: { type: 'object', enabled: false },
                    knowledgeGaps: { type: 'object', enabled: false },
                    timestamp: { type: 'date' },
                },
            },
        });
        console.log(`Index "${indexName}" created successfully.`);
    } catch (error) {
        console.error(`Failed to create index "${indexName}":`, error);
        process.exit(1);
    }
}

createRecommendationIndex();
