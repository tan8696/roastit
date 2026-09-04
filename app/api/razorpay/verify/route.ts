import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";

const TIER_DAYS = 30;

type VerifyBody = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
  tier?: unknown;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  const tier = body.tier === "pro" ? "pro" : body.tier === "basic" ? "basic" : "";

  if (!orderId || !paymentId || !signature || !tier) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 500 });
  }

  // Per Razorpay's documented verification formula — never trust the
  // client's claim that a payment succeeded without this check.
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server is not configured for payments." },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const expiresAt = new Date(Date.now() + TIER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from("profiles").upsert({
    id: session.user.id,
    is_pro_user: true,
    tier,
    tier_expires_at: expiresAt,
  });

  if (error) {
    console.error("Failed to record Razorpay payment:", error);
    return NextResponse.json(
      { error: "Payment succeeded but saving your plan failed. Contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, tier, expiresAt });
}
