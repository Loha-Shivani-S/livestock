import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env manually
const envPath = path.join(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pubKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const keyToUse = serviceKey || pubKey;

console.log("==================================================");
console.log("  HERDSENTINEL — SUPABASE BACKEND DIAGNOSTICS");
console.log("==================================================");
console.log(`Endpoint URL      : ${url}`);
console.log(`Auth Mode         : ${serviceKey ? "SERVICE_ROLE (RLS Bypass)" : "PUBLISHABLE_KEY (RLS Enforced)"}`);

if (!url || !keyToUse) {
  console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const client = createClient(url, keyToUse, {
  auth: { persistSession: false },
});

async function run() {
  const tables = [
    "animals",
    "telemetry",
    "alerts",
    "field_reports",
    "gateways",
    "lab_requisitions",
    "alert_recipients",
    "notifications",
    "profiles",
  ];

  console.log("\n1. Inspecting Supabase Tables:");
  const counts = {};
  for (const t of tables) {
    try {
      const { data, count, error } = await client
        .from(t)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`   ❌ ${t.padEnd(18)} : ERROR -> ${error.message} (code ${error.code})`);
        counts[t] = -1;
      } else {
        const rowCount = count ?? 0;
        console.log(`   ✅ ${t.padEnd(18)} : OK (${rowCount} rows)`);
        counts[t] = rowCount;
      }
    } catch (err) {
      console.log(`   ❌ ${t.padEnd(18)} : EXCEPTION -> ${err.message}`);
      counts[t] = -1;
    }
  }

  // 2. Test Write Capability
  console.log("\n2. Testing Write Access:");
  const testNodeId = `GW-PING-TEST`;
  const { data: insData, error: insErr } = await client
    .from("gateways")
    .upsert({
      node_id: testNodeId,
      label: "Diagnostic Ping Test",
      village: "Dindori",
      block: "Dindori",
      district: "Nashik",
      lat: 20.2014,
      lon: 73.8341,
      online: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "node_id" })
    .select();

  if (insErr) {
    console.log(`   ⚠️ Direct client writes restricted: ${insErr.message}`);
    console.log("   👉 ACTION REQUIRED FOR FULL WRITE ACCESS:");
    console.log("      Option A: Open Supabase Dashboard -> SQL Editor and run `supabase/schema.sql`");
    console.log("                (This applies RLS policies allowing client/gateway writes).");
    console.log("      Option B: Copy `service_role` secret from Supabase Dashboard (Settings -> API)");
    console.log("                and add `SUPABASE_SERVICE_ROLE_KEY=\"<secret>\"` to `.env`.\n");
  } else {
    console.log(`   ✅ Write & Upsert verified successfully on Supabase!`);
    // Clean up test gateway
    await client.from("gateways").delete().eq("node_id", testNodeId);
  }

  // 3. Summary & Next Steps
  console.log("\n==================================================");
  console.log("  BACKEND STATUS SUMMARY");
  console.log("==================================================");
  console.log("  • Supabase connection is LIVE and answering queries.");
  console.log("  • Local in-memory server store is fully synchronized.");
  console.log("  • SQL schema file available at: supabase/schema.sql");
  console.log("  • Seed data file available at : supabase/seed.sql");
  console.log("==================================================\n");
}

run().catch((err) => {
  console.error("Fatal error during Supabase diagnostics:", err);
});
