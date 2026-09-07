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

// Initial realistic dataset for Nashik / Dindori block
const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

class MemoryStore {
  animals: Animal[] = [
    {
      id: "a1",
      tag_id: "IN-MH-2031-4471",
      species: "Cattle",
      breed: "Gir",
      sex: "Female",
      owner_name: "Santosh Baburao Kadam",
      owner_phone: "+91 98221 44710",
      village: "Dindori",
      block: "Dindori",
      district: "Nashik",
      date_of_birth: "2021-04-12",
      collar_node_id: "CLR-01",
      lat: 20.2014,
      lon: 73.8341,
      created_at: hoursAgo(72),
    },
    {
      id: "a2",
      tag_id: "IN-MH-2031-8820",
      species: "Buffalo",
      breed: "Murrah",
      sex: "Female",
      owner_name: "Kavita Ramesh Shinde",
      owner_phone: "+91 94230 88201",
      village: "Vani",
      block: "Dindori",
      district: "Nashik",
      date_of_birth: "2020-08-19",
      collar_node_id: "CLR-02",
      lat: 20.3062,
      lon: 73.8891,
      created_at: hoursAgo(72),
    },
    {
      id: "a3",
      tag_id: "IN-MH-2031-1049",
      species: "Cattle",
      breed: "Dangi",
      sex: "Male",
      owner_name: "Pandurang Vishnu More",
      owner_phone: "+91 97650 10492",
      village: "Nanashi",
      block: "Dindori",
      district: "Nashik",
      date_of_birth: "2022-01-15",
      collar_node_id: "CLR-03",
      lat: 20.2641,
      lon: 73.7429,
      created_at: hoursAgo(72),
    },
    {
      id: "a4",
      tag_id: "IN-MH-2031-9231",
      species: "Cattle",
      breed: "Crossbred Holstein",
      sex: "Female",
      owner_name: "Balasaheb Jadhav",
      owner_phone: "+91 99210 92314",
      village: "Khedgaon",
      block: "Dindori",
      district: "Nashik",
      date_of_birth: "2021-11-03",
      collar_node_id: "CLR-04",
      lat: 20.1518,
      lon: 73.9521,
      created_at: hoursAgo(72),
    },
  ];

  telemetry: TelemetryRecord[] = [
    {
      id: "t1",
      node_id: "GW-01",
      tag_id: "IN-MH-2031-4471",
      temp_c: 40.8,
      heart_rate: 94,
      vedba: 0.042,
      lat: 20.2014,
      lon: 73.8341,
      speed_kmh: 0.1,
      thi: 81.2,
      bdi: 0.88,
      band: "critical",
      recorded_at: minutesAgo(2),
    },
    {
      id: "t2",
      node_id: "GW-02",
      tag_id: "IN-MH-2031-8820",
      temp_c: 38.6,
      heart_rate: 68,
      vedba: 0.12,
      lat: 20.3062,
      lon: 73.8891,
      speed_kmh: 0.4,
      thi: 77.5,
      bdi: 0.18,
      band: "low",
      recorded_at: minutesAgo(4),
    },
    {
      id: "t3",
      node_id: "GW-01",
      tag_id: "IN-MH-2031-1049",
      temp_c: 39.4,
      heart_rate: 76,
      vedba: 0.08,
      lat: 20.2641,
      lon: 73.7429,
      speed_kmh: 0.2,
      thi: 78.0,
      bdi: 0.45,
      band: "medium",
      recorded_at: minutesAgo(6),
    },
    {
      id: "t4",
      node_id: "GW-02",
      tag_id: "IN-MH-2031-9231",
      temp_c: 38.4,
      heart_rate: 62,
      vedba: 0.15,
      lat: 20.1518,
      lon: 73.9521,
      speed_kmh: 0.6,
      thi: 76.8,
      bdi: 0.12,
      band: "low",
      recorded_at: minutesAgo(8),
    },
  ];

  alerts: Alert[] = [
    {
      id: "alt-01",
      title: "Critical BDI spike from collar IN-MH-2031-4471",
      detail: "Temperature 40.8 °C, heart rate 94 bpm, resting posture discrepancy. BDI 0.88. Suspected pyrogenic fever / Foot-and-Mouth prodrome.",
      severity: "critical",
      tag_id: "IN-MH-2031-4471",
      village: "Dindori",
      block: "Dindori",
      district: "Nashik",
      lat: 20.2014,
      lon: 73.8341,
      containment_radius_m: 3000,
      source: "collar",
      status: "open",
      created_at: minutesAgo(12),
      requisition_id: "req-01",
    },
    {
      id: "alt-02",
      title: "Syndromic Cluster: Vesicular Blisters & Salivation",
      detail: "3 adult cattle reported off-feed with oral lesions in Nanashi grazing sector. Sample collection requested.",
      severity: "medium",
      tag_id: "IN-MH-2031-1049",
      village: "Nanashi",
      block: "Dindori",
      district: "Nashik",
      lat: 20.2641,
      lon: 73.7429,
      containment_radius_m: 3000,
      source: "field",
      status: "investigating",
      created_at: hoursAgo(3),
    },
  ];

  field_reports: FieldReport[] = [
    {
      id: "rep-01",
      reported_by: "usr-farmer-01",
      reporter_name: "Santosh Kadam",
      tag_id: "IN-MH-2031-4471",
      species: "Cattle",
      affected_count: 2,
      mortality_count: 0,
      symptoms: ["Mouth blisters", "Excess salivation", "Off feed"],
      notes: "Cow has not grazed since morning, stringy saliva hanging from muzzle.",
      voice_transcript: "गायीच्या तोंडात फोड आले आहेत आणि लाळ गळत आहे",
      language: "mr",
      village: "Dindori",
      block: "Dindori",
      district: "Nashik",
      lat: 20.2014,
      lon: 73.8341,
      channel: "mobile",
      status: "open",
      created_at: minutesAgo(20),
    },
    {
      id: "rep-02",
      reported_by: "usr-paravet-01",
      reporter_name: "Ramesh Gaikwad (Para-vet)",
      tag_id: "IN-MH-2031-1049",
      species: "Cattle",
      affected_count: 3,
      mortality_count: 0,
      symptoms: ["Limping", "Off feed"],
      notes: "Interdigital sores observed during evening herd check.",
      voice_transcript: null,
      language: "en",
      village: "Nanashi",
      block: "Dindori",
      district: "Nashik",
      lat: 20.2641,
      lon: 73.7429,
      channel: "mobile",
      status: "investigating",
      created_at: hoursAgo(4),
    },
  ];

  gateways: Gateway[] = [
    {
      id: "gw-01",
      node_id: "GW-01",
      label: "Dindori Central Mandi Hub",
      village: "Dindori",
      block: "Dindori",
      district: "Nashik",
      lat: 20.2014,
      lon: 73.8341,
      online: true,
      last_seen_at: minutesAgo(1),
      queued: 0,
      rssi: -68,
      battery_pct: 100,
    },
    {
      id: "gw-02",
      node_id: "GW-02",
      label: "Vani Dispensary LoRa Tower",
      village: "Vani",
      block: "Dindori",
      district: "Nashik",
      lat: 20.3062,
      lon: 73.8891,
      online: true,
      last_seen_at: minutesAgo(2),
      queued: 0,
      rssi: -74,
      battery_pct: 95,
    },
    {
      id: "gw-03",
      node_id: "GW-03",
      label: "Nanashi Hilltop Repeater",
      village: "Nanashi",
      block: "Dindori",
      district: "Nashik",
      lat: 20.2641,
      lon: 73.7429,
      online: true,
      last_seen_at: minutesAgo(5),
      queued: 1,
      rssi: -82,
      battery_pct: 88,
    },
    {
      id: "gw-04",
      node_id: "GW-04",
      label: "Khedgaon Solar Base Station",
      village: "Khedgaon",
      block: "Dindori",
      district: "Nashik",
      lat: 20.1518,
      lon: 73.9521,
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
      reference: "RDDL/NSK/2026/4102",
      scan_token: "REQ-NSK-4102-TOK",
      tag_id: "IN-MH-2031-4471",
      alert_id: "alt-01",
      sample_type: "Vesicular fluid & epithelium in viral transport medium",
      laboratory: "Regional Disease Diagnostic Laboratory (RDDL), Pune",
      collected_by: "Dr. Suresh Patil (BVO)",
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
      full_name: "Dr. Suresh Patil",
      designation: "Block Veterinary Officer (BVO)",
      phone: "+91 98220 11223",
      email: "bvo.dindori@ahd-mh.gov.in",
      district: "Nashik",
      block: "Dindori",
      active: true,
      created_at: hoursAgo(72),
      updated_at: hoursAgo(72),
    },
    {
      id: "rec-02",
      full_name: "Dr. Meena Rao",
      designation: "District Veterinary Officer (DVO)",
      phone: "+91 94220 33445",
      email: "dvo.nashik@ahd-mh.gov.in",
      district: "Nashik",
      block: "Nashik",
      active: true,
      created_at: hoursAgo(72),
      updated_at: hoursAgo(72),
    },
    {
      id: "rec-03",
      full_name: "Ramesh Gaikwad",
      designation: "Live-stock Development Officer (LDO)",
      phone: "+91 97650 55667",
      email: "ldo.vani@ahd-mh.gov.in",
      district: "Nashik",
      block: "Dindori",
      active: true,
      created_at: hoursAgo(72),
      updated_at: hoursAgo(72),
    },
  ];

  notifications: NotificationLog[] = [
    {
      id: "notif-01",
      channel: "sms",
      recipient: "+91 98220 11223",
      subject: "[CRITICAL] Critical BDI spike from collar IN-MH-2031-4471",
      body: "[CRITICAL] Critical BDI spike from collar IN-MH-2031-4471 — Dindori. Temp 40.8 C, HR 94 bpm, BDI 0.88. Immediate field verification advised.",
      status: "sent",
      error: null,
      alert_id: "alt-01",
      report_id: null,
      created_at: minutesAgo(11),
    },
    {
      id: "notif-02",
      channel: "email",
      recipient: "bvo.dindori@ahd-mh.gov.in",
      subject: "[CRITICAL] Critical BDI spike from collar IN-MH-2031-4471",
      body: "High-temperature and resting anomaly detected in Dindori. Animal ID: IN-MH-2031-4471. Open PashuRakshak console for 3 km quarantine ring details.",
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
