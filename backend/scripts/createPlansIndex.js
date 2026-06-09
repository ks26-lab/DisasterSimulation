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
 * Create the disaster-plans index.
 */
async function createPlansIndex() {
    const indexName = ELASTICSEARCH.plansIndex;

    try {
        const exists = await client.indices.exists({ index: indexName });

        if (exists) {
            console.log(`Index "${indexName}" already exists. Skipping creation.`);
            return;
        }

        const response = await client.indices.create({
            index: indexName,
            settings: {
                number_of_shards: 1,
                number_of_replicas: 0,
            },
            mappings: {
                properties: {
                    eventId: { type: 'keyword' },
                    historicalMatches: { type: 'object', enabled: true },
                    learningInsights: {
                        properties: {
                            successfulStrategies: { type: 'keyword' },
                            failedStrategies: { type: 'keyword' },
                            recommendations: { type: 'text' },
                        },
                    },
                    generatedPlan: {
                        properties: {
                            priority: { type: 'keyword' },
                            recommendedActions: { type: 'object', enabled: true },
                        },
                    },
                    reflection: {
                        properties: {
                            approved: { type: 'boolean' },
                            risks: { type: 'keyword' },
                            improvements: { type: 'text' },
                        },
                    },
                    overallConfidence: { type: 'float' },
                    workflowTrace: { type: 'object', enabled: true },
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

createPlansIndex();
