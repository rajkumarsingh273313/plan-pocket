import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PLANPOCKET — Your Financial Planning Companion" },
      {
        name: "description",
        content:
          "PLANPOCKET brings personal finance planning and small-business scenario planning together. Track expenses, build budgets, set savings goals, estimate investment growth, and explore hypothetical business scenarios — all in one place.",
      },
      {
        property: "og:title",
        content: "PLANPOCKET — Your Financial Planning Companion",
      },
      {
        property: "og:description",
        content:
          "Track expenses, build budgets, set savings goals, estimate investment growth, and explore hypothetical business scenarios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

/* ─────────────────────────────────────────────
   Small reusable icon helpers (inline SVG)
───────────────────────────────────────────── */
function Icon({
  path,
  size = 22,
  className = "",
}: {
  path: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Feature data — verified against the app code
───────────────────────────────────────────── */
const features = [
  {
    id: "dashboard",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width={26}
        height={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
    title: "Dashboard",
    status: "live" as const,
    summary:
      "A central overview that shows active goal count, this month's expenses, total saved toward goals, and your last investment estimate. Shortcuts to every planning tool are a single click away.",
  },
  {
    id: "expense-tracker",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width={26}
        height={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: "Expense Tracker",
    status: "live" as const,
    summary:
      "Record daily spending with a description, amount (₹), category (Food, Transport, Housing, Utilities, Health, Shopping, Entertainment, Other), and date. Expenses are saved in your browser and the tracker shows a running total for the current month.",
  },
  {
    id: "budget-planner",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width={26}
        height={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    ),
    title: "Budget Planner",
    status: "live" as const,
    summary:
      "Choose a planning month, set your take-home income, and define spending limits by category. The planner then compares your budgeted limits with your recorded expenses so you can see where you are on track and where you are over.",
  },
  {
    id: "goal-planner",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width={26}
        height={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    title: "Savings Goal Planner",
    status: "live" as const,
    summary:
      "Create savings goals with a name, target amount, already-saved amount, duration presets (3 months, 6 months, 1 year, 3 years, or a custom period), and optional planned monthly contribution. The planner calculates the recommended monthly saving, tracks progress with a doughnut chart, and lets you record individual contributions with dates. You can review, edit, and delete contributions for each goal.",
  },
  {
    id: "investment-calculator",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width={26}
        height={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: "Investment Calculator",
    status: "live" as const,
    summary:
      "Enter a starting balance, monthly contribution, expected annual return, and investment period in years. The calculator estimates the potential future value using monthly compounding. Results are clearly labelled as illustrative estimates — not guaranteed returns or financial advice.",
  },
  {
    id: "financial-reports",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width={26}
        height={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Financial Reports",
    status: "live" as const,
    summary:
      "Select a month to generate a snapshot of your income, total spending, category breakdown, and budget vs. actual comparison from the data you have saved in this browser. You can download the report as a CSV file for use in a spreadsheet.",
  },
  {
    id: "cfo-helper",
    icon: (
      <svg
        viewBox="0 0 24 24"
        width={26}
        height={26}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-5" />
      </svg>
    ),
    title: "CFO Helper — Scenario Calculator",
    status: "live" as const,
    summary:
      "A hypothetical business scenario planner. Use sliders to adjust staffing (engineers, marketing), marketing spend, product price changes, revenue growth, and operating expenses. Run the scenario to see estimated runway, monthly burn, profit margin, break-even point, and a chart of the results. You can generate a text report and export it as a PDF. Results are scenario estimates, not AI-powered analysis or guaranteed outcomes.",
  },
];

/* How it works steps */
const steps = [
  {
    num: "01",
    title: "Create an account",
    desc: "Sign up with a username and password. Your financial data is stored in your browser — nothing is sent to a server in this prototype.",
  },
  {
    num: "02",
    title: "Enter your financial information",
    desc: "Log expenses, set up category budgets, create savings goals, or enter investment assumptions. You can use as many or as few tools as you need.",
  },
  {
    num: "03",
    title: "Choose a planning tool",
    desc: "Navigate to the Dashboard and open the tool you want. Each tool works independently — you can use Goal Planner without touching the Budget Planner, for example.",
  },
  {
    num: "04",
    title: "Review your progress",
    desc: "See your spending vs. budget, goal progress bars and contribution history, an investment growth estimate, or a monthly financial report you can download.",
  },
  {
    num: "05",
    title: "Explore what-if scenarios",
    desc: "Open the CFO Helper to simulate hypothetical business decisions — adjust hiring, pricing, and costs, then run the scenario to see estimated financial outcomes.",
  },
];

/* Audiences */
const audiences = [
  {
    title: "Individuals and households",
    desc: "Track day-to-day spending, set category budgets for the month, and monitor savings goals for things like an emergency fund or a planned purchase.",
  },
  {
    title: "Students and early-career professionals",
    desc: "Learn to plan personal finances by logging expenses, comparing them with a budget, and seeing how a consistent monthly saving amount grows over time.",
  },
  {
    title: "Freelancers",
    desc: "Record irregular income and expenses, plan budgets without a fixed salary, and use the CFO Helper to think through business decisions like taking on extra marketing cost.",
  },
  {
    title: "Small-business owners",
    desc: "Run hypothetical scenarios — what happens to profit margin if you hire two engineers and increase prices by 10%? The CFO Helper lets you explore those questions with your own numbers.",
  },
];

/* ─────────────────────────────────────────────
   Main landing page component
───────────────────────────────────────────── */
function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  // Track active section for nav highlight
  useEffect(() => {
    const sections = ["features", "how-it-works", "about", "goal-planner"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const APP_URL = "/app";

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#about", label: "About" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Skip to main ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {/* ══════════════════════════════════════
          HEADER / NAVIGATION
      ══════════════════════════════════════ */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <a
            href="/"
            className="flex items-center gap-2 font-bold text-foreground"
            aria-label="PLANPOCKET home"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
              aria-hidden="true"
            >
              P
            </span>
            <span className="text-lg tracking-tight">PLANPOCKET</span>
          </a>

          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-6 md:flex"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <a
              href={APP_URL}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Log in
            </a>
            <a
              href={APP_URL}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Get started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            {mobileMenuOpen ? (
              <svg
                viewBox="0 0 24 24"
                width={20}
                height={20}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width={20}
                height={20}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav
            id="mobile-menu"
            className="border-t border-border bg-background px-4 py-4 md:hidden"
            aria-label="Mobile navigation"
          >
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="mt-3 border-t border-border pt-3">
                <a
                  href={APP_URL}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log in
                </a>
              </li>
              <li>
                <a
                  href={APP_URL}
                  className="mt-1 block rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get started
                </a>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="main-content">
        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section
          aria-labelledby="hero-heading"
          className="border-b border-border bg-background py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Personal Finance &amp; Business Planning
              </p>
              <h1
                id="hero-heading"
                className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              >
                One place for all your financial planning
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                PLANPOCKET brings personal finance tools and small-business
                scenario planning together. Track spending, build budgets, set
                savings goals, estimate investment growth, and explore
                hypothetical business decisions — without switching between
                separate apps.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href={APP_URL}
                  className="w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                >
                  Get started — it's free
                </a>
                <a
                  href={APP_URL}
                  className="w-full rounded-md border border-input bg-background px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent sm:w-auto"
                >
                  Log in
                </a>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Prototype — data is stored in your browser. No account
                information leaves your device in this version.
              </p>
            </div>

            {/* Product preview */}
            <div
              className="mt-16 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
              role="img"
              aria-label="Illustrative preview of the PLANPOCKET dashboard showing example financial data"
            >
              <div className="border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-destructive/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <span className="h-3 w-3 rounded-full bg-green-500/60" />
                  <span className="ml-4 text-xs text-muted-foreground">
                    PLANPOCKET Dashboard — illustrative example data
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                {[
                  { label: "Active Goals", value: "3" },
                  { label: "This Month's Expenses", value: "₹18,450" },
                  { label: "Saved Toward Goals", value: "₹42,000" },
                  { label: "Last Investment Estimate", value: "₹3,12,500" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-card px-4 py-5 text-center"
                  >
                    <div className="text-xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-3">
                {[
                  {
                    tool: "Goal Planner",
                    detail: "Emergency Fund — 68% complete",
                    bar: 68,
                  },
                  {
                    tool: "Budget Planner",
                    detail: "Food ₹6,200 / ₹8,000 limit",
                    bar: 78,
                  },
                  {
                    tool: "CFO Helper",
                    detail: "Scenario: +2 engineers, 10% price rise",
                    bar: null,
                  },
                ].map((item) => (
                  <div key={item.tool} className="bg-card px-5 py-5">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.tool}
                    </div>
                    <div className="text-sm text-foreground">{item.detail}</div>
                    {item.bar !== null && (
                      <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${item.bar}%` }}
                          role="presentation"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="px-4 py-2 text-center text-xs text-muted-foreground">
                All figures shown above are illustrative example data. Your
                actual data will appear when you use the app.
              </p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            ABOUT / PURPOSE
        ══════════════════════════════════════ */}
        <section
          id="about"
          aria-labelledby="about-heading"
          className="border-b border-border py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2
                id="about-heading"
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                What is PLANPOCKET?
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                PLANPOCKET is a client-side finance-planning prototype that
                helps you organise spending, make budgets, set savings goals,
                estimate investment growth, review monthly summaries, and
                explore hypothetical business scenarios — all in a single web
                application.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                It is designed to be approachable for individuals managing
                household finances and for freelancers or small-business owners
                who want a lightweight tool to think through financial decisions.
              </p>
              <div className="mt-6 rounded-lg border border-border bg-muted/30 px-5 py-4 text-sm text-muted-foreground text-left">
                <strong className="text-foreground">Prototype notice:</strong>{" "}
                Financial data is stored in your browser using localStorage.
                Records are not confirmed to sync between devices. The prototype
                login stores credentials in browser storage — do not use real
                passwords or sensitive financial data. Investment and scenario
                outputs are estimates, not financial advice.
              </div>
            </div>

            {/* Audience grid */}
            <div
              id="audiences"
              className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {audiences.map((a) => (
                <div
                  key={a.title}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <h3 className="font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {a.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FEATURES
        ══════════════════════════════════════ */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="border-b border-border py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2
                id="features-heading"
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                Every tool, explained honestly
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                All features below are implemented and available in the current
                app. Status is noted where relevant.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article
                  key={f.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-6"
                  aria-labelledby={`feature-${f.id}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {f.icon}
                    </span>
                    <div>
                      <h3
                        id={`feature-${f.id}`}
                        className="font-semibold text-foreground"
                      >
                        {f.title}
                      </h3>
                      {f.status === "live" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-green-500"
                            aria-hidden="true"
                          />
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.summary}
                  </p>
                </article>
              ))}
            </div>

            {/* Roadmap notice */}
            <div className="mt-12 rounded-lg border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground">
                In the current roadmap
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-border text-xs">
                    —
                  </span>
                  Improve spacing and layout of the CFO Helper Scenario Controls
                  row.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-border text-xs">
                    —
                  </span>
                  Restyle the exported CFO PDF report without changing
                  calculations.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-border text-xs">
                    —
                  </span>
                  Verify controls, downloads, and layout across browsers.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            GOAL PLANNER HIGHLIGHT
        ══════════════════════════════════════ */}
        <section
          id="goal-planner"
          aria-labelledby="goal-planner-heading"
          className="border-b border-border bg-muted/20 py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
                  Savings Goal Planner
                </p>
                <h2
                  id="goal-planner-heading"
                  className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                  Set a target. Track every step.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Create a savings goal with a name, target amount, and how much
                  you have already set aside. Choose a saving duration — 3
                  months, 6 months, 1 year, 3 years, or a custom period — and
                  the planner calculates the recommended monthly saving needed
                  to reach your target on time.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "See saved amount, remaining amount, and progress percentage at a glance.",
                    "Visualise progress with a doughnut chart — Saved vs. Remaining.",
                    "Record individual contributions with an amount and date to build a personal savings history.",
                    "Edit or delete any recorded contribution and watch the total update instantly.",
                    "Compare a planned monthly contribution against the recommended amount.",
                    "Goals and contribution records are stored in your browser and persist across sessions.",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <svg
                        viewBox="0 0 24 24"
                        width={18}
                        height={18}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 flex-shrink-0 text-primary"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-sm text-muted-foreground">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Contributions are personal savings records you log yourself.
                  There is no payment processing or bank connection.
                </p>
              </div>

              {/* Goal card illustration */}
              <div
                className="rounded-xl border border-border bg-card p-6 shadow-lg"
                role="img"
                aria-label="Illustrative example of a goal card for an Emergency Fund goal"
              >
                <p className="mb-4 text-right text-xs text-muted-foreground">
                  Illustrative example
                </p>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">
                      Emergency Fund
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Oct 10, 2026 – Apr 10, 2027
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    68%
                  </span>
                </div>
                <div className="mb-1 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: "68%" }}
                    role="presentation"
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-lg bg-muted/40 px-2 py-3">
                    <div className="font-bold text-foreground">₹1,00,000</div>
                    <div className="text-muted-foreground">Target</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-3">
                    <div className="font-bold text-green-600">₹68,000</div>
                    <div className="text-muted-foreground">Saved</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-3">
                    <div className="font-bold text-foreground">₹32,000</div>
                    <div className="text-muted-foreground">Remaining</div>
                  </div>
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Recent contributions
                  </p>
                  {[
                    { date: "Oct 5, 2026", amount: "₹8,000", ref: "483920104751" },
                    { date: "Sep 4, 2026", amount: "₹10,000", ref: "712304859201" },
                  ].map((c) => (
                    <div
                      key={c.ref}
                      className="flex items-center justify-between py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">{c.date}</span>
                      <span className="font-medium text-foreground">
                        {c.amount}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        #{c.ref}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Recommended monthly saving: <strong>₹10,667</strong> over 3
                  remaining months
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section
          id="how-it-works"
          aria-labelledby="how-heading"
          className="border-b border-border py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2
                id="how-heading"
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                How it works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The actual user flow, from sign-up to reviewing your results.
              </p>
            </div>
            <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {steps.map((step, idx) => (
                <li
                  key={step.num}
                  className="flex flex-col rounded-xl border border-border bg-card p-6"
                >
                  <span
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {step.num}
                  </span>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FINAL CALL TO ACTION
        ══════════════════════════════════════ */}
        <section
          aria-labelledby="cta-heading"
          className="py-24"
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2
              id="cta-heading"
              className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Ready to take control of your finances?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Create a free account and start using every planning tool today.
              No external service required — everything runs in your browser.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href={APP_URL}
                className="w-full rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              >
                Get started — it's free
              </a>
              <a
                href={APP_URL}
                className="w-full rounded-md border border-input bg-background px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent sm:w-auto"
              >
                Log in to your account
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  P
                </span>
                <span>PLANPOCKET</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Your financial planning companion. A client-side prototype for
                personal finance and small-business scenario planning.
              </p>
            </div>

            {/* Nav */}
            <nav aria-label="Footer navigation">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Navigation
              </h3>
              <ul className="space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* App links */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                App
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href={APP_URL}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Log in
                  </a>
                </li>
                <li>
                  <a
                    href={APP_URL}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Create account
                  </a>
                </li>
                <li>
                  <a
                    href={APP_URL}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open dashboard
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} PLANPOCKET. Prototype project.</p>
            <p>
              Finance data is stored locally in your browser. Calculations and
              scenario results are estimates, not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
