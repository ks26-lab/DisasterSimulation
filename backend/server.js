import 'dotenv/config';
console.log(
    'GEMINI_API_KEY:',
    process.env.GEMINI_API_KEY
        ? 'FOUND'
        : 'MISSING'
);
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import disasterRoutes from './routes/disasterRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import { SERVER } from './config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../dist')));

app.get('/health', (_req, res) => {
    res.json({
        success: true,
        service: 'disaster-response-agent-backend',
        timestamp: new Date().toISOString(),
    });
});

app.use('/', disasterRoutes);
app.use('/debug', debugRoutes);

app.get('/', (_req, res) => {
    res.json({
        success: true,
        service: 'disaster-response-agent-backend'
    });
});

app.use((err, _req, res, _next) => {
    console.error('[unhandled-error]', err);
    res.status(500).json({
        success: false,
        error: err.message ?? 'Internal server error',
    });
});

app.listen(SERVER.port, () => {
    console.log(`Disaster response backend running on port ${SERVER.port}`);
});
