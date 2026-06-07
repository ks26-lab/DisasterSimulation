import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';

const client = new Client({
    node: process.env.ELASTIC_URL,
    auth: {
        apiKey: process.env.ELASTIC_API_KEY
    }
});

export class ElasticSearchService {

    async store(report) {

        return await client.index({
            index: 'disaster-reports',
            document: report
        });
    }

    async getAll() {

        const result = await client.search({
            index: 'disaster-reports',
            query: {
                match_all: {}
            }
        });

        return result.hits.hits;
    }

    async search(searchReport) {

        const result = await client.search({
            index: 'disaster-reports',
            size: 10,
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                "disaster.type":
                                    searchReport.searchFeatures.disasterType
                            }
                        },
                        {
                            match: {
                                "disaster.severity":
                                    searchReport.searchFeatures.severity
                            }
                        }
                    ]
                }
            }
        });

        return result.hits.hits;
    }
}