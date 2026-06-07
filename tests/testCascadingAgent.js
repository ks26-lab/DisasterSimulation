import { CascadingAnalysisAgent }
from "../src/agents/CascadingAnalysisAgent.js";

const agent =
  new CascadingAnalysisAgent();

const observationReport = {

  infrastructureSummary: {

    hospitalStatus:
      "UNSTABLE"
  },

  severityMetrics: {

    operationalRisk: 90
  }
};

const result =
  agent.analyze(
    observationReport
  );

console.log(result);