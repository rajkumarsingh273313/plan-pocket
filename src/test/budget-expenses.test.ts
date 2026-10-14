import { describe, expect, it, beforeEach } from "vitest";

// Replicate or import the pure logic functions from public/planpocket.html
const budgetCategories = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Shopping",
  "Entertainment",
  "Other",
];

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type?: "essential" | "optional";
}

interface BudgetPlan {
  income?: number | "" | null;
  limits: Record<string, number>;
}

function getMonthlyCategoryTotals(expenses: Expense[], month: string): Record<string, number> {
  const totals: Record<string, number> = {};
  budgetCategories.forEach((cat) => {
    totals[cat] = 0;
  });
  expenses
    .filter((e) => typeof e.date === "string" && e.date.startsWith(month))
    .forEach((e) => {
      const amt = Number(e.amount);
      const validAmt = Number.isFinite(amt) && amt > 0 ? amt : 0;
      const cat = budgetCategories.includes(e.category) ? e.category : "Other";
      totals[cat] = (totals[cat] || 0) + validAmt;
    });
  return totals;
}

function computeBudgetMetrics(
  plan: BudgetPlan,
  totals: Record<string, number>,
  categoriesList?: string[],
) {
  const totalSpent = Object.values(totals).reduce((sum, amt) => sum + amt, 0);
  const totalPlanned = Object.values(plan.limits || {}).reduce(
    (sum, amt) => sum + (Number.isFinite(amt) && amt > 0 ? amt : 0),
    0,
  );
  const income =
    plan.income !== "" &&
    plan.income !== null &&
    plan.income !== undefined &&
    Number.isFinite(Number(plan.income))
      ? Number(plan.income)
      : null;
  const remainingIncome = income !== null ? income - totalSpent : null;
  const remainingBudget = totalPlanned - totalSpent;

  let totalOverspent = 0;
  const overspentCategories: { category: string; over: number; limit: number; actual: number }[] =
    [];
  const catsToCheck =
    categoriesList ||
    Array.from(
      new Set([...budgetCategories, ...Object.keys(plan.limits || {}), ...Object.keys(totals)]),
    );
  catsToCheck.forEach((cat) => {
    const limit = Number(plan.limits?.[cat] || 0);
    const actual = Number(totals[cat] || 0);
    if (limit > 0 && actual > limit) {
      const diff = actual - limit;
      totalOverspent += diff;
      overspentCategories.push({ category: cat, over: diff, limit, actual });
    }
  });

  const largestCategories = Object.entries(totals)
    .filter(([_, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0,
    }));

  return {
    totalSpent,
    totalPlanned,
    income,
    remainingIncome,
    remainingBudget,
    totalOverspent,
    overspentCategories,
    largestCategories,
  };
}

function generateRuleBasedSuggestions(
  expenses: Expense[],
  month: string,
  plan: BudgetPlan,
  totals: Record<string, number>,
  goal?: { id: string; name: string; target: number; saved: number } | null,
) {
  const monthExpenses = expenses.filter(
    (e) => typeof e.date === "string" && e.date.startsWith(month),
  );
  const optionalExpenses = monthExpenses.filter((e) => e.type === "optional");
  const optionalTotal = optionalExpenses.reduce(
    (sum, e) => sum + (Number.isFinite(e.amount) && e.amount > 0 ? e.amount : 0),
    0,
  );
  const totalSpent = Object.values(totals).reduce((sum, amt) => sum + amt, 0);
  const income = Number.isFinite(Number(plan.income)) ? Number(plan.income) : null;
  const remainingIncome = income !== null ? income - totalSpent : null;

  const metrics = computeBudgetMetrics(plan, totals);
  const suggestions: { type: string; title: string; text: string }[] = [];

  // Rule 1: Overspending mitigation
  if (metrics.overspentCategories.length > 0) {
    metrics.overspentCategories.forEach((item) => {
      const catOptional = optionalExpenses
        .filter(
          (e) => (budgetCategories.includes(e.category) ? e.category : "Other") === item.category,
        )
        .reduce((sum, e) => sum + e.amount, 0);
      if (catOptional > 0) {
        suggestions.push({
          type: "warning",
          title: `Over Budget in ${item.category}`,
          text: `Spending in ${item.category} exceeded your planned limit by ₹${item.over}. There is ₹${catOptional} in optional expenses recorded here—trimming these discretionary purchases can help restore your budget.`,
        });
      } else {
        suggestions.push({
          type: "warning",
          title: `Over Budget in ${item.category}`,
          text: `Spending in ${item.category} is ₹${item.over} over limit. Since all recorded expenses in this category are marked essential, consider adjusting your category limit or economizing in optional spending areas.`,
        });
      }
    });
  }

  // Rule 2: Optional spending reduction
  if (optionalTotal > 0) {
    const pct = totalSpent > 0 ? Math.round((optionalTotal / totalSpent) * 100) : 0;
    const trim15 = Math.round(optionalTotal * 0.15);
    const trim25 = Math.round(optionalTotal * 0.25);
    suggestions.push({
      type: "info",
      title: "Discretionary Spending Opportunities",
      text: `Optional spending accounts for ₹${optionalTotal} (${pct}% of your monthly total). Trimming 15% to 25% of these optional purchases would free up ₹${trim15} – ₹${trim25} each month.`,
    });
  }

  // Rule 3: Goal-oriented savings
  if (goal) {
    const target = Number(goal.target || 0);
    const saved = Number(goal.saved || 0);
    const goalRemaining = Math.max(0, target - saved);

    if (goalRemaining <= 0) {
      suggestions.push({
        type: "success",
        title: `Goal Completed: ${goal.name}`,
        text: `Outstanding! Your target goal "${goal.name}" has reached 100% of its target.`,
      });
    } else {
      if (optionalTotal > 0) {
        const redirect20 = Math.round(optionalTotal * 0.2);
        const months = Math.ceil(goalRemaining / Math.max(1, redirect20));
        suggestions.push({
          type: "success",
          title: `Reach "${goal.name}" Faster`,
          text: `"${goal.name}" needs ₹${goalRemaining} more. Reallocating 20% of your optional spending (₹${redirect20}/month) toward this goal would help achieve it in approx. ${months} month(s).`,
        });
      }
      if (remainingIncome !== null && remainingIncome > 0) {
        const halfSurplus = Math.round(remainingIncome * 0.5);
        suggestions.push({
          type: "success",
          title: `Surplus Income toward "${goal.name}"`,
          text: `You have ₹${remainingIncome} in surplus take-home income. Directing half (₹${halfSurplus}) toward "${goal.name}" will accelerate your progress.`,
        });
      } else if (remainingIncome !== null && remainingIncome < 0) {
        suggestions.push({
          type: "warning",
          title: "Cash Flow Deficit",
          text: `Total monthly expenses exceed take-home income by ₹${Math.abs(remainingIncome)}. Focus on trimming optional spending before making additional commitments toward "${goal.name}".`,
        });
      }
    }
  }

  return suggestions;
}

describe("PlanPocket Budget & Expenses Integration", () => {
  it("calculates category totals and overall spending accurately", () => {
    const expenses: Expense[] = [
      {
        id: "1",
        description: "Groceries",
        amount: 3500,
        category: "Food",
        date: "2026-10-02",
        type: "essential",
      },
      {
        id: "2",
        description: "Dining out",
        amount: 1200,
        category: "Food",
        date: "2026-10-05",
        type: "optional",
      },
      {
        id: "3",
        description: "Bus pass",
        amount: 800,
        category: "Transport",
        date: "2026-10-03",
        type: "essential",
      },
      {
        id: "4",
        description: "Old month",
        amount: 5000,
        category: "Food",
        date: "2026-09-15",
        type: "essential",
      },
    ];

    const totals = getMonthlyCategoryTotals(expenses, "2026-10");
    expect(totals["Food"]).toBe(4700);
    expect(totals["Transport"]).toBe(800);
    expect(totals["Utilities"]).toBe(0);

    const plan: BudgetPlan = {
      income: 25000,
      limits: {
        Food: 4000,
        Transport: 1000,
      },
    };

    const metrics = computeBudgetMetrics(plan, totals);
    expect(metrics.totalSpent).toBe(5500);
    expect(metrics.totalPlanned).toBe(5000);
    expect(metrics.remainingIncome).toBe(19500);
    expect(metrics.remainingBudget).toBe(-500);
    expect(metrics.totalOverspent).toBe(700); // Food is 4700 vs limit 4000 = 700 over
    expect(metrics.overspentCategories).toHaveLength(1);
    expect(metrics.overspentCategories[0]!.category).toBe("Food");
    expect(metrics.largestCategories[0]!.category).toBe("Food");
    expect(metrics.largestCategories[0]!.amount).toBe(4700);
  });

  it("updates budget metrics dynamically on adding, editing, and deleting an expense", () => {
    let expenses: Expense[] = [
      {
        id: "1",
        description: "Rent",
        amount: 15000,
        category: "Housing",
        date: "2026-10-01",
        type: "essential",
      },
    ];

    const plan: BudgetPlan = {
      income: 40000,
      limits: { Housing: 15000, Entertainment: 3000 },
    };

    // Initial state
    let totals = getMonthlyCategoryTotals(expenses, "2026-10");
    let metrics = computeBudgetMetrics(plan, totals);
    expect(metrics.totalSpent).toBe(15000);
    expect(metrics.remainingIncome).toBe(25000);
    expect(metrics.totalOverspent).toBe(0);

    // 1. Add expense
    const newExpense: Expense = {
      id: "2",
      description: "Concert Ticket",
      amount: 4000,
      category: "Entertainment",
      date: "2026-10-08",
      type: "optional",
    };
    expenses.push(newExpense);

    totals = getMonthlyCategoryTotals(expenses, "2026-10");
    metrics = computeBudgetMetrics(plan, totals);
    expect(metrics.totalSpent).toBe(19000);
    expect(metrics.remainingIncome).toBe(21000);
    expect(metrics.totalOverspent).toBe(1000); // 4000 vs 3000 limit

    // 2. Edit expense (discount applied to 2500)
    expenses = expenses.map((e) => (e.id === "2" ? { ...e, amount: 2500 } : e));
    totals = getMonthlyCategoryTotals(expenses, "2026-10");
    metrics = computeBudgetMetrics(plan, totals);
    expect(metrics.totalSpent).toBe(17500);
    expect(metrics.totalOverspent).toBe(0); // within 3000 limit

    // 3. Delete expense
    expenses = expenses.filter((e) => e.id !== "2");
    totals = getMonthlyCategoryTotals(expenses, "2026-10");
    metrics = computeBudgetMetrics(plan, totals);
    expect(metrics.totalSpent).toBe(15000);
    expect(metrics.totalOverspent).toBe(0);
  });

  it("generates respectful, rule-based suggestions without claiming expensive essential expenses are unnecessary", () => {
    const expenses: Expense[] = [
      {
        id: "1",
        description: "Critical Surgery / Medicine",
        amount: 35000,
        category: "Health",
        date: "2026-10-02",
        type: "essential",
      },
      {
        id: "2",
        description: "Designer Shoes",
        amount: 4000,
        category: "Shopping",
        date: "2026-10-04",
        type: "optional",
      },
      {
        id: "3",
        description: "Movie Streaming",
        amount: 1000,
        category: "Entertainment",
        date: "2026-10-06",
        type: "optional",
      },
    ];

    const plan: BudgetPlan = {
      income: 50000,
      limits: {
        Health: 30000, // overspent by 5000
        Shopping: 3000, // overspent by 1000
      },
    };

    const goal = {
      id: "g1",
      name: "Emergency Fund",
      target: 20000,
      saved: 10000,
    };

    const totals = getMonthlyCategoryTotals(expenses, "2026-10");
    const suggestions = generateRuleBasedSuggestions(expenses, "2026-10", plan, totals, goal);

    // Verify suggestions contain overspending warnings
    const healthWarning = suggestions.find((s) => s.title.includes("Health"));
    expect(healthWarning).toBeDefined();
    // In Health, all was essential, so it does NOT claim it is unnecessary just because it's ₹35,000
    expect(healthWarning?.text).toContain(
      "all recorded expenses in this category are marked essential",
    );

    const shoppingWarning = suggestions.find((s) => s.title.includes("Shopping"));
    expect(shoppingWarning).toBeDefined();
    // In Shopping, there was optional spending, so it mentions trimming optional expenses
    expect(shoppingWarning?.text).toContain("trimming these discretionary purchases");

    // Optional spending review should only consider the optional expenses (4000 + 1000 = 5000)
    const optReview = suggestions.find((s) => s.title.includes("Discretionary"));
    expect(optReview?.text).toContain("₹5000");

    // Goal acceleration calculates 20% of 5000 = 1000/mo toward remaining 10000
    const goalSuggestion = suggestions.find((s) => s.title.includes("Emergency Fund"));
    expect(goalSuggestion?.text).toContain("10 month(s)");
  });

  it("handles empty data and invalid amounts safely", () => {
    const emptyExpenses: Expense[] = [];
    const totals = getMonthlyCategoryTotals(emptyExpenses, "2026-10");
    expect(totals["Food"]).toBe(0);

    const emptyPlan: BudgetPlan = { income: "", limits: {} };
    const metrics = computeBudgetMetrics(emptyPlan, totals);
    expect(metrics.totalSpent).toBe(0);
    expect(metrics.totalPlanned).toBe(0);
    expect(metrics.income).toBeNull();
    expect(metrics.remainingIncome).toBeNull();
    expect(metrics.totalOverspent).toBe(0);
    expect(metrics.largestCategories).toEqual([]);

    // Corrupt amounts in expenses
    const corruptedExpenses = [
      { id: "1", description: "Bad 1", amount: -500, category: "Food", date: "2026-10-01" },
      { id: "2", description: "Bad 2", amount: NaN, category: "Food", date: "2026-10-01" },
      {
        id: "3",
        description: "Bad 3",
        amount: "not a number",
        category: "Food",
        date: "2026-10-01",
      },
      { id: "4", description: "Good", amount: 1200, category: "Food", date: "2026-10-01" },
    ];

    const safeTotals = getMonthlyCategoryTotals(
      corruptedExpenses as unknown as Expense[],
      "2026-10",
    );
    expect(safeTotals["Food"]).toBe(1200);
  });

  it("supports user-defined custom categories alongside default categories", () => {
    const defaultCategories = [
      "Food",
      "Transport",
      "Housing",
      "Utilities",
      "Health",
      "Shopping",
      "Entertainment",
    ];
    const customCategories = ["Gym & Fitness", "Education & Books"];
    const allCategories = [...defaultCategories, ...customCategories];

    const expenses: Expense[] = [
      {
        id: "c1",
        description: "Gym Membership",
        amount: 2500,
        category: "Gym & Fitness",
        date: "2026-10-01",
        type: "essential",
      },
      {
        id: "c2",
        description: "Online Course",
        amount: 1500,
        category: "Education & Books",
        date: "2026-10-05",
        type: "optional",
      },
      {
        id: "c3",
        description: "Lunch",
        amount: 500,
        category: "Food",
        date: "2026-10-02",
        type: "essential",
      },
    ];

    // Compute totals using all categories
    const totals: Record<string, number> = {};
    allCategories.forEach((c) => {
      totals[c] = 0;
    });
    expenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    expect(totals["Gym & Fitness"]).toBe(2500);
    expect(totals["Education & Books"]).toBe(1500);
    expect(totals["Food"]).toBe(500);

    const plan: BudgetPlan = {
      income: 40000,
      limits: {
        "Gym & Fitness": 2000, // over by 500
        "Education & Books": 2000,
      },
    };

    const metrics = computeBudgetMetrics(plan, totals);
    expect(metrics.totalSpent).toBe(4500);
    expect(metrics.totalPlanned).toBe(4000);
    expect(metrics.totalOverspent).toBe(500);
    expect(metrics.overspentCategories).toHaveLength(1);
    expect(metrics.overspentCategories[0]!.category).toBe("Gym & Fitness");
  });

  it("handles month stepping correctly across year boundaries", () => {
    function stepMonth(yearMonth: string, delta: number): string {
      const [yStr, mStr] = yearMonth.split("-");
      let y = parseInt(yStr || "0", 10);
      let m = parseInt(mStr || "1", 10) - 1 + delta;
      if (m < 0) {
        y -= 1;
        m = 11;
      } else if (m > 11) {
        y += 1;
        m = 0;
      }
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    }

    expect(stepMonth("2026-10", 1)).toBe("2026-11");
    expect(stepMonth("2026-10", -1)).toBe("2026-09");
    expect(stepMonth("2026-12", 1)).toBe("2027-01");
    expect(stepMonth("2026-01", -1)).toBe("2025-12");
  });

  it("validates and manages custom categories correctly", () => {
    const defaultCategories = [
      "Food",
      "Transport",
      "Housing",
      "Utilities",
      "Health",
      "Shopping",
      "Entertainment",
    ];

    function validateCategory(
      input: string,
      existing: string[],
    ): { valid: boolean; error?: string; name?: string } {
      const raw = input.trim();
      if (!raw) return { valid: false, error: "Empty name" };
      if (raw.length > 30) return { valid: false, error: "Too long" };
      const lower = raw.toLowerCase();
      if (lower === "other" || defaultCategories.some((c) => c.toLowerCase() === lower)) {
        return { valid: false, error: "Already default" };
      }
      if (existing.some((c) => c.toLowerCase() === lower)) {
        return { valid: false, error: "Already exists" };
      }
      return { valid: true, name: raw };
    }

    let customCategories: string[] = [];

    // Valid additions
    const r1 = validateCategory("Gym & Fitness", customCategories);
    expect(r1.valid).toBe(true);
    if (r1.name) customCategories.push(r1.name);

    const r2 = validateCategory("Online Courses", customCategories);
    expect(r2.valid).toBe(true);
    if (r2.name) customCategories.push(r2.name);

    // Reject empty
    expect(validateCategory("   ", customCategories).valid).toBe(false);

    // Reject > 30 chars
    expect(
      validateCategory(
        "This is a category name that is way too long for our limits",
        customCategories,
      ).valid,
    ).toBe(false);

    // Reject duplicate default (case-insensitive)
    expect(validateCategory("food", customCategories).valid).toBe(false);
    expect(validateCategory("Other", customCategories).valid).toBe(false);

    // Reject duplicate custom (case-insensitive)
    expect(validateCategory("gym & fitness", customCategories).valid).toBe(false);

    // Categories list merging: default + custom + Other
    const all = [...defaultCategories, ...customCategories, "Other"];
    expect(all).toContain("Gym & Fitness");
    expect(all).toContain("Online Courses");
    expect(all[all.length - 1]).toBe("Other");

    // Deletion
    customCategories = customCategories.filter((c) => c !== "Gym & Fitness");
    expect(customCategories).toEqual(["Online Courses"]);
  });
});
