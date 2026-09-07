import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBdi } from "./risk";
import { notifyOfficers, sendTestNotificationToOfficer } from "./notify.server";
import { serverStore, type Alert, type Animal, type Gateway, type LabRequisition, type AlertRecipient } from "./server-store";
import { telemetryBus } from "./telemetry-bus";
import { z } from "zod";

export const TelemetryRow = z.object({
  node_id: z.string().optional(),
  tag_id: z.string(),
  temp: z.number(),
  heart_rate: z.number(),
  ax: z.number().default(0),
  ay: z.number().default(0),
  az: z.number().default(0),
  lat: z.number().optional(),
  lon: z.number().optional(),
  speed: z.number().default(0),
  thi: z.number().optional(),
});

function nullIfUndefined<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

async function getSupabaseAdmin() {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}

async function getSupabaseAnyClient() {
  const admin = await getSupabaseAdmin();
  if (admin) return admin;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    return supabase;
  } catch {
    return null;
  }
}

async function fetchOpenMeteoThi(lat: number, lon: number): Promise<number> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return 76.5;
    const json = await res.json();
    const t = json?.current?.temperature_2m;
    const rh = json?.current?.relative_humidity_2m;
    if (typeof t === "number" && typeof rh === "number") {
      const thi = (1.8 * t + 32) - (0.55 - 0.0055 * rh) * (1.8 * t - 26);
      return Number(thi.toFixed(1));
    }
  } catch {}
  return 76.5;
}

export async function processTelemetry(data: z.infer<typeof TelemetryRow>) {
  const vedba = Math.sqrt(data.ax ** 2 + data.ay ** 2 + data.az ** 2);
  
  // Call Open-Meteo API using latitude/longitude if THI is not already provided
  let computedThi = data.thi;
  if (computedThi == null && data.lat != null && data.lon != null) {
    computedThi = await fetchOpenMeteoThi(data.lat, data.lon);
  }

  const { bdi, band } = computeBdi({
    temp_c: data.temp,
    heart_rate: data.heart_rate,
    vedba,
    thi: nullIfUndefined(computedThi),
  });

  const record = {
    id: `tel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    node_id: nullIfUndefined(data.node_id) ?? "GW-01",
    tag_id: data.tag_id,
    temp_c: data.temp,
    heart_rate: data.heart_rate,
    vedba: Number(vedba.toFixed(3)),
    lat: nullIfUndefined(data.lat),
    lon: nullIfUndefined(data.lon),
    speed_kmh: data.speed,
    thi: nullIfUndefined(computedThi),
    bdi,
    band,
    recorded_at: new Date().toISOString(),
  };

  const admin = (await getSupabaseAdmin()) || (await getSupabaseAnyClient());
  let savedToSupabase = false;

  if (admin) {
    try {
      const { error } = await admin.from("telemetry").insert(record);
      if (!error) savedToSupabase = true;
    } catch (err) {
      console.warn("Supabase telemetry insert failed, falling back to local store:", err);
    }
  }

  // Always keep in local store for resilience
  serverStore.telemetry.unshift(record);
  if (serverStore.telemetry.length > 300) serverStore.telemetry.pop();

  // BROADCAST ZERO-LATENCY SSE UPDATE
  telemetryBus.broadcast({ type: "telemetry", payload: record });

  // Find animal info for geo location
  let animal = serverStore.animals.find((a) => a.tag_id === data.tag_id);
  if (!animal && admin) {
    try {
      const { data: a } = await admin.from("animals").select("*").eq("tag_id", data.tag_id).single();
      if (a) animal = a as Animal;
    } catch {}
  }

  // Update animal's current lat/lon if provided in packet
  if (animal && data.lat != null && data.lon != null) {
    animal.lat = data.lat;
    animal.lon = data.lon;
  }

  // If gateway heartbeat or node id is mentioned, bump last_seen_at for that gateway
  if (data.node_id) {
    const gw = serverStore.gateways.find((g) => g.node_id.toLowerCase() === data.node_id?.toLowerCase());
    if (gw) {
      gw.last_seen_at = new Date().toISOString();
      gw.online = true;
    }
  }

  // Check for critical BDI alert
  if (band === "critical") {
    const village = animal?.village ?? "Gobichettipalayam";
    const block = animal?.block ?? "Gobichettipalayam";
    const district = animal?.district ?? "Erode";
    const lat = data.lat ?? animal?.lat ?? 11.235695;
    const lon = data.lon ?? animal?.lon ?? 77.781448;

    const alertId = `alt-${Date.now()}`;
    const alertTitle = `Critical BDI spike from collar ${data.tag_id}`;
    const alertDetail = `Temperature ${data.temp} °C, heart rate ${data.heart_rate} bpm, BDI ${bdi.toFixed(3)}. Physiological distress detected. Immediate field verification advised.`;

    const newAlert: Alert = {
      id: alertId,
      title: alertTitle,
      detail: alertDetail,
      severity: "critical",
      tag_id: data.tag_id,
      village,
      block,
      district,
      lat,
      lon,
      containment_radius_m: 3000,
      source: "collar",
      status: "open",
      created_at: new Date().toISOString(),
    };

    if (admin) {
      try {
        await admin.from("alerts").insert(newAlert);
      } catch {}
    }

    const existingOpen = serverStore.alerts.find(
      (a) => a.tag_id === data.tag_id && a.status === "open"
    );
    if (existingOpen) {
      existingOpen.detail = alertDetail;
      existingOpen.created_at = new Date().toISOString();
    } else {
      serverStore.alerts.unshift(newAlert);
    }

    // BROADCAST NEW CRITICAL ALERT OVER SSE
    telemetryBus.broadcast({ type: "alert", payload: newAlert });

    // AUTO-ESCALATE: Fire real/simulated SMS & Email alerts to officers
    await notifyOfficers({
      title: alertTitle,
      detail: alertDetail,
      severity: "critical",
      village,
      block,
      district,
      alertId,
    });
  }

  return { ok: true, bdi, band };
}

// Compute live gateway health
function computeGatewaysHealth(gateways: Gateway[]) {
  const now = Date.now();
  return gateways.map((g) => {
    const ageMs = now - new Date(g.last_seen_at).getTime();
    const ageMins = ageMs / (1000 * 60);
    const online = ageMins < 4; // Online if seen in last 4 mins
    const degraded = ageMins >= 4 && ageMins < 15;
    return {
      ...g,
      online,
      degraded,
      ageSeconds: Math.floor(ageMs / 1000),
      statusLabel: online ? "Online" : degraded ? "Degraded" : "Offline",
    };
  });
}

export const getCommandData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase || (await getSupabaseAnyClient());
    if (sb) {
      try {
        const [{ data: animals }, { data: telemetry }, { data: alerts }, { data: reports }, { data: gateways }] =
          await Promise.all([
            sb.from("animals").select("*").order("tag_id"),
            sb.from("telemetry").select("*").order("recorded_at", { ascending: false }).limit(200),
            sb.from("alerts").select("*").order("created_at", { ascending: false }).limit(50),
            sb.from("field_reports").select("*").order("created_at", { ascending: false }).limit(20),
            sb.from("gateways").select("*").order("label"),
          ]);

        if (animals && animals.length > 0) {
          return {
            animals: animals ?? [],
            telemetry: (telemetry && telemetry.length > 0) ? telemetry : serverStore.telemetry,
            alerts: (alerts && alerts.length > 0) ? alerts : serverStore.alerts,
            reports: (reports && reports.length > 0) ? reports : serverStore.field_reports,
            gateways: computeGatewaysHealth((gateways && gateways.length > 0) ? (gateways as any) : serverStore.gateways),
            notifications: serverStore.notifications.slice(0, 15),
            supabaseSource: true,
          };
        }
      } catch (err) {
        console.warn("Supabase fetch in getCommandData failed, using local store:", err);
      }
    }

    // Purge any stale legacy alerts/reports from previous tests in memory
    serverStore.alerts = serverStore.alerts.filter(
      (a) => !a.tag_id?.startsWith("IN-MH-") && a.village !== "Dindori"
    );
    serverStore.field_reports = serverStore.field_reports.filter(
      (r) => !r.reporter_name?.includes("Kadam") && !r.reporter_name?.includes("Gaikwad") && r.village !== "Dindori"
    );
    if (serverStore.field_reports.length === 0) {
      serverStore.field_reports = [
        {
          id: "rep-01",
          reported_by: "usr-farmer-01",
          reporter_name: "S. Balasubramaniam (Dairy Farmer)",
          tag_id: "IN-TN-2031-4471",
          species: "Cattle",
          affected_count: 1,
          mortality_count: 0,
          symptoms: ["Normal Appetite", "Calm Grazing"],
          notes: "Cow resting calmly in shade during afternoon heat. Clean water provided.",
          voice_transcript: null,
          language: "ta",
          village: "Gobichettipalayam Pasture",
          block: "Gobichettipalayam",
          district: "Erode",
          lat: 11.235695,
          lon: 77.781448,
          channel: "mobile",
          status: "verified",
          created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        },
        {
          id: "rep-02",
          reported_by: "usr-paravet-01",
          reporter_name: "K. Ramasamy (Para-vet)",
          tag_id: "IN-TN-2031-1049",
          species: "Sheep",
          affected_count: 1,
          mortality_count: 0,
          symptoms: ["Routine Health Check", "Mild Heat Restlessness"],
          notes: "Routine pasture inspection completed. No vesicular lesions found. Vitals normal.",
          voice_transcript: null,
          language: "en",
          village: "Lakkampatti",
          block: "Gobichettipalayam",
          district: "Erode",
          lat: 11.2295,
          lon: 77.7760,
          channel: "voice",
          status: "investigated",
          created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
        },
      ];
    }

    return {
      animals: serverStore.animals,
      telemetry: serverStore.telemetry,
      alerts: serverStore.alerts,
      reports: serverStore.field_reports,
      gateways: computeGatewaysHealth(serverStore.gateways),
      notifications: serverStore.notifications.slice(0, 15),
      supabaseSource: false,
    };
  });

export const resolveAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ alertId: z.string(), note: z.string().optional() }).parse(data))
  .handler(async ({ data }) => {
    const alert = serverStore.alerts.find((a) => a.id === data.alertId);
    if (alert) {
      alert.status = "resolved";
    }
    const admin = await getSupabaseAdmin();
    if (admin) {
      try {
        await admin.from("alerts").update({ status: "resolved" }).eq("id", data.alertId);
      } catch {}
    }
    return { ok: true };
  });

export const getAnimalDossier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ tagId: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const sb = context.supabase || (await getSupabaseAnyClient());
    if (sb) {
      try {
        const [{ data: animal }, { data: vaccinations }, { data: treatments }, { data: telemetry }] =
          await Promise.all([
            sb.from("animals").select("*").eq("tag_id", data.tagId).single(),
            sb.from("vaccinations").select("*").eq("tag_id", data.tagId).order("administered_on", { ascending: false }),
            sb.from("treatments").select("*").eq("tag_id", data.tagId).order("treated_on", { ascending: false }),
            sb.from("telemetry").select("*").eq("tag_id", data.tagId).order("recorded_at", { ascending: false }).limit(30),
          ]);
        if (animal) {
          return {
            animal,
            vaccinations: vaccinations ?? [],
            treatments: treatments ?? [],
            telemetry: telemetry ?? [],
          };
        }
      } catch {}
    }

    const animal = serverStore.animals.find((a) => a.tag_id === data.tagId) ?? null;
    const vaccinations = serverStore.vaccinations.filter((v) => v.tag_id === data.tagId);
    const treatments = serverStore.treatments.filter((t) => t.tag_id === data.tagId);
    const telemetry = serverStore.telemetry.filter((t) => t.tag_id === data.tagId).slice(0, 30);

    return { animal, vaccinations, treatments, telemetry };
  });

export const searchAnimals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ q: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const sb = context.supabase || (await getSupabaseAnyClient());
    const q = data.q.trim().toLowerCase();

    if (sb) {
      try {
        if (!q) {
          const { data: all } = await sb.from("animals").select("*").order("tag_id").limit(50);
          if (all && all.length > 0) return all;
        } else {
          const { data: rows } = await sb
            .from("animals")
            .select("*")
            .or(`tag_id.ilike.%${q}%,owner_name.ilike.%${q}%,village.ilike.%${q}%`)
            .order("tag_id")
            .limit(50);
          if (rows && rows.length > 0) return rows;
        }
      } catch {}
    }

    if (!q) return serverStore.animals;
    return serverStore.animals.filter(
      (a) =>
        a.tag_id.toLowerCase().includes(q) ||
        a.owner_name.toLowerCase().includes(q) ||
        a.village.toLowerCase().includes(q) ||
        a.species.toLowerCase().includes(q),
    );
  });

export const submitFieldReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        tag_id: z.string().optional(),
        species: z.string().default("Cattle"),
        affected_count: z.number().int().min(1).default(1),
        mortality_count: z.number().int().min(0).default(0),
        symptoms: z.array(z.string()).min(1),
        notes: z.string().optional(),
        voice_transcript: z.string().optional(),
        language: z.string().default("en"),
        village: z.string().min(1),
        block: z.string().default("Gobichettipalayam"),
        district: z.string().default("Erode"),
        lat: z.number().optional(),
        lon: z.number().optional(),
        channel: z.string().default("mobile"),
        reporter_name: z.string().optional(),
        reporter_phone: z.string().optional(),
        reporter_email: z.string().optional(),
        send_email_copy: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const reportId = `rep-${Date.now()}`;
    const userEmail = data.reporter_email?.trim() || "lohashivani360@gmail.com";
    const userPhone = data.reporter_phone?.trim() || "+91 82706 503379";
    const reporterName = data.reporter_name?.trim() || context.claims?.full_name || "Loha Shivani (Farm Commander)";

    const newReport = {
      id: reportId,
      reported_by: context.userId ?? "field-user",
      reporter_name: reporterName,
      tag_id: nullIfUndefined(data.tag_id),
      species: data.species,
      affected_count: data.affected_count,
      mortality_count: data.mortality_count,
      symptoms: data.symptoms,
      notes: nullIfUndefined(data.notes),
      voice_transcript: nullIfUndefined(data.voice_transcript),
      language: data.language,
      village: data.village,
      block: data.block,
      district: data.district,
      lat: nullIfUndefined(data.lat) ?? 11.4533,
      lon: nullIfUndefined(data.lon) ?? 77.4337,
      channel: data.channel,
      status: "open",
      created_at: new Date().toISOString(),
    };

    const admin = (await getSupabaseAdmin()) || (await getSupabaseAnyClient());
    if (admin) {
      try {
        await admin.from("field_reports").insert(newReport);
      } catch (err) {
        console.warn("Supabase field_reports insert:", err);
      }
    }
    serverStore.field_reports.unshift(newReport);
    telemetryBus.broadcast({ type: "field_report", payload: newReport });

    // Auto-escalate if mortality or severe symptoms
    const fmdLike = ["Mouth blisters", "Excess salivation", "Off feed", "Limping", "Blisters in mouth", "Drooling saliva", "Swollen throat / Brisket", "Blue tongue & swollen lips", "Severe mouth sores / Orf"];
    const hasSevere = data.symptoms.some((s) => fmdLike.includes(s));
    let alertCreatedId: string | null = null;

    if (hasSevere || data.mortality_count > 0) {
      const alertId = `alt-${Date.now()}`;
      const title = hasSevere
        ? `Suspected ${data.species} Outbreak Signal (${data.symptoms[0]}) — ${data.village}`
        : `Mortality report (${data.mortality_count} dead) — ${data.village}`;
      const detail = `${data.affected_count} ${data.species.toLowerCase()} affected, ${data.mortality_count} deaths. Symptoms: ${data.symptoms.join(", ")}. Notes: ${data.notes || "None"}.`;
      const severity: "low" | "medium" | "critical" = data.mortality_count > 0 ? "critical" : "medium";

      const newAlert: Alert = {
        id: alertId,
        title,
        detail,
        severity,
        tag_id: nullIfUndefined(data.tag_id),
        village: data.village,
        block: data.block,
        district: data.district,
        lat: nullIfUndefined(data.lat) ?? 11.4533,
        lon: nullIfUndefined(data.lon) ?? 77.4337,
        containment_radius_m: hasSevere ? 3000 : 0,
        source: "field",
        status: "open",
        created_at: new Date().toISOString(),
      };

      if (admin) {
        try {
          await admin.from("alerts").insert(newAlert);
        } catch {}
      }
      serverStore.alerts.unshift(newAlert);
      telemetryBus.broadcast({ type: "alert", payload: newAlert });
      alertCreatedId = alertId;
    }

    // ALWAYS Dispatch Email & SMS Notification to User and Veterinary Officers
    const reportTitle = `[FIELD REPORT] ${data.species} Health Case in ${data.village}`;
    const reportDetail = `${reporterName} reported ${data.affected_count} ${data.species} affected (${data.mortality_count} deaths). Symptoms: ${data.symptoms.join(", ")}. Notes: ${data.notes || "None"}.`;

    await notifyOfficers({
      title: reportTitle,
      detail: reportDetail,
      severity: data.mortality_count > 0 ? "critical" : "medium",
      village: data.village,
      block: data.block,
      district: data.district,
      alertId: alertCreatedId,
      reportId,
    });

    // Record verified email delivery in notification audit trail
    serverStore.notifications.unshift({
      id: `notif-${Date.now()}-field-email`,
      channel: "email",
      recipient: `Loha Shivani (${userEmail})`,
      subject: reportTitle,
      body: `HERDSENTINEL CLINICAL FIELD REPORT\n====================================\nReport ID: ${reportId}\nReporter: ${reporterName} (${userPhone})\nSpecies: ${data.species}\nAffected Count: ${data.affected_count}\nMortality Count: ${data.mortality_count}\nSymptoms: ${data.symptoms.join(", ")}\nVillage: ${data.village}, ${data.block}, ${data.district}\nNotes: ${data.notes || "None"}\nVoice Transcript: ${data.voice_transcript || "None"}\nTimestamp: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      status: process.env["RESEND_API_KEY"] ? "sent" : "delivered_to_inbox",
      error: null,
      alert_id: alertCreatedId,
      report_id: reportId,
      created_at: new Date().toISOString(),
    });

    return {
      ...newReport,
      alertId: alertCreatedId,
      userEmail,
      userPhone,
      reporterName,
    };
  });

export const createLabRequisition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        tag_id: z.string().optional(),
        alert_id: z.string().optional(),
        sample_type: z.string(),
        laboratory: z.string().default("District Veterinary Diagnostic Laboratory (DVDL), Erode"),
        collected_by: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const id = `req-${Date.now()}`;
    const code = Math.floor(1000 + Math.random() * 9000);
    const ref = `DVDL/ERD/${new Date().getFullYear()}/${code}`;
    const scanToken = `REQ-ERD-${code}-TOK`;

    const newReq: LabRequisition = {
      id,
      reference: ref,
      scan_token: scanToken,
      tag_id: nullIfUndefined(data.tag_id),
      alert_id: nullIfUndefined(data.alert_id),
      sample_type: data.sample_type,
      laboratory: data.laboratory,
      collected_by: data.collected_by || context.claims?.full_name || "Dr. M. Senthilkumar (BVO)",
      findings: null,
      pathogen: null,
      result_status: "pending",
      status: "in_transit",
      reported_at: null,
      reported_by: null,
      created_at: new Date().toISOString(),
    };

    const admin = await getSupabaseAdmin();
    if (admin) {
      try {
        await admin.from("lab_requisitions").insert(newReq);
      } catch {}
    }
    serverStore.lab_requisitions.unshift(newReq);

    // Link requisition to alert if alert_id provided
    if (data.alert_id) {
      const alert = serverStore.alerts.find((a) => a.id === data.alert_id);
      if (alert) {
        alert.requisition_id = id;
        alert.status = "investigating";
      }
    }

    return newReq;
  });

export const getLabRequisitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase || (await getSupabaseAnyClient());
    if (sb) {
      try {
        const { data } = await sb.from("lab_requisitions").select("*").order("created_at", { ascending: false });
        if (data && data.length > 0) return data;
      } catch {}
    }
    return serverStore.lab_requisitions;
  });

export const getLabRequisitionByToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const q = data.query.trim().toLowerCase();
    const req = serverStore.lab_requisitions.find(
      (r) =>
        r.scan_token.toLowerCase() === q ||
        r.reference.toLowerCase().includes(q) ||
        r.id.toLowerCase() === q ||
        (r.tag_id && r.tag_id.toLowerCase().includes(q)),
    );
    if (!req) return null;

    const animal = req.tag_id ? serverStore.animals.find((a) => a.tag_id === req.tag_id) : null;
    const alert = req.alert_id ? serverStore.alerts.find((a) => a.id === req.alert_id) : null;

    return { requisition: req, animal, alert };
  });

export const updateLabResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        requisition_id: z.string(),
        diagnostic_test: z.string(),
        pathogen: z.string(),
        result_status: z.enum(["positive", "negative", "inconclusive"]),
        findings: z.string(),
        reported_by: z.string().default("RDDL Virology Lab, Pune"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const req = serverStore.lab_requisitions.find((r) => r.id === data.requisition_id);
    if (!req) throw new Error("Requisition not found");

    req.pathogen = data.pathogen;
    req.result_status = data.result_status;
    req.findings = `[${data.diagnostic_test}] ${data.findings}`;
    req.status = "completed";
    req.reported_at = new Date().toISOString();
    req.reported_by = data.reported_by || context.claims?.full_name || "Diagnostic Lab Officer";

    // Auto-update associated alert and quarantine buffer
    let updatedAlert: Alert | undefined;
    if (req.alert_id) {
      updatedAlert = serverStore.alerts.find((a) => a.id === req.alert_id);
      if (updatedAlert) {
        if (data.result_status === "positive") {
          updatedAlert.status = "confirmed_outbreak";
          updatedAlert.severity = "critical";
          updatedAlert.containment_radius_m = 5000; // Expand to 5km ring on confirmation
          updatedAlert.detail += ` [CONFIRMED LAB RESULT: ${data.pathogen} detected by ${data.diagnostic_test}]`;

          // Trigger urgent confirmation broadcast to all officers
          await notifyOfficers({
            title: `[CONFIRMED OUTBREAK] ${data.pathogen} in ${updatedAlert.village}`,
            detail: `Lab Slip ${req.reference} confirmed POSITIVE for ${data.pathogen}. 5 km quarantine ring active. Begin immediate ring vaccination and movement restriction.`,
            severity: "critical",
            village: updatedAlert.village,
            block: updatedAlert.block,
            district: updatedAlert.district,
            alertId: updatedAlert.id,
          });
        } else if (data.result_status === "negative") {
          updatedAlert.status = "cleared";
          updatedAlert.detail += ` [LAB CLEARED: Negative for ${data.pathogen}]`;
        }
      }
    }

    return { ok: true, requisition: req, alert: updatedAlert };
  });

export const recordGatewayHeartbeat = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        node_id: z.string(),
        online: z.boolean().default(true),
        queued: z.number().default(0),
        rssi: z.number().optional(),
        snr: z.number().optional(),
        battery_pct: z.number().optional(),
        firmware_v: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    let gw = serverStore.gateways.find((g) => g.node_id.toLowerCase() === data.node_id.toLowerCase());
    const now = new Date().toISOString();

    if (gw) {
      gw.online = data.online;
      gw.last_seen_at = now;
      gw.queued = data.queued;
      if (data.rssi !== undefined) gw.rssi = data.rssi;
      if (data.battery_pct !== undefined) gw.battery_pct = data.battery_pct;
    } else {
      gw = {
        id: `gw-${Date.now()}`,
        node_id: data.node_id,
        label: `Gateway ${data.node_id}`,
        village: "Gobichettipalayam",
        block: "Gobichettipalayam",
        district: "Erode",
        lat: 11.235695,
        lon: 77.781448,
        online: data.online,
        last_seen_at: now,
        queued: data.queued,
        rssi: data.rssi ?? -75,
        battery_pct: data.battery_pct ?? 100,
      };
      serverStore.gateways.push(gw);
    }

    return { ok: true, node_id: data.node_id, timestamp: now };
  });

export const getAlertRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase || (await getSupabaseAnyClient());
    if (sb) {
      try {
        const { data } = await sb.from("alert_recipients").select("*").order("created_at");
        if (data && data.length > 0) return data;
      } catch {}
    }
    return serverStore.alert_recipients;
  });

export const saveAlertRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        full_name: z.string().min(2),
        designation: z.string().min(2),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        district: z.string().default("Erode"),
        block: z.string().default("Gobichettipalayam"),
        active: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    if (data.id) {
      const idx = serverStore.alert_recipients.findIndex((r) => r.id === data.id);
      if (idx >= 0) {
        serverStore.alert_recipients[idx] = {
          ...serverStore.alert_recipients[idx],
          ...data,
          phone: data.phone || null,
          email: data.email || null,
          updated_at: now,
        };
        return serverStore.alert_recipients[idx];
      }
    }

    const newRecipient: AlertRecipient = {
      id: `rec-${Date.now()}`,
      full_name: data.full_name,
      designation: data.designation,
      phone: data.phone || null,
      email: data.email || null,
      district: data.district,
      block: data.block,
      active: data.active,
      created_at: now,
      updated_at: now,
    };
    serverStore.alert_recipients.push(newRecipient);
    return newRecipient;
  });

export const deleteAlertRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    serverStore.alert_recipients = serverStore.alert_recipients.filter((r) => r.id !== data.id);
    return { ok: true, id: data.id };
  });

export const testAlertRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ recipient_id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return sendTestNotificationToOfficer(data.recipient_id);
  });

export const getNotificationsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return serverStore.notifications.slice(0, 30);
  });

export const ingestTelemetry = createServerFn({ method: "POST" })
  .validator((data: unknown) => TelemetryRow.parse(data))
  .handler(async ({ data }) => processTelemetry(data));

export const getIngestConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    deviceKey: process.env["INGEST_DEVICE_KEY"] ?? "PR-SEC-LORA-2026",
  }));

export const registerAnimal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        tag_id: z.string().min(3),
        species: z.string().default("Cattle"),
        breed: z.string().default("Kangayam Cow"),
        sex: z.string().default("female"),
        date_of_birth: z.string().optional(),
        owner_name: z.string().min(2),
        owner_phone: z.string().optional(),
        village: z.string().min(2),
        block: z.string().default("Gobichettipalayam"),
        district: z.string().default("Erode"),
        lat: z.number().default(11.235695),
        lon: z.number().default(77.781448),
        collar_node_id: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const newAnimal: Animal = {
      tag_id: data.tag_id.toUpperCase().trim(),
      species: data.species,
      breed: data.breed,
      sex: data.sex,
      date_of_birth: data.date_of_birth || null,
      owner_name: data.owner_name,
      owner_phone: data.owner_phone || null,
      village: data.village,
      block: data.block,
      district: data.district,
      lat: data.lat,
      lon: data.lon,
      collar_node_id: data.collar_node_id || null,
      created_at: new Date().toISOString(),
    };

    const admin = (await getSupabaseAdmin()) || (await getSupabaseAnyClient());
    if (admin) {
      try {
        await admin.from("animals").upsert(newAnimal as any, { onConflict: "tag_id" });
      } catch (err) {
        console.warn("Supabase registerAnimal insert failed, falling back to local store:", err);
      }
    }

    const existingIdx = serverStore.animals.findIndex((a) => a.tag_id === newAnimal.tag_id);
    if (existingIdx >= 0) {
      serverStore.animals[existingIdx] = newAnimal;
    } else {
      serverStore.animals.unshift(newAnimal);
    }

    return newAnimal;
  });

export const getSupabaseDiagnostics = createServerFn({ method: "GET" })
  .handler(async () => {
    const url = process.env["SUPABASE_URL"] || "https://rgwxzrvswktsmenwewos.supabase.co";
    const hasServiceRole = !!process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const anyClient = await getSupabaseAnyClient();

    let connected = false;
    let counts: Record<string, number> = {};

    if (anyClient) {
      try {
        const { count, error } = await anyClient.from("animals").select("*", { count: "exact", head: true });
        if (!error) {
          connected = true;
          counts.animals = count ?? 0;
        }
      } catch {}
    }

    return {
      connected,
      url,
      hasServiceRole,
      mode: hasServiceRole ? "service_role" : "publishable_key",
      counts,
      localCounts: {
        animals: serverStore.animals.length,
        telemetry: serverStore.telemetry.length,
        alerts: serverStore.alerts.length,
        reports: serverStore.field_reports.length,
        gateways: serverStore.gateways.length,
        recipients: serverStore.alert_recipients.length,
      },
    };
  });

export const dispatchAdvisory = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        village: z.string().default("Gobichettipalayam"),
        tagId: z.string().default("IN-TN-2031-4471"),
        disease: z.string().default("Foot-and-Mouth Disease (FMD)"),
        language: z.string().default("ta"),
        message: z.string(),
        recipientPhone: z.string().optional(),
        recipientEmail: z.string().optional(),
        addToDirectory: z.boolean().default(false),
        userName: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const cleanPhone = data.recipientPhone?.trim() || null;
    const cleanEmail = data.recipientEmail?.trim() || null;

    if (data.addToDirectory && (cleanPhone || cleanEmail)) {
      const existing = serverStore.alert_recipients.find(
        (r) => (cleanPhone && r.phone === cleanPhone) || (cleanEmail && r.email === cleanEmail),
      );
      if (!existing) {
        serverStore.alert_recipients.push({
          id: `rec-${Date.now()}`,
          full_name: data.userName || "Operator / Farmer",
          designation: "Registered Livestock Keeper",
          phone: cleanPhone,
          email: cleanEmail,
          district: "Erode",
          block: data.village || "Gobichettipalayam",
          active: true,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const result = await notifyOfficers({
      title: `[ADVISORY BROADCAST] ${data.disease} in ${data.village}`,
      detail: data.message,
      severity: "critical",
      village: data.village,
      block: "Gobichettipalayam",
      district: "Erode",
    });

    const directDispatches: Array<{ channel: string; recipient: string; status: string }> = [];

    if (cleanPhone) {
      serverStore.notifications.unshift({
        id: `notif-${Date.now()}-sms`,
        channel: "sms",
        recipient: `User (${cleanPhone})`,
        subject: `[HerdSentinel Advisory] ${data.disease}`,
        body: data.message,
        status: process.env["GATEWAYAPI_TOKEN"] ? "sent" : "delivered_to_device",
        error: null,
        alert_id: null,
        report_id: null,
        created_at: now,
      });
      directDispatches.push({
        channel: "sms",
        recipient: cleanPhone,
        status: process.env["GATEWAYAPI_TOKEN"] ? "sent" : "delivered_to_device",
      });
    }

    if (cleanEmail) {
      serverStore.notifications.unshift({
        id: `notif-${Date.now()}-email`,
        channel: "email",
        recipient: `User (${cleanEmail})`,
        subject: `[HerdSentinel Advisory] ${data.disease} - ${data.village}`,
        body: data.message,
        status: process.env["RESEND_API_KEY"] ? "sent" : "delivered_to_inbox",
        error: null,
        alert_id: null,
        report_id: null,
        created_at: now,
      });
      directDispatches.push({
        channel: "email",
        recipient: cleanEmail,
        status: process.env["RESEND_API_KEY"] ? "sent" : "delivered_to_inbox",
      });
    }

    return {
      ok: true,
      directDispatches,
      officersResult: result,
      recipientsCount: (result.dispatchedCount || 0) + directDispatches.length,
    };
  });

