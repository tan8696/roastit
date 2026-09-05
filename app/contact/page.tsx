import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Brutal Roaster team.",
};

export default function ContactPage() {
  return (
    <StaticPage title="Contact">
      <p>
        Got a bug to report, a feature you want, or a landing page you think
        we&apos;ll be too scared to roast? We read everything.
      </p>
      <p>
        <strong className="text-white/80">Email</strong>
        <br />
        <a href="mailto:rosterai@gmail.com" className="text-white/80 underline">
          rosterai@gmail.com
        </a>
      </p>
      <p>
        <strong className="text-white/80">In-app feedback</strong>
        <br />
        If you already have an account, the fastest way to reach us is the
        feedback button in your account menu — it goes straight to the team.
      </p>
      <p className="text-white/40 text-xs">
        We typically reply within 1–2 business days.
      </p>
    </StaticPage>
  );
}
