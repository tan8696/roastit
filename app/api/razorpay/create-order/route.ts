import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@/auth";

// Placeholder INR pricing (rough $15 / $50 conversion, rounded) — confirm
// and adjust these before taking real payments.
const TIER_AMOUNTS_PAISE: Record<string, number> = {
  basic: 129900, // ~₹1,299
  pro: 419900, // ~₹4,199
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { tier?: unknown };
  try {
    body = (await request.json()) as { tier?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tier = typeof body.tier === "string" ? body.tier : "";
  const amount = TIER_AMOUNTS_PAISE[tier];
  if (!amount) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Payments are not configured." },
      { status: 500 }
    );
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `${session.user.id}-${tier}-${Date.now()}`.slice(0, 40),
      notes: { userId: session.user.id, tier },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json(
      { error: `Could not create order: ${message}` },
      { status: 500 }
    );
  }
}
