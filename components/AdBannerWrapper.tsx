"use client";

import { usePathname } from "next/navigation";
import AdBanner from "@/components/AdBanner";

// Chat and Boardroom use a fixed h-screen layout with their message
// composer pinned to the bottom — a global fixed ad bar there overlaps
// the input box. Login has no content worth monetizing. Keep ads only
// on pages with normal scrolling layouts and bottom padding reserved.
const ADS_DISABLED_ON = ["/login", "/chat", "/boardroom"];

export default function AdBannerWrapper({ isPro }: { isPro: boolean }) {
  const pathname = usePathname();
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
  const isConfigured = Boolean(clientId && slotId);

  if (isPro || !isConfigured) return null;
  if (ADS_DISABLED_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="fixed bottom-0 w-full z-50 bg-black/80 backdrop-blur-md border-t border-white/10">
      <AdBanner />
    </div>
  );
}
