import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSharedRoast } from "@/lib/sharedRoast";
import { RoastResultCard, scoreVerdict } from "@/components/RoastResultCard";

export const revalidate = 0; // always reflect the latest roast for this URL, never a stale build-time snapshot

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shared = await getSharedRoast(slug);
  if (!shared) return { title: "Roast not found" };

  const hostname = (() => {
    try {
      return new URL(shared.url).hostname;
    } catch {
      return shared.url;
    }
  })();

  return {
    title: `${shared.result.overallScore}/100 — ${hostname} roasted`,
    description: `${scoreVerdict(shared.result.overallScore)}. ${shared.result.issues[0]?.description ?? ""}`,
  };
}

export default async function SharedRoastPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shared = await getSharedRoast(slug);
  if (!shared) notFound();

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-5 py-16">
        <nav className="flex items-center justify-between mb-10">
          <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">
            ← Brutal Roaster
          </Link>
          <span className="text-xs text-white/30 truncate max-w-[50%]">{shared.url}</span>
        </nav>

        <RoastResultCard result={shared.result} />

        <div className="mt-8 rounded-xl border border-white/10 p-5 text-center" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-sm text-white/70 mb-3">Get your own site roasted — free, no signup.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-black bg-white hover:bg-white/90 transition-all duration-200"
          >
            Roast My Page →
          </Link>
        </div>
      </div>
    </div>
  );
}
