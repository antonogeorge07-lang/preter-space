import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently delete the signed-in user's account: their messages, presence,
 * profile and auth identity. Conversations they created are removed too, which
 * cascades to the messages inside them.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    await supabaseAdmin.from("messages").delete().eq("sender_id", userId);
    await supabaseAdmin.from("user_presence").delete().eq("user_id", userId);
    await supabaseAdmin.from("call_sessions").delete().or(`caller_id.eq.${userId},callee_id.eq.${userId}`);
    await supabaseAdmin.from("conversations").delete().eq("created_by", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { deleted: true };
  });
