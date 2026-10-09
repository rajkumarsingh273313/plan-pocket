# PLANPOCKET

**Your Financial Planning Companion**

PLANPOCKET is a client-side financial planning prototype that brings everyday finance tools and small-business scenario planning together in one web application. It is designed to help users organize spending, create budgets, track savings goals, estimate investment growth, review financial summaries, and explore hypothetical business scenarios.

> **Project status:** This is a prototype. Finance data is stored in the browser with `localStorage`. The current repository does not confirm a connected MongoDB or SQL database, production-grade authentication, real SMS OTP delivery, or an AI model powering the CFO Helper. Treat calculations and scenario outputs as estimates, not financial advice.

## Problem

Personal and small-business financial information is often managed across separate tools or calculated manually. This can make it harder to understand spending, stay within a budget, monitor savings goals, estimate investment growth, and consider business decisions. PLANPOCKET aims to provide a single, approachable place for these planning activities.

## Target users

- Individuals and households organizing their expenses, budgets, and savings goals.

- Students and early-career professionals learning to plan personal finances.

- Freelancers and small-business owners reviewing financial activity and exploring hypothetical scenarios.

## Main features

- **Dashboard:** Overview of key financial activity and shortcuts to the planning tools.

- **Expense Tracker:** Record expenses with descriptions, amounts, categories, and dates; review spending totals.

- **Budget Planner:** Set monthly income and category limits, then compare plans with recorded spending.

- **Savings Goal Planner:** Create goals and track saved amounts and contribution progress.

- **Investment Calculator:** Estimate potential future value from user-entered assumptions, including contributions, return, and time period.

- **Financial Reports:** Review spending information and download a CSV report where supported.

- **CFO Helper:** Adjust hypothetical business scenario inputs—such as hiring, marketing, pricing, revenue growth, and operating expenses—and review estimated results and charts.

- **Account screens:** Prototype sign-up, login, and password-reset/OTP flows.

## Technology stack

- **Languages:** TypeScript and JavaScript

- **UI library:** React

- **Application framework and routing:** TanStack Start and TanStack Router

- **Styling:** Tailwind CSS

- **UI building blocks:** Radix UI-based components and shadcn-style components

- **Charts:** Recharts is included in the project dependencies; the standalone finance interface also loads Chart.js for charts.

- **Build and development:** Vite and Bun

- **Testing:** Vitest and Testing Library

- **Development assistance:** Lovable was used to assist with project development

## Project structure

```
public/
  planpocket.html       Main finance interface and client-side interactions
  favicon.ico           Browser tab icon
  robots.txt             Search crawler instructions
src/
  components/ui/         Reusable UI component building blocks
  hooks/                 Shared React hooks
  lib/                   Shared helpers and error-handling utilities
  routes/
    __root.tsx           Shared app shell, metadata, and error boundaries
    index.tsx            Home route; displays planpocket.html in an iframe
  router.tsx             Router initialization
  routeTree.gen.ts       Generated route tree; normally do not edit manually
  server.ts              TanStack Start server entry and error handling
  start.ts               Start middleware setup
  styles.css             Global styles and Tailwind theme tokens
  test/                  Automated tests and test setup
package.json             Dependencies and development scripts
vite.config.ts           Vite and TanStack Start configuration
tsconfig.json            TypeScript configuration
vitest.config.ts         Vitest configuration
roadmap.md               Current project follow-up items
```

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

Use the local URL printed in the terminal to open the app in your browser. Other available scripts include:

```bash
npm run build
npm run preview
npm run lint
npm test
```

If using Bun, prefix those commands with `bun run` (for example, `bun run build`).

## Data, security, and limitations

- The finance interface stores application data in the browser using `localStorage`; records are not confirmed to sync between devices or users.

- The prototype login stores account information in browser storage. This is not suitable for real accounts or sensitive financial information.

- The password reset/OTP flow is a demonstration. The source indicates that an OTP is generated locally and logged for testing rather than delivered through a verified SMS provider.

- No connected MongoDB or SQL database is confirmed in the current repository.

- The CFO Helper should be described as a scenario calculator/planning helper unless a real AI provider is separately integrated and verified.

- Investment and business-scenario values are illustrative estimates based on inputs. They are not guarantees, professional financial advice, or a substitute for reviewing actual financial records.

Do not use the prototype with real passwords or sensitive financial data.

## Implementation status and next steps

The repository contains the finance interface and its client-side planning tools. The React home route currently embeds the main interface from `public/planpocket.html`. The repository includes a basic automated routing test, but that test does not verify all finance workflows or calculations.

Suggested next steps:

1. Test the major flows and calculations across desktop and mobile browsers.

1. Review input validation, error states, accessibility, and chart labels.

1. Replace demo authentication with secure server-side authentication before handling real users.

1. Select and integrate a database if persistent, multi-user data is required.

1. Add tests for budgets, expenses, goals, investment calculations, reports, and CFO scenarios.

1. Add an AI provider only if AI-powered CFO analysis is an intended feature, and clearly distinguish model-generated guidance from calculated results.

## Acknowledgment

Lovable assisted with the creation and editing of the project. The repository is maintained through GitHub.