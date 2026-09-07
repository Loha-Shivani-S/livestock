#!/usr/bin/env python3
"""
PashuRakshak — Synthetic Spatiotemporal Cluster & Outbreak Simulator
SIH Live Demo Rehearsal Script (Deliverable #4)
---------------------------------------------------------------------
Simulates a real-time livestock disease outbreak progression:
  Phase 1: Subclinical pyrexia in primary index animal (BDI ~ 0.45)
  Phase 2: Secondary herd contact in Dindori village (Cluster signal)
  Phase 3: Acute Foot-and-Mouth (FMD) prodrome (BDI > 0.85)
           -> Triggers 3 km quarantine buffer ring
           -> Auto-dispatches BVO emergency alert
           -> Broadcasts live via SSE to the Command Dashboard
"""

import time
import json
import sys
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

INGEST_URL = "http://localhost:8080/api/public/ingest"

HERD_SIMULATION_STEPS = [
    # STEP 1: Baseline Normal Morning Telemetry
    {
        "step": 1,
        "phase": "Baseline Normalcy",
        "description": "Herds grazing normally at morning pasture.",
        "delay_sec": 3,
        "packets": [
            {
                "node_id": "GW-DINDORI-01",
                "tag_id": "IN-MH-15-C8821",
                "temp": 38.6,
                "heart_rate": 66,
                "ax": 0.22, "ay": 0.15, "az": 0.85,
                "lat": 20.2014, "lon": 73.8341,
                "speed": 0.8,
            },
            {
                "node_id": "GW-DINDORI-01",
                "tag_id": "IN-MH-15-C8822",
                "temp": 38.7,
                "heart_rate": 68,
                "ax": 0.19, "ay": 0.12, "az": 0.88,
                "lat": 20.2032, "lon": 73.8315,
                "speed": 0.6,
            }
        ]
    },
    # STEP 2: Index Case Subclinical Pyrexia
    {
        "step": 2,
        "phase": "Index Subclinical Fever",
        "description": "Index cow IN-MH-15-C8821 develops internal pyrexia; movement slowing down.",
        "delay_sec": 4,
        "packets": [
            {
                "node_id": "GW-DINDORI-01",
                "tag_id": "IN-MH-15-C8821",
                "temp": 39.8,
                "heart_rate": 86,
                "ax": 0.08, "ay": 0.04, "az": 0.12,
                "lat": 20.2014, "lon": 73.8341,
                "speed": 0.2,
            }
        ]
    },
    # STEP 3: Spatiotemporal Cluster — Secondary Animal Infection
    {
        "step": 3,
        "phase": "Spatiotemporal Transmission Cluster",
        "description": "Secondary contact IN-MH-15-C8822 in Dindori stalls exhibits resting tachycardia.",
        "delay_sec": 4,
        "packets": [
            {
                "node_id": "GW-DINDORI-01",
                "tag_id": "IN-MH-15-C8822",
                "temp": 40.3,
                "heart_rate": 98,
                "ax": 0.05, "ay": 0.02, "az": 0.08,
                "lat": 20.2032, "lon": 73.8315,
                "speed": 0.1,
            }
        ]
    },
    # STEP 4: Acute Outbreak Spike (Critical BDI > 0.85)
    {
        "step": 4,
        "phase": "CRITICAL OUTBREAK ESCALATION",
        "description": "Index animal hits 41.2 °C and 118 bpm. BDI crosses 0.70 threshold into Critical.",
        "delay_sec": 5,
        "packets": [
            {
                "node_id": "GW-DINDORI-01",
                "tag_id": "IN-MH-15-C8821",
                "temp": 41.2,
                "heart_rate": 118,
                "ax": 0.03, "ay": 0.01, "az": 0.04,  # recumbent
                "lat": 20.2014, "lon": 73.8341,
                "speed": 0.0,
            }
        ]
    },
    # STEP 5: Third Contact Infected — Ring Quarantine Active
    {
        "step": 5,
        "phase": "3 km Quarantine Ring Buffer Confirmation",
        "description": "Third herd member IN-MH-2031-4471 collapses off-feed. BVO alert dispatched.",
        "delay_sec": 3,
        "packets": [
            {
                "node_id": "GW-DINDORI-01",
                "tag_id": "IN-MH-2031-4471",
                "temp": 40.9,
                "heart_rate": 112,
                "ax": 0.02, "ay": 0.01, "az": 0.05,
                "lat": 20.2018, "lon": 73.8345,
                "speed": 0.0,
            }
        ]
    }
]


def send_packet(packet: dict) -> dict:
    payload = json.dumps(packet).encode("utf-8")
    req = urllib.request.Request(
        INGEST_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-device-key": "PR-SEC-LORA-2026",
            "User-Agent": "PashuRakshak-Simulator/1.0",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.URLError as e:
        return {"error": str(e)}


def run_simulation():
    print("=" * 75)
    print("PashuRakshak — Synthetic Livestock Outbreak Generator")
    print(f"Target Gateway: {INGEST_URL}")
    print("Watch http://localhost:8080/command for live SSE needle updates!")
    print("=" * 75)

    for stage in HERD_SIMULATION_STEPS:
        print(f"\n>> [{stage['step']}/5] {stage['phase']}")
        print(f"  Note: {stage['description']}")

        for pkt in stage["packets"]:
            result = send_packet(pkt)
            bdi = result.get("bdi", "--")
            band = result.get("band", "--")
            print(f"  -> Ingested {pkt['tag_id']}: Temp {pkt['temp']} °C, HR {pkt['heart_rate']} bpm => BDI: {bdi} [{band.upper()}]")

        time.sleep(stage["delay_sec"])

    print("\n" + "=" * 75)
    print("Outbreak simulation cycle complete.")
    print("Check Dashboard: http://localhost:8080/command")
    print("Check BVO Alerts: http://localhost:8080/officers")
    print("Check Lab QR Slip: http://localhost:8080/lab")
    print("=" * 75)


if __name__ == "__main__":
    run_simulation()
