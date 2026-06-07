import { ElasticSearchService } from './backend/services/elastic-service.js';
import { OperationalIntelligenceService } from './backend/services/operationalIntelligenceService.js';
import { ContradictionAnalysisService } from './backend/services/contradictionAnalysisService.js';

async function runTests() {
    console.log('Testing Operational Intelligence Layer...');
    
    const elasticService = new ElasticSearchService();
    const opsIntelService = new OperationalIntelligenceService(elasticService);
    
    try {
        // 1. Test Causal Memory Storage
        console.log('\n--- Storing Causal Relationship ---');
        await elasticService.storeCausalRelationship({
            cause: 'severe_rainfall',
            effect: 'river_overflow',
            confidence: 0.85
        });
        await elasticService.storeCausalRelationship({
            cause: 'river_overflow',
            effect: 'bridge_collapse',
            confidence: 0.70
        });
        console.log('Stored causal relationships.');

        // 2. Test Evidence Reliability Storage
        console.log('\n--- Storing Evidence Reliability ---');
        await elasticService.updateEvidenceReliability({
            source: 'gov_weather_api',
            isCorrect: true
        });
        const evidence = await elasticService.getEvidenceReliability('gov_weather_api');
        console.log('Gov Weather API Reliability:', evidence);

        // 3. Test Conflict Resolution Storage
        console.log('\n--- Storing Memory Conflict Resolution ---');
        await elasticService.storeMemoryConflictResolution({
            strategy: 'early_evacuation',
            contextualDifferences: 'Urban vs Rural',
            environmentalConditions: 'High density urban zone',
            resolution: 'Early evacuation fails in urban zones due to immediate gridlock.'
        });
        console.log('Stored conflict resolution.');

        // Allow Elastic to refresh
        await new Promise(r => setTimeout(r, 2000));

        // 4. Test Operational Intelligence Generation
        console.log('\n--- Generating Operational Intelligence ---');
        const mockEvent = {
            disaster: { type: 'Flood', severity: 'High' },
            observations: ['severe_rainfall']
        };

        const intel = await opsIntelService.generateIntelligence(mockEvent);
        console.log(JSON.stringify(intel, null, 2));

        console.log('\nALL TESTS PASSED.');
        process.exit(0);

    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
}

runTests();
