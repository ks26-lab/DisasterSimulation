export function calculateSimilarity(
  currentDisaster,
  historicalDisaster
) {

  let score = 0;

  // Severity similarity

  if (
    currentDisaster.severity ===
    historicalDisaster.severity
  ) {

    score += 30;
  }

  // Infrastructure similarity

  if (
    currentDisaster.hospitalStatus ===
    historicalDisaster.hospitalStatus
  ) {

    score += 30;
  }

  // Cascading similarity

  if (
    currentDisaster.hasTrafficCollapse ===
    historicalDisaster.hasTrafficCollapse
  ) {

    score += 40;
  }

  return score;
}