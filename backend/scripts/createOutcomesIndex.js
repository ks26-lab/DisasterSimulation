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
 * Create the disaster-outcomes index for plan and outcome memory storage.
 */
async function createOutcomesIndex() {
    const indexName = ELASTICSEARCH.outcomesIndex;

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
                    outcome: {
                        properties: {
                            casualties: { type: 'integer' },
                            injuries: { type: 'integer' },
                            peopleEvacuated: { type: 'integer' },
                            economicLossUSD: { type: 'float' },
                        },
                    },
                    effectiveness: { type: 'float' },
                    lessonsLearned: { type: 'keyword' },
                    timestamp: { type: 'date' },
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

createOutcomesIndex();
