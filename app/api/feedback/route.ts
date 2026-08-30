import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

type FeedbackBody = {
  rating?: number;
  category?: string;
  message?: string;
};

const RECIPIENT_EMAIL = "tan8696ish@gmail.com";

// ─── Nodemailer transporter (Gmail SMTP via App Password) ─────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,   // Your Gmail address (e.g. rosterai@gmail.com)
      pass: process.env.SMTP_PASS,   // Gmail App Password (not your regular password)
    },
  });
}

// ─── HTML email template ──────────────────────────────────────────────────────
function buildEmailHtml(
  rating: number,
  category: string,
  message: string
): string {
  const stars = rating > 0 ? ["😤", "😕", "😐", "😊", "🤩"][rating - 1] : "—";
  const categoryLabel: Record<string, string> = {
    bug: "🐛 Bug Report",
    feature: "✨ Feature Idea",
    general: "💬 General",
    praise: "🙌 Praise",
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px; }
    .wrapper { max-width: 560px; margin: 0 auto; background: #111; border-radius: 16px; border: 1px solid #222; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #111 100%); padding: 24px 28px; border-bottom: 1px solid #222; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
    .body { padding: 24px 28px; }
    .meta-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .chip { padding: 6px 12px; border-radius: 8px; border: 1px solid #333; background: #1a1a1a; font-size: 12px; color: #aaa; }
    .chip strong { color: #fff; }
    .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #555; font-weight: 700; margin-bottom: 8px; }
    .message-box { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 16px; font-size: 14px; color: #ccc; line-height: 1.7; white-space: pre-wrap; }
    .footer { padding: 16px 28px; border-top: 1px solid #1a1a1a; font-size: 11px; color: #444; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>BRUTAL<span style="color:#333">.</span> — New Feedback</h1>
      <p>Someone just sent feedback via the app</p>
    </div>
    <div class="body">
      <div class="meta-row">
        <div class="chip">Rating: <strong>${stars}</strong></div>
        <div class="chip">Category: <strong>${categoryLabel[category] ?? category}</strong></div>
      </div>
      <div class="label">Message</div>
      <div class="message-box">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    <div class="footer">
      Sent from Brutal Roaster · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function POST(request: Request) {
  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { rating = 0, category = "general", message = "" } = body;

  if (!message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  // ── Always log server-side (useful even without SMTP configured) ────────────
  console.log("📬 New Feedback:", {
    rating,
    category,
    message: message.trim(),
    timestamp: new Date().toISOString(),
  });

  // ── Send email if SMTP credentials are configured ──────────────────────────
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Brutal Roaster Feedback" <${process.env.SMTP_USER}>`,
        to: RECIPIENT_EMAIL,
        subject: `[Brutal] New ${category} feedback — rated ${rating}/5`,
        html: buildEmailHtml(rating, category, message.trim()),
        text: `Rating: ${rating}/5\nCategory: ${category}\n\nMessage:\n${message.trim()}`,
      });
    } catch (emailErr) {
      // Log the error but don't fail the request — user still sees success
      console.error("Email send failed:", emailErr);
    }
  } else {
    console.warn(
      "⚠️  SMTP_USER / SMTP_PASS not set — email not sent. Configure these in .env.local to enable email delivery."
    );
  }

  return NextResponse.json({ success: true });
}
