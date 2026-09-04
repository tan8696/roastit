import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";

// Single source of truth for "is this user actually paid up right now,
// and for which plan." Chat and Boardroom both call this instead of
// trusting a ?tier= URL param, which anyone could edit for free access.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ active: false, tier: null }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ active: false, tier: null });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("tier, tier_expires_at, is_pro_user")
    .eq("id", session.user.id)
    .single();

  const active = Boolean(
    data?.is_pro_user &&
      data?.tier_expires_at &&
      new Date(data.tier_expires_at).getTime() > Date.now()
  );

  return NextResponse.json({
    active,
    tier: active ? data?.tier ?? null : null,
  });
}
