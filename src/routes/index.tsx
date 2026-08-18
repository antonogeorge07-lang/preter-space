import { createFileRoute } from "@tanstack/react-router";
import AuthGate from "@/components/AuthGate";
import Forge from "@/pages/Forge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Preter: Chat across every language" },
      {
        name: "description",
        content:
          "Preter interprets your conversations in real time, so you can chat, call, and share with anyone in their own language.",
      },
      { property: "og:title", content: "Preter: Chat across every language" },
      {
        property: "og:description",
        content: "Real-time interpreted messaging, voice notes, and calls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <Forge />
    </AuthGate>
  ),
});
