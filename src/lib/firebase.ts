import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, type Database } from "firebase/database";
import { useEffect, useState } from "react";

export const firebaseConfig = {
  apiKey: "AIzaSyBjHbSUhcC4W2jUUo5Qoya1z8oUvL4_nUM",
  authDomain: "livestock2-0.firebaseapp.com",
  databaseURL: "https://livestock2-0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "livestock2-0",
  storageBucket: "livestock2-0.firebasestorage.app",
  messagingSenderId: "58734097931",
  appId: "1:58734097931:web:fed2de60e673a6b59f390e",
};

// Singleton initialization for browser & Vite
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db: Database = getDatabase(app);

export interface CowRawPayload {
  bpm?: string | number | null;
  temp?: string | number | null;
  ax?: string | number | null;
  ay?: string | number | null;
  az?: string | number | null;
  lat?: string | number | null;
  lon?: string | number | null;
  status?: string | null;
}

export interface CowTelemetryState {
  bpm: number | null;
  temp: number | null;
  ax: number | null;
  ay: number | null;
  az: number | null;
  lat: number | null;
  lon: number | null;
  status: string;
  vedba: number | null;
  connected: boolean;
  error: string | null;
  lastUpdated: Date | null;
  raw: CowRawPayload | null;
}

function parseNumber(val: any): number | null {
  if (val === undefined || val === null || val === "" || val === "--") return null;
  const num = parseFloat(String(val).trim());
  return isNaN(num) ? null : num;
}

function normalizeAccel(val: any, fallback = 0.05): number {
  const num = parseNumber(val);
  if (num === null) return fallback;
  // If raw MPU6050 16-bit register value (e.g. ±16384 for 1g), convert to g
  if (Math.abs(num) > 10) {
    return Number((num / 16384.0).toFixed(3));
  }
  return Number(num.toFixed(3));
}

/**
 * React Hook: Listen to live ESP8266 telemetry from Firebase Realtime Database (/cow1).
 * Automatically updates state with live BPM, Temp, 3-axis Accelerometer, GPS, and Status.
 */
export function useFirebaseCowTelemetry(enabled: boolean = true) {
  const [telemetry, setTelemetry] = useState<CowTelemetryState>({
    bpm: null,
    temp: null,
    ax: null,
    ay: null,
    az: null,
    lat: null,
    lon: null,
    status: "Standing",
    vedba: null,
    connected: false,
    error: null,
    lastUpdated: null,
    raw: null,
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let isMounted = true;
    const cowRef = ref(db, "cow1");

    const unsubscribe = onValue(
      cowRef,
      (snapshot) => {
        if (!isMounted) return;

        const data: CowRawPayload | null = snapshot.val();
        if (!data || typeof data !== "object") {
          setTelemetry((prev) => ({
            ...prev,
            connected: true,
            error: "Waiting for ESP8266 node data at /cow1...",
          }));
          return;
        }

        // Parse numerical fields with graceful fallbacks
        const bpm = parseNumber(data.bpm);
        const temp = parseNumber(data.temp);
        const ax = normalizeAccel(data.ax, 0.05);
        const ay = normalizeAccel(data.ay, 0.02);
        const az = normalizeAccel(data.az, 0.98);

        // Vector of Dynamic Body Acceleration (VeDBA) in g
        const vedba = Number(Math.sqrt(ax * ax + ay * ay + az * az).toFixed(3));

        // GPS coordinates parsing with comma-split guard
        const rawLatStr = (String(data.lat ?? "").split(",")[0] ?? "").trim();
        const rawLonStr = (String(data.lon ?? "").split(",")[0] ?? "").trim();
        let lat = parseNumber(rawLatStr);
        let lon = parseNumber(rawLonStr);

        // Standardize status (Walking, Standing, Eating, Sleeping)
        let status = String(data.status ?? "").trim();
        if (!status && String(data.lon ?? "").includes("ACT:")) {
          status = String(data.lon ?? "").split("ACT:")[1]?.split(",")[0]?.trim() || "Standing";
        }
        if (!status) {
          if (vedba > 0.35) status = "Walking";
          else if (vedba < 0.08) status = "Sleeping";
          else status = "Standing";
        }

        setTelemetry({
          bpm,
          temp,
          ax,
          ay,
          az,
          lat,
          lon,
          status,
          vedba,
          connected: true,
          error: null,
          lastUpdated: new Date(),
          raw: data,
        });
      },
      (err) => {
        if (!isMounted) return;
        console.error("[Firebase RTDB] Listen error at /cow1:", err);
        setTelemetry((prev) => ({
          ...prev,
          connected: false,
          error: err?.message || "Failed to connect to Firebase Realtime Database",
        }));
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [enabled]);

  return telemetry;
}
