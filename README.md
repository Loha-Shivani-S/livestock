# Remix of Remix of Guardian Herd

PROBLEM STATEMENT: • Problem Description Livestock owners, field veterinarians,para-veterinary workers and government departments often lack a unified, realtime mechanism to identify emerging animal-health risks at the village, block and district levels. Disease symptoms may be reported late, diagnostic facilities may be distant, vaccination and treatment histories may be incomplete, and information from farms, veterinary dispensaries, laboratories, vaccination drives and surveillance programmes may remain fragmented. These gaps can delay containment, increase livestock mortality and productivity loss, raise the risk of zoonotic transmission, and affect farmersâ€™ incomes. The challenge is to create a practical system that enables early warning, rapid reporting, risk assessment, preventive action, referral and coordinated response, including in low-connectivity areas.
• Expected Solution / Outcome A scalable animal-health surveillance and decision-support solution that can: capture symptom and mortality reports from farmers and field workers; use rulebased or AI-assisted triage to flag suspected outbreaks; integrate geospatial risk mapping, weather and historical disease trends; maintain animal-level or herd-level health,vaccination and treatment records; issue multilingual advisories and alerts; support sample collection, laboratory referral and case escalation; provide dashboards for veterinary officials; and operate through mobile, web, IVR or offline-enabled channels. Expected outcomes include reduced reporting time, earlier outbreak identification, improved vaccination coverage, faster treatment and containment, lower mortality and productivity loss, and stronger evidence-based planning.

WHAT I HAVE DONE IN HARDWARE : Based on your physical prototype photo and the system architecture, here is the complete hardware breakdown divided into two units: the Animal Wearable Collar (Transmitter Node) and the Base Station / Gateway (Receiver Node).




1. Animal Wearable Collar (Transmitter Node)

This is the physical belt mounted on the livestock that collects vitals and transmits them wirelessly.




ComponentSpecific Module / PartInterface / ProtocolPrimary FunctionMicrocontrollerArduino Nano (ATmega328P, 5V, 16MHz)Core ControllerReads all raw sensor registers, packages data into a binary struct, and drives the LoRa radio.Motion & PostureMPU6050 / MPU9250 (3-axis Accel + Gyro)I2C (SDA/SCL pins A4/A5)Measures tri-axial acceleration ($a_x, a_y, a_z$) to compute Dynamic Body Acceleration ($\text{VeDBA}$) and resting posture angles (pitch/roll).Body TemperatureDS18B20 (Waterproof probe) or LM35/NTC1-Wire Digital (or Analog)Measures skin/body temperature to detect pyrogenic fever and heat stress.Heart / Pulse RateOptical Pulse Sensor (e.g., KY-039 / MAX30102)Analog / I2CMeasures optical photoplethysmography (PPG) to track pulse rate (BPM).Geolocation & SpeedNEO-6M GPS Module (with ceramic patch antenna)UART Serial (TX/RX)Captures latitude, longitude, and ground velocity ($v_{\text{GPS}}$) for movement analysis.Long-Range WirelessSX1278 LoRa Transceiver (433 MHz / 868 MHz / 915 MHz)SPI (MOSI, MISO, SCK, CS)Transmits sensor payloads over 5–10 km in remote, zero-cellular grazing pastures.Power Supply3× 18650 Li-ion Battery Pack (in series/parallel holder)DC PowerDelivers continuous power (~3.7V to 11.1V depending on configuration) to power the GPS and radio.Power RegulationBuck/Boost Converter (e.g., LM2596 or TP4056 + Step-up)Power RailRegulates battery output to steady 5V (for Nano, GPS, Pulse) and 3.3V (for LoRa module).Mounting HarnessHeavy-duty woven fabric/nylon strap with velcro/buckleMechanicalSecures modules around the neck with counterweight balance.

2. Base Station / Field Gateway (Receiver Node)

This is the central village hub (the yellow box in your prototype setup) that catches radio packets and bridges them to the cloud.

ComponentSpecific Module / PartInterface / ProtocolPrimary FunctionLoRa Receiver RadioSX1278 LoRa ModuleSPIListens continuously on the designated radio frequency for incoming collar packets.Gateway ControllerESP32 Dev Board (or Raspberry Pi Zero 2 W)SPI + Wi-Fi / CellularReceives raw byte payloads from the SX1278, unpacks the data, and connects to the internet.Internet UplinkIntegrated Wi-Fi (ESP32) or SIM800L / 4G LTE HATHTTP / MQTTForwards the unpacked JSON telemetry stream to your FastAPI/TimescaleDB cloud backend.Power Source5V USB Wall Adapter / Solar Power PackMicro-USB / Type-CKeeps the village gateway operational 24/7.

WHAT TO BE DONE IN WEBSITE : A PROPER CONNECTION BETWEEN HARDWARE AND WEB, LOGIN/SIGN IN, PROPER BACKEND, PROPER UNDERSTANDABLE UI/UX, MAKE IT IMAGES SO FARMERS CAN UNDERSTAND, MULTILINGUAL, SPEECH TO TEXT IN MULTILINGUAL, SEND OR RECEIVE DATA.

1. Ingestion Backend (FastAPI / Node.js)

What it does: The central gateway that receives data from your LoRa receiver (or simulated JSON payloads).

Key functions:




Ingests sensor data: {node_id, tag_id, temp, heart_rate, ax, ay, az, lat, lon, speed}.

Ingests grassroots reports from non-sensor herds (symptoms, sudden deaths).

Calls the free Open-Meteo API using latitude/longitude to factor in the local Temperature-Humidity Index (THI).

2. Biological Predictive Analytics Engine (Python / NumPy)

What it does: The core mathematical layer running on the backend that detects early illness before visible symptoms appear.

Key algorithms:




Cardio-Kinetic Discrepancy: Calculates Dynamic Body Acceleration ($\text{VeDBA}$) from the accelerometer; isolates fever/internal pain when heart rate spikes while the animal is resting.

Poincaré Postural Dynamics: Analyzes resting/lying bout durations to spot restlessness or avoidance of lying on one side (early mastitis or lameness).

Unified BDI Score: Outputs a normalized Biological Degradation Index (0.0 to 1.0) that categorizes cases into Low, Medium, or Critical/High Risk.

3. Database Layer (PostgreSQL + PostGIS + TimescaleDB)

What it does: Stores continuous sensor data, geographic boundaries, and animal history.

3 core tables:




Telemetry Hypertable: High-frequency vitals, location, and computed BDI scores.

Digital Health Ledger: Tag ID, owner details, species, FMD/Brucellosis vaccination history, and deworming dates (aligned with Bharat Pashudhan standards).

Syndromic & Mortality Table: Field reports containing observed symptoms (e.g., mouth blisters, salivation) and mortality counts.

4. Spatiotemporal & Response Module (PostGIS / Python)

What it does: Executes containment and clinical actions when a high BDI or symptom cluster is detected.

Key features:




Automatically calculates and draws a 3 km / 5 km quarantine ring-buffer polygon around the affected animal's GPS coordinates.

Generates a Digital Lab Requisition Slip with a unique QR code for para-vets to collect biological samples and route them to the Regional Disease Diagnostic Lab (RDDL).

Triggers an escalation ticket for the Block Veterinary Officer (BVO) and prepares automated regional SMS/voice advisory text.

5. Unified Command Dashboard (Streamlit or React/Next.js)

What it does: The single screen you show the jury during your evaluation.

4 core visual panels:




GIS Hotspot Map: Shows animal markers, village risk heatmaps, and the active 3 km outbreak containment ring.

Live Vitals & BDI Gauge: Visualizes temperature, heart rate, dynamic movement, and the real-time BDI risk dial.

Bharat Pashudhan Animal Dossier: Searchable Tag ID records showing vaccination status and treatment history.

Grassroots Reporting Tab: A simple form simulating an offline field PWA or toll-free IVR report (logging symptoms and mortality).

Summary of What to Show the Jury

[LoRa Collar / Hardware Node] ──► [FastAPI Backend + BDI Math] ──► [PostgreSQL Database]
                                                                          │
                                                                          ▼
                                                             [Command Dashboard]
                                                             • Live Outbreak Map (3 km Ring)
                                                             • BDI Health Gauge (0 - 1)
                                                             • Bharat Pashudhan Ledger
                                                             • QR Lab Requisition Slip

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/eb3e205b-a168-4bfc-a5be-bd237d20572a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
