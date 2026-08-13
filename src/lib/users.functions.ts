import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const searchSchema = z.object({ query: z.string().trim().min(2).max(64) });

/**
 * Authenticated directory search. Profiles are not readable client-side (RLS limits
 * SELECT to yourself and people you already share a conversation with), so discovery
 * runs server-side and returns only non-sensitive display fields - never emails.
 */
export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.query.replace(/[%_,]/g, " ").trim();
    if (!term) return { users: [] };

    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, updated_at")
      .ilike("full_name", `%${term}%`)
      .not("full_name", "is", null)
      .neq("id", context.userId)
      .order("full_name", { ascending: true })
      .limit(20);

    if (error) return { users: [] };

    return {
      users: (rows ?? []).map((r) => ({
        id: r.id,
        full_name: r.full_name,
        avatar_url: r.avatar_url,
        updated_date: r.updated_at,
      })),
    };
  });
