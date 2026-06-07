import { HistoricalMatchingAgent }
from "../src/agents/HistoricalMatchingAgent.js";

const agent =
  new HistoricalMatchingAgent();

const currentDisaster = {

  severity: "CRITICAL",

  hospitalStatus: "UNSTABLE",

  hasTrafficCollapse: true
};

const historicalRecords = [

  {
    id: "Flood-2019",

    severity: "HIGH",

    hospitalStatus: "STABLE",

    hasTrafficCollapse: true
  },

  {
    id: "Flood-2021",

    severity: "CRITICAL",

    hospitalStatus: "UNSTABLE",

    hasTrafficCollapse: true
  },

  {
    id: "Flood-2024",

    severity: "WARNING",

    hospitalStatus: "STABLE",

    hasTrafficCollapse: false
  }
];

const results =
  agent.findMatches(
    currentDisaster,
    historicalRecords
  );

console.log(
  JSON.stringify(
    results,
    null,
    2
  )
);