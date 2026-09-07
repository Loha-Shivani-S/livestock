import fs from "fs";

let env = "";
if (fs.existsSync(".env.local")) env += fs.readFileSync(".env.local", "utf-8") + "\n";
if (fs.existsSync(".env")) env += fs.readFileSync(".env", "utf-8");
const match = env.match(/RESEND_API_KEY=["']?([^"'\r\n]+)/);
const key = match ? match[1] : null;

async function testHtmlEmail() {
  console.log("Sending rich HTML test alert via Resend to lohashivani360@gmail.com...");
  
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HerdSentinel Alerts <onboarding@resend.dev>",
      to: ["lohashivani360@gmail.com"],
      subject: "🚨 [CRITICAL ALERT] Livestock Health Warning — Gobichettipalayam",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
            <div style="background: #0f172a; padding: 20px 24px; color: #ffffff;">
              <span style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                CRITICAL OUTBREAK SIGNAL
              </span>
              <h2 style="margin: 12px 0 4px 0; font-size: 20px; color: #ffffff;">Suspected Livestock Outbreak in Gobichettipalayam</h2>
              <div style="font-size: 12px; color: #94a3b8;">HerdSentinel Autonomous Disease Surveillance System</div>
            </div>
            <div style="padding: 24px;">
              <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; color: #991b1b; line-height: 1.5;">
                <strong>Incident Summary:</strong><br/>
                Loha Shivani reported 3 animals exhibiting fever, limping, and excessive salivation. Immediate 3km containment protocol suggested.
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 40%;">Location:</td><td>Gobichettipalayam Pasture, Erode</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Species:</td><td>Cattle / Buffalo / Small Ruminants</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Reported By:</td><td>Loha Shivani (+91 82706 503379)</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Direct Recipient:</td><td>lohashivani360@gmail.com</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Timestamp:</td><td>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
              </table>
              <div style="text-align: center; margin: 24px 0 12px 0;">
                <a href="http://localhost:8080/command" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                  Open Command Console
                </a>
              </div>
            </div>
            <div style="background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
              Emergency Toll-Free Helpline: <strong>1962</strong> | Sent from HerdSentinel Localhost Dev
            </div>
          </div>
        </div>
      `,
    }),
  });

  const body = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", body);
}

testHtmlEmail();
