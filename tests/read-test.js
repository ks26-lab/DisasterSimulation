import { ElasticSearchService }
from "./elastic-service.js";

const elasticService =
    new ElasticSearchService();

async function test() {

    const reports =
        await elasticService.getAll();

    console.log(
        JSON.stringify(
            reports,
            null,
            2
        )
    );
}

test();