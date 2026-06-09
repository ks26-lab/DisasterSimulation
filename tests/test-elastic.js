import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';

console.log("URL:", process.env.ELASTIC_URL);
console.log(
  "API Key:",
  process.env.ELASTIC_API_KEY ? "Loaded" : "Missing"
);

const client = new Client({
  node: process.env.ELASTIC_URL,
  auth: {
    apiKey: process.env.ELASTIC_API_KEY
  }
});

async function test() {
  try {
    const info = await client.info();

    console.log("✅ Connected successfully!");
    console.log(info);
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

test();