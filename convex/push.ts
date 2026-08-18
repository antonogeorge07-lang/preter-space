"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import webpush from "web-push";

/**
 * Background push delivery (Web Push / VAPID).
 * Runs in Convex's Node runtime because the web-push signing library is
 * Node-only. Subscriptions live in `push_subscriptions`.
 */
function configure() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@preter.space",
    publicKey,
    privateKey,
  );
  return true;
}

export const notifyMessage = action({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    senderName: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (!configure()) return null;

    const recipients: string[] = await ctx.runQuery(api.pushData.recipientsFor, {
      conversationId: args.conversationId,
      senderId: args.senderId,
    });
    if (recipients.length === 0) return null;

    const subs = await ctx.runQuery(api.pushData.subscriptionsFor, { userIds: recipients });

    const payload = JSON.stringify({
      title: args.senderName || "Preter",
      body: args.body.slice(0, 160) || "New message",
      url: `/chat/${args.conversationId}`,
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (error) {
          const status = (error as { statusCode?: number })?.statusCode;
          // 404/410 mean the browser dropped the subscription: clean it up.
          if (status === 404 || status === 410) {
            await ctx.runMutation(api.pushData.unsubscribe, { endpoint: sub.endpoint });
          }
        }
      }),
    );

    return null;
  },
});
