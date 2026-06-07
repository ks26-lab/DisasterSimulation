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
 * Create the counterfactual-memory index.
 */
async function createCounterfactualMemoryIndex() {
    const indexName = ELASTICSEARCH.counterfactualMemoryIndex || 'counterfactual-memory';

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
                    eventId: { type: 'keyword' },
                    alternativeActions: { type: 'text' },
                    estimatedImpact: { type: 'object', enabled: true },
                    reasoning: { type: 'text' },
                    confidence: { type: 'float' },
                    createdAt: { type: 'date' },
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

createCounterfactualMemoryIndex();
