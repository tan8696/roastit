import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";

// Owner-only testing backdoor — grants full paid access without a real
// Razorpay payment. Locked to the site owner's own email so a real
// customer can never call this on themselves.
const OWNER_EMAIL = "tanishla1100@gmail.com";
const DAYS = 365;

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { tier?: unknown };
  try {
    body = (await request.json()) as { tier?: unknown };
  } catch {
    body = {};
  }
  const tier = body.tier === "basic" ? "basic" : "pro";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const expiresAt = new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from("profiles").upsert({
    id: session.user.id,
    is_pro_user: true,
    tier,
    tier_expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tier, expiresAt });
}
