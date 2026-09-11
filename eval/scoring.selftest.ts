// Runnable check: `node eval/scoring.selftest.ts`
import assert from "node:assert/strict";
import { meanAbsoluteError, pearsonCorrelation } from "./scoring.ts";

// Perfect agreement -> MAE 0, correlation 1
assert.equal(meanAbsoluteError([[5, 5], [7, 7], [3, 3]]), 0);
const perfectCorr = pearsonCorrelation([[1, 1], [2, 2], [3, 3], [4, 4]]);
assert.ok(Math.abs(perfectCorr - 1) < 1e-9, `expected ~1, got ${perfectCorr}`);

// Known offset -> MAE reflects the exact average gap
assert.equal(meanAbsoluteError([[5, 7], [3, 5], [8, 6]]), (2 + 2 + 2) / 3);

// Perfect disagreement (inverse relationship) -> correlation -1
const inverseCorr = pearsonCorrelation([[1, 10], [2, 8], [3, 6], [4, 4]]);
assert.ok(Math.abs(inverseCorr - -1) < 1e-9, `expected ~-1, got ${inverseCorr}`);

// No variance in one side -> correlation undefined (NaN), not a crash or a fake 0
const flatCorr = pearsonCorrelation([[5, 1], [5, 2], [5, 3]]);
assert.ok(Number.isNaN(flatCorr), "correlation with zero variance should be NaN");

// Empty / single-point inputs degrade to NaN rather than throwing
assert.ok(Number.isNaN(meanAbsoluteError([])));
assert.ok(Number.isNaN(pearsonCorrelation([[1, 1]])));

console.log("✓ scoring math checks passed");
