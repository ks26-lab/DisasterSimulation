import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ElasticSearchService }
from './services/elastic-service.js';

const app = express();

const elasticService =
    new ElasticSearchService();

app.use(cors());
app.use(express.json());

app.post(
    '/store-report',
    async (req, res) => {

        try {

            const result =
                await elasticService.store(
                    req.body
                );

            res.json(result);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);

app.post(
    '/search-disasters',
    async (req, res) => {

        try {

            const result =
                await elasticService.search(
                    req.body
                );

            res.json(result);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    error.message
            });
        }
    }
);

app.listen(
    3000,
    () =>
        console.log(
            'Server running on port 3000'
        )
);