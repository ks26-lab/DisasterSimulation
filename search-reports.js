import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ELASTIC_URL,
  auth: {
    apiKey: process.env.ELASTIC_API_KEY
  }
});

async function searchReports() {
  const result = await client.search({
    index: 'disaster-reports',
    query: {
      match_all: {}
    }
  });

  console.log(JSON.stringify(result.hits.hits, null, 2));
}

searchReports();