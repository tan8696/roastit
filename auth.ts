import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || "dummy-secret-for-dev-only-do-not-use-in-prod",
  // Vercel proxies requests, which changes the Host header. Without this,
  // Auth.js rejects the request as an "UntrustedHost" and Google sign-in
  // silently fails (this is the #1 cause of broken OAuth on Vercel).
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-google-client-secret",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Supabase Auth owns the password/user store; NextAuth just verifies
      // against it and issues its own session, same as it does for Google.
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) return null;

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) return null;

        return {
          id: data.user.id,
          email: data.user.email,
          name: (data.user.user_metadata?.name as string | undefined) || data.user.email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
