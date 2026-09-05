import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import TermsContent from "@/components/TermsContent";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern your use of Brutal Roaster.",
};

export default function TermsPage() {
  return (
    <StaticPage title="Terms of Use">
      <TermsContent />
    </StaticPage>
  );
}
