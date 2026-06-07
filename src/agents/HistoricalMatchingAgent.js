import {
  calculateSimilarity
}
from "../memory/similarityEngine.js";

export class HistoricalMatchingAgent {

  findMatches(
    currentDisaster,
    historicalRecords
  ) {

    const matches =
      historicalRecords.map(
        record => {

          const similarityScore =
            calculateSimilarity(
              currentDisaster,
              record
            );

          return {

            disaster:
              record,

            similarityScore
          };
        }
      );

    matches.sort(
      (a, b) =>
        b.similarityScore -
        a.similarityScore
    );

    return matches;
  }
}