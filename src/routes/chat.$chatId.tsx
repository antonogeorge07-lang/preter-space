import { createFileRoute } from "@tanstack/react-router";
import AuthGate from "@/components/AuthGate";
import Forge from "@/pages/Forge";

export const Route = createFileRoute("/chat/$chatId")({
  head: () => ({
    meta: [
      { title: "Conversation — Preter" },
      { name: "description", content: "Open your Preter conversation: messages are translated as they arrive, so you read every reply in your own language across voice notes, files, and calls." },
      { property: "og:title", content: "Conversation — Preter" },
      { property: "og:description", content: "Open your Preter conversation: messages are translated as they arrive, so you read every reply in your own language across voice notes, files, and calls." },
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
