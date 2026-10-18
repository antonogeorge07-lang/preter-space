import type { AuthConfig } from "convex/server";

const issuer = process.env["SUPABASE_JWT_ISSUER"];
const jwks = process.env["SUPABASE_JWKS_URL"];

if (!issuer || !jwks) {
  throw new Error("Convex authentication requires SUPABASE_JWT_ISSUER " + "and SUPABASE_JWKS_URL.");
}

export default {
  providers: [
    {
      type: "customJwt",
      issuer,
      applicationID: "authenticated",
      jwks,
      algorithm: "ES256",
    },
  ],
} satisfies AuthConfig;
