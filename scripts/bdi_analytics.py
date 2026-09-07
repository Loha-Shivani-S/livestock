"""
HerdSentinel — Biological Predictive Analytics Engine (SIH Problem Statement Deliverable #2)
---------------------------------------------------------------------------------------------
Mathematical algorithms for pre-clinical livestock disease detection:
1. Cardio-Kinetic Discrepancy (CKD) via Vectorial Dynamic Body Acceleration (VeDBA).
2. Poincaré Postural Dynamics (SD1/SD2 phase-space analysis of rumination & lying bouts).
3. Temperature-Humidity Index (THI) adjustment from Open-Meteo data.
4. Unified Biological Degradation Index (BDI: 0.00 to 1.00) with risk triage.
"""

import math
from typing import Dict, List, Optional, Tuple

try:
    import numpy as np
except ImportError:
    np = None


class BiologicalAnalyticsEngine:
    # Baseline physiological thresholds for adult dairy cattle (Bos indicus / Bos taurus)
    TEMP_NORMAL = 38.8   # °C
    TEMP_FEVER = 40.0    # °C
    HR_RESTING_NORMAL = 68   # beats per minute
    HR_RESTING_HIGH = 100    # beats per minute
    VEDBA_RESTING = 0.18     # g (Vectorial Dynamic Body Acceleration threshold for rest)
    THI_THRESHOLD = 72.0     # Temperature-Humidity Index baseline

    @staticmethod
    def calculate_vedba(ax: float, ay: float, az: float) -> float:
        """
        Calculates Vectorial Dynamic Body Acceleration:
        VeDBA = sqrt(ax^2 + ay^2 + az^2)
        """
        return math.sqrt(ax**2 + ay**2 + az**2)

    @classmethod
    def cardio_kinetic_discrepancy(cls, heart_rate: float, vedba: float) -> float:
        """
        Cardio-Kinetic Discrepancy (CKD):
        Elevated heart rate while an animal is physically still (low VeDBA)
        indicates systemic pyrexia, endotoxemia, or visceral pain rather than
        exertion from walking or grazing.
        """
        hr_load = max(0.0, min(1.0, (heart_rate - cls.HR_RESTING_NORMAL) / (cls.HR_RESTING_HIGH - cls.HR_RESTING_NORMAL)))
        resting_weight = max(0.0, min(1.0, (cls.VEDBA_RESTING * 2.0 - vedba) / cls.VEDBA_RESTING))
        return hr_load * (0.40 + 0.60 * resting_weight)

    @staticmethod
    def poincare_postural_dynamics(
        lying_bouts_minutes: List[float],
        lateral_asymmetry_ratio: float = 1.0
    ) -> Dict[str, float]:
        """
        Poincaré Postural Dynamics:
        Maps successive resting/lying bout durations (L_n vs L_{n+1}).
        - SD1: Instantaneous bout variability (short-term restlessness).
        - SD2: Continuous circadian lying rhythm (long-term duration).
        - Lateral Asymmetry: Avoidance of lying on one side (early mastitis / unilateral lameness).
        """
        if not lying_bouts_minutes or len(lying_bouts_minutes) < 2:
            asym_penalty = max(0.0, min(1.0, (abs(lateral_asymmetry_ratio - 1.0) - 0.2) / 0.8))
            return {"sd1": 0.1, "sd2": 0.5, "restlessness": round(0.15 + 0.85 * asym_penalty, 3)}

        bouts = lying_bouts_minutes
        diffs = [bouts[i + 1] - bouts[i] for i in range(len(bouts) - 1)]

        mean_diff = sum(diffs) / len(diffs)
        var_diff = sum((d - mean_diff) ** 2 for d in diffs) / len(diffs)
        sd1 = math.sqrt(var_diff / 2.0)

        mean_bout = sum(bouts) / len(bouts)
        var_bout = sum((b - mean_bout) ** 2 for b in bouts) / len(bouts)
        sd2 = math.sqrt(max(0.01, 2.0 * var_bout - 0.5 * var_diff))

        bout_ratio = sd1 / (sd2 if sd2 > 0 else 1.0)
        asymmetry_penalty = max(0.0, min(1.0, (abs(lateral_asymmetry_ratio - 1.0) - 0.2) / 0.8))
        restlessness = max(0.0, min(1.0, 0.65 * min(1.0, bout_ratio) + 0.35 * asymmetry_penalty))

        return {
            "sd1": round(sd1, 2),
            "sd2": round(sd2, 2),
            "restlessness": round(restlessness, 3),
        }

    @classmethod
    def compute_bdi(
        cls,
        temp_c: float,
        heart_rate: float,
        ax: float,
        ay: float,
        az: float,
        thi: Optional[float] = None,
        lying_bouts: Optional[List[float]] = None,
        lateral_asymmetry: float = 1.0,
    ) -> Dict[str, any]:
        """
        Unified Biological Degradation Index (BDI):
        Outputs a normalized score from 0.00 to 1.00 categorized into:
        - Low Risk (< 0.40)
        - Medium Risk (0.40 - 0.69)
        - Critical / High Risk (>= 0.70) -> Triggers quarantine ring & BVO alert
        """
        vedba = cls.calculate_vedba(ax, ay, az)
        fever = max(0.0, min(1.0, (temp_c - cls.TEMP_NORMAL) / (cls.TEMP_FEVER - cls.TEMP_NORMAL)))
        ckd = cls.cardio_kinetic_discrepancy(heart_rate, vedba)

        bouts = lying_bouts if lying_bouts else [45.0, 48.0, 42.0, 50.0]
        poincare = cls.poincare_postural_dynamics(bouts, lateral_asymmetry)
        postural_restlessness = poincare["restlessness"]

        inactivity = max(0.0, min(1.0, (cls.VEDBA_RESTING - vedba) / cls.VEDBA_RESTING))
        thi_stress = max(0.0, min(1.0, (thi - cls.THI_THRESHOLD) / 12.0)) if thi else 0.0

        # Weighted formula
        bdi_raw = (
            0.40 * fever +
            0.32 * ckd +
            0.13 * postural_restlessness +
            0.10 * inactivity +
            0.05 * thi_stress
        )
        bdi = round(max(0.0, min(1.0, bdi_raw)), 3)

        if bdi >= 0.70:
            band = "critical"
            containment_ring_m = 3000
        elif bdi >= 0.40:
            band = "medium"
            containment_ring_m = 1000
        else:
            band = "low"
            containment_ring_m = 0

        return {
            "bdi": bdi,
            "band": band,
            "containment_ring_m": containment_ring_m,
            "vedba": round(vedba, 3),
            "cardio_kinetic_discrepancy": round(ckd, 3),
            "poincare": poincare,
            "fever_score": round(fever, 3),
            "inactivity_score": round(inactivity, 3),
            "thi_stress": round(thi_stress, 3),
        }


# Demonstration test runs simulating SIH field cases
if __name__ == "__main__":
    print("=" * 70)
    print("HerdSentinel Biological Predictive Analytics Engine — Demonstration")
    print("=" * 70)

    # Case A: Acute FMD Fever & Restless Tachycardia
    print("\n[Case A: Acute Foot-and-Mouth Disease (FMD) Prodrome]")
    case_a = BiologicalAnalyticsEngine.compute_bdi(
        temp_c=40.8,
        heart_rate=114,
        ax=0.04, ay=0.02, az=0.03,  # Resting in stall
        thi=81.2,
        lying_bouts=[12.0, 8.0, 15.0, 7.0],  # Frequent restless shifts
        lateral_asymmetry=1.8,
    )
    print(f"Result: BDI = {case_a['bdi']} | Band = {case_a['band'].upper()} | Quarantine Ring = {case_a['containment_ring_m']} m")
    print(f"VeDBA: {case_a['vedba']} g | Cardio-Kinetic Discrepancy: {case_a['cardio_kinetic_discrepancy']}")
    print(f"Poincaré Dynamics: SD1={case_a['poincare']['sd1']}, SD2={case_a['poincare']['sd2']}, Restlessness={case_a['poincare']['restlessness']}")

    # Case B: Healthy Grazing Animal
    print("\n[Case B: Healthy Baseline Animal]")
    case_b = BiologicalAnalyticsEngine.compute_bdi(
        temp_c=38.6,
        heart_rate=64,
        ax=0.25, ay=0.18, az=0.88,  # Active walking/grazing
        thi=74.0,
        lying_bouts=[48.0, 52.0, 46.0, 50.0],  # Normal circadian sleep
        lateral_asymmetry=1.05,
    )
    print(f"Result: BDI = {case_b['bdi']} | Band = {case_b['band'].upper()} | Quarantine Ring = {case_b['containment_ring_m']} m")

    # Case C: Subclinical Mastitis
    print("\n[Case C: Subclinical Mastitis (Unilateral Udder Pain)]")
    case_c = BiologicalAnalyticsEngine.compute_bdi(
        temp_c=39.5,
        heart_rate=82,
        ax=0.08, ay=0.05, az=0.10,
        thi=76.0,
        lying_bouts=[22.0, 18.0, 25.0, 19.0],
        lateral_asymmetry=2.2,  # Refuses to lie on right infected side
    )
    print(f"Result: BDI = {case_c['bdi']} | Band = {case_c['band'].upper()} | Quarantine Ring = {case_c['containment_ring_m']} m")
    print("=" * 70)
