import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ELASTIC_URL,
  auth: {
    apiKey: process.env.ELASTIC_API_KEY
  }
});

async function insertReport() {
  try {
    const response = await client.index({
      index: 'disaster-reports',
      document: {
        reportType: 'OBSERVATION',
        riskLevel: 'MEDIUM',
        waterLevel: 25,
        peopleAffected: 0,
        summary: 'Risk is LOW. 0 people affected.',
        timestamp: new Date().toISOString()
      }
    });

    console.log('Report stored!');
    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

insertReport();