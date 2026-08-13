import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const blockSchema = z.object({ userId: z.string().uuid() });
const reportSchema = z.object({
  conversationId: z.string().uuid(),
  reportedUserId: z.string().uuid().optional(),
  reason: z.string().trim().max(500).optional(),
});

/** Add a user to the caller's block list. Recipient-side blocks are enforced in the database. */
export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => blockSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You cannot block yourself");

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("blocked_user_ids")
      .eq("id", context.userId)
      .maybeSingle();

    const current: string[] = profile?.blocked_user_ids ?? [];
    if (current.includes(data.userId)) return { blocked: true };

    const { error } = await context.supabase
      .from("profiles")
      .update({ blocked_user_ids: [...current, data.userId] })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    return { blocked: true };
  });

/** Remove a user from the caller's block list. */
export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => blockSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("blocked_user_ids")
      .eq("id", context.userId)
      .maybeSingle();

    const current: string[] = profile?.blocked_user_ids ?? [];
    const { error } = await context.supabase
      .from("profiles")
      .update({ blocked_user_ids: current.filter((id) => id !== data.userId) })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    return { blocked: false };
  });

/** File a moderation report against a conversation. Stored for review. */
export const reportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversation_reports").insert({
      conversation_id: data.conversationId,
      reporter_id: context.userId,
      reported_user_id: data.reportedUserId ?? null,
      reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { reported: true };
  });
