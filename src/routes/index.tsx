import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, type ReactNode, type KeyboardEvent } from "react";

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
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: LandingPage,
});

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
    title: "Explore the planning suite",
    desc: "Discover each of the personal finance and small-business planning tools. All data remains in your local browser — nothing is sent to an external server.",
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
   Motion helpers (presentation only)
───────────────────────────────────────────── */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`pp-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* Small illustrative previews per feature — decorative, non-interactive */
function Bar({ w, tone = "primary" }: { w: number; tone?: "primary" | "warn" }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={`pp-grow h-2 rounded-full ${tone === "warn" ? "bg-[var(--pp-warn)]" : "bg-primary"}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function FeaturePreview({ id }: { id: string }) {
  const card = "rounded-lg border border-border bg-card p-3";
  const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  switch (id) {
    case "dashboard":
      return (
        <div className="grid grid-cols-2 gap-3">
          {[["Active Goals", "3"], ["This Month", "₹18,450"], ["Saved", "₹42,000"], ["Investment", "₹3,12,500"]].map(([l, v]) => (
            <div key={l} className={card}>
              <div className={label}>{l}</div>
              <div className="mt-1 text-lg font-bold text-foreground">{v}</div>
            </div>
          ))}
        </div>
      );
    case "expense-tracker":
      return (
        <div className="space-y-2">
          {[["Groceries", "Food", "₹1,240"], ["Metro card", "Transport", "₹500"], ["Electricity", "Utilities", "₹2,100"], ["Movie night", "Entertainment", "₹650"]].map(([d, c, a], i) => (
            <div key={d} className={`${card} pp-slide flex items-center justify-between`} style={{ animationDelay: `${i * 70}ms` }}>
              <div>
                <div className="text-sm font-semibold text-foreground">{d}</div>
                <div className="text-xs text-muted-foreground">{c}</div>
              </div>
              <div className="text-sm font-bold text-foreground">{a}</div>
            </div>
          ))}
        </div>
      );
    case "budget-planner":
      return (
        <div className={`${card} space-y-4`}>
          {[["Food", "₹6,200 / ₹8,000", 78, "primary"], ["Transport", "₹1,900 / ₹2,500", 76, "primary"], ["Shopping", "₹4,800 / ₹4,000", 100, "warn"]].map(([c, t, w, tone]) => (
            <div key={c as string}>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-semibold text-foreground">{c}</span>
                <span className="text-muted-foreground">{t}</span>
              </div>
              <Bar w={w as number} tone={tone as "primary" | "warn"} />
            </div>
          ))}
        </div>
      );
    case "goal-planner":
      return (
        <div className={`${card} flex items-center gap-5`}>
          <svg viewBox="0 0 42 42" className="h-24 w-24 flex-shrink-0 -rotate-90">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="5" />
            <circle className="pp-ring" cx="21" cy="21" r="15.9" fill="none" stroke="var(--primary)" strokeWidth="5" strokeDasharray="68 32" strokeLinecap="round" />
          </svg>
          <div>
            <div className="font-bold text-foreground">Emergency Fund</div>
            <div className="text-xs text-muted-foreground">₹68,000 of ₹1,00,000</div>
            <div className="badge-accent-soft mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold">68%</div>
          </div>
        </div>
      );
    case "investment-calculator":
      return (
        <div className={card}>
          <div className={label}>Estimated value over 10 years</div>
          <svg viewBox="0 0 200 80" className="mt-2 h-28 w-full" preserveAspectRatio="none">
            <path d="M0 75 C 50 70, 90 58, 130 40 S 185 8, 200 4 L200 80 L0 80 Z" fill="var(--accent)" />
            <path className="pp-draw" d="M0 75 C 50 70, 90 58, 130 40 S 185 8, 200 4" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
          </svg>
          <div className="mt-1 text-lg font-bold text-foreground">₹3,12,500 <span className="text-xs font-medium text-muted-foreground">illustrative</span></div>
        </div>
      );
    case "financial-reports":
      return (
        <div className={card}>
          <div className={label}>October summary</div>
          <div className="mt-3 flex h-28 items-end gap-2">
            {[55, 80, 35, 62, 45, 28, 40].map((h, i) => (
              <div key={i} className="pp-rise flex-1 rounded-t-md bg-primary/80" style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>By category</span><span className="font-semibold text-foreground">CSV ready</span></div>
        </div>
      );
    default:
      return (
        <div className={`${card} space-y-3`}>
          {[["Engineers", 60], ["Marketing spend", 40], ["Price change", 70]].map(([l, w]) => (
            <div key={l as string}>
              <div className="mb-1 text-xs font-semibold text-foreground">{l}</div>
              <Bar w={w as number} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1 text-center">
            <div className="rounded-md bg-muted px-2 py-2"><div className="text-sm font-bold text-foreground">14 mo</div><div className="text-[11px] text-muted-foreground">Runway</div></div>
            <div className="rounded-md bg-muted px-2 py-2"><div className="text-sm font-bold text-foreground">₹4.8L</div><div className="text-[11px] text-muted-foreground">Monthly burn</div></div>
          </div>
        </div>
      );
  }
}

function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const go = useCallback((i: number, focus = false) => {
    const n = (i + features.length) % features.length;
    setActive(n);
    if (focus) tabsRef.current[n]?.focus();
  }, []);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(active + 1, true); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(active - 1, true); }
    else if (e.key === "Home") { e.preventDefault(); go(0, true); }
    else if (e.key === "End") { e.preventDefault(); go(features.length - 1, true); }
  };
  const f = features[active];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10">
      <div
        role="tablist"
        aria-label="PLANPOCKET features"
        aria-orientation="vertical"
        className="pp-tabs -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {features.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabsRef.current[i] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={i === active}
            aria-controls="feature-panel"
            tabIndex={i === active ? 0 : -1}
            onClick={() => go(i)}
            onKeyDown={onKey}
            className={`pp-tab flex flex-shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
              i === active ? "is-active" : ""
            }`}
          >
            <span className="pp-tab-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg">{t.icon}</span>
            <span className="whitespace-nowrap lg:whitespace-normal">{t.title}</span>
          </button>
        ))}
      </div>

      <div
        id="feature-panel"
        role="tabpanel"
        aria-labelledby={`tab-${f.id}`}
        tabIndex={0}
        className="pp-panel rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8"
      >
        <div key={f.id} className="pp-swap grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="badge-accent-soft flex h-11 w-11 items-center justify-center rounded-lg">{f.icon}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pp-success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--pp-success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--pp-success)]" aria-hidden="true" />
                Available
              </span>
            </div>
            <h3 id={`feature-${f.id}`} className="text-2xl font-bold tracking-tight text-foreground">{f.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{f.summary}</p>
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => go(active - 1)} aria-label="Previous feature" className="pp-arrow">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button type="button" onClick={() => go(active + 1)} aria-label="Next feature" className="pp-arrow">
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
                {active + 1} / {features.length}
              </span>
            </div>
          </div>
          <div className="pp-preview-wrap rounded-xl bg-muted/70 p-4 sm:p-5" aria-hidden="true">
            <FeaturePreview id={f.id} />
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Illustrative example data</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main landing page component
───────────────────────────────────────────── */
function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  // Track active section for nav highlight
  useEffect(() => {
    const sections = ["features", "how-it-works", "about", "goal-planner", "access"];
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

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#about", label: "About" },
    { href: "#access", label: "App Access" },
  ];

  return (
    <div
      className="planpocket-landing min-h-screen bg-background text-foreground"
      style={{
        backgroundColor: "#F5F7FA",
        color: "#172B4D",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Scoped Theme Styles: PlanPocket Brand Identity ── */}
      <style>{`
        .planpocket-landing,
        .dark .planpocket-landing,
        :root .planpocket-landing {
          --background: #F5F7FA !important;
          --color-background: #F5F7FA !important;
          --foreground: #172B4D !important;
          --color-foreground: #172B4D !important;
          --card: #FFFFFF !important;
          --color-card: #FFFFFF !important;
          --card-foreground: #172B4D !important;
          --color-card-foreground: #172B4D !important;
          --popover: #FFFFFF !important;
          --color-popover: #FFFFFF !important;
          --popover-foreground: #172B4D !important;
          --color-popover-foreground: #172B4D !important;
          --primary: #0F766E !important;
          --color-primary: #0F766E !important;
          --primary-foreground: #FFFFFF !important;
          --color-primary-foreground: #FFFFFF !important;
          --secondary: #FFFFFF !important;
          --color-secondary: #FFFFFF !important;
          --secondary-foreground: #172B4D !important;
          --color-secondary-foreground: #172B4D !important;
          --muted: #EEF2F6 !important;
          --color-muted: #EEF2F6 !important;
          --muted-foreground: #667085 !important;
          --color-muted-foreground: #667085 !important;
          --accent: #DDF3EC !important;
          --color-accent: #DDF3EC !important;
          --accent-foreground: #0F766E !important;
          --color-accent-foreground: #0F766E !important;
          --destructive: #B42318 !important;
          --color-destructive: #B42318 !important;
          --destructive-foreground: #FFFFFF !important;
          --color-destructive-foreground: #FFFFFF !important;
          --border: #E4E7EC !important;
          --color-border: #E4E7EC !important;
          --input: #E4E7EC !important;
          --color-input: #E4E7EC !important;
          --ring: #0F766E !important;
          --color-ring: #0F766E !important;
          --radius: 12px !important;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif !important;
          background-color: #F5F7FA !important;
          color: #172B4D !important;
        }

        .planpocket-landing .btn-planpocket-primary {
          background-color: #0F766E !important;
          color: #FFFFFF !important;
          border: 1px solid #0F766E !important;
          border-radius: 10px !important;
          font-weight: 600 !important;
          transition: background-color 0.15s ease, transform 0.1s ease !important;
        }
        .planpocket-landing .btn-planpocket-primary:hover {
          background-color: #0B5F58 !important;
          border-color: #0B5F58 !important;
        }
        .planpocket-landing .btn-planpocket-primary:active {
          transform: scale(0.98) !important;
        }

        .planpocket-landing .btn-planpocket-secondary {
          background-color: #FFFFFF !important;
          color: #172B4D !important;
          border: 1px solid #E4E7EC !important;
          border-radius: 10px !important;
          font-weight: 600 !important;
          transition: background-color 0.15s ease, border-color 0.15s ease !important;
        }
        .planpocket-landing .btn-planpocket-secondary:hover {
          background-color: #F5F7FA !important;
          border-color: #D0D5DD !important;
        }


        .planpocket-landing { --pp-success:#067647; --pp-success-soft:#DCFAE6; --pp-warn:#DC6803; overflow-x:clip; }
        .planpocket-landing :focus-visible { outline:2px solid #0F766E; outline-offset:2px; border-radius:8px; }
        .planpocket-landing .pp-hero-bg { background:
            radial-gradient(60% 50% at 15% 0%, rgba(15,118,110,.10), transparent 70%),
            radial-gradient(50% 45% at 90% 10%, rgba(221,243,236,.9), transparent 70%); }
        .planpocket-landing .pp-eyebrow { font-size:.75rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#0F766E; }
        .planpocket-landing .pp-reveal { opacity:0; transform:translateY(18px); transition:opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1); }
        .planpocket-landing .pp-reveal.is-visible { opacity:1; transform:none; }
        .planpocket-landing .pp-float { animation:pp-float 7s ease-in-out infinite; }
        @keyframes pp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .planpocket-landing .pp-tab { background:#fff; border-color:#E4E7EC; color:#344054; transition:background-color .2s, border-color .2s, color .2s, box-shadow .2s; }
        .planpocket-landing .pp-tab:hover { border-color:#B7DED4; background:#FAFDFC; }
        .planpocket-landing .pp-tab .pp-tab-icon { background:#EEF2F6; color:#667085; transition:inherit; }
        .planpocket-landing .pp-tab .pp-tab-icon svg { width:18px; height:18px; }
        .planpocket-landing .pp-tab.is-active { border-color:#0F766E; color:#172B4D; box-shadow:0 6px 18px -10px rgba(15,118,110,.45); }
        .planpocket-landing .pp-tab.is-active .pp-tab-icon { background:#0F766E; color:#fff; }
        .planpocket-landing .pp-tabs { scrollbar-width:none; }
        .planpocket-landing .pp-tabs::-webkit-scrollbar { display:none; }
        .planpocket-landing .pp-arrow { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:999px; border:1px solid #E4E7EC; background:#fff; color:#172B4D; transition:background-color .15s, border-color .15s; }
        .planpocket-landing .pp-arrow:hover { background:#DDF3EC; border-color:#B7DED4; }
        .planpocket-landing .pp-swap { animation:pp-swap .45s cubic-bezier(.2,.7,.2,1); }
        @keyframes pp-swap { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
        .planpocket-landing .pp-grow { animation:pp-grow .9s cubic-bezier(.2,.7,.2,1) both; transform-origin:left; }
        @keyframes pp-grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        .planpocket-landing .pp-rise { animation:pp-rise .7s cubic-bezier(.2,.7,.2,1) both; transform-origin:bottom; }
        @keyframes pp-rise { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .planpocket-landing .pp-slide { animation:pp-slide .5s ease both; }
        @keyframes pp-slide { from{opacity:0; transform:translateX(-10px)} to{opacity:1; transform:none} }
        .planpocket-landing .pp-draw { stroke-dasharray:260; animation:pp-draw 1.2s ease both; }
        @keyframes pp-draw { from{stroke-dashoffset:260} to{stroke-dashoffset:0} }
        .planpocket-landing .pp-ring { animation:pp-ring 1s ease both; }
        @keyframes pp-ring { from{stroke-dasharray:0 100} }
        .planpocket-landing .pp-card { transition:transform .2s ease, box-shadow .2s ease, border-color .2s; }
        .planpocket-landing .pp-card:hover { transform:translateY(-3px); box-shadow:0 14px 30px -18px rgba(23,43,77,.35); border-color:#CFE7E0; }
        .planpocket-landing .pp-step-num { background:#0F766E; color:#fff; }
        .planpocket-landing .pp-cta { background:linear-gradient(135deg,#0F766E 0%,#0B5F58 100%); color:#fff; }
        .planpocket-landing .pp-cta .btn-planpocket-primary { background:#fff !important; color:#0F766E !important; border-color:#fff !important; }
        .planpocket-landing .pp-cta .btn-planpocket-primary:hover { background:#DDF3EC !important; }
        .planpocket-landing .pp-cta .btn-planpocket-secondary { background:transparent !important; color:#fff !important; border-color:rgba(255,255,255,.5) !important; }
        .planpocket-landing .pp-cta .btn-planpocket-secondary:hover { background:rgba(255,255,255,.1) !important; }
        .planpocket-landing .btn-planpocket-primary:hover { transform:translateY(-1px); box-shadow:0 8px 18px -10px rgba(15,118,110,.7); }
        @media (prefers-reduced-motion: reduce) {
          .planpocket-landing *, .planpocket-landing *::before, .planpocket-landing *::after { animation:none !important; transition:none !important; }
          .planpocket-landing .pp-reveal { opacity:1; transform:none; }
          html:has(.planpocket-landing) { scroll-behavior:auto; }
        }
        html:has(.planpocket-landing) { scroll-behavior:smooth; scroll-padding-top:80px; }
        .planpocket-landing .badge-accent-soft {
          background-color: #DDF3EC !important;
          color: #0F766E !important;
        }
      `}</style>

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
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <a
            href="/"
            className="flex items-center gap-2.5 font-bold text-foreground"
            aria-label="PLANPOCKET home"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm"
              aria-hidden="true"
            >
              P
            </span>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              PLANPOCKET
            </span>
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
                className={`text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded ${
                  activeSection === link.href.slice(1)
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <a
              href="/app?page=login"
              className="btn-planpocket-secondary rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Log in
            </a>
            <a
              href="/app?page=signup"
              className="btn-planpocket-primary rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Get started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
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
            className="border-t border-border bg-card px-4 py-4 md:hidden shadow-lg"
            aria-label="Mobile navigation"
          >
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="mt-3 border-t border-border pt-3">
                <a
                  href="/app?page=login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-left block rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Log in
                </a>
              </li>
              <li>
                <a
                  href="/app?page=signup"
                  className="mt-1 block rounded-md btn-planpocket-primary px-3 py-2 text-center text-sm font-semibold shadow-sm"
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
          className="pp-hero-bg border-b border-border py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-3xl text-center">
              <span className="badge-accent-soft mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                Personal Finance &amp; Business Planning
              </span>
              <h1
                id="hero-heading"
                className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
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
                  href="/app?page=signup"
                  className="w-full rounded-md btn-planpocket-primary px-6 py-3 text-center text-base font-semibold shadow-sm transition-colors sm:w-auto"
                >
                  Get started — it's free
                </a>
                <a
                  href="/app?page=login"
                  className="w-full rounded-md btn-planpocket-secondary px-6 py-3 text-center text-base font-semibold transition-colors sm:w-auto"
                >
                  Log in
                </a>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Prototype — data is stored in your browser. No account
                information leaves your device in this version.
              </p>
            </Reveal>

            {/* Product preview */}
            <Reveal delay={150} className="mt-14">
            <div
              className="pp-float overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-30px_rgba(23,43,77,0.35)]"
              role="img"
              aria-label="Illustrative preview of the PLANPOCKET dashboard showing example financial data"
            >
              <div className="border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-border" />
                  <span className="h-3 w-3 rounded-full bg-border" />
                  <span className="h-3 w-3 rounded-full bg-border" />
                  <span className="ml-4 text-xs font-medium text-muted-foreground">
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
                    <div className="text-sm font-medium text-foreground">
                      {item.detail}
                    </div>
                    {item.bar !== null && (
                      <div className="mt-3 h-2 w-full rounded-full bg-muted">
                        <div
                          className="pp-grow h-2 rounded-full bg-primary"
                          style={{ width: `${item.bar}%` }}
                          role="presentation"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="border-t border-border bg-card px-4 py-2.5 text-center text-xs text-muted-foreground">
                All figures shown above are illustrative example data. Your
                actual data will appear when you use the app.
              </p>
            </div>
            </Reveal>
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
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              <p className="pp-eyebrow mb-3">Features</p>
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
            </Reveal>

            <Reveal>
              <FeatureShowcase />
            </Reveal>

            {/* Roadmap notice */}
            <div className="mt-12 rounded-xl border border-dashed border-border bg-card/60 p-6">
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
          className="border-b border-border bg-card py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal>
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
              </Reveal>

              {/* Goal card illustration */}
              <Reveal delay={120}>
              <div
                className="pp-float rounded-2xl border border-border bg-card p-6 shadow-[0_24px_50px_-28px_rgba(23,43,77,0.35)]"
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
                  <span className="badge-accent-soft rounded-full px-2.5 py-1 text-xs font-bold">
                    68%
                  </span>
                </div>
                <div className="mb-1 h-2.5 w-full rounded-full bg-muted">
                  <div
                    className="pp-grow h-2.5 rounded-full bg-primary"
                    style={{ width: "68%" }}
                    role="presentation"
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-lg bg-muted/60 px-2 py-3">
                    <div className="font-bold text-foreground">₹1,00,000</div>
                    <div className="text-muted-foreground">Target</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-3">
                    <div className="font-bold text-[var(--pp-success)]">₹68,000</div>
                    <div className="text-muted-foreground">Saved</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-2 py-3">
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
                      <span className="font-semibold text-foreground">
                        {c.amount}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        #{c.ref}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Recommended monthly saving: <strong className="text-foreground">₹10,667</strong> over 3
                  remaining months
                </div>
              </div>
              </Reveal>
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
            <Reveal className="mx-auto mb-12 max-w-2xl text-center">
              <p className="pp-eyebrow mb-3">How it works</p>
              <h2
                id="how-heading"
                className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                How it works
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The actual workflow, from feature discovery to reviewing your results.
              </p>
            </Reveal>
            <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {steps.map((step, i) => (
                <li key={step.num} className="list-none">
                <Reveal delay={i * 80} className="h-full">
                <div
                  className="pp-card flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <span
                    className="pp-step-num mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    aria-hidden="true"
                  >
                    {step.num}
                  </span>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
                </Reveal>
                </li>
              ))}
            </ol>
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
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="pp-eyebrow mb-3">About</p>
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
              <div className="mt-6 rounded-lg border border-border bg-card px-5 py-4 text-left text-sm text-muted-foreground shadow-sm">
                <strong className="text-foreground font-semibold">
                  Prototype notice:
                </strong>{" "}
                Financial data is stored in your browser using localStorage.
                Records are not confirmed to sync between devices. The prototype
                login stores credentials in browser storage — do not use real
                passwords or sensitive financial data. Investment and scenario
                outputs are estimates, not financial advice.
              </div>
            </Reveal>

            {/* Audience grid */}
            <div
              id="audiences"
              className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {audiences.map((a, i) => (
                <Reveal key={a.title} delay={i * 80}>
                <div
                  className="pp-card h-full rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {a.desc}
                  </p>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            APP ACCESS & PROTOTYPE STATUS
        ══════════════════════════════════════ */}
        <section
          id="access"
          aria-labelledby="access-heading"
          className="border-b border-border py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
              <span className="badge-accent-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                Client-Side Prototype • Local Storage
              </span>
              <h2
                id="access-heading"
                className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                Access the PLANPOCKET Application
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                PLANPOCKET operates directly in your web browser. Account credentials
                and financial planning data are stored in your device&apos;s localStorage for
                personal budgeting and scenario simulation. No external servers or cloud accounts
                are required.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href="/app?page=signup"
                  className="btn-planpocket-primary rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
                >
                  Create Account (Sign Up)
                </a>
                <a
                  href="/app?page=login"
                  className="btn-planpocket-secondary rounded-md px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  Log In
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FINAL CALL TO ACTION
        ══════════════════════════════════════ */}
        <section
          aria-labelledby="cta-heading"
          className="px-4 py-20 sm:px-6"
        >
          <Reveal className="pp-cta mx-auto max-w-5xl rounded-3xl px-6 py-16 text-center shadow-lg sm:px-12">
            <h2
              id="cta-heading"
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Ready to take control of your finances?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
              Review every tool, simulate hypothetical scenarios, and plan your
              savings goals — all right here.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="/app?page=signup"
                className="w-full rounded-md btn-planpocket-primary px-8 py-3 text-center text-base font-semibold shadow-sm transition-colors sm:w-auto"
              >
                Get started — it's free
              </a>
              <a
                href="/app?page=login"
                className="w-full rounded-md btn-planpocket-secondary px-8 py-3 text-center text-base font-semibold transition-colors sm:w-auto"
              >
                Log in to your account
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  P
                </span>
                <span className="font-extrabold tracking-tight">PLANPOCKET</span>
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
                    href="/app?page=login"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Log in
                  </a>
                </li>
                <li>
                  <a
                    href="/app?page=signup"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Create account
                  </a>
                </li>
                <li>
                  <a
                    href="/app"
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
