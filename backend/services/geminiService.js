import { GoogleGenAI } from '@google/genai';
import { GEMINI } from '../config/index.js';
import path from 'path';
import fs from 'fs';

// ============================================================================
// ENVIRONMENT AUTHENTICATION LAYER (DYNAMIC FOR LOCAL & RENDER PRODUCTION)
// ============================================================================
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
        fs.writeFileSync('/tmp/google-creds.json', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/google-creds.json';
    } catch (err) {
        console.error('[Vertex Setup Error] Failed to write temporary credentials disk file:', err.message);
    }
} else {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('./project-credentials.json');
}

/**
 * Modern Server-side Gemini integration via Vertex AI platform configuration.
 * Avoids both legacy geofencing rules and 2026 SDK deprecation blocks.
 */
export class GeminiService {
    /**
     * @param {string} [gcpProjectId]
     * @param {string} [modelName]
     */
    constructor(gcpProjectId = null, modelName = GEMINI.model) {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error(
                'Authentication setup is incomplete. Ensure project-credentials.json exists locally or GOOGLE_APPLICATION_CREDENTIALS_JSON is configured on Render.'
            );
        }

        // Initialize the modern Unified SDK specifying Vertex AI mode
        this.ai = new GoogleGenAI({
            vertex: true,
            project: gcpProjectId || 'luminous-slice-429713-d9',
            location: 'us-central1'
        });

        this.modelName = modelName || 'gemini-2.5-flash';
    }

    /**
     * Helper to safely execute model generations and parse response content
     * @private
     */
    async _generateAndParse(prompt) {
        // Modern method syntax call structure
        const response = await this.ai.models.generateContent({
            model: this.modelName,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const text = response.text;

        if (!text) {
            throw new Error('Received empty generation contents chunk from Google Gen AI layer.');
        }

        try {
            return JSON.parse(text.trim());
        } catch (error) {
            throw new Error(`Failed to parse tracking execution return as JSON payload: ${error.message}\nRaw response: ${text}`);
        }
    }

    /**
     * Generate a structured disaster response plan from current and historical context.
     * @param {object} currentReport
     * @param {object[]} historicalMatches
     * @param {object|null} [learningInsights]
     * @returns {Promise<object>}
     */
    async generateResponsePlan(currentReport, historicalMatches, learningInsights = null) {
        let learningInsightsSection = '';
        if (learningInsights) {
            learningInsightsSection = `\nLearning insights from historical disasters:\n${JSON.stringify(learningInsights, null, 2)}\n`;
        }

        const prompt = `
You are a disaster response planning agent.

Analyze the current disaster report and relevant historical disasters.
Generate a structured JSON response plan.

Requirements:
- Return ONLY valid JSON
- Do NOT return plain text or markdown
- Base recommendations on current conditions and historical patterns
- Prioritize life safety, infrastructure protection, and population impact
- Recommendations must be transparent: specify what evidence supports each action, what evidence contradicts it, the confidence level, and what information is missing.
- You are allowed and encouraged to express uncertainty when historical evidence is weak. Avoid forcing definitive answers.

Current disaster report:
${JSON.stringify(currentReport, null, 2)}

Historical disaster matches:
${JSON.stringify(historicalMatches, null, 2)}
${learningInsightsSection}
Return JSON with this exact structure:
{
  "summary": "Brief situation summary",
  "recommendedActions": [
    {
      "action": "Specific action to take",
      "priority": "IMMEDIATE | HIGH | MEDIUM | LOW",
      "rationale": "Why this action is needed",
      "supportingEvidence": ["Evidence Item A", "Evidence Item B"],
      "contradictingEvidence": ["Evidence Item C"],
      "confidenceScore": 0.85,
      "knowledgeGaps": ["Specific information missing or uncertain"]
    }
  ],
  "priority": "OVERALL priority level (CRITICAL | HIGH | MEDIUM | LOW)",
  "reasoning": "Detailed reasoning connecting current situation to historical lessons, explaining contradictions and uncertainty",
  "confidence": 0.85
}
`;

        return this._generateAndParse(prompt).catch(error => {
            throw new Error(`Failed to parse Gemini planning response as JSON: ${error.message}`);
        });
    }

    /**
     * Review a proposed response plan for risks, weaknesses, and improvements.
     * @param {object} currentReport
     * @param {object[]} historicalMatches
     * @param {object} generatedPlan
     * @returns {Promise<object>}
     */
    async reviewResponsePlan(currentReport, historicalMatches, generatedPlan) {
        const prompt = `
You are a disaster response review agent.

Review the proposed response plan generated for the current disaster report and historical context.
Identify:
- risks (potential side effects or negative consequences of the proposed actions)
- weaknesses (gaps, technical shortcomings, or operational challenges in the plan)
- missing actions (critical tasks that should be performed but were omitted)
- improvements (concrete ways to strengthen the plan)
- approved (boolean: true if the plan is sound, false if there are critical showstoppers)
- confidence (float between 0.0 and 1.0: your level of confidence in this review assessment)

Current disaster report:
${JSON.stringify(currentReport, null, 2)}

Historical disaster matches:
${JSON.stringify(historicalMatches, null, 2)}

Proposed plan:
${JSON.stringify(generatedPlan, null, 2)}

Return JSON with this exact structure:
{
  "risks": ["risk item 1", "risk item 2"],
  "weaknesses": ["weakness item 1"],
  "missingActions": ["missing action 1"],
  "improvements": ["improvement recommendation 1"],
  "approved": true,
  "confidence": 0.88
}
`;

        return this._generateAndParse(prompt).catch(error => {
            throw new Error(`Failed to parse Gemini reflection response as JSON: ${error.message}`);
        });
    }

    /**
     * Analyze previous outcomes to determine successful, failed, and recommended strategies.
     * @param {object[]} historicalReports
     * @param {object[]} historicalPlans
     * @param {object[]} historicalOutcomes
     * @returns {Promise<object>}
     */
    async generateLearningInsights(historicalReports, historicalPlans, historicalOutcomes) {
        const prompt = `
You are a disaster response learning agent.

Analyze the historical reports, plans, and outcomes from previous response operations.
Determine successful strategies, failed strategies, and key recommendations.
Assess supporting/contradicting evidence and detect knowledge gaps or infrastructure dependencies.

Historical reports:
${JSON.stringify(historicalReports, null, 2)}

Historical plans:
${JSON.stringify(historicalPlans, null, 2)}

Historical outcomes:
${JSON.stringify(historicalOutcomes, null, 2)}

Return JSON with this exact structure:
{
  "successfulStrategies": ["strategy 1"],
  "failedStrategies": ["strategy 2"],
  "recommendations": ["recommendation 1"],
  "supportingEvidence": ["Evidence mapping for successful applications"],
  "contradictingEvidence": ["Evidence mapping for failures"],
  "confidenceScores": {
    "strategy1": 0.85
  },
  "knowledgeGaps": ["gap 1"],
  "dependencyPatterns": ["system-A failure leads to system-B failure"],
  "confidence": 0.85
}
`;

        return this._generateAndParse(prompt).catch(error => {
            throw new Error(`Failed to parse Gemini learning response as JSON: ${error.message}`);
        });
    }

    /**
     * Analyze alternative decisions that could have been taken in hindsight.
     * @param {object} event
     * @param {object} responsePlan
     * @param {object} outcome
     * @returns {Promise<object>}
     */
    async generateCounterfactualAnalysis(event, responsePlan, outcome) {
        const prompt = `
You are a disaster counterfactual analysis agent.

Perform hindsight analysis on what alternative actions could have been taken during a disaster event, their potential impact, and reasoning.
Operational Feasibility Constraints:
- Recommended alternative actions must respect available resources and historical context constraints.
- They must remain operationally realistic and avoid impossible interventions (e.g. evacuating a whole city by helicopter).
- Explicitly reject and outline why unrealistic alternatives are impossible.

Input Event:
${JSON.stringify(event, null, 2)}

Response Plan Generated:
${JSON.stringify(responsePlan, null, 2)}

Outcome Recorded:
${JSON.stringify(outcome, null, 2)}

Return JSON with this exact structure:
{
  "alternativeActions": ["Action A (e.g. Evacuate 4 hours earlier using existing buses)"],
  "estimatedImpact": ["Impact description (e.g. Reduces casualty probability by 15%)"],
  "reasoning": "Detailed justification of why these actions were realistic and what was rejected as unrealistic",
  "confidence": 0.85
}
`;

        return this._generateAndParse(prompt).catch(error => {
            throw new Error(`Failed to parse Gemini counterfactual response as JSON: ${error.message}`);
        });
    }

    /**
     * Detect gaps in historical evidence.
     * @param {object} currentEvent
     * @param {object[]} historicalMatches
     * @returns {Promise<object>}
     */
    async detectKnowledgeGaps(currentEvent, historicalMatches) {
        const prompt = `
You are a disaster knowledge gap detection agent.

Analyze a current event report and a list of similar historical events.
Identify missing patterns, insufficient examples, weak confidence regions, or unseen combinations of events.
For every detected gap, structure it with gap detail, severity, reason, and recommended data to resolve it.

Current Event:
${JSON.stringify(currentEvent, null, 2)}

Historical Matches:
${JSON.stringify(historicalMatches, null, 2)}

Return JSON with this exact structure:
{
  "knownPatterns": ["pattern A"],
  "unknownPatterns": ["pattern B"],
  "knowledgeGaps": [
    {
      "gap": "Description of the gap",
      "severity": "LOW | MEDIUM | HIGH",
      "reason": "Why this gap is critical or how it affects planning",
      "recommendedData": "Actionable description of the data needed to resolve this gap"
    }
  ],
  "confidence": 0.80
}
`;

        return this._generateAndParse(prompt).catch(error => {
            throw new Error(`Failed to parse Gemini knowledge gap response as JSON: ${error.message}`);
        });
    }

    /**
     * Discover relationships between infrastructure systems.
     * @param {object} currentEvent
     * @param {object[]} historicalMatches
     * @param {object[]} historicalTexts
     * @returns {Promise<object>}
     */
    async discoverDependencies(currentEvent, historicalMatches, historicalTexts) {
        const prompt = `
You are a disaster dependency discovery agent.

Analyze infrastructure relationships and risk propagation paths based on current event report, historical matches, and past logs/plans text references.
Extract multi-hop dependency chains (e.g. grid failure leading to signal loss, causing routing delay, leading to hospital overload).

Current Event:
${JSON.stringify(currentEvent, null, 2)}

Historical Matches:
${JSON.stringify(historicalMatches, null, 2)}

Relevant Past Logs/Texts:
${JSON.stringify(historicalTexts, null, 2)}

Return JSON with this exact structure:
{
  "dependencies": [
    {
      "source": "Infrastructure System A",
      "target": "Infrastructure System B",
      "intermediateNodes": ["Node X", "Node Y"],
      "confidence": 0.80,
      "observations": 1
    }
  ],
  "riskChains": ["System A -> Node X -> Node Y -> System B"],
  "confidence": 0.80
}
`;

        return this._generateAndParse(prompt).catch(error => {
            throw new Error(`Failed to parse Gemini dependency response as JSON: ${error.message}`);
        });
    }
}