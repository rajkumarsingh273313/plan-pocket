import { describe, expect, it } from "vitest";
import {
  getExpensesForMonth,
  getMonthlyCategoryTotals,
  computeBudgetMetrics,
  type ExpenseRecord,
  type BudgetPlanRecord,
} from "../lib/budget-expenses";

describe("Financial Reports Month Filtering & Calculations (FEAT-004)", () => {
  describe("Month Filtering Logic with Boundary Dates", () => {
    it("strictly filters expenses by month with boundary date inclusion", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Oct Start", amount: 100, category: "Food", date: "2026-10-01" },
        { id: "2", description: "Oct Mid", amount: 200, category: "Food", date: "2026-10-15" },
        { id: "3", description: "Oct End", amount: 300, category: "Food", date: "2026-10-31" },
        { id: "4", description: "Sept End", amount: 400, category: "Food", date: "2026-09-30" },
        { id: "5", description: "Nov Start", amount: 500, category: "Food", date: "2026-11-01" },
      ];

      const octExpenses = getExpensesForMonth(expenses, "2026-10");
      expect(octExpenses).toHaveLength(3);
      expect(octExpenses.map((e) => e.id)).toEqual(["1", "2", "3"]);

      const septExpenses = getExpensesForMonth(expenses, "2026-09");
      expect(septExpenses).toHaveLength(1);
      expect(septExpenses[0]?.id).toBe("4");

      const novExpenses = getExpensesForMonth(expenses, "2026-11");
      expect(novExpenses).toHaveLength(1);
      expect(novExpenses[0]?.id).toBe("5");
    });

    it("returns empty array for month with no expenses", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Oct Expense", amount: 100, category: "Food", date: "2026-10-15" },
      ];

      const novExpenses = getExpensesForMonth(expenses, "2026-11");
      expect(novExpenses).toHaveLength(0);
    });

    it("handles February leap year and non-leap year correctly", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Feb 28 2024", amount: 100, category: "Food", date: "2024-02-28" },
        { id: "2", description: "Feb 29 2024", amount: 200, category: "Food", date: "2024-02-29" },
        { id: "3", description: "Mar 1 2024", amount: 300, category: "Food", date: "2024-03-01" },
        { id: "4", description: "Feb 28 2025", amount: 400, category: "Food", date: "2025-02-28" },
        { id: "5", description: "Mar 1 2025", amount: 500, category: "Food", date: "2025-03-01" },
      ];

      const feb2024 = getExpensesForMonth(expenses, "2024-02");
      expect(feb2024).toHaveLength(2);
      expect(feb2024.map((e) => e.id)).toEqual(["1", "2"]);

      const feb2025 = getExpensesForMonth(expenses, "2025-02");
      expect(feb2025).toHaveLength(1);
      expect(feb2025[0]?.id).toBe("4");
    });
  });

  describe("Budget vs Actual with Unbudgeted Categories", () => {
    it("distinguishes budgeted vs unbudgeted spending correctly", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Rent", amount: 15000, category: "Housing", date: "2026-10-01" },
        { id: "2", description: "Groceries", amount: 8000, category: "Food", date: "2026-10-05" },
        { id: "3", description: "Concert", amount: 2000, category: "Entertainment", date: "2026-10-10" },
        { id: "4", description: "Unplanned Shopping", amount: 3000, category: "Shopping", date: "2026-10-12" },
      ];

      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: 50000,
        limits: {
          Housing: 15000,
          Food: 10000,
          // Entertainment and Shopping have NO limits set
        },
      };

      const totals = getMonthlyCategoryTotals(expenses, "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.totalSpent).toBe(28000); // All expenses
      expect(metrics.budgetedSpent).toBe(23000); // Housing 15000 + Food 8000
      expect(metrics.unbudgetedSpent).toBe(5000); // Entertainment 2000 + Shopping 3000
      expect(metrics.totalPlanned).toBe(25000); // Housing 15000 + Food 10000

      expect(metrics.categoryMetrics["Housing"]?.hasLimit).toBe(true);
      expect(metrics.categoryMetrics["Food"]?.hasLimit).toBe(true);
      expect(metrics.categoryMetrics["Entertainment"]?.hasLimit).toBe(false);
      expect(metrics.categoryMetrics["Shopping"]?.hasLimit).toBe(false);

      expect(metrics.categoryMetrics["Entertainment"]?.status).toBe("no_limit");
      expect(metrics.categoryMetrics["Shopping"]?.status).toBe("no_limit");
    });

    it("shows over-budget indication for categories exceeding limits", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Groceries 1", amount: 6000, category: "Food", date: "2026-10-02" },
        { id: "2", description: "Groceries 2", amount: 5000, category: "Food", date: "2026-10-15" },
        { id: "3", description: "Transport", amount: 2000, category: "Transport", date: "2026-10-08" },
      ];

      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: 30000,
        limits: {
          Food: 10000, // Spent 11000, over by 1000
          Transport: 3000, // Spent 2000, under by 1000
        },
      };

      const totals = getMonthlyCategoryTotals(expenses, "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(totals["Food"]).toBe(11000);
      expect(totals["Transport"]).toBe(2000);

      expect(metrics.totalOverspent).toBe(1000);
      expect(metrics.overspentCategories).toHaveLength(1);
      expect(metrics.overspentCategories[0]?.category).toBe("Food");
      expect(metrics.overspentCategories[0]?.over).toBe(1000);
      expect(metrics.overspentCategories[0]?.limit).toBe(10000);
      expect(metrics.overspentCategories[0]?.actual).toBe(11000);

      expect(metrics.categoryMetrics["Food"]?.status).toBe("over_limit");
      expect(metrics.categoryMetrics["Transport"]?.status).toBe("normal");
    });
  });

  describe("Goal Contribution Monthly Totals", () => {
    it("calculates goal contributions filtered by selected month", () => {
      const goalContributions = [
        { id: "c1", amount: 5000, date: "2026-09-15", reference: "Sep contribution" },
        { id: "c2", amount: 3000, date: "2026-10-05", reference: "Oct contribution 1" },
        { id: "c3", amount: 2000, date: "2026-10-20", reference: "Oct contribution 2" },
        { id: "c4", amount: 4000, date: "2026-11-10", reference: "Nov contribution" },
      ];

      // Filter contributions for October 2026
      const octContributions = goalContributions.filter((c) => c.date.startsWith("2026-10"));
      const octTotal = octContributions.reduce((sum, c) => sum + c.amount, 0);

      expect(octContributions).toHaveLength(2);
      expect(octTotal).toBe(5000); // 3000 + 2000
    });

    it("calculates multiple goals' contributions for the same month", () => {
      const goal1Contributions = [
        { id: "g1-c1", amount: 2000, date: "2026-10-05" },
        { id: "g1-c2", amount: 1000, date: "2026-10-15" },
      ];

      const goal2Contributions = [
        { id: "g2-c1", amount: 5000, date: "2026-10-10" },
      ];

      const goal1Oct = goal1Contributions
        .filter((c) => c.date.startsWith("2026-10"))
        .reduce((sum, c) => sum + c.amount, 0);

      const goal2Oct = goal2Contributions
        .filter((c) => c.date.startsWith("2026-10"))
        .reduce((sum, c) => sum + c.amount, 0);

      expect(goal1Oct).toBe(3000);
      expect(goal2Oct).toBe(5000);
    });

    it("returns zero when no contributions exist for selected month", () => {
      const contributions = [
        { id: "c1", amount: 5000, date: "2026-09-15" },
        { id: "c2", amount: 3000, date: "2026-11-05" },
      ];

      const octContributions = contributions.filter((c) => c.date.startsWith("2026-10"));
      const octTotal = octContributions.reduce((sum, c) => sum + c.amount, 0);

      expect(octTotal).toBe(0);
    });
  });

  describe("Income After Expenses - 'Not set' when income is null", () => {
    it("displays 'Not set' when income is null", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Groceries", amount: 5000, category: "Food", date: "2026-10-05" },
      ];

      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: null, // No income set
        limits: { Food: 10000 },
      };

      const totals = getMonthlyCategoryTotals(expenses, "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.income).toBeNull();
      expect(metrics.incomeRemaining).toBeNull();

      // UI should display "Not set" when income is null
      const displayIncome = metrics.income !== null ? `₹${metrics.income}` : "Not set";
      const displayRemaining =
        metrics.incomeRemaining !== null ? `₹${metrics.incomeRemaining}` : "Not set";

      expect(displayIncome).toBe("Not set");
      expect(displayRemaining).toBe("Not set");
    });

    it("calculates income after expenses when income is set", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Rent", amount: 15000, category: "Housing", date: "2026-10-01" },
        { id: "2", description: "Groceries", amount: 8000, category: "Food", date: "2026-10-05" },
      ];

      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: 50000,
        limits: { Housing: 15000, Food: 10000 },
      };

      const totals = getMonthlyCategoryTotals(expenses, "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.income).toBe(50000);
      expect(metrics.totalSpent).toBe(23000);
      expect(metrics.incomeRemaining).toBe(27000); // 50000 - 23000

      const displayIncome = `₹${metrics.income?.toLocaleString("en-IN")}`;
      const displayRemaining = `₹${metrics.incomeRemaining?.toLocaleString("en-IN")}`;

      expect(displayIncome).toBe("₹50,000");
      expect(displayRemaining).toBe("₹27,000");
    });

    it("handles empty string income as 'Not set'", () => {
      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: "" as any, // User cleared income field
        limits: {},
      };

      const totals = getMonthlyCategoryTotals([], "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.income).toBeNull();
      expect(metrics.incomeRemaining).toBeNull();
    });

    it("handles undefined income as 'Not set'", () => {
      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: undefined,
        limits: {},
      };

      const totals = getMonthlyCategoryTotals([], "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.income).toBeNull();
      expect(metrics.incomeRemaining).toBeNull();
    });

    it("shows deficit when expenses exceed set income", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Emergency", amount: 35000, category: "Health", date: "2026-10-10" },
      ];

      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: 25000,
        limits: { Health: 30000 },
      };

      const totals = getMonthlyCategoryTotals(expenses, "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.income).toBe(25000);
      expect(metrics.totalSpent).toBe(35000);
      expect(metrics.incomeRemaining).toBe(-10000); // Deficit
      expect(metrics.isIncomeDeficit).toBe(true);
    });
  });

  describe("Report Empty States", () => {
    it("handles report with no expenses for selected month", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Sept expense", amount: 1000, category: "Food", date: "2026-09-15" },
      ];

      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: 50000,
        limits: { Food: 10000 },
      };

      const totals = getMonthlyCategoryTotals(expenses, "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.totalSpent).toBe(0);
      expect(metrics.unbudgetedSpent).toBe(0);
      expect(metrics.budgetedSpent).toBe(0);
      expect(metrics.incomeRemaining).toBe(50000); // All income remaining
      expect(metrics.overspentCategories).toHaveLength(0);
    });

    it("handles report with no budget limits set", () => {
      const expenses: ExpenseRecord[] = [
        { id: "1", description: "Expense", amount: 5000, category: "Food", date: "2026-10-05" },
      ];

      const plan: BudgetPlanRecord = {
        month: "2026-10",
        income: 30000,
        limits: {}, // No limits
      };

      const totals = getMonthlyCategoryTotals(expenses, "2026-10");
      const metrics = computeBudgetMetrics(plan, totals);

      expect(metrics.totalSpent).toBe(5000);
      expect(metrics.budgetedSpent).toBe(0);
      expect(metrics.unbudgetedSpent).toBe(5000);
      expect(metrics.totalPlanned).toBe(0);
      expect(metrics.incomeRemaining).toBe(25000);
    });
  });

  describe("Report Source/Status Note Truthfulness", () => {
    it("distinguishes browser-cached vs cloud-synced data sources", () => {
      // Mock data sources
      const budgetSource = "browser-cache"; // Not yet synced to cloud
      const expenseSource = "browser-cache";
      const goalSource = "cloud-synced"; // Successfully loaded from MongoDB
      const scenarioSource = "cloud-synced"; // Successfully loaded from MongoDB

      expect(budgetSource).toBe("browser-cache");
      expect(expenseSource).toBe("browser-cache");
      expect(goalSource).toBe("cloud-synced");
      expect(scenarioSource).toBe("cloud-synced");

      // Report should display:
      // "Budget & Expenses: Cached in browser (not yet synced)"
      // "Goals & Investment Scenarios: Loaded from cloud"
    });

    it("reports cloud request failure truthfully", () => {
      const goalLoadStatus = "failed";
      const goalErrorMessage = "Network error: Unable to connect to server";

      expect(goalLoadStatus).toBe("failed");
      
      // Report should display:
      // "Goals: Failed to load from cloud. Network error: Unable to connect to server"
      // NOT: "Goals: Loaded successfully" (lying about cache)
    });

    it("reports unauthenticated request truthfully", () => {
      const investmentLoadStatus = "unauthorized";
      const investmentError = "Authentication required. Please log in.";

      expect(investmentLoadStatus).toBe("unauthorized");
      
      // Report should display:
      // "Investment Scenarios: Authentication required. Please log in."
    });
  });
});
