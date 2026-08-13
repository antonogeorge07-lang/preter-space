import { createFileRoute } from "@tanstack/react-router";
import AuthGate from "@/components/AuthGate";
import Forge from "@/pages/Forge";

export const Route = createFileRoute("/chat/$chatId")({
  head: () => ({
    meta: [
      { title: "Conversation — Preter" },
      { name: "description", content: "Your translated conversation on Preter." },
      { property: "og:title", content: "Conversation — Preter" },
      { property: "og:description", content: "Your translated conversation on Preter." },
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
