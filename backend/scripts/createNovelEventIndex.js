import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH } from '../config/index.js';

const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_API_KEY,
    },
});

async function createNovelEventIndex() {
    const indexName = ELASTICSEARCH.novelEventMemoryIndex || 'novel-event-memory';
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
                    eventType: { type: 'keyword' },
                    noveltyScore: { type: 'float' },
                    reason: { type: 'text' },
                    confidencePenalty: { type: 'float' },
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

createNovelEventIndex();
