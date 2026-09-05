import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "About",
  description:
    "Brutal Roaster is an AI direct-response expert that tears apart your landing page and rewrites it to convert.",
};

export default function AboutPage() {
  return (
    <StaticPage title="About Brutal Roaster">
      <p>
        Most landing page feedback is polite, vague, and useless. Someone
        tells you it &quot;looks good&quot; and you&apos;re no closer to
        knowing why visitors aren&apos;t converting. Brutal Roaster exists
        because founders and marketers need something more honest than that.
      </p>
      <p>
        Paste in a URL and our AI — modeled on the instincts of a ruthless,
        highly-paid direct-response copywriter — scrapes the page, tears
        apart what&apos;s actually killing your conversions, and rewrites
        your headline, subheadline, and call-to-action from scratch. No
        fluff, no hedging, no &quot;great job, just a few tweaks.&quot;
      </p>
      <p>
        <strong className="text-white/80">Who it&apos;s for</strong>
        <br />
        Indie founders shipping their own landing pages, growth marketers who
        need a second opinion before a launch, and agencies running
        conversion audits for clients. If you&apos;re close enough to your
        own page that you can&apos;t see its problems anymore, that&apos;s
        exactly the gap this fills.
      </p>
      <p>
        <strong className="text-white/80">The Virtual Startup Boardroom</strong>
        <br />
        Beyond landing page teardowns, Brutal Roaster runs a 5-agent debate on
        your business idea — a Believer who champions it, a Skeptic who
        attacks it, an Investor who breaks down the unit economics, and a
        Judge who synthesizes all three into a final verdict: build it, pivot
        first, or don&apos;t build it at all.
      </p>
      <p>
        <strong className="text-white/80">How it works</strong>
        <br />
        Under the hood, landing page teardowns run on Llama 3.3 (via Groq) for
        fast, cheap analysis, while the chat assistant and Boardroom debates
        run on Google&apos;s Gemini. Every roast starts from real, scraped
        content from your page — not a generic template response.
      </p>
      <p>
        Questions, feedback, or just want to tell us we&apos;re wrong about
        your headline? Reach us at{" "}
        <a href="mailto:rosterai@gmail.com" className="text-white/80 underline">
          rosterai@gmail.com
        </a>
        .
      </p>
    </StaticPage>
  );
}
