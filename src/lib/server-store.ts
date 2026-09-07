// Resilient in-memory & file-persisted server store.
// Used when Supabase service role key is absent or as a fallback.

export interface Animal {
  id: string;
  tag_id: string;
  species: string;
  breed: string;
  sex: string;
  owner_name: string;
  owner_phone: string | null;
  village: string;
  block: string;
  district: string;
  date_of_birth: string | null;
  collar_node_id: string | null;
  lat: number;
  lon: number;
  created_at: string;
}

export interface TelemetryRecord {
  id: string;
  node_id: string | null;
  tag_id: string;
  temp_c: number;
  heart_rate: number;
  vedba: number;
  lat: number | null;
  lon: number | null;
  speed_kmh: number;
  thi: number | null;
  bdi: number;
  band: "low" | "medium" | "critical";
  recorded_at: string;
}

export interface Alert {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "critical";
  tag_id: string | null;
  village: string;
  block: string;
  district: string;
  lat: number | null;
  lon: number | null;
  containment_radius_m: number;
  source: string;
  status: "open" | "investigating" | "confirmed_outbreak" | "cleared" | "resolved";
  created_at: string;
  requisition_id?: string | null;
}

export interface FieldReport {
  id: string;
  reported_by: string | null;
  reporter_name: string;
  tag_id: string | null;
  species: string;
  affected_count: number;
  mortality_count: number;
  symptoms: string[];
  notes: string | null;
  voice_transcript: string | null;
  language: string;
  village: string;
  block: string;
  district: string;
  lat: number | null;
  lon: number | null;
  channel: string;
  status: string;
  created_at: string;
}

export interface Gateway {
  id: string;
  node_id: string;
  label: string;
  village: string;
  block: string;
  district: string;
  lat: number;
  lon: number;
  online: boolean;
  last_seen_at: string;
  queued?: number;
  rssi?: number;
  battery_pct?: number;
}

export interface LabRequisition {
  id: string;
  reference: string;
  scan_token: string;
  tag_id: string | null;
  alert_id: string | null;
  sample_type: string;
  laboratory: string;
  collected_by: string | null;
  findings: string | null;
  pathogen: string | null;
  result_status: "pending" | "positive" | "negative" | "inconclusive";
  status: "pending" | "collected" | "in_transit" | "processing" | "completed";
  reported_at: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface AlertRecipient {
  id: string;
  full_name: string;
  designation: string;
  phone: string | null;
  email: string | null;
  district: string;
  block: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  error: string | null;
  alert_id: string | null;
  report_id: string | null;
  created_at: string;
}

// Initial realistic dataset for Gobichettipalayam / Erode sector
const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

class MemoryStore {
  animals: Animal[] = [
    {
      id: "a1",
      tag_id: "IN-MH-2031-4471",
      species: "Cattle",
      breed: "Kangayam / Gir",
      sex: "Female",
      owner_name: "S. Balasubramaniam",
      owner_phone: "+91 94432 44710",
      village: "Sector 1 (Live Collar)",
      block: "Erode Rural",
      district: "Erode",
      date_of_birth: "2021-04-12",
      collar_node_id: "CLR-01",
      lat: 11.235695,
      lon: 77.781448,
      created_at: hoursAgo(72),
    },
    {
      id: "a2",
      tag_id: "IN-MH-2031-8820",
      species: "Buffalo",
      breed: "Murrah",
      sex: "Female",
      owner_name: "K. Ramesh Kumar",
      owner_phone: "+91 94430 88201",
      village: "North Pasture",
      block: "Erode Rural",
      district: "Erode",
      date_of_birth: "2020-08-19",
      collar_node_id: "CLR-02",
      lat: 11.2374,
      lon: 77.7831,
      created_at: hoursAgo(72),
    },
    {
      id: "a3",
      tag_id: "IN-MH-2031-1049",
      species: "Sheep",
      breed: "Mecheri",
      sex: "Male",
      owner_name: "P. Muthusamy",
      owner_phone: "+91 97890 10492",
      village: "South Meadow",
      block: "Erode Rural",
      district: "Erode",
      date_of_birth: "2022-01-15",
      collar_node_id: "CLR-03",
      lat: 11.2341,
      lon: 77.7798,
      created_at: hoursAgo(72),
    },
    {
      id: "a4",
      tag_id: "IN-MH-2031-9231",
      species: "Goat",
      breed: "Tellicherry",
      sex: "Female",
      owner_name: "V. Selvam",
      owner_phone: "+91 98420 92314",
      village: "West Orchard",
      block: "Erode Rural",
      district: "Erode",
      date_of_birth: "2021-11-03",
      collar_node_id: "CLR-04",
      lat: 11.2368,
      lon: 77.7801,
      created_at: hoursAgo(72),
    },
  ];

  telemetry: TelemetryRecord[] = [
    {
      id: "t1",
      node_id: "GW-01",
      tag_id: "IN-MH-2031-4471",
      temp_c: 38.6,
      heart_rate: 68,
      vedba: 0.068,
      lat: 11.235695,
      lon: 77.781448,
      speed_kmh: 0.1,
      thi: 74.2,
      bdi: 0.19,
      band: "low",
      recorded_at: minutesAgo(1),
    },
    {
      id: "t2",
      node_id: "GW-01",
      tag_id: "IN-MH-2031-8820",
      temp_c: 38.7,
      heart_rate: 66,
      vedba: 0.12,
      lat: 11.2374,
      lon: 77.7831,
      speed_kmh: 0.4,
      thi: 74.5,
      bdi: 0.18,
      band: "low",
      recorded_at: minutesAgo(3),
    },
    {
      id: "t3",
      node_id: "GW-01",
      tag_id: "IN-MH-2031-1049",
      temp_c: 39.4,
      heart_rate: 78,
      vedba: 0.08,
      lat: 11.2341,
      lon: 77.7798,
      speed_kmh: 0.2,
      thi: 75.0,
      bdi: 0.42,
      band: "medium",
      recorded_at: minutesAgo(5),
    },
    {
      id: "t4",
      node_id: "GW-01",
      tag_id: "IN-MH-2031-9231",
      temp_c: 38.5,
      heart_rate: 72,
      vedba: 0.14,
      lat: 11.2368,
      lon: 77.7801,
      speed_kmh: 0.5,
      thi: 74.0,
      bdi: 0.14,
      band: "low",
      recorded_at: minutesAgo(7),
    },
  ];

  alerts: Alert[] = [
    {
      id: "alt-01",
      title: "Pre-clinical Elevated Temperature (State 2)",
      detail: "Temperature 39.4 °C, resting bout restlessness detected in grazing pasture sector.",
      severity: "medium",
      tag_id: "IN-MH-2031-1049",
      village: "South Meadow",
      block: "Erode Rural",
      district: "Erode",
      lat: 11.2341,
      lon: 77.7798,
      containment_radius_m: 3000,
      source: "collar",
      status: "open",
      created_at: minutesAgo(12),
      requisition_id: "req-01",
    },
  ];

  field_reports: FieldReport[] = [
    {
      id: "rep-01",
      reported_by: "usr-farmer-01",
      reporter_name: "S. Balasubramaniam",
      tag_id: "IN-MH-2031-4471",
      species: "Cattle",
      affected_count: 1,
      mortality_count: 0,
      symptoms: ["Off feed"],
      notes: "Cow resting calmly in shade during noon heat.",
      voice_transcript: null,
      language: "en",
      village: "Sector 1 (Live Collar)",
      block: "Erode Rural",
      district: "Erode",
      lat: 11.235695,
      lon: 77.781448,
      channel: "mobile",
      status: "open",
      created_at: minutesAgo(20),
    },
  ];

  gateways: Gateway[] = [
    {
      id: "gw-01",
      node_id: "GW-DINDORI-01",
      label: "Pasture Base Station LoRa Tower",
      village: "Sector 1 (Live Collar)",
      block: "Erode Rural",
      district: "Erode",
      lat: 11.235695,
      lon: 77.781448,
      online: true,
      last_seen_at: minutesAgo(1),
      queued: 0,
      rssi: -62,
      battery_pct: 100,
    },
    {
      id: "gw-02",
      node_id: "GW-02",
      label: "Kullampalayam LoRa Tower",
      village: "Kullampalayam",
      block: "Gobichettipalayam",
      district: "Erode",
      lat: 11.2421,
      lon: 77.7865,
      online: true,
      last_seen_at: minutesAgo(2),
      queued: 0,
      rssi: -74,
      battery_pct: 95,
    },
    {
      id: "gw-03",
      node_id: "GW-03",
      label: "Lakkampatti Pasture Repeater",
      village: "Lakkampatti",
      block: "Gobichettipalayam",
      district: "Erode",
      lat: 11.2295,
      lon: 77.7760,
      online: true,
      last_seen_at: minutesAgo(5),
      queued: 1,
      rssi: -82,
      battery_pct: 88,
    },
    {
      id: "gw-04",
      node_id: "GW-04",
      label: "Pariyoor Solar Relay",
      village: "Pariyoor",
      block: "Gobichettipalayam",
      district: "Erode",
      lat: 11.2395,
      lon: 77.7735,
      online: false,
      last_seen_at: hoursAgo(14),
      queued: 14,
      rssi: -105,
      battery_pct: 12,
    },
  ];

  lab_requisitions: LabRequisition[] = [
    {
      id: "req-01",
      reference: "DVDL/ERD/2026/4102",
      scan_token: "REQ-ERD-4102-TOK",
      tag_id: "IN-MH-2031-4471",
      alert_id: "alt-01",
      sample_type: "Vesicular fluid & epithelium in viral transport medium",
      laboratory: "District Veterinary Diagnostic Laboratory (DVDL), Erode",
      collected_by: "Dr. M. Senthilkumar (BVO)",
      findings: null,
      pathogen: null,
      result_status: "pending",
      status: "in_transit",
      reported_at: null,
      reported_by: null,
      created_at: minutesAgo(10),
    },
  ];

  alert_recipients: AlertRecipient[] = [
    {
      id: "rec-01",
      full_name: "Dr. M. Senthilkumar",
      designation: "Block Veterinary Officer (BVO)",
      phone: "+91 94432 12345",
      email: "bvo.gobi@tn.gov.in",
      district: "Erode",
      block: "Gobichettipalayam",
      active: true,
      created_at: hoursAgo(72),
      updated_at: hoursAgo(72),
    },
    {
      id: "rec-02",
      full_name: "Dr. P. Kavitha",
      designation: "District Veterinary Officer (DVO)",
      phone: "+91 94433 67890",
      email: "dvo.erode@tn.gov.in",
      district: "Erode",
      block: "Erode",
      active: true,
      created_at: hoursAgo(72),
      updated_at: hoursAgo(72),
    },
    {
      id: "rec-03",
      full_name: "K. Ramasamy",
      designation: "Livestock Inspector (LI)",
      phone: "+91 98425 54321",
      email: "li.kullampalayam@tn.gov.in",
      district: "Erode",
      block: "Gobichettipalayam",
      active: true,
      created_at: hoursAgo(72),
      updated_at: hoursAgo(72),
    },
  ];

  notifications: NotificationLog[] = [
    {
      id: "notif-01",
      channel: "sms",
      recipient: "+91 94432 12345",
      subject: "[CRITICAL] Critical BDI spike from collar IN-MH-2031-4471",
      body: "[CRITICAL] Critical BDI spike from collar IN-MH-2031-4471 — Gobichettipalayam. Temp 40.8 C, HR 94 bpm, BDI 0.88. Immediate field verification advised.",
      status: "sent",
      error: null,
      alert_id: "alt-01",
      report_id: null,
      created_at: minutesAgo(11),
    },
    {
      id: "notif-02",
      channel: "email",
      recipient: "bvo.gobi@tn.gov.in",
      subject: "[CRITICAL] Critical BDI spike from collar IN-MH-2031-4471",
      body: "High-temperature and resting anomaly detected in Gobichettipalayam. Animal ID: IN-MH-2031-4471. Open HerdSentinel console for 3 km quarantine ring details.",
      status: "sent",
      error: null,
      alert_id: "alt-01",
      report_id: null,
      created_at: minutesAgo(11),
    },
  ];

  vaccinations = [
    {
      id: "v1",
      tag_id: "IN-MH-2031-4471",
      vaccine_name: "FMD Oil Adjuvant Vaccine (Raksha-Ovac)",
      dose_number: 3,
      administered_on: "2025-10-14",
      batch_no: "RO-2025-88",
      administered_by: "Dr. Suresh Patil",
    },
    {
      id: "v2",
      tag_id: "IN-MH-2031-4471",
      vaccine_name: "Brucellosis S19 (Calfhood)",
      dose_number: 1,
      administered_on: "2021-10-02",
      batch_no: "BR-21-04",
      administered_by: "Ramesh Gaikwad",
    },
    {
      id: "v3",
      tag_id: "IN-MH-2031-8820",
      vaccine_name: "Haemorrhagic Septicaemia (HS) Vaccine",
      dose_number: 2,
      administered_on: "2025-11-20",
      batch_no: "HS-25-109",
      administered_by: "Dr. Suresh Patil",
    },
  ];

  treatments = [
    {
      id: "tr1",
      tag_id: "IN-MH-2031-4471",
      diagnosis: "Sub-clinical Mastitis (Right hind quarter)",
      drug_administered: "Intramammary Cloxacillin + Meloxicam 15ml",
      treated_on: "2025-12-05",
      treated_by: "Dr. Suresh Patil",
      follow_up_date: "2025-12-10",
    },
  ];
}

// Global singleton
declare global {
  var __pashuServerStore: MemoryStore | undefined;
}

if (!globalThis.__pashuServerStore) {
  globalThis.__pashuServerStore = new MemoryStore();
}

export const serverStore = globalThis.__pashuServerStore;
