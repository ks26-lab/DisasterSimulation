import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function fetchJson(endpoint, options = {}) {
    options.headers = { ...options.headers, 'Content-Type': 'application/json' };
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const json = await res.json();
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
    }
    return json;
}

async function runTests() {
    console.log('--- Starting Operational Intelligence Workflow E2E Test ---');

    try {
        const eventId = `test-event-${Date.now()}`;
        const mockEvent = {
            metadata: { eventId },
            disaster: { type: 'Earthquake', severity: 'High' },
            observations: ['infrastructure_collapse', 'telecom_failure']
        };

        const mockPlan = {
            generatedPlan: {
                recommendedActions: [{ action: 'Deploy emergency generators', rationale: 'Restore telecom' }]
            }
        };

        const mockOutcome = {
            outcome: { restored: true },
            effectiveness: 0.90,
            lessonsLearned: ['generator_deployment_protocol']
        };

        console.log('1. Storing Disaster Report...');
        await fetchJson('/store-report', {
            method: 'POST',
            body: JSON.stringify(mockEvent)
        });

        console.log('2. Storing Outcome (Triggering Strategy Evolution)...');
        await fetchJson('/store-outcome', {
            method: 'POST',
            body: JSON.stringify({
                eventId,
                ...mockOutcome
            })
        });

        // Small delay to allow elastic search updates if any async handlers trigger
        await new Promise(r => setTimeout(r, 1000));

        console.log('3. Running Counterfactual Analysis...');
        await fetchJson('/run-counterfactual', {
            method: 'POST',
            body: JSON.stringify({
                event: mockEvent,
                responsePlan: mockPlan,
                outcome: mockOutcome
            })
        });

        console.log('4. Running Dependency Discovery...');
        await fetchJson('/discover-dependencies', {
            method: 'POST',
            body: JSON.stringify({
                currentEvent: mockEvent,
                historicalMatches: []
            })
        });

        console.log('5. Running Knowledge Gap Detection...');
        await fetchJson('/detect-gaps', {
            method: 'POST',
            body: JSON.stringify({
                currentEvent: mockEvent,
                historicalMatches: []
            })
        });

        console.log('6. Verifying Intelligence Indices Document Counts...');
        const indicesToVerify = [
            'strategy-memory',
            'counterfactual-memory',
            'dependency-memory',
            'knowledge-gap-memory'
        ];

        for (const index of indicesToVerify) {
            const countRes = await fetchJson(`/debug/count/${index}`);
            console.log(`- ${index}: ${countRes.count} documents`);
            assert(countRes.count > 0, `Index ${index} is empty! Expected count > 0`);
        }

        console.log('\nSUCCESS! All operational intelligence workflows are verifiable via API.');
    } catch (err) {
        console.error('\nTEST FAILED:', err.message || err);
        process.exit(1);
    }
}

runTests();
