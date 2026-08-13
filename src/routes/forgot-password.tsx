import { createFileRoute } from "@tanstack/react-router";
import ForgotPassword from "@/pages/ForgotPassword";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Preter" },
      { name: "description", content: "Request a password reset link for your Preter account." },
      { property: "og:title", content: "Reset your password — Preter" },
      { property: "og:description", content: "Request a password reset link for Preter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});
