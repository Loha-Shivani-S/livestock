# HerdSentinel — Supabase Backend Guide

This guide explains how the **Supabase PostgreSQL & Realtime backend** powers the **HerdSentinel** multi-species livestock disease surveillance and early warning system.

---

## 1. Architecture Overview

```
[ LoRa / GSM Collars ] ──> [ ESP32 Field Gateways ]
                                  │ (HTTP POST /api/public/gateway-heartbeat)
                                  ▼
                    [ TanStack Start SSR / Ingestion ]
                                  │
      ┌───────────────────────────┴───────────────────────────┐
      ▼                                                       ▼
[ Supabase PostgreSQL ]                                [ Supabase Realtime ]
  • animals (RFID & GPS)                                 • Alerts broadcast
  • telemetry (Vitals, BDI, THI)                         • Live vital feeds
  • alerts (Quarantine rings)                            • Field outbreak updates
  • field_reports (Farmer offline PWA)
  • gateways (Device health & RSSI)
  • lab_requisitions (QR verification)
  • alert_recipients (SMS / Email directory)
```

---

## 2. Quick Setup (1-Click SQL)

### Step 1: Open Supabase Dashboard
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and select your project (`rgwxzrvswktsmenwewos`).
2. In the left navigation, click on **SQL Editor**.

### Step 2: Run the Schema Migration
1. Open [`supabase/schema.sql`](file:///c:/livestock-watch-pro-main/supabase/schema.sql) in this repository.
2. Paste the entire content into the Supabase SQL Editor and click **Run**.
   - This creates all 12 tables with indexes.
   - It configures Row Level Security (RLS) policies allowing public read and permitted IoT/farmer inserts.
   - It registers tables with `supabase_realtime`.

### Step 3: (Optional) Seed Sample Data
1. Open [`supabase/seed.sql`](file:///c:/livestock-watch-pro-main/supabase/seed.sql).
2. Paste into the SQL Editor and click **Run**.
   - Seeds 8 Indian livestock cattle/buffalo tags (Gir cow, Murrah, Osmanabadi).
   - Seeds 3 LoRa gateways (Dindori HQ, Vani Kasbe, Niphad Border).
   - Seeds 4 veterinary officers with phone/email for SMS/email escalation.

---

## 3. Environment Variables Configuration

In `.env`:

```bash
# Supabase Project URL & Publishable Key (Already configured)
SUPABASE_URL="https://rgwxzrvswktsmenwewos.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_HUfEH7JBHW44m5l4MH9siw_gBXb-IIG"
VITE_SUPABASE_URL="https://rgwxzrvswktsmenwewos.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_HUfEH7JBHW44m5l4MH9siw_gBXb-IIG"

# Optional: Service Role Key (For server-side RLS bypass)
# Retrieve from Supabase Dashboard -> Settings -> API -> Project API keys -> service_role secret
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
```

> **Note**: If `SUPABASE_SERVICE_ROLE_KEY` is not present, HerdSentinel operates using `SUPABASE_PUBLISHABLE_KEY` with RLS policies and automatically mirrors data to the persistent in-memory fallback store so the application is always 100% operational offline and online.

---

## 4. Diagnostics & Live Sync CLI

Run the diagnostic script at any time from the terminal:

```bash
npm run db:sync
```

This checks:
- Live endpoint connectivity
- Row counts for all 9 core tables
- Direct write capability
- RLS permissions status

---

## 5. Live Supabase Features in the Application

1. **Animal Registration** (`/register`):
   - Click **"+ Register New Tag"** to add Bharat Pashudhan RFID tags directly into the Supabase database.
2. **Realtime Surveillance Console** (`/command`):
   - Realtime WebSocket channel subscribes to Postgres changes on `alerts`, `telemetry`, and `field_reports`.
   - New collar readings or field reports update the map and vitals gauges in real time without refreshing.
   - Live badge shows `⚡ Supabase: Cloud Active`.
3. **Lab Diagnostic Slip** (`/lab`):
   - Verified against `lab_requisitions` table in Supabase with QR token lookup.
   - Positive confirmations escalate to `confirmed_outbreak` with 5 km containment rings.
4. **IoT Heartbeat & Gateway Health** (`/devices`):
   - ESP32 gateway heartbeat posts directly to `/api/public/gateway-heartbeat` which writes to Supabase `gateways` table.
