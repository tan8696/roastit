import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth";
import StaticPage from "@/components/StaticPage";
import DeleteAccountSection from "@/components/DeleteAccountSection";

export const metadata: Metadata = { title: "Settings" };

// Mirrors the tier naming shown on /paywall (id "basic" → "Pro", "pro" → "Max").
const TIER_NAMES: Record<string, string> = { basic: "Pro", pro: "Max" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let planName = "Free";
  let expiresAt: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await supabase
      .from("profiles")
      .select("tier, tier_expires_at, is_pro_user")
      .eq("id", session.user.id)
      .single();

    const active = Boolean(
      data?.is_pro_user && data?.tier_expires_at && new Date(data.tier_expires_at).getTime() > Date.now()
    );
    if (active && data) {
      planName = TIER_NAMES[data.tier as string] ?? data.tier ?? "Pro";
      expiresAt = data.tier_expires_at as string;
    }
  }

  return (
    <StaticPage title="Settings">
      <div className="rounded-2xl border border-white/10 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-1">Account</p>
        <p className="text-sm text-white/80">{session.user.name || session.user.email}</p>
        <p className="text-xs text-white/40">{session.user.email}</p>
      </div>

      <div className="rounded-2xl border border-white/10 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-1">Plan</p>
        <p className="text-sm text-white/80">
          {planName}
          {expiresAt && (
            <span className="text-white/40"> · renews {new Date(expiresAt).toLocaleDateString()}</span>
          )}
        </p>
        <a
          href="/paywall"
          className="inline-block mt-3 text-xs font-semibold text-white underline underline-offset-2 hover:no-underline"
        >
          Manage subscription →
        </a>
      </div>

      <DeleteAccountSection />
    </StaticPage>
  );
}
