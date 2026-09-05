import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEntitlement } from "@/lib/entitlement";

// Single source of truth for "is this user actually paid up right now,
// and for which plan." Chat and Boardroom both call this instead of
// trusting a ?tier= URL param, which anyone could edit for free access.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ active: false, tier: null }, { status: 401 });
  }

  const entitlement = await getEntitlement(session.user.id);
  return NextResponse.json(entitlement);
}
