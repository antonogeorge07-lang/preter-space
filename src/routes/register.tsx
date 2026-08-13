import { createFileRoute } from "@tanstack/react-router";
import { GuestGate } from "@/components/AuthGate";
import Register from "@/pages/Register";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — Preter" },
      {
        name: "description",
        content: "Create a free Preter account and start chatting across languages in seconds.",
      },
      { property: "og:title", content: "Create your account — Preter" },
      { property: "og:description", content: "Start chatting across languages in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <GuestGate>
      <Register />
    </GuestGate>
  ),
});
