import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import disasterRoutes from './routes/disasterRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import { SERVER } from './config/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({
        success: true,
        service: 'disaster-response-agent-backend',
        timestamp: new Date().toISOString(),
    });
});

app.use('/', disasterRoutes);
app.use('/debug', debugRoutes);

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
