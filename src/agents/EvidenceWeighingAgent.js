export class EvidenceWeighingAgent {

  analyze(historicalMatches) {

    const analyzedMatches =
      historicalMatches.map(
        match => {

          let confidence = 50;

          // Higher similarity
          // increases confidence

          confidence +=
            match.similarityScore;

          // Contradiction penalty

          if (
            match.disaster
              .hasContradiction
          ) {

            confidence -= 30;
          }

          // Clamp confidence

          confidence =
            Math.max(
              0,
              Math.min(
                confidence,
                100
              )
            );

          return {

            disasterId:
              match.disaster.id,

            similarityScore:
              match.similarityScore,

            confidence,

            hasContradiction:
              match.disaster
                .hasContradiction
          };
        }
      );

    return {

      weightedEvidence:
        analyzedMatches
    };
  }
}