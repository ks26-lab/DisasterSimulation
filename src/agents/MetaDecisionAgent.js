import { PRIORITIES }
from "../constants/priorities.js";

export class MetaDecisionAgent {

  generateDecision({

    observationReport,

    cascadingAnalysis,

    evidenceAnalysis
  }) {

    const recommendations = [];

    let urgencyLevel =
      PRIORITIES.INFO;

    // Critical escalation

    if (
      cascadingAnalysis
        .escalationLevel ===
      PRIORITIES.CRITICAL
    ) {

      urgencyLevel =
        PRIORITIES.CRITICAL;

      recommendations.push(
        "Immediate evacuation recommended"
      );
    }

    // Hospital instability

    if (
      observationReport
        .infrastructureSummary
        ?.hospitalStatus ===
      "UNSTABLE"
    ) {

      recommendations.push(
        "Deploy emergency medical support"
      );
    }

    // Evidence confidence

    const highConfidenceEvidence =
      evidenceAnalysis
        .weightedEvidence
        .filter(
          item =>
            item.confidence > 70
        );

    if (
      highConfidenceEvidence.length > 0
    ) {

      recommendations.push(
        "Historical evidence supports intervention"
      );
    }

    return {

      urgencyLevel,

      recommendations,

      supportingEvidence:
        highConfidenceEvidence
    };
  }
}