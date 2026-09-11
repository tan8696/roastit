import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://roastitai.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/chat", "/boardroom", "/settings", "/paywall"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
