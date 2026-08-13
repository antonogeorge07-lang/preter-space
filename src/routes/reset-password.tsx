import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Preter" },
      { name: "description", content: "Choose a new password for your Preter account and get straight back to your translated conversations, voice notes, and calls." },
      { property: "og:title", content: "Choose a new password — Preter" },
      { property: "og:description", content: "Choose a new password for your Preter account and get straight back to your translated conversations, voice notes, and calls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});
