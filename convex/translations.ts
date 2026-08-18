import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Translation cache.
 *
 * Every (source text, target language) pair is stored once so repeated or
 * common phrases never hit the AI gateway twice. Keys are a stable hash of the
 * normalised source text, which keeps rows small and lookups indexed.
 */
export function hashText(text: string) {
  const normalised = text.trim();
  let h = 5381;
  for (let i = 0; i < normalised.length; i++) {
    h = ((h << 5) + h + normalised.charCodeAt(i)) | 0;
  }
  return `${(h >>> 0).toString(36)}-${normalised.length.toString(36)}`;
}

export const getCached = query({
  args: { textHash: v.string(), langs: v.array(v.string()) },
  handler: async (ctx, args) => {
    const out: Record<string, string> = {};
    for (const lang of [...new Set(args.langs)]) {
      const row = await ctx.db
        .query("translation_cache")
        .withIndex("by_hash_lang", (q) =>
          q.eq("textHash", args.textHash).eq("targetLang", lang),
        )
        .first();
      if (row) out[lang] = row.translation;
    }
    return out;
  },
});

export const putCached = mutation({
  args: {
    textHash: v.string(),
    sourceText: v.string(),
    detectedLang: v.optional(v.string()),
    entries: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    for (const [targetLang, translation] of Object.entries(args.entries)) {
      if (!translation) continue;
      const existing = await ctx.db
        .query("translation_cache")
        .withIndex("by_hash_lang", (q) =>
          q.eq("textHash", args.textHash).eq("targetLang", targetLang),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { translation, lastUsedAt: Date.now() });
      } else {
        await ctx.db.insert("translation_cache", {
          textHash: args.textHash,
          targetLang,
          translation,
          sourceText: args.sourceText.slice(0, 2000),
          detectedLang: args.detectedLang,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
        });
      }
    }
    return null;
  },
});
