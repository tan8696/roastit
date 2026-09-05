import { auth } from "@/auth";
import DashboardHome from "@/components/DashboardHome";
import MarketingHome from "@/components/MarketingHome";

// A server component so search engines and AdSense's reviewer see real
// content at "/" instead of being bounced to a login form — the previous
// client-side redirect-when-unauthenticated left crawlers with nothing to
// evaluate, which is a near-automatic AdSense rejection.
export default async function Page() {
  const session = await auth();
  return session ? <DashboardHome /> : <MarketingHome />;
}
