import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SignupBody = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
};

export async function POST(request: Request) {
  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server is not configured for sign-up." },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // email_confirm: true skips Supabase's confirmation-email step — we
  // haven't verified email deliverability is configured on the project,
  // so requiring it would leave new users stuck unable to sign in.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });

  if (error) {
    const alreadyExists = error.message?.toLowerCase().includes("already");
    return NextResponse.json(
      {
        error: alreadyExists
          ? "An account with that email already exists. Try signing in instead."
          : error.message || "Could not create account.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
