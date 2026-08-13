import { createFileRoute } from "@tanstack/react-router";
import Legal from "@/pages/Legal";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Terms & Privacy — Preter" },
      { name: "description", content: "Preter's terms of service and privacy policy." },
      { property: "og:title", content: "Terms & Privacy — Preter" },
      { property: "og:description", content: "Preter's terms of service and privacy policy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Legal,
});
