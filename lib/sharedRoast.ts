import { createClient } from "@supabase/supabase-js";
import { shareSlugFor } from "@/lib/urlHash";
import { RoastResultSchema, type RoastResult } from "@/lib/schemas/roast";

export type SharedRoast = { slug: string; url: string; result: RoastResult };

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

// Same URL always maps to the same slug (see lib/urlHash.ts), so re-roasting
// a page updates its existing share page instead of creating a new row —
// upsert, not insert. Best-effort: a missing Supabase config or a write
// failure shouldn't fail the roast response itself, just skip the share link.
export async function saveSharedRoast(url: string, result: RoastResult): Promise<string | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;

  const slug = shareSlugFor(url);
  const { error } = await supabase
    .from("shared_roasts")
    .upsert({ slug, url, result, updated_at: new Date().toISOString() });

  if (error) {
    console.error("Failed to save shared roast:", error);
    return null;
  }
  return slug;
}

export async function getSharedRoast(slug: string): Promise<SharedRoast | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("shared_roasts")
    .select("slug, url, result")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  const parsed = RoastResultSchema.safeParse(data.result);
  if (!parsed.success) return null;

  return { slug: data.slug, url: data.url, result: parsed.data };
}
