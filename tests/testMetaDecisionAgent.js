import { MetaDecisionAgent }
from "../src/agents/MetaDecisionAgent.js";

import { PRIORITIES }
from "../src/constants/priorities.js";

const agent =
  new MetaDecisionAgent();

const observationReport = {

  infrastructureSummary: {

    hospitalStatus:
      "UNSTABLE"
  }
};

const cascadingAnalysis = {

  escalationLevel:
    PRIORITIES.CRITICAL
};

const evidenceAnalysis = {

  weightedEvidence: [

    {

      disasterId:
        "Flood-2021",

      confidence: 85
    }
  ]
};

const result =
  agent.generateDecision({

    observationReport,

    cascadingAnalysis,

    evidenceAnalysis
  });

console.log(
  JSON.stringify(
    result,
    null,
    2
  )
);