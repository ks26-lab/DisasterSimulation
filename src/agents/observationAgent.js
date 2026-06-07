import { PRIORITIES }
from "../constants/priorities.js";

export class ObservationAgent {

  observe(snapshot) {

    const detectedEvents = [];

    let severity =
      PRIORITIES.INFO;

    // Water level analysis

    if (snapshot.waterLevel > 50) {

      severity =
        PRIORITIES.WARNING;

      detectedEvents.push(
        "RISING_WATER_LEVEL"
      );
    }

    if (snapshot.waterLevel > 80) {

      severity =
        PRIORITIES.CRITICAL;

      detectedEvents.push(
        "CRITICAL_WATER_LEVEL"
      );
    }

    // Infrastructure analysis

    if (
      snapshot.hospitalStatus ===
      "UNSTABLE"
    ) {

      detectedEvents.push(
        "HOSPITAL_INSTABILITY"
      );
    }

    return {

      severityMetrics: {

        overallSeverity:
          severity,

        operationalRisk:
          snapshot.waterLevel
      },

      infrastructureSummary: {

        hospitalStatus:
          snapshot.hospitalStatus
      },

      operationalRisks: {

        floodingRisk:
          snapshot.waterLevel,

        populationRisk:
          snapshot.affectedPopulation
      },

      detectedEvents,

      searchFeatures: {

        disasterType:
          "Flood",

        severity,

        affectedInfrastructure: [

          snapshot.hospitalStatus
        ]
      }
    };
  }
}