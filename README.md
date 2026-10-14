# PLANPOCKET

**Your Financial Planning Companion**

PLANPOCKET is a client-side financial-planning prototype that brings personal finance tools and small-business scenario planning together in one web application. It helps users organize expenses, plan budgets, track savings goals, estimate investment growth, review financial summaries, and explore hypothetical business scenarios.

> **Project status:** PLANPOCKET integrates secure Supabase Authentication and a MongoDB-backed cloud persistence engine for financial goals and scenarios when configured with environment variables. Password recovery is supported via Supabase Auth at `/auth/reset-password`. The CFO Helper provides deterministic business scenario projections and report exports without transmitting financial data to external AI providers. Calculations and scenario outputs are transparent planning estimates, not guaranteed outcomes or financial advice.

## What the project aims to help with

Personal and small-business financial information is often spread across separate tools or managed manually. PLANPOCKET brings several planning activities into one place so users can record spending, plan budgets, track savings goals, estimate investment growth, review summaries, and explore hypothetical business decisions.

## Intended users

- Individuals and households organizing expenses, budgets, and savings goals.

- Students and early-career professionals learning to plan personal finances.

- Freelancers and small-business owners reviewing financial activity and exploring hypothetical scenarios.

## Features

The public landing page at `/` introduces the project and its feature set. The finance application is available at `/app`.

- **Dashboard:** Overview of financial activity and shortcuts to planning tools.

- **Expense Tracker:** Record expenses with descriptions, amounts, categories, and dates, and review spending totals.

- **Budget Planner:** Set monthly income and category limits, then compare the plan with recorded spending.

- **Savings Goal Planner:** Create savings goals, set targets and timelines, record personal contributions, and track progress and contribution history. Contributions are personal savings records; they do not initiate or confirm money transfers.

- **Investment Calculator:** Estimate potential future value using user-entered investment assumptions. Results depend on the selected calculator and inputs; estimates are not guaranteed.

- **Financial Reports:** Review spending information and export a CSV report where supported.

- **CFO Helper:** Explore hypothetical business scenarios using available inputs such as hiring, marketing, pricing, revenue growth, and operating expenses, then review estimated results and charts. Do not describe this as AI-powered unless a real AI integration is implemented and verified.

- **Account screens:** Supabase Authentication with login, registration, and email-based password recovery at `/auth/reset-password`.

Check the current application before relying on any feature description; implementations may change as the project develops.

## Routes and project structure

This project uses TanStack Start and TanStack Router file-based routing.

```
/                      Public PLANPOCKET introduction and feature landing page (src/routes/index.tsx)
/app                   Finance application rendered from public/planpocket.html (src/routes/app.tsx)
/auth/reset-password   Dedicated Supabase password recovery callback page (src/routes/auth.reset-password.tsx)
```

```
public/
  planpocket.html       Main finance application UI and client-side interactions
  favicon.ico           Browser tab icon
  robots.txt             Search crawler instructions
src/
  components/ui/         Reusable UI building blocks
  hooks/                 Shared React hooks
  lib/                   Shared helpers and error-handling utilities
  routes/
    __root.tsx           Shared application shell and error boundaries
    index.tsx            Public landing page at /
    app.tsx              Finance application route at /app
  router.tsx             Router initialization
  routeTree.gen.ts       Generated route tree; do not edit manually
  server.ts              TanStack Start server entry and error handling
  start.ts               Start middleware setup
  styles.css             Global styles and theme tokens
  test/                  Automated tests and test setup
roadmap.md               Current project follow-up items
```

## Technology stack

- **Languages:** TypeScript and JavaScript

- **UI library:** React

- **Application framework and routing:** TanStack Start and TanStack Router

- **Styling:** Tailwind CSS, shared theme tokens, and existing project styles

- **UI building blocks:** Radix UI-based and shadcn-style components

- **Charts:** Recharts is included in the dependencies; the standalone finance interface also uses Chart.js where implemented

- **Build and development:** Vite and Bun (npm is also supported)

- **Testing:** Vitest and Testing Library

## Run locally

You need a recent version of Node.js. Bun is the preferred package manager because the repository includes a Bun lockfile.

### With Bun

```bash
bun install
bun run dev
```

### With npm

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. Available project scripts include:

```bash
npm run build
npm run preview
npm run lint
npm test
```

If using Bun, run these as `bun run build`, `bun run preview`, `bun run lint`, or `bun test` as appropriate.

## Data, security, and limitations
 
- Authentication uses Supabase Auth with email/password verification and password recovery at `/auth/reset-password`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to connect your project.

- Multi-user persistence uses a server API route backed by MongoDB (`MONGODB_URI`). Scenarios and goals are secured with server-verified Supabase session Bearer tokens.

- When running without Supabase or MongoDB environment variables, the app displays honest configuration guidance and falls back to local storage for personal budgeting.

- The CFO Helper generates deterministic financial scenario forecasts using transparent business modeling formulas without external AI dependencies or third-party data transmission.

- Investment and business-scenario outputs are illustrative planning estimates based on user inputs. They are not guaranteed outcomes or professional financial advice.

## Development and testing status

The repository contains a basic automated routing test, but it does not verify every finance workflow, calculation, or responsive-browser interaction. Before release, test the major flows, calculations, validation, accessibility, chart labels, and mobile/desktop layouts.

Suggested future work:

1. Expand tests for expenses, budgets, goals, investments, reports, and CFO scenarios.

1. Verify major workflows and responsive layouts in supported browsers.

1. Replace demo authentication with secure server-side authentication before supporting real users or private cloud data.

1. Choose and integrate a database only if multi-user or cross-device persistence is required, with server-side ownership checks.

1. Integrate an AI provider only if AI-powered CFO analysis is intended; clearly distinguish AI-generated explanations from deterministic calculations.

See [`roadmap.md`](roadmap.md) for the current tracked follow-up items.

## Acknowledgment

Lovable has assisted with development. The project is maintained through GitHub.
