import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";
import AdBannerWrapper from "@/components/AdBannerWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://roastitai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Brutal Roaster — AI Landing Page Teardown & Business Advisor",
    template: "%s | Brutal Roaster",
  },
  description:
    "Paste a URL. Our AI direct-response expert tears apart your landing page and rewrites it to convert. Also features a Virtual Startup Boardroom with 5 AI advisors.",
  keywords: [
    "landing page teardown",
    "AI copywriting",
    "conversion rate optimization",
    "CRO",
    "startup advisor",
    "business analysis",
    "direct response marketing",
  ],
  authors: [{ name: "Brutal Roaster" }],
  creator: "Brutal Roaster",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Brutal Roaster",
    title: "Brutal Roaster — AI Landing Page Teardown",
    description:
      "Paste a URL. Our AI tears apart your landing page and rewrites it to convert.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brutal Roaster — AI Landing Page Teardown",
    description:
      "Paste a URL. Our AI tears apart your landing page and rewrites it to convert.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {adsenseClientId && (
          <Script
            id="adsbygoogle-init"
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          />
        )}
      </head>
      <body className="font-sans bg-black text-white antialiased">
        <SessionProvider>
          {children}
          <AdBannerWrapper />
        </SessionProvider>
      </body>
    </html>
  );
}
