/**
 * Voyager 1 distance estimate adapted from Fomalhaut's offline Horizons fit.
 * Copyright 2023–2026 Fomalhaut. Licensed under Apache-2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Source revision: 67c53510a426bdc932564998f8b331fde8b1aef5.
 * Local changes: typed module, UTC input validation, explicit model-period guard,
 * numeric result fields and no DOM, timer, global declarations or network calls.
 * Full license and provenance: licenses/voyager-Apache-2.0.txt, licenses/voyager.md.
 * The distributed public license is also served at /licenses/voyager-Apache-2.0.txt.
 */

export type VoyagerEstimate = {
  distanceKm: number;
  astronomicalUnits: number;
  lightTimeSeconds: number;
};

export const voyagerSourceUrl = "https://github.com/fomalhaut1998/hexo-theme-fomalhaut/blob/67c53510a426bdc932564998f8b331fde8b1aef5/source/js/data/voyager1.js";
export const voyagerReferenceUrl = "https://ssd-api.jpl.nasa.gov/doc/horizons.html";
export const voyagerModelPeriod = Object.freeze({
  startTdbJulianDate: 2461041.5,
  endTdbJulianDate: 2488069.5,
});

const astronomicalUnitKm = 149597870.7;
const lightSpeedKmPerSecond = 299792.458;
const annualFrequency = 0.0172021241615;
const lunarFrequency = 0.229970830734;
// Fixed TT−UTC approximation used by the original fit, not a future leap-second
// prediction or a complete UTC→TDB time-scale transformation.
const approximateTdbOffsetSeconds = 69.184;

const voyagerCoefficients: readonly (readonly number[])[] = [
  [
    -4768757493, -175871.2482, 4821326.396, -978962.8128, -80685.04577, -268239.9111,
    -86925.84294, 113174.3989, -21383.06883, -224592.0731, 206983.561, 18501.66248,
    201780.3116, 158474.5328, -121523.9368, 50640.92862, -233524.3311, -212173.1095,
    301935.6221, 161926.8843, -175593.3123, -75123.43832, 67205.51374, 29389.93531,
    -18596.1336, -3803.171036, 3270.43796, -3454.673872, -519.9949615, -3106.312164,
    732.8030526, 5443.011931, -436.3019924, 294.2367872, -430.748044, -5855.072952,
    1076.079218, 6860.613614, -774.6519996, -5046.66298, 383.5207337, 2712.367012,
    -175.0636739, -961.8432467, 209.5858093, 353.2989598, -0.3255422246,
  ],
  [
    -20171982620, -1167129.03, 20427839.8, -3061772.99, 573981.6089, -257077.1133,
    -163819.4301, -171900.7796, 164205.0762, -223489.9462, -172268.1129, -64.37099291,
    -123053.6407, 244798.8559, 80101.71003, 72601.05736, 161410.1566, -308754.3962,
    -203678.9582, 245895.4859, 113818.7744, -113227.1949, -48225.65984, 36922.72707,
    14802.93231, -8369.670079, 2457.409344, 1131.912079, -688.3394903, -567.4885228,
    -5512.706901, 710.0107395, 3142.741178, -23.33064079, 3583.954183, -846.5404228,
    -6875.043327, 1022.034382, 6145.693748, -539.5682657, -3843.861465, 256.8369095,
    1725.444578, -184.5357823, -517.3078354, 128.1139616, 234.4700754,
  ],
  [
    14593777600, 843597.5666, -13579296.61, 2198579.608, -371633.6873, 78620.41746,
    -7640.660754, -4314.945216, -2425.934473, 7851.280672, -3520.631792, -751.6491278,
    -4088.785016, -4399.570535, 2429.983355, -1550.978833, 4518.361142, 6082.097978,
    -5888.17556, -4663.158904, 3443.454398, 2159.246605, -1299.558358, -815.3446172,
    352.3917414, 120.399035, -83.89904484, 70.88811846, 13.4808119, 70.63415421,
    6.31009794, -126.4099165, -3.872225444, -8.282701359, -5.796503491, 132.7410212,
    4.479940174, -159.1012817, -8.500532673, 113.945462, 7.471605583, -62.3427886,
    -3.144574508, 22.01237845, -2.300870407, -8.389838768, -0.7317303606,
  ],
];

const earthCoefficients: readonly (readonly number[])[] = [
  [
    850798.5341, 7013.540642, -26748303.17, -147161213.2, -411.4552311, 138.9969322,
    -162063.1113, -1236890.236, 2853.557807, 961.9591217, -1251.06874, -15530.08073,
    102.7280357, 91.49637108, -1.543181594, -209.0107966, 30.15310549, 43.13705254,
    -1773.629859, 4297.587551, -0.8569159104, -15.11551203, -4.114987006, 5.705981831,
    0.209833935, 17.05494584,
  ],
  [
    -3645311.867, 5438.545308, 147171304.6, -26745476.18, -15.39180188, -426.5800855,
    1236973.811, -162031.9921, -885.139787, 2814.504401, 15553.01737, -1246.640742,
    -44.9159859, 63.97974574, 236.7962295, -2.847192125, -12.08265895, -11.69709169,
    -4301.654282, -1771.980451, -3.043641565, -2.873414013, 3.779877028, -4.6363277,
    -3.860659656, 2.821798125,
  ],
  [
    508.7263286, 299.7538958, -20706.41039, 5800.164329, -12126.25862, 3429.434806,
    -175.512183, 39.73719376, -99.8413748, 25.44605569, -2.43827917, 1.018689138,
    0.3425549553, 1.566855892, 0.02874224449, 0.7628786074, 1.468460994, 0.5949455382,
    -2.51269059, 1.568845494, -2.017080268, -96.63152037, -0.3523320747, -0.7469393158,
    -0.05645796964, 1.820241446,
  ],
];

/**
 * Input: UTC Unix milliseconds. Output: estimated simultaneous geometric
 * Earth-centre distance, AU, and distance/c. This is not live telemetry.
 * Only evaluate inside the fit's 2026-01-01–2100-01-01 TDB window.
 */
export function getVoyagerEstimate(ms: number): VoyagerEstimate | null {
  if (!Number.isFinite(ms)) return null;
  const julianTdb = ms / 86400000 + 2440587.5 + approximateTdbOffsetSeconds / 86400;
  if (julianTdb < voyagerModelPeriod.startTdbJulianDate || julianTdb > voyagerModelPeriod.endTdbJulianDate) return null;

  const x = 2 * (julianTdb - voyagerModelPeriod.startTdbJulianDate)
    / (voyagerModelPeriod.endTdbJulianDate - voyagerModelPeriod.startTdbJulianDate) - 1;
  const chebyshev = [1, x];
  for (let k = 2; k <= 46; k++) chebyshev[k] = 2 * x * chebyshev[k - 1] - chebyshev[k - 2];

  const days = julianTdb - voyagerModelPeriod.startTdbJulianDate;
  const annualPhase = annualFrequency * days;
  const lunarPhase = lunarFrequency * days;
  const earthBasis = [chebyshev[0], chebyshev[1]];
  for (let harmonic = 1; harmonic <= 4; harmonic++) {
    const cosine = Math.cos(harmonic * annualPhase), sine = Math.sin(harmonic * annualPhase);
    earthBasis.push(chebyshev[0] * cosine, chebyshev[0] * sine, chebyshev[1] * cosine, chebyshev[1] * sine);
  }
  for (let harmonic = 1; harmonic <= 2; harmonic++) {
    const cosine = Math.cos(harmonic * lunarPhase), sine = Math.sin(harmonic * lunarPhase);
    earthBasis.push(chebyshev[0] * cosine, chebyshev[0] * sine, chebyshev[1] * cosine, chebyshev[1] * sine);
  }

  let squaredDistance = 0;
  for (let axis = 0; axis < 3; axis++) {
    let probe = voyagerCoefficients[axis][0] + voyagerCoefficients[axis][1] * days;
    let earth = 0;
    for (let k = 2; k < 47; k++) probe += voyagerCoefficients[axis][k] * chebyshev[k];
    for (let k = 0; k < 26; k++) earth += earthCoefficients[axis][k] * earthBasis[k];
    squaredDistance += (probe - earth) ** 2;
  }
  const distanceKm = Math.sqrt(squaredDistance);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  return {
    distanceKm,
    astronomicalUnits: distanceKm / astronomicalUnitKm,
    lightTimeSeconds: distanceKm / lightSpeedKmPerSecond,
  };
}

