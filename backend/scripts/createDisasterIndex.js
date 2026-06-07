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
 * Create the disaster-reports index with explicit field mappings.
 */
async function createDisasterIndex() {
    const indexName = ELASTICSEARCH.reportsIndex;

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
                    timestamp: { type: 'date' },
                    metadata: {
                        properties: {
                            reportType: { type: 'keyword' },
                            reportVersion: { type: 'keyword' },
                            generatedBy: { type: 'keyword' },
                            timestamp: { type: 'date' },
                            eventId: { type: 'keyword' },
                        },
                    },
                    location: {
                        properties: {
                            latitude: { type: 'float' },
                            longitude: { type: 'float' },
                            region: { type: 'keyword' },
                            state: { type: 'keyword' },
                            country: { type: 'keyword' },
                            district: { type: 'keyword' },
                        },
                    },
                    disaster: {
                        properties: {
                            type: { type: 'keyword' },
                            subType: { type: 'keyword' },
                            status: { type: 'keyword' },
                            severity: { type: 'keyword' },
                        },
                    },
                    environment: {
                        properties: {
                            waterLevel: { type: 'float' },
                            rainfall: { type: 'float' },
                            riverFlow: { type: 'float' },
                            trend: { type: 'keyword' },
                            recoveryActive: { type: 'boolean' },
                        },
                    },
                    population: {
                        properties: {
                            affectedPopulation: { type: 'integer' },
                            criticalPopulation: { type: 'integer' },
                        },
                    },
                    infrastructure: {
                        properties: {
                            hospitalFlooded: { type: 'boolean' },
                            schoolFlooded: { type: 'boolean' },
                            bridgeFlooded: { type: 'boolean' },
                            roadsAffected: { type: 'integer' },
                            bridgesAffected: { type: 'integer' },
                            hospitalsAffected: { type: 'integer' },
                        },
                    },
                    observation: {
                        properties: {
                            riskLevel: { type: 'keyword' },
                            summary: { type: 'text' },
                            events: { type: 'object', enabled: false },
                        },
                    },
                    outcome: {
                        properties: {
                            effectiveness: { type: 'float' },
                            successfulStrategies: { type: 'keyword' },
                        },
                    },
                    disasterFingerprint: { type: 'object', enabled: true },
                    severityMetrics: { type: 'object', enabled: true },
                    historicalSearchRequest: { type: 'object', enabled: true },
                    searchFeatures: { type: 'object', enabled: true },
                    reportStatus: { type: 'object', enabled: true },
                    searchPriorities: { type: 'object', enabled: true },
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

createDisasterIndex();
