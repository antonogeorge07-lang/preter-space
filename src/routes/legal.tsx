import { createFileRoute } from "@tanstack/react-router";
import Legal from "@/pages/Legal";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Terms & Privacy | Preter" },
      { name: "description", content: "Read Preter's terms of service and privacy policy: how we handle your messages, interpretation data, account information, and your rights as a user." },
      { property: "og:title", content: "Terms & Privacy | Preter" },
      { property: "og:description", content: "Read Preter's terms of service and privacy policy: how we handle your messages, interpretation data, account information, and your rights as a user." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Legal,
});
