# HerdSentinel — Multi-Species Livestock Disease Early Warning & Containment Platform

[![SIH Problem Statement](https://img.shields.io/badge/SIH-National%20Surveillance-blue)](https://github.com/Loha-Shivani-S/livestock)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Multi-Species](https://img.shields.io/badge/Coverage-Cattle%20%7C%20Buffalo%20%7C%20Sheep%20%7C%20Goats%20%7C%20Swine-success)](#)

A unified, real-time epidemiological surveillance and biosecurity platform for early detection, pre-clinical anomaly triage, and automated GIS containment of infectious livestock diseases across all multi-species herds and flocks (Cattle, Buffalo, Sheep, Goats, Swine).

---

## 🎯 Problem Statement & Scope

Livestock owners, field para-veterinarians, and state animal husbandry departments frequently lack a unified, zero-latency mechanism to detect emerging outbreaks at village, block, and district levels.
* Traditional disease reporting occurs 7–10 days after visible symptoms manifest, by which time transmission has escalated across herds.
* **HerdSentinel** bridges physical IoT wear-collar telemetry, mathematical pre-clinical triage ($\text{BDI}$), multilingual field reporting, and automated PostGIS 3 km quarantine buffer generation into one real-time command console.

---

## 🏗️ End-to-End System Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. WEARABLE SENSOR COLLAR (Multi-Species Wearable Node)     │
 │  • Core: Arduino Nano (ATmega328P, 16MHz)                   │
 │  • Motion: MPU6050 3-Axis Accelerometer (VeDBA dynamics)    │
 │  • Temperature: DS18B20 / Waterproof probe (Pyrexia)        │
 │  • Cardiac: MAX30102 / Pulse Sensor (Resting Tachycardia)   │
 │  • Geolocation: NEO-6M GPS Module                           │
 │  • Radio: SX1278 LoRa Transceiver (433 / 868 MHz, 5-10 km)  │
 └──────────────────────────────┬──────────────────────────────┘
                                │ (LoRa Long-Range Wireless Radio)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 2. VILLAGE GATEWAY NODE (ESP8266 / ESP32 Base Station)      │
 │  • LoRa Receiver catches collar telemetry packets           │
 │  • Wi-Fi / Cellular 4G uplink bridges data to cloud         │
 │  • Pushes to Firebase Realtime DB & local ingestion API     │
 └──────────────────────────────┬──────────────────────────────┘
                                │ (Encrypted HTTPS / SSE Stream)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 3. HERDSENTINEL PREDICTIVE ANALYTICS & INGESTION BACKEND    │
 │  • Cardio-Kinetic Discrepancy (CKD) Engine                  │
 │  • Temperature-Humidity Index (THI) from Open-Meteo API     │
 │  • Poincaré Postural Dynamics (Lying/Resting bouts)         │
 │  • Biological Degradation Index (BDI: 0.00 to 1.00)         │
 └──────────────────────────────┬──────────────────────────────┘
                                │ (Zero-Latency SSE WebSockets)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 4. EPIDEMIOLOGICAL COMMAND & TRIAGE CONSOLE                 │
 │  • 60% Left: Interactive GIS Hotspot Map + 3 km Quarantine  │
 │  • 40% Right: Multi-Species Inspector & Cardio-Kinetic Card │
 │  • Digital Lab Requisition Generator (QR & Chain-of-Custody)│
 │  • Multilingual Vernacular Voice Advisory (IVR / Audio)     │
 └─────────────────────────────────────────────────────────────┘
```

---

## 🧬 Biological Predictive Analytics Engine (BDI)

Early disease detection relies on two coupled mathematical discrepancies computed on each telemetry frame:

### 1. Vectorial Dynamic Body Acceleration ($\text{VeDBA}$)
$$\text{VeDBA} = \sqrt{a_x^2 + a_y^2 + a_z^2}$$
Measures actual kinetic physical displacement to isolate exertion from stillness.

### 2. Cardio-Kinetic Discrepancy ($\text{CKD}$)
When an animal is physically resting or recumbent ($\text{VeDBA} < 0.18\,\text{g}$), its baseline heart rate should remain low (e.g., $50–70\,\text{bpm}$). If heart rate spikes to $>90\,\text{bpm}$ while motion flatlines near zero, the system flags **subclinical pyrexia / systemic endotoxemia** days before external vesicular lesions appear.

$$\text{BDI} = w_{\text{temp}} \cdot \Delta T + w_{\text{CKD}} \cdot \text{CKD} + w_{\text{THI}} \cdot \Delta \text{THI}$$

* **State 1 (Baseline Normal, $\text{BDI} < 0.40$):** All map markers green. Fully coupled dynamics.
* **State 2 (Sentinel Anomaly, $0.40 \le \text{BDI} < 0.70$):** Marker amber. Subclinical distress advisory flagged.
* **State 3 (Active Outbreak, $\text{BDI} \ge 0.70$):** Marker red. Automated 3 km quarantine buffer ring activated.

---

## 🚀 Quickstart & Development

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **npm** or **bun**
- Arduino IDE (for ESP8266/Nano firmware)

### 2. Installation
```bash
git clone https://github.com/Loha-Shivani-S/livestock.git
cd livestock
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### 4. Connect Real ESP8266 Hardware (Firebase Stream)
```bash
npm run firebase:sync
```
When your LoRa collar sends data, the bridge streams updates directly into the web console in real time.

---

## 📦 Repository Structure

```
├── firmware/
│   ├── collar_node/          # Arduino Nano firmware (MPU6050, Pulse, Temp, GPS, LoRa)
│   └── gateway_node/         # ESP8266 / ESP32 LoRa-to-Firebase gateway firmware
├── scripts/
│   ├── firebase-bridge.mjs   # Real-time hardware Firebase-to-Dashboard bridge daemon
│   ├── bdi_analytics.py      # Standalone Python/NumPy BDI mathematical algorithm
│   └── simulate_outbreak.py  # Spatiotemporal cluster and outbreak simulation generator
├── src/
│   ├── components/           # GIS Map, Risk Gauge, Lab Slip, Vernacular Audio Modals
│   ├── routes/               # TanStack File-Based Routes (Command, Field Report, Lab, etc.)
│   └── lib/                  # BDI math engine, i18n dictionary, SSE telemetry bus
└── supabase/                 # PostgreSQL schema and Bharat Pashudhan seed data
```

---

## 📜 Compliance & Alignment

- **Bharat Pashudhan / INAPH**: Unified 12-digit animal identification and vaccination histories.
- **Regional Disease Diagnostic Laboratory (RDDL)**: Automated digital lab requisition slips with scannable QR verification tokens.
- **National Biosecurity Protocol**: Dynamic 3 km movement restriction perimeter and ring vaccination workflows.
