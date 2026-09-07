export type RiskBand = "low" | "medium" | "critical";

export type VitalSample = {
  temp_c: number;
  heart_rate: number;
  /** Vectorial Dynamic Body Acceleration, in g. */
  vedba: number;
  /** Temperature-Humidity Index from Open-Meteo weather feed. */
  thi?: number | null;
  /** Recent resting/lying bout durations (minutes) for Poincaré analysis. */
  lying_bouts?: number[] | null;
  /** Ratio of left vs right lateral recumbency (1.0 = balanced, >1.6 = avoidance). */
  lateral_asymmetry?: number | null;
};

/** Species-typical resting references used by the triage rules. */
const REFERENCE = {
  temp: { normal: 38.8, fever: 40.0 },
  heart: { restingNormal: 68, restingHigh: 100 },
  motion: { resting: 0.18 },
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * 1. Cardio-Kinetic Discrepancy (CKD):
 * Evaluates elevated heart rate specifically when the animal is resting (low VeDBA).
 * Tachycardia during rest is a prime indicator of systemic pyrexia, endotoxemia, or acute pain.
 */
export function computeCardioKineticDiscrepancy(heartRate: number, vedba: number): number {
  const hrLoad = clamp01(
    (heartRate - REFERENCE.heart.restingNormal) /
      (REFERENCE.heart.restingHigh - REFERENCE.heart.restingNormal),
  );
  // Weight is 1.0 when resting, decays as physical motion increases
  const restingWeight = clamp01((REFERENCE.motion.resting * 2 - vedba) / REFERENCE.motion.resting);
  return hrLoad * (0.40 + 0.60 * restingWeight);
}

/**
 * 2. Poincaré Postural Dynamics:
 * Analyzes successive lying/resting bout durations (L_n vs L_n+1) to detect:
 * - Restlessness (frequent interrupted lying bouts from discomfort/colic)
 * - Lateral recumbency asymmetry (avoiding lying on an inflamed udder quarter or sore hoof)
 */
export function computePoincarePosturalDynamics(
  bouts: number[] = [],
  lateralAsymmetry = 1.0
): { sd1: number; sd2: number; restlessness: number } {
  if (!bouts || bouts.length < 2) {
    // Baseline normal when insufficient history
    const asymmetryFactor = clamp01((Math.abs(lateralAsymmetry - 1.0) - 0.2) / 0.8);
    return { sd1: 0.1, sd2: 0.5, restlessness: Number((0.15 + 0.85 * asymmetryFactor).toFixed(3)) };
  }

  // Differences between consecutive lying bouts: x_i = L_{i+1} - L_i
  const diffs: number[] = [];
  for (let i = 0; i < bouts.length - 1; i++) {
    const bCurrent = bouts[i];
    const bNext = bouts[i + 1];
    if (typeof bCurrent === "number" && typeof bNext === "number") {
      diffs.push(bNext - bCurrent);
    }
  }

  const meanDiff = diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
  const varDiff = diffs.reduce((a, b) => a + (b - meanDiff) ** 2, 0) / (diffs.length || 1);
  const sd1 = Math.sqrt(varDiff / 2); // Short-term bout variability (restlessness)

  const meanBout = bouts.reduce((a, b) => a + b, 0) / bouts.length;
  const varBout = bouts.reduce((a, b) => a + (b - meanBout) ** 2, 0) / bouts.length;
  const sd2 = Math.sqrt(Math.max(0.01, 2 * varBout - 0.5 * varDiff)); // Long-term continuous rhythm

  // Restlessness ratio: high dispersion relative to mean bout duration
  const boutRatio = sd1 / (sd2 || 1);
  const asymmetryPenalty = clamp01((Math.abs(lateralAsymmetry - 1.0) - 0.2) / 0.8);
  const restlessness = clamp01(0.65 * clamp01(boutRatio) + 0.35 * asymmetryPenalty);

  return {
    sd1: Number(sd1.toFixed(2)),
    sd2: Number(sd2.toFixed(2)),
    restlessness: Number(restlessness.toFixed(3)),
  };
}

/**
 * 3. Unified Biological Degradation Index (BDI):
 * Normalized scale (0.0 to 1.0) synthesized from:
 * - Core pyrexia (drift above normal temp)
 * - Cardio-kinetic discrepancy (HR elevation while at rest)
 * - Poincaré postural dynamics (restlessness & lying asymmetry)
 * - Kinetic inactivity (lethargy / off-feet)
 * - Environmental THI stress (nudges risk, prevents masking)
 */
export function computeBdi(sample: VitalSample): {
  bdi: number;
  band: RiskBand;
  metrics: {
    fever: number;
    cardioKinetic: number;
    posturalRestlessness: number;
    inactivity: number;
    thiStress: number;
  };
} {
  const fever = clamp01(
    (sample.temp_c - REFERENCE.temp.normal) / (REFERENCE.temp.fever - REFERENCE.temp.normal),
  );

  const cardioKinetic = computeCardioKineticDiscrepancy(sample.heart_rate, sample.vedba);

  const poincare = computePoincarePosturalDynamics(
    sample.lying_bouts || [45, 48, 42, 50],
    sample.lateral_asymmetry || 1.0
  );
  const posturalRestlessness = poincare.restlessness;

  const inactivity = clamp01((REFERENCE.motion.resting - sample.vedba) / REFERENCE.motion.resting);

  const thiStress = sample.thi ? clamp01((sample.thi - 72) / 12) : 0;

  // Composite multi-factorial score
  const bdiRaw =
    0.40 * fever +
    0.32 * cardioKinetic +
    0.13 * posturalRestlessness +
    0.10 * inactivity +
    0.05 * thiStress;

  const bdi = Number(clamp01(bdiRaw).toFixed(3));

  return {
    bdi,
    band: bandFor(bdi),
    metrics: {
      fever: Number(fever.toFixed(3)),
      cardioKinetic: Number(cardioKinetic.toFixed(3)),
      posturalRestlessness: Number(posturalRestlessness.toFixed(3)),
      inactivity: Number(inactivity.toFixed(3)),
      thiStress: Number(thiStress.toFixed(3)),
    },
  };
}

export function bandFor(bdi: number): RiskBand {
  if (bdi >= 0.7) return "critical";
  if (bdi >= 0.4) return "medium";
  return "low";
}

export const BAND_STYLES: Record<RiskBand, { dot: string; text: string; chip: string; label: string }> = {
  low: {
    dot: "bg-low",
    text: "text-low",
    chip: "bg-low-soft text-low border-low/25",
    label: "Low",
  },
  medium: {
    dot: "bg-medium",
    text: "text-medium",
    chip: "bg-medium-soft text-medium border-medium/25",
    label: "Medium",
  },
  critical: {
    dot: "bg-critical",
    text: "text-critical",
    chip: "bg-critical-soft text-critical border-critical/25",
    label: "Critical",
  },
};
