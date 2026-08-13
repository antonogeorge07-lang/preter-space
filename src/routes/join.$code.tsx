import { createFileRoute } from "@tanstack/react-router";
import JoinConversation from "@/pages/JoinConversation";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Join a conversation — Preter" },
      {
        name: "description",
        content: "You've been invited to a multilingual conversation on Preter. Pick your language and join.",
      },
      { property: "og:title", content: "Join a conversation — Preter" },
      { property: "og:description", content: "Pick your language and join the conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JoinConversation,
});
