import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ELASTIC_URL,
  auth: {
    apiKey: process.env.ELASTIC_API_KEY
  }
});

async function createIndex() {
  try {
    const response = await client.indices.create({
      index: 'disaster-reports'
    });

    console.log('Index created!');
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

createIndex();