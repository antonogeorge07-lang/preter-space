// @lovable.dev/vite-tanstack-config already includes tanstackStart, react, tailwind, tsconfig paths,
// nitro (build-only), env injection, @ alias and dedupe. Do NOT add them manually.
import path from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Public (publishable) fallbacks so a build never ships without backend settings.
const publicDefaults: Record<string, string> = {
  VITE_SUPABASE_URL: "https://sfrrsrdzpzobrirvdtld.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_5CFnT6cDUtVCjW6ATu4rdA_DuFwNmfd",
  VITE_SUPABASE_PROJECT_ID: "sfrrsrdzpzobrirvdtld",
  SUPABASE_URL: "https://sfrrsrdzpzobrirvdtld.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_5CFnT6cDUtVCjW6ATu4rdA_DuFwNmfd",
};

const serverEnv = loadEnv(
  process.env["NODE_ENV"] === "production" ? "production" : "development",
  process.cwd(),
  "",
);
Object.assign(process.env, serverEnv);
for (const [key, value] of Object.entries(publicDefaults)) {
  if (!process.env[key]) process.env[key] = value;
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(import.meta.dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(import.meta.dirname, "node_modules/entities"),
      },
    },
  },
});
