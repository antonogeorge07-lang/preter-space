import { createFileRoute } from "@tanstack/react-router";
import { GuestGate } from "@/components/AuthGate";
import Landing from "@/pages/Landing";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Preter — Talk to anyone, in any language" },
      {
        name: "description",
        content:
          "Preter is a multilingual messenger: send a message in your language, your friend reads it in theirs. Voice notes, calls, and files included.",
      },
      { property: "og:title", content: "Preter — Talk to anyone, in any language" },
      {
        property: "og:description",
        content: "Multilingual chat with real-time translation, voice notes, and calls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <GuestGate>
      <Landing />
    </GuestGate>
  ),
});
