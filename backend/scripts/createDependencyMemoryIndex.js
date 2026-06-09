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
 * Create the dependency-memory index.
 */
async function createDependencyMemoryIndex() {
    const indexName = ELASTICSEARCH.dependencyMemoryIndex || 'dependency-memory';

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
                    target: { type: 'keyword' },
                    intermediateNodes: { type: 'keyword' },
                    confidence: { type: 'float' },
                    observations: { type: 'integer' },
                    confidenceHistory: { type: 'float' },
                    confidenceTrend: { type: 'keyword' },
                    updatedAt: { type: 'date' },
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

createDependencyMemoryIndex();
