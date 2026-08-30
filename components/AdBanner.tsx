"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdBanner() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err: any) {
      console.error("AdSense error:", err.message);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle block w-full text-center"
      style={{ display: "block" }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-dummy"}
      data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID || "dummy-slot"}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
