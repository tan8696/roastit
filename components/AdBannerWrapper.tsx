"use client";

import { usePathname } from "next/navigation";
import AdBanner from "@/components/AdBanner";

// Allowlist, not a denylist: AdSense rejected the site for "Google-served
// ads on screens without publisher content" — a denylist of known-thin
// routes (login, paywall, a 404) can never be complete, since a 404 can
// happen at any unpredictable URL and still renders inside this same root
// layout. Only pages confirmed to carry real, substantial content get ads;
// everything else (login, chat, boardroom, paywall, 404s, any future route
// we forget to update) safely defaults to no ad.
const ADS_ENABLED_ON = ["/", "/about", "/contact", "/privacy", "/terms"];

export default function AdBannerWrapper() {
  const pathname = usePathname();
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
  const isConfigured = Boolean(clientId && slotId);

  if (!isConfigured) return null;
  if (!ADS_ENABLED_ON.includes(pathname)) return null;

  return (
    <div className="fixed bottom-0 w-full z-50 bg-black/80 backdrop-blur-md border-t border-white/10">
      <AdBanner />
    </div>
  );
}
