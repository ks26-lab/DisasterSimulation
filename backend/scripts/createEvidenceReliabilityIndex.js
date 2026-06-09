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
 * Create the evidence-reliability-memory index.
 */
async function createEvidenceReliabilityIndex() {
    const indexName = ELASTICSEARCH.evidenceReliabilityMemoryIndex || 'evidence-reliability-memory';

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
                    source: { type: 'keyword' },
                    reliabilityScore: { type: 'float' },
                    correctPredictions: { type: 'integer' },
                    incorrectPredictions: { type: 'integer' },
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

createEvidenceReliabilityIndex();
