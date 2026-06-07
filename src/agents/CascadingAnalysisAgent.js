import { PRIORITIES }
from "../constants/priorities.js";

export class CascadingAnalysisAgent {

  analyze(observationReport) {

    const events = [];

    // Example cascading logic

    if (
      observationReport.infrastructureSummary
      ?.hospitalStatus === "UNSTABLE"
    ) {

      events.push({

        eventType:
          "HOSPITAL_OVERLOAD",

        priority:
          PRIORITIES.HIGH,

        description:
          "Hospital capacity becoming unstable"
      });
    }

    if (
      observationReport.severityMetrics
      ?.operationalRisk > 80
    ) {

      events.push({

        eventType:
          "CRITICAL_OPERATIONAL_RISK",

        priority:
          PRIORITIES.CRITICAL,

        description:
          "Operational risk extremely high"
      });
    }

    return {

      generatedEvents: events,

      escalationLevel:
        this.calculateEscalation(events)
    };
  }

  calculateEscalation(events) {

    const hasCritical =
      events.some(
        event =>
          event.priority ===
          PRIORITIES.CRITICAL
      );

    if (hasCritical) {

      return PRIORITIES.CRITICAL;
    }

    const hasHigh =
      events.some(
        event =>
          event.priority ===
          PRIORITIES.HIGH
      );

    if (hasHigh) {

      return PRIORITIES.HIGH;
    }

    return PRIORITIES.WARNING;
  }
}