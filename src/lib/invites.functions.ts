import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteCodeSchema = z.object({ code: z.string().trim().min(4).max(64) });

const joinSchema = z.object({
  code: z.string().trim().min(4).max(64),
  language: z.string().trim().min(2).max(8).optional(),
});

/** Public: returns only the inviter's display name for the invite preview screen. */
export const getInvitePreview = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => inviteCodeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("conversations")
      .select("participant_name, invite_open")
      .eq("invite_code", data.code)
      .eq("invite_open", true)
      .maybeSingle();
    return { sender_name: row?.participant_name ?? null, valid: !!row };
  });

/** Authenticated: validates the invite code server-side and adds the caller as a participant. */
export const joinByInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => joinSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: conv, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("invite_code", data.code)
      .eq("invite_open", true)
      .maybeSingle();

    if (error || !conv) return { error: "invalid_invite" as const };

    const ids: string[] = Array.isArray(conv.participant_ids) ? conv.participant_ids : [];
    if (ids.includes(userId)) {
      return { conversation_id: conv.id, already_member: true as const };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const displayName = profile?.full_name || profile?.email || "New member";

    let languages: Record<string, string> = {};
    try {
      languages = JSON.parse(conv.participant_languages || "{}") || {};
    } catch {
      languages = {};
    }
    if (data.language) languages[userId] = data.language;

    const names: string[] = Array.isArray(conv.participant_names) ? conv.participant_names : [];

    const { error: updateError } = await supabaseAdmin
      .from("conversations")
      .update({
        participant_ids: [...ids, userId],
        participant_names: [...names, displayName],
        participant_languages: JSON.stringify(languages),
      })
      .eq("id", conv.id);

    if (updateError) return { error: "join_failed" as const };

    return { conversation_id: conv.id, already_member: false as const };
  });
