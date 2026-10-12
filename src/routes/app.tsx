import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "PLANPOCKET — Your Financial Planning Companion" },
      {
        name: "description",
        content:
          "Budgets, expenses, goals, investments, reports and a CFO Helper in one calm finance dashboard.",
      },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  return (
    <iframe
      src="/planpocket.html"
      title="PLANPOCKET Finance App"
      className="fixed inset-0 h-screen w-screen border-0"
    />
  );
}
