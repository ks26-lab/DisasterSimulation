import { Router } from 'express';
import { ElasticSearchService } from '../services/elastic-service.js';
import { GeminiService } from '../services/geminiService.js';

const router = Router();
const elasticService = new ElasticSearchService();

/**
 * Gemini connectivity test
 */
router.get('/gemini-test', async (req, res) => {
    try {
        const gemini = new GeminiService();

        const result =
            await gemini.generateResponsePlan(
                {
                    disaster: {
                        type: 'TEST'
                    }
                },
                []
            );

        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('[gemini-test]', error);

        res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
});
/**
 * Return all Elasticsearch indices.
 */
router.get('/indices', async (req, res) => {
    try {
        const indices = await elasticService.client.cat.indices({
            format: 'json'
        });
        res.json(indices);
    } catch (err) {
        res.status(500).json(err);
    }
});

/**
 * Return document count for a specific index.
 */
router.get('/count/:index', async (req, res) => {
    try {
        const { index } = req.params;
        const countRes = await elasticService.client.count({ index });
        res.json({
            index,
            count: countRes.count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Return the latest 20 documents from the specified index.
 */
router.get('/docs/:index', async (req, res) => {
    try {
        const { index } = req.params;
        const searchRes = await elasticService.client.search({
            index,
            size: 20,
            query: { match_all: {} }
            // Note: Since each index might have a different timestamp field,
            // we omit sorting to keep it generic, or we can sort by _doc
        });
        res.json(searchRes.hits.hits.map(h => ({ id: h._id, source: h._source })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Verify Elasticsearch connectivity and cluster status.
 */
router.get('/health', async (req, res) => {
    try {
        const indices = await elasticService.client.cat.indices({
            format: 'json'
        });

        res.json({
            status: 'connected',
            indices: indices.length
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
});

router.get('/mapping/:index', async (req, res) => {
    const mapping =
        await elasticService.client.indices.getMapping({
            index: req.params.index
        });

    res.json(mapping);
});

export default router;
