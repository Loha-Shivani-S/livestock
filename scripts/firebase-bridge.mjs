/**
 * HerdSentinel - Hardware Firebase Bridge
 * 
 * Specifically adapted for senior's ESP8266 schema (/cow1.json).
 * Automatically maps:
 *   bpm         -> heart_rate
 *   temp        -> temp (in °C)
 *   ax, ay, az  -> converted from raw MPU6050 counts to g-force
 *   lat, lon    -> GPS coordinates
 * 
 * Usage:
 *   npm run firebase:sync
 *   or: node scripts/firebase-bridge.mjs <FIREBASE_DATABASE_URL>
 */

const DEFAULT_URL = "https://livestock2-0-default-rtdb.asia-southeast1.firebasedatabase.app";
const dbUrl = (process.argv[2] || process.env.FIREBASE_DB_URL || DEFAULT_URL).replace(/\/$/, "");
const localApiUrl = process.env.INGEST_API_URL || "http://localhost:8080/api/public/ingest";

console.log("======================================================================");
console.log("  HerdSentinel - ESP8266 Multi-species Telemetry Bridge");
console.log("======================================================================");
console.log(`[Firebase Target] ${dbUrl}`);
console.log(`[Local Dashboard] ${localApiUrl}`);
console.log("Listening for updates on /cow1.json ...");
console.log("======================================================================\n");

function normalizeG(val, fallback = 0.05) {
  if (val === undefined || val === null || val === "--" || val === "") return fallback;
  const num = parseFloat(val);
  if (isNaN(num)) return fallback;
  // If value is raw MPU6050 sensor count (e.g. 15000 or -8000), convert to g
  if (Math.abs(num) > 10) {
    return Number((num / 16384.0).toFixed(3));
  }
  return Number(num.toFixed(3));
}

let lastSnapshotHash = "";

async function pollFirebase() {
  // Check senior's /cow1.json first, then fallback to /telemetry/latest.json
  const endpoints = [`${dbUrl}/cow1.json`, `${dbUrl}/telemetry/latest.json`];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;

      const data = await res.json();
      if (!data || typeof data !== "object") continue;

      const snapshotHash = JSON.stringify(data);
      if (snapshotHash === lastSnapshotHash) continue; // no new packet
      lastSnapshotHash = snapshotHash;

      // Extract fields from senior's schema
      const bpm = parseFloat(data.bpm || data.heart_rate || "72");
      const temp = parseFloat(data.temp || data.temperature || "38.6");
      const ax = normalizeG(data.ax, 0.05);
      const ay = normalizeG(data.ay, 0.02);
      const az = normalizeG(data.az, 0.98);
      const rawLat = String(data.lat || data.latitude || "11.2356").split(",")[0].trim();
      const rawLon = String(data.lon || data.longitude || "77.7814").split(",")[0].trim();
      const lat = parseFloat(rawLat);
      const lon = parseFloat(rawLon);
      const status = data.status || (String(data.lon || "").includes("Walking") ? "Walking" : "Standing");

      // Calculate VeDBA from converted accelerations
      const vedba = Math.sqrt(ax * ax + ay * ay + az * az).toFixed(3);

      console.log(`\n[ESP8266 -> Firebase -> Dashboard] New Reading from Cow 1:`);
      console.log(`  Vitals: Temp: ${temp} °C | Heart Rate: ${bpm} bpm | Posture: ${status}`);
      console.log(`  Motion (VeDBA): ${vedba} g (ax: ${ax}, ay: ${ay}, az: ${az})`);
      console.log(`  GPS Coordinates: ${lat}, ${lon}`);

      // Forward to HerdSentinel local ingestion API
      const ingestRes = await fetch(localApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_id: "GW-DINDORI-01",
          tag_id: "IN-MH-2031-4471", // Primary collared cow
          temp: isNaN(temp) ? 38.6 : temp,
          heart_rate: isNaN(bpm) ? 72 : bpm,
          ax,
          ay,
          az,
          lat: isNaN(lat) || lat === 0 ? 20.2014 : lat,
          lon: isNaN(lon) || lon === 0 ? 73.8341 : lon,
          speed: status === "Walking" ? 1.2 : 0.0,
        }),
      });

      if (ingestRes.ok) {
        const result = await ingestRes.json();
        console.log(`  --> Dashboard Ingested! Live BDI: ${result.bdi} (${result.band.toUpperCase()})`);
      } else {
        console.error(`  --> Dashboard Ingestion Error: HTTP ${ingestRes.status}`);
      }
      break; // Successfully handled from this endpoint
    } catch (err) {
      // quiet retry on next interval
    }
  }
}

// Poll Firebase every 2 seconds
setInterval(pollFirebase, 2000);
pollFirebase();
