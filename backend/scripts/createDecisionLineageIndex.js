import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH } from '../config/index.js';

const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_API_KEY,
    },
});

async function createDecisionLineageIndex() {
    const indexName = ELASTICSEARCH.decisionLineageMemoryIndex || 'decision-lineage-memory';

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
                    event: { type: 'object', enabled: false },
                    strategyUsed: { type: 'keyword' },
                    supportingEvidence: { type: 'keyword' },
                    contradictingEvidence: { type: 'keyword' },
                    outcome: { type: 'object', enabled: false },
                    counterfactuals: { type: 'object', enabled: false },
                    confidenceAtDecision: { type: 'float' },
                    createdAt: { type: 'date' },
                },
            },
        });

        console.log(`Index "${indexName}" created successfully.`);
    } catch (error) {
        console.error(`Failed to create index "${indexName}":`, error);
        process.exit(1);
    }
}

createDecisionLineageIndex();
