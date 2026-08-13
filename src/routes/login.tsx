import { createFileRoute } from "@tanstack/react-router";
import { GuestGate } from "@/components/AuthGate";
import Login from "@/pages/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in | Preter" },
      { name: "description", content: "Sign in to your Preter account to continue your conversations." },
      { property: "og:title", content: "Sign in | Preter" },
      { property: "og:description", content: "Sign in to your Preter account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <GuestGate>
      <Login />
    </GuestGate>
  ),
});
