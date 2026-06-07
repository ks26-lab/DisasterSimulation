import { EvidenceWeighingAgent }
from "../src/agents/EvidenceWeighingAgent.js";

const agent =
  new EvidenceWeighingAgent();

const historicalMatches = [

  {

    disaster: {

      id: "Flood-2021",

      hasContradiction: false
    },

    similarityScore: 80
  },

  {

    disaster: {

      id: "Flood-2019",

      hasContradiction: true
    },

    similarityScore: 75
  }
];

const results =
  agent.analyze(
    historicalMatches
  );

console.log(
  JSON.stringify(
    results,
    null,
    2
  )
);