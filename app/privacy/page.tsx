import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import PrivacyContent from "@/components/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Brutal Roaster collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy">
      <PrivacyContent />
    </StaticPage>
  );
}
