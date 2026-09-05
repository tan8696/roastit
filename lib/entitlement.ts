import { createClient } from "@supabase/supabase-js";

export type Entitlement = { active: boolean; tier: "basic" | "pro" | null };

// The one place that decides "is this user actually paid up." Every route
// that spends real money (Gemini/Groq calls) must check this itself —
// gating the page in the UI doesn't stop a direct request to the API.
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return { active: false, tier: null };

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("tier, tier_expires_at, is_pro_user")
    .eq("id", userId)
    .single();

  const active = Boolean(
    data?.is_pro_user &&
      data?.tier_expires_at &&
      new Date(data.tier_expires_at).getTime() > Date.now()
  );

  return { active, tier: active ? (data?.tier === "pro" ? "pro" : "basic") : null };
}
