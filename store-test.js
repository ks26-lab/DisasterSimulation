import { ElasticSearchService }
from "./elastic-service.js";

const elasticService =
    new ElasticSearchService();

async function test() {

    const report = {

        metadata: {
            reportType: "OBSERVATION",
            generatedBy: "Test"
        },

        disaster: {
            type: "Flood",
            severity: "HIGH"
        },

        environment: {
            waterLevel: 75
        },

        population: {
            affectedPopulation: 1000
        }
    };

    const result =
        await elasticService.store(
            report
        );

    console.log(
        "Stored:",
        result
    );
}

test();