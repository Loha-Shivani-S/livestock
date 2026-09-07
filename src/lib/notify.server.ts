import { serverStore } from "./server-store";

type NotifyInput = {
  title: string;
  detail: string;
  severity: "low" | "medium" | "critical";
  village: string;
  block?: string;
  district?: string;
  alertId?: string | null;
  reportId?: string | null;
};

type Recipient = {
  id?: string;
  full_name: string;
  designation: string;
  phone: string | null;
  email: string | null;
  district: string;
  block: string;
};

function msisdn(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return Number(`91${digits}`);
  if (digits.length >= 11 && digits.length <= 15) return Number(digits);
  return null;
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

// Resilient key retriever that reads process.env or falls back to reading .env file directly
async function getResendConfig(): Promise<{ key: string | null; from: string }> {
  let key = process.env["RESEND_API_KEY"] || null;
  let from = process.env["ALERT_FROM_EMAIL"] || null;

  if (!key || !from) {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const envLocalPath = path.resolve(process.cwd(), ".env.local");
      const envPath = path.resolve(process.cwd(), ".env");
      let text = "";
      if (fs.existsSync(envLocalPath)) {
        text += fs.readFileSync(envLocalPath, "utf-8") + "\n";
      }
      if (fs.existsSync(envPath)) {
        text += fs.readFileSync(envPath, "utf-8");
      }
      if (text) {
        if (!key) {
          const mKey = text.match(/RESEND_API_KEY=["']?([^"'\r\n]+)/);
          if (mKey && mKey[1]) {
            key = mKey[1].trim();
            process.env["RESEND_API_KEY"] = key;
          }
        }
        if (!from) {
          const mFrom = text.match(/ALERT_FROM_EMAIL=["']?([^"'\r\n]+)/);
          if (mFrom && mFrom[1]) {
            from = mFrom[1].trim();
            process.env["ALERT_FROM_EMAIL"] = from;
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Resend free tier accounts strictly require onboarding@resend.dev until custom domain is DNS-verified
  const defaultSender = "HerdSentinel Alerts <onboarding@resend.dev>";
  return {
    key,
    from: from || defaultSender,
  };
}

async function log(row: {
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  error?: string | null;
  alertId?: string | null;
  reportId?: string | null;
}) {
  const admin = await getSupabaseAdmin();
  if (admin) {
    try {
      await admin.from("notifications").insert({
        channel: row.channel,
        recipient: row.recipient,
        subject: row.subject,
        body: row.body,
        status: row.status,
        error: row.error ?? null,
        alert_id: row.alertId ?? null,
        report_id: row.reportId ?? null,
      });
      return;
    } catch (err) {
      console.warn("Failed to log notification to Supabase, logging to local store", err);
    }
  }

  // Fallback to resilient serverStore
  serverStore.notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    channel: row.channel,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    status: row.status,
    error: row.error ?? null,
    alert_id: row.alertId ?? null,
    report_id: row.reportId ?? null,
    created_at: new Date().toISOString(),
  });
}

async function sendSms(to: string, message: string) {
  const token = process.env["GATEWAYAPI_TOKEN"];
  const sender = process.env["GATEWAYAPI_SENDER"] || "PashuRak";

  if (!token) {
    // Transparent simulated delivery so officers and juries see the notification pipeline in action
    return {
      status: "simulated_delivered",
      error: null,
      simulated: true,
      info: "Simulated SMS delivery (Set GATEWAYAPI_TOKEN for live carrier SMS)",
    };
  }

  const number = msisdn(to);
  if (!number) return { status: "failed", error: `Unusable phone number: ${to}` };

  try {
    const response = await fetch("https://gatewayapi.eu/rest/mtsms", {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sender, message, recipients: [{ msisdn: number }] }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`GatewayAPI SMS failed [${response.status}]: ${body}`);
      return { status: "failed", error: `[${response.status}] ${body}`.slice(0, 500) };
    }
    return { status: "sent", error: null };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const { key, from } = await getResendConfig();

  if (!key) {
    return {
      status: "simulated_delivered",
      error: null,
      simulated: true,
      info: "Simulated Email delivery (Set RESEND_API_KEY in .env for live SMTP)",
    };
  }

  // Resend Free Tier restriction:
  // When using onboarding@resend.dev, Resend ONLY allows delivery to the account owner's email (lohashivani360@gmail.com).
  // Other mock recipient domains (e.g., .gov.in) are safely simulated to prevent 403 rejection.
  const isFreeTierSender = from.includes("onboarding@resend.dev");
  const isAccountOwner = to.toLowerCase().includes("lohashivani360@gmail.com");

  if (isFreeTierSender && !isAccountOwner) {
    return {
      status: "simulated_delivered",
      error: null,
      simulated: true,
      info: `Simulated for ${to} (Resend free tier routes live email to lohashivani360@gmail.com)`,
    };
  }

  try {
    const payload: Record<string, any> = {
      from,
      to: [to],
      subject,
      text,
    };
    if (html) {
      payload.html = html;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Resend email failed [${response.status}]: ${body}`);
      return { status: "failed", error: `[${response.status}] ${body}`.slice(0, 500) };
    }

    const resData = await response.json().catch(() => ({}));
    console.log(`[Resend] Successfully delivered email to ${to}, Resend ID: ${resData.id}`);
    return { status: "sent", error: null, id: resData.id };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

function buildAlertHtml(opts: {
  title: string;
  detail: string;
  severity: string;
  village: string;
  block?: string;
  district?: string;
  reportId?: string | null;
  alertId?: string | null;
}) {
  const isCritical = opts.severity === "critical";
  const badgeBg = isCritical ? "#ef4444" : "#f59e0b";
  const badgeText = isCritical ? "CRITICAL OUTBREAK SIGNAL" : "HEALTH ADVISORY";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; padding: 32px 16px; color: #f1f5f9;">
      <div style="max-width: 600px; margin: 0 auto; background: #111827; border-radius: 14px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        <!-- Header -->
        <div style="background: #030712; padding: 24px 28px; border-bottom: 1px solid #1f2937;">
          <div style="display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; background: ${badgeBg}; color: #ffffff;">
            ${badgeText}
          </div>
          <h1 style="margin: 14px 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
            ${opts.title}
          </h1>
          <div style="font-size: 12px; color: #9ca3af; letter-spacing: 0.02em;">
            HerdSentinel Multi-Species Biosecurity & Telemetry Network
          </div>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px;">
          <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid ${badgeBg}; padding: 16px 18px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; line-height: 1.6; color: #fca5a5;">
            <strong style="color: #ffffff;">Field Summary:</strong><br/>
            ${opts.detail}
          </div>

          <!-- Metadata Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #9ca3af; width: 38%;">Target Village / Pasture</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #f3f4f6; font-weight: 600;">${opts.village}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #9ca3af;">Block & District</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #f3f4f6;">${opts.block || "Gobichettipalayam"}, ${opts.district || "Erode"}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #9ca3af;">Designated Commander</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #f3f4f6;">Loha Shivani (+91 82706 503379)</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #9ca3af;">Direct Recipient</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #22c55e; font-family: monospace;">lohashivani360@gmail.com</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #9ca3af;">Detection Timestamp</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #f3f4f6;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
            </tr>
            ${opts.reportId ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #9ca3af;">Field Report ID</td><td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #38bdf8; font-family: monospace;">${opts.reportId}</td></tr>` : ""}
            ${opts.alertId ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #9ca3af;">Containment Alert ID</td><td style="padding: 10px 0; border-bottom: 1px solid #1f2937; color: #f43f5e; font-family: monospace;">${opts.alertId}</td></tr>` : ""}
          </table>

          <!-- Actions -->
          <div style="text-align: center; margin: 30px 0 16px 0;">
            <a href="http://localhost:8080/command" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);">
              Open Command Console & View Containment Zone →
            </a>
          </div>

          <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 14px;">
            Emergency Toll-Free Helpline: <strong style="color: #f3f4f6;">1962</strong> (Tamil Nadu Pashu Chikitsalaya)
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #030712; padding: 18px 28px; border-top: 1px solid #1f2937; font-size: 11px; color: #6b7280; text-align: center; line-height: 1.6;">
          This automated alert was dispatched by HerdSentinel Localhost Dev using verified Resend SMTP integration.<br/>
          Recipient registered: <code>lohashivani360@gmail.com</code> | Farm Commander: <code>Loha Shivani</code>
        </div>
      </div>
    </div>
  `;
}

/**
 * Fan out a critical/medium alert to veterinary officers by SMS and email.
 * Never throws: notification issues must never interrupt clinical operations.
 */
export async function notifyOfficers(input: NotifyInput) {
  try {
    let recipients: Recipient[] = [];
    const admin = await getSupabaseAdmin();

    if (admin) {
      try {
        const { data } = await admin
          .from("alert_recipients")
          .select("id, full_name, designation, phone, email, district, block")
          .eq("active", true);
        if (data && data.length > 0) recipients = data as Recipient[];
      } catch (err) {
        console.warn("Could not load recipients from Supabase, using local directory", err);
      }
    }

    if (recipients.length === 0) {
      recipients = serverStore.alert_recipients.filter((r) => r.active);
    }

    const scoped = recipients.filter(
      (r) => !input.block || r.block.toLowerCase() === input.block.toLowerCase() || r.district.toLowerCase() === (input.district ?? "Erode").toLowerCase(),
    );

    const targetList = scoped.length ? [...scoped] : [...recipients];

    const userContact: Recipient = {
      id: "rec-owner-01",
      full_name: "Loha Shivani (Farm Commander & Lead Herd Manager)",
      designation: "Designated Farm Commander & Lead Herd Manager",
      phone: "+91 82706 503379",
      email: "lohashivani360@gmail.com",
      district: "Erode",
      block: "Gobichettipalayam",
    };

    if (!targetList.some((r) => r.email === userContact.email || r.phone === userContact.phone)) {
      targetList.unshift(userContact);
    }

    const subject = `[${input.severity.toUpperCase()}] ${input.title}`;
    const body = [
      `HERDSENTINEL MULTI-SPECIES ANIMAL HEALTH ALERT — ${input.severity.toUpperCase()}`,
      `============================================================`,
      input.title,
      "",
      input.detail,
      "",
      `Location: Village ${input.village}, Block ${input.block ?? "Gobichettipalayam"}, District ${input.district ?? "Erode"}`,
      `Timestamp: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      "",
      `Action Required: Open the HerdSentinel Command Console at http://localhost:8080/command to verify vitals and review the 3 km containment zone.`,
    ].join("\n");

    const htmlBody = buildAlertHtml({
      title: input.title,
      detail: input.detail,
      severity: input.severity,
      village: input.village,
      block: input.block,
      district: input.district,
      reportId: input.reportId,
      alertId: input.alertId,
    });

    const sms = `[HerdSentinel ${input.severity.toUpperCase()}] ${input.title} at ${input.village}. ${input.detail}`.slice(0, 320);

    const results = [];

    for (const r of targetList) {
      if (r.phone) {
        const res = await sendSms(r.phone, sms);
        await log({
          channel: "sms",
          recipient: `${r.full_name} (${r.phone})`,
          subject,
          body: sms,
          status: res.status,
          error: res.error,
          alertId: input.alertId ?? null,
          reportId: input.reportId ?? null,
        });
        results.push({ recipient: r.full_name, channel: "sms", status: res.status });
      }

      if (r.email) {
        const res = await sendEmail(r.email, subject, body, htmlBody);
        await log({
          channel: "email",
          recipient: `${r.full_name} (${r.email})`,
          subject,
          body,
          status: res.status,
          error: res.error,
          alertId: input.alertId ?? null,
          reportId: input.reportId ?? null,
        });
        results.push({ recipient: r.full_name, channel: "email", status: res.status });
      }
    }

    return { ok: true, dispatchedCount: results.length, details: results };
  } catch (error) {
    console.error("notifyOfficers failed", error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Send an immediate test notification to a specific officer to verify their phone & email.
 */
export async function sendTestNotificationToOfficer(recipientId: string) {
  const recipient = serverStore.alert_recipients.find((r) => r.id === recipientId);
  if (!recipient) throw new Error("Officer recipient not found");

  return notifyOfficers({
    title: `[TEST ALERT] HerdSentinel Verification Ping for ${recipient.designation}`,
    detail: `This is a test broadcast to verify SMS & email routing for ${recipient.full_name}. Sensor telemetry and outbreak alert channels are active.`,
    severity: "low",
    village: recipient.block,
    block: recipient.block,
    district: recipient.district,
  });
}
