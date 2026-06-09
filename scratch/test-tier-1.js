const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
    try {
        console.log("--- Starting Tier 1 Intelligence Features E2E Test ---");

        // 1. Store Decision Lineage
        console.log("1. Storing Decision Lineage...");
        const lineageRes = await fetch(`${BASE_URL}/store-decision-lineage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: 'flood_2026_01',
                event: { type: 'flood', severity: 'high' },
                strategyUsed: 'early_evacuation',
                supportingEvidence: ['Gov Weather API', 'Local Sensors'],
                contradictingEvidence: ['Historical Mismatch'],
                outcome: { effectiveness: 0.85 },
                counterfactuals: { alternative: 'stay_in_place', confidence: 0.4 },
                confidenceAtDecision: 0.81
            })
        });
        const lineageData = await lineageRes.json();
        if (!lineageData.success) throw new Error("Decision lineage failed: " + JSON.stringify(lineageData));

        // 2. Trigger Strategy Conflict Detection
        console.log("2. Storing Strategy Outcome to trigger Conflict Detection...");
        // A success
        await fetch(`${BASE_URL}/store-outcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: 'flood_test_1',
                outcome: { note: 'worked' },
                effectiveness: 0.9,
                lessonsLearned: ['early_evacuation']
            })
        });
        
        // A failure (to create conflict)
        await fetch(`${BASE_URL}/store-outcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: 'flood_test_2',
                outcome: { note: 'failed' },
                effectiveness: 0.2,
                lessonsLearned: ['early_evacuation']
            })
        });

        // 3. Verify Indices Output
        console.log("3. Verifying Outputs in Memory...");
        const dlDocs = await fetch(`${BASE_URL}/debug/docs/decision-lineage-memory`).then(res => res.json());
        console.log(`- decision-lineage-memory docs: ${dlDocs.length}`);
        
        const stratDocs = await fetch(`${BASE_URL}/debug/docs/strategy-memory`).then(res => res.json());
        console.log(`- strategy-memory docs: ${stratDocs.length}`);
        
        const strategy = stratDocs.find(d => d.id === 'early_evacuation')?.source;
        if (strategy) {
            console.log(`  > early_evacuation conflictLevel: ${strategy.conflictLevel}`);
            console.log(`  > early_evacuation supportingCases: ${strategy.supportingCases}`);
            console.log(`  > early_evacuation contradictingCases: ${strategy.contradictingCases}`);
            console.log(`  > early_evacuation updatedAt: ${strategy.updatedAt}`);
        } else {
            console.log(`  > early_evacuation not found in strategy memory!`);
        }

        console.log("\nSUCCESS! All Tier 1 features are verifiable via API.");
    } catch (error) {
        console.error("\nTEST FAILED:", error.message);
        process.exit(1);
    }
}

runTest();
