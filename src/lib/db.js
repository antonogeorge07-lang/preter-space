/**
 * Compatibility adapter: exposes the legacy `db` SDK surface used across the
 * ported app, backed by Lovable Cloud (Postgres + Auth + Storage + Realtime).
 */
import { supabase } from "@/integrations/supabase/client";
import { invokeLLM, transcribeAudio, sendInviteEmail } from "@/lib/backend.functions";

const TABLES = {
  Conversation: "conversations",
  Message: "messages",
  CallSession: "call_sessions",
  UserPresence: "user_presence",
  User: "profiles",
};

const PROFILE_COLUMNS = new Set([
  "email",
  "full_name",
  "avatar_url",
  "bio",
  "default_language",
  "blocked_user_ids",
  "active_sessions",
]);

function normalize(row) {
  if (!row) return row;
  return { ...row, created_date: row.created_at, updated_date: row.updated_at };
}

function stripAliases(data) {
  const out = { ...data };
  delete out.created_date;
  delete out.updated_date;
  delete out.id;
  return out;
}

function mapField(field) {
  if (field === "created_date") return "created_at";
  if (field === "updated_date") return "updated_at";
  return field;
}

function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith("-");
  const field = mapField(desc ? sort.slice(1) : sort);
  return query.order(field, { ascending: !desc, nullsFirst: false });
}

function applyWhere(query, where = {}) {
  let q = query;
  for (const [key, value] of Object.entries(where)) {
    const field = mapField(key);
    if (Array.isArray(value)) q = q.in(field, value);
    else if (value === null) q = q.is(field, null);
    else q = q.eq(field, value);
  }
  return q;
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

function entity(name) {
  const table = TABLES[name];

  return {
    async list(sort, limit = 100) {
      let q = supabase.from(table).select("*");
      q = applySort(q, sort);
      q = q.limit(limit);
      return (unwrap(await q) || []).map(normalize);
    },
    async filter(where, sort, limit = 100) {
      let q = supabase.from(table).select("*");
      q = applyWhere(q, where);
      q = applySort(q, sort);
      q = q.limit(limit);
      return (unwrap(await q) || []).map(normalize);
    },
    async get(id) {
      const data = unwrap(await supabase.from(table).select("*").eq("id", id).maybeSingle());
      return normalize(data);
    },
    async create(payload) {
      const data = unwrap(await supabase.from(table).insert(stripAliases(payload)).select().single());
      return normalize(data);
    },
    async update(id, payload) {
      const data = unwrap(
        await supabase.from(table).update(stripAliases(payload)).eq("id", id).select().single(),
      );
      return normalize(data);
    },
    async delete(id) {
      unwrap(await supabase.from(table).delete().eq("id", id).select());
      return { id };
    },
    /**
     * Supports the `$addToSet` operator used by the invite-join flow.
     */
    async updateMany(where, operations) {
      let q = supabase.from(table).select("*");
      q = applyWhere(q, where);
      const rows = unwrap(await q) || [];
      const addToSet = operations?.$addToSet || {};
      const plain = { ...operations };
      delete plain.$addToSet;

      for (const row of rows) {
        const patch = { ...plain };
        for (const [field, value] of Object.entries(addToSet)) {
          const current = Array.isArray(row[field]) ? row[field] : [];
          if (!current.includes(value)) patch[field] = [...current, value];
        }
        if (Object.keys(patch).length === 0) continue;
        unwrap(await supabase.from(table).update(patch).eq("id", row.id).select());
      }
      return { count: rows.length };
    },
    subscribe(callback) {
      const channel = supabase
        .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          const type =
            payload.eventType === "INSERT"
              ? "create"
              : payload.eventType === "UPDATE"
                ? "update"
                : "delete";
          callback({ type, data: normalize(payload.new?.id ? payload.new : payload.old) });
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

const entities = Object.keys(TABLES).reduce((acc, name) => {
  acc[name] = entity(name);
  return acc;
}, {});

// Set when signup auto-confirms and no email code is required.
let autoConfirmedSession = null;

const auth = {
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw new Error("Not authenticated");
    const user = data.user;
    const profile = unwrap(await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle());
    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0],
      avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      bio: profile?.bio || "",
      default_language: profile?.default_language || "en",
      // True only when the user has explicitly chosen a language (not the fallback).
      language_set: !!profile?.default_language,
      blocked_user_ids: profile?.blocked_user_ids || [],
      active_sessions: profile?.active_sessions || [],
      created_date: profile?.created_at,
    };
  },
  async updateMe(patch) {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) throw new Error("Not authenticated");
    const clean = {};
    for (const [key, value] of Object.entries(patch)) {
      if (PROFILE_COLUMNS.has(key)) clean[key] = value;
    }
    if (Object.keys(clean).length === 0) return null;
    return normalize(
      unwrap(await supabase.from("profiles").update(clean).eq("id", data.user.id).select().single()),
    );
  },
  async loginViaEmailPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return true;
  },
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw new Error(error.message);
    autoConfirmedSession = data.session || null;
    return { auto_confirmed: !!data.session };
  },
  async verifyOtp({ email, otpCode }) {
    if (autoConfirmedSession) {
      const token = autoConfirmedSession.access_token;
      autoConfirmedSession = null;
      return { access_token: token };
    }
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "email" });
    if (error) throw new Error(error.message);
    return { access_token: data.session?.access_token };
  },
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw new Error(error.message);
    return true;
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return true;
  },
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return true;
  },
  // Session is already persisted by the auth client; kept for API compatibility.
  async setToken() {
    return true;
  },
  async loginWithProvider(provider, redirectPath = "/") {
    const supportedProviders = new Set(["google", "apple", "azure"]);

    const normalizedProvider =
      provider === "microsoft" ? "azure" : provider;

    if (!supportedProviders.has(normalizedProvider)) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const redirectTo = new URL(
      redirectPath,
      window.location.origin,
    ).toString();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: normalizedProvider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw new Error(error.message || "Sign-in failed");
    }
  },
  async logout(redirect = "/landing") {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.href = redirect;
  },
};

async function uploadFile({ file }) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "anonymous";
  const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError) throw new Error(signError.message);
  return { file_url: data.signedUrl };
}

export const db = {
  entities,
  auth,
  functions: {
    // No server-side counterparts for the legacy backend functions; callers all
    // implement a client-side fallback path.
    async invoke(name) {
      throw new Error(`Backend function "${name}" is not available`);
    },
  },
  integrations: {
    Core: {
      UploadFile: uploadFile,
      async InvokeLLM({ prompt }) {
        return invokeLLM({ data: { prompt } });
      },
      async TranscribeAudio({ audio_url }) {
        return transcribeAudio({ data: { audioUrl: audio_url } });
      },
      async SendEmail({ to, subject, body }) {
        return sendInviteEmail({ data: { to, subject, body } });
      },
    },
  },
};

export default db;
