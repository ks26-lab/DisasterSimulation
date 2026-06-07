export const EventSchema = {

  eventId: "",

  timestamp: "",

  eventType: "",

  priority: "",

  sourceAgent: "",

  description: "",

  affectedInfrastructure: [],

  cascadingSource: "",

  operationalImpact: {

    evacuationImpact: 0,

    responseDelay: 0,

    casualtyRisk: 0
  }
};