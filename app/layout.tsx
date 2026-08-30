import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import AdBanner from "@/components/AdBanner";

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

export const metadata: Metadata = {
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
    url: "https://brutal-roaster.vercel.app",
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
  const session = await auth();
  let isPro = false;

  if (session?.user?.id) {
    // Check Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data } = await supabase
        .from("profiles") // assuming table is profiles
        .select("is_pro_user")
        .eq("id", session.user.id)
        .single();

      if (data?.is_pro_user) {
        isPro = true;
      }
    }
  }

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {!isPro && (
          <Script
            id="adsbygoogle-init"
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
          />
        )}
      </head>
      <body className="font-sans bg-black text-white antialiased">
        <SessionProvider>
          {children}
          {!isPro && (
            <div className="fixed bottom-0 w-full z-50 bg-black/80 backdrop-blur-md border-t border-white/10">
              <AdBanner />
            </div>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
