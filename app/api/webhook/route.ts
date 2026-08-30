import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2026-08-26.dahlia",
  });

  // Initialize Supabase Admin (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // client_reference_id should be the Supabase/NextAuth user ID
    const userId = session.client_reference_id;

    if (userId) {
      console.log(`Upgrading user ${userId} to Pro...`);
      const { error } = await supabaseAdmin
        .from("profiles") // assuming table name is profiles, adjust if needed
        .update({ is_pro_user: true })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update user in Supabase:", error);
        return NextResponse.json(
          { error: "Failed to update user in database" },
          { status: 500 }
        );
      }
      console.log(`User ${userId} successfully upgraded to Pro.`);
    } else {
      console.warn("checkout.session.completed missing client_reference_id");
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
