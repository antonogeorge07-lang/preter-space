import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode, command }) => {
  const serverEnv = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, serverEnv);

  return {
    plugins: [
      tailwindcss(),

      tanstackStart({
        importProtection: {
          serverOnly: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },

        server: {
          entry: "server",
        },
      }),

      ...(command === "build"
        ? [
            nitro({
              preset: "cloudflare-module",
            }),
          ]
        : []),

      react(),
    ],

    resolve: {
      // Vite 8 supports tsconfig path resolution natively.
      tsconfigPaths: true,

      alias: {
        "@": path.resolve(import.meta.dirname, "src"),

        "entities/lib/decode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(
          import.meta.dirname,
          "node_modules/entities",
        ),
      },

      dedupe: [
        "react",
        "react-dom",
        "@tanstack/react-router",
        "@tanstack/react-start",
      ],
    },
  };
});
