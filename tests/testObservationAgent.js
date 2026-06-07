import { ObservationAgent }
from "../src/agents/ObservationAgent.js";

const agent =
  new ObservationAgent();

const snapshot = {

  waterLevel: 85,

  affectedPopulation: 1200,

  hospitalStatus:
    "UNSTABLE"
};

const result =
  agent.observe(snapshot);

console.log(result);