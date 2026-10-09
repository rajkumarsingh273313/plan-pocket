import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PLANPOCKET — Your Financial Planning Companion" },
      { name: "description", content: "Budgets, expenses, goals, investments, reports and a CFO Helper in one calm finance dashboard." },
      { property: "og:title", content: "PLANPOCKET — Your Financial Planning Companion" },
      { property: "og:description", content: "Budgets, expenses, goals, investments, reports and a CFO Helper in one calm finance dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/planpocket.html"
      title="PLANPOCKET"
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
}
