import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StaticPage from "@/components/StaticPage";
import DeleteAccountSection from "@/components/DeleteAccountSection";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <StaticPage title="Settings">
      <div className="rounded-2xl border border-white/10 p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-xs text-white/35 uppercase tracking-wider font-semibold mb-1">Account</p>
        <p className="text-sm text-white/80">{session.user.name || session.user.email}</p>
        <p className="text-xs text-white/40">{session.user.email}</p>
      </div>

      <DeleteAccountSection />
    </StaticPage>
  );
}
