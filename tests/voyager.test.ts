import test from "node:test";
import assert from "node:assert/strict";
import { getVoyagerEstimate, voyagerModelPeriod } from "../src/lib/voyager";

// Independent NASA/JPL Horizons response, queried 2026-10-23 Asia/Shanghai.
// Target -31, Earth body centre 500@399, UTC input, VECTORS,
// VEC_CORR=NONE, VEC_TABLE=6, KM-S. Full query/provenance: licenses/voyager.md.
// These two checkpoints do not establish an accuracy bound for the full window.
const horizonsSamples = [
  { utc: "2026-01-01T00:00:00Z", distanceKm: 2.543071271417156e10, lightTimeSeconds: 8.482772676746777e4 },
  { utc: "2026-10-23T00:00:00Z", distanceKm: 2.583296919349596e10, lightTimeSeconds: 8.616950995310217e4 },
];

test("offline estimate agrees with two independently queried Horizons geometric ranges", () => {
  for (const sample of horizonsSamples) {
    const result = getVoyagerEstimate(Date.parse(sample.utc));
    assert.ok(result, sample.utc);
    assert.ok(Math.abs(result.distanceKm - sample.distanceKm) < 12000, `geometric range at ${sample.utc}`);
    assert.ok(Math.abs(result.lightTimeSeconds - sample.lightTimeSeconds) < .05, `one-way light time at ${sample.utc}`);
  }
});

test("the unchanged fit preserves reference checkpoints and deterministic output", () => {
  const current = getVoyagerEstimate(Date.parse("2026-10-23T00:00:00Z"));
  const later = getVoyagerEstimate(Date.parse("2030-01-01T00:00:00Z"));
  assert.ok(current && later);
  assert.ok(Math.abs(current.distanceKm - 25832962579.183224) < .01);
  assert.ok(Math.abs(later.distanceKm - 27561334353.555134) < .01);
  assert.deepEqual(current, getVoyagerEstimate(Date.parse("2026-10-23T00:00:00Z")));
});

test("AU and light time are consistent with the returned geometric kilometre range", () => {
  for (const sample of horizonsSamples) {
    const result = getVoyagerEstimate(Date.parse(sample.utc));
    assert.ok(result);
    assert.ok(Math.abs(result.astronomicalUnits * 149597870.7 - result.distanceKm) < .00001);
    assert.ok(Math.abs(result.lightTimeSeconds * 299792.458 - result.distanceKm) < .00001);
    assert.ok(result.distanceKm > 0 && result.astronomicalUnits > 0 && result.lightTimeSeconds > 0);
  }
});

test("the fit includes its TDB endpoints and refuses to extrapolate even one millisecond", () => {
  // The original approximation adds 69.184s to UTC. Convert its TDB JD endpoints
  // back to UTC Unix milliseconds; do not confuse them with UTC midnight.
  const start = (voyagerModelPeriod.startTdbJulianDate - 2440587.5) * 86400000 - 69184;
  const end = (voyagerModelPeriod.endTdbJulianDate - 2440587.5) * 86400000 - 69184;
  assert.equal(new Date(start).toISOString(), "2025-12-31T23:58:50.816Z");
  assert.equal(new Date(end).toISOString(), "2099-12-31T23:58:50.816Z");
  assert.ok(getVoyagerEstimate(start));
  assert.ok(getVoyagerEstimate(start + 1));
  assert.ok(getVoyagerEstimate(end - 1));
  assert.ok(getVoyagerEstimate(end));
  assert.equal(getVoyagerEstimate(start - 1), null);
  assert.equal(getVoyagerEstimate(end + 1), null);
});

test("invalid clocks and dates outside the fit produce no misleading distance", () => {
  for (const value of [NaN, Infinity, -Infinity, Number.MAX_VALUE, -Number.MAX_VALUE, 0, Date.parse("1977-09-05T00:00:00Z"), Date.parse("2100-01-01T00:00:00Z")]) {
    assert.equal(getVoyagerEstimate(value), null, String(value));
  }
});

