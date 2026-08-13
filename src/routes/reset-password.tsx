import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Preter" },
      { name: "description", content: "Set a new password for your Preter account." },
      { property: "og:title", content: "Choose a new password — Preter" },
      { property: "og:description", content: "Set a new password for your Preter account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});
