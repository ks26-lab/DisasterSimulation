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
 * Create the causal-memory index.
 */
async function createCausalMemoryIndex() {
    const indexName = ELASTICSEARCH.causalMemoryIndex || 'causal-memory';

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
                    cause: { type: 'keyword' },
                    effect: { type: 'keyword' },
                    observations: { type: 'integer' },
                    confidence: { type: 'float' },
                    contradictions: { type: 'integer' },
                    confidenceHistory: { type: 'float' },
                    trend: { type: 'keyword' },
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

createCausalMemoryIndex();
