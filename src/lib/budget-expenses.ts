/**
 * Shared Budget & Expenses Calculation and Domain Module
 *
 * Implements deterministic, currency-safe financial planning logic:
 * - Integer-paise arithmetic to eliminate floating-point drift
 * - Strict INR currency formatting and two-decimal validation
 * - Synchronized monthly expense aggregation & category totals
 * - Distinct metrics: Planned, Budgeted Spent, Unbudgeted Spent, Total Spent,
 *   Category Budget Remaining, and Income After Expenses
 * - Tiered in-app alert thresholds: 80% (Warning), 90% (Near Limit),
 *   100% (Reached), and >100% (Over Limit)
 * - Deterministic end-of-month projection with clear, labeled assumptions
 * - Month-over-month spending trend & category delta comparison
 * - Rule-based optimization suggestions for discretionary spending & goal funding
 */

export const DEFAULT_BUDGET_CATEGORIES: readonly string[] = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Shopping",
  "Entertainment",
  "Other",
] as const;

export const ALERT_THRESHOLDS = {
  WARNING: 80,
  NEAR_LIMIT: 90,
  REACHED: 100,
  OVER_LIMIT: 100,
} as const;

export type AlertThresholdLevel =
  | "normal"
  | "warning"
  | "near_limit"
  | "reached"
  | "over_limit"
  | "no_limit";

export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number; // In Rupees
  amountPaise?: number; // Optional integer paise
  category: string;
  date: string; // YYYY-MM-DD
  note?: string | undefined;
  type?: "essential" | "optional" | undefined;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface BudgetPlanRecord {
  month: string; // YYYY-MM
  income?: number | null | undefined;
  incomePaise?: number | null | undefined;
  limits: Record<string, number>; // Category name -> Rupee limit
  limitsPaise?: Record<string, number> | undefined;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CustomCategoryRecord {
  id: string;
  name: string;
  color?: string | undefined;
  icon?: string | undefined;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface OverspentCategoryDetail {
  category: string;
  over: number;
  limit: number;
  actual: number;
}

export interface CategoryMetricDetail {
  category: string;
  limit: number;
  actual: number;
  remaining: number;
  over: number;
  percentage: number;
  status: AlertThresholdLevel;
  hasLimit: boolean;
}

export interface BudgetMetrics {
  totalSpent: number;
  budgetedSpent: number;
  unbudgetedSpent: number;
  totalPlanned: number;
  remainingBudget: number; // Planned - Budgeted Spent
  income: number | null;
  incomeRemaining: number | null; // Income - Total Spent
  remainingIncome: number | null; // Alias for backward compatibility
  totalOverspent: number;
  overspentCategories: OverspentCategoryDetail[];
  largestCategories: Array<{ category: string; amount: number; percentage: number }>;
  categoryMetrics: Record<string, CategoryMetricDetail>;
  isIncomeDeficit: boolean;
}

export interface BudgetAlertItem {
  type: "warning" | "danger" | "info" | "neutral";
  category?: string;
  title: string;
  message: string;
  percent?: number;
  level: AlertThresholdLevel | "deficit";
}

export interface MonthEndProjection {
  projectedTotal: number;
  dailyAverage: number;
  daysPassed: number;
  daysInMonth: number;
  confidence: "low" | "medium" | "high";
  assumptionNote: string;
}

export interface CategoryComparisonDelta {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
  trend: "up" | "down" | "flat";
}

export interface MonthOverMonthComparison {
  currentTotal: number;
  previousTotal: number;
  diffAmount: number;
  diffPercent: number;
  trend: "up" | "down" | "flat";
  categoryDeltas: Record<string, CategoryComparisonDelta>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Currency-safe arithmetic (Paise / Rupees)
// ─────────────────────────────────────────────────────────────────────────────

export function rupeesToPaise(rupees: number | string): number {
  const val = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 100);
}

export function paiseToRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

export function formatINR(rupees: number): string {
  const safe = Number.isFinite(rupees) ? paiseToRupees(rupeesToPaise(rupees)) : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function isValidCurrencyAmount(amount: unknown): boolean {
  if (typeof amount === "number") {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    // Check at most 2 decimal places
    const str = amount.toString();
    const parts = str.split(".");
    return (parts[1]?.length ?? 0) <= 2;
  }
  if (typeof amount === "string") {
    const trimmed = amount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
    const num = parseFloat(trimmed);
    return Number.isFinite(num) && num > 0;
  }
  return false;
}

export function isValidMonthKey(month: unknown): boolean {
  if (typeof month !== "string") return false;
  return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month.trim());
}

export function isValidIsoDate(date: unknown): boolean {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(date.trim())) return false;
  const parsed = new Date(date.trim());
  return !isNaN(parsed.getTime());
}

export function getMonthKeyFromDate(date: string | Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonthKey(month: string): string {
  if (!isValidMonthKey(month)) return "";
  const parts = month.split("-");
  const yearStr = parts[0] ?? "1970";
  const monthStr = parts[1] ?? "01";
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly filtering and category aggregations
// ─────────────────────────────────────────────────────────────────────────────

export function getExpensesForMonth(expenses: ExpenseRecord[], month: string): ExpenseRecord[] {
  if (!isValidMonthKey(month)) return [];
  return expenses.filter(
    (e) => typeof e.date === "string" && e.date.startsWith(month) && Number(e.amount) > 0,
  );
}

export function getMonthlyCategoryTotals(
  expenses: ExpenseRecord[],
  month: string,
  categoriesList?: readonly string[],
): Record<string, number> {
  const totalsPaise: Record<string, number> = {};
  const activeCategories = categoriesList || DEFAULT_BUDGET_CATEGORIES;

  activeCategories.forEach((cat) => {
    totalsPaise[cat] = 0;
  });

  const monthExpenses = getExpensesForMonth(expenses, month);
  monthExpenses.forEach((e) => {
    const paise = rupeesToPaise(e.amount);
    if (paise <= 0) return;

    const matchedCat = activeCategories.includes(e.category) ? e.category : e.category || "Other";
    totalsPaise[matchedCat] = (totalsPaise[matchedCat] || 0) + paise;
  });

  const result: Record<string, number> = {};
  Object.entries(totalsPaise).forEach(([cat, p]) => {
    result[cat] = paiseToRupees(p);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Budget Metrics (Distinct Planned, Budgeted, Unbudgeted, Remaining)
// ─────────────────────────────────────────────────────────────────────────────

export function computeBudgetMetrics(
  plan: BudgetPlanRecord | { income?: number | "" | null; limits?: Record<string, number> },
  totals: Record<string, number>,
  categoriesList?: string[],
): BudgetMetrics {
  const limits = plan.limits || {};
  const allCategories = Array.from(
    new Set([
      ...(categoriesList || DEFAULT_BUDGET_CATEGORIES),
      ...Object.keys(limits),
      ...Object.keys(totals),
    ]),
  );

  let totalSpentPaise = 0;
  let budgetedSpentPaise = 0;
  let unbudgetedSpentPaise = 0;
  let totalPlannedPaise = 0;
  let totalOverspentPaise = 0;

  const overspentCategories: OverspentCategoryDetail[] = [];
  const categoryMetrics: Record<string, CategoryMetricDetail> = {};

  allCategories.forEach((cat) => {
    const actual = Number(totals[cat] || 0);
    const limit = Number(limits[cat] || 0);
    const hasLimit = limit > 0;

    const actualPaise = rupeesToPaise(actual);
    const limitPaise = rupeesToPaise(limit);

    totalSpentPaise += actualPaise;

    if (hasLimit) {
      totalPlannedPaise += limitPaise;
      budgetedSpentPaise += actualPaise;
    } else if (actualPaise > 0) {
      unbudgetedSpentPaise += actualPaise;
    }

    const percentage = hasLimit ? Math.round((actualPaise / limitPaise) * 100) : 0;
    const overPaise = hasLimit && actualPaise > limitPaise ? actualPaise - limitPaise : 0;
    const remainingPaise = hasLimit && limitPaise > actualPaise ? limitPaise - actualPaise : 0;

    let status: AlertThresholdLevel = "normal";
    if (!hasLimit) {
      status = "no_limit";
    } else if (actualPaise > limitPaise) {
      status = "over_limit";
    } else if (actualPaise === limitPaise) {
      status = "reached";
    } else if (percentage >= ALERT_THRESHOLDS.NEAR_LIMIT) {
      status = "near_limit";
    } else if (percentage >= ALERT_THRESHOLDS.WARNING) {
      status = "warning";
    }

    if (overPaise > 0) {
      const overRupees = paiseToRupees(overPaise);
      totalOverspentPaise += overPaise;
      overspentCategories.push({
        category: cat,
        over: overRupees,
        limit,
        actual,
      });
    }

    categoryMetrics[cat] = {
      category: cat,
      limit,
      actual,
      remaining: paiseToRupees(remainingPaise),
      over: paiseToRupees(overPaise),
      percentage,
      status,
      hasLimit,
    };
  });

  const totalSpent = paiseToRupees(totalSpentPaise);
  const budgetedSpent = paiseToRupees(budgetedSpentPaise);
  const unbudgetedSpent = paiseToRupees(unbudgetedSpentPaise);
  const totalPlanned = paiseToRupees(totalPlannedPaise);
  const remainingBudget = paiseToRupees(totalPlannedPaise - budgetedSpentPaise);

  const rawIncome = plan.income;
  const income =
    rawIncome !== "" &&
    rawIncome !== null &&
    rawIncome !== undefined &&
    Number.isFinite(Number(rawIncome))
      ? Number(rawIncome)
      : null;

  const incomeRemaining = income !== null ? paiseToRupees(rupeesToPaise(income) - totalSpentPaise) : null;
  const isIncomeDeficit = income !== null && totalSpentPaise > rupeesToPaise(income);

  const largestCategories = Object.entries(totals)
    .filter(([_, amt]) => Number(amt) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0,
    }));

  return {
    totalSpent,
    budgetedSpent,
    unbudgetedSpent,
    totalPlanned,
    remainingBudget,
    income,
    incomeRemaining,
    remainingIncome: incomeRemaining,
    totalOverspent: paiseToRupees(totalOverspentPaise),
    overspentCategories,
    largestCategories,
    categoryMetrics,
    isIncomeDeficit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// In-App Alert System
// ─────────────────────────────────────────────────────────────────────────────

export function getCategoryAlertStatus(actual: number, limit: number): {
  status: AlertThresholdLevel;
  percent: number;
  message?: string;
} {
  if (limit <= 0) {
    return { status: "no_limit", percent: 0 };
  }
  const ratio = actual / limit;
  const pct = Math.round(ratio * 100);
  if (actual > limit) {
    return {
      status: "over_limit",
      percent: pct,
      message: `Over limit by ₹${(actual - limit).toFixed(2)} (${pct}%)`,
    };
  }
  if (actual === limit) {
    return {
      status: "reached",
      percent: 100,
      message: `100% of budget limit reached`,
    };
  }
  if (ratio >= 0.9) {
    return {
      status: "near_limit",
      percent: pct,
      message: `Near limit: ${pct}% of budget spent`,
    };
  }
  if (ratio >= 0.8) {
    return {
      status: "warning",
      percent: pct,
      message: `Approaching limit: ${pct}% spent`,
    };
  }
  return { status: "normal", percent: pct };
}

export function getBudgetAlerts(metrics: BudgetMetrics, month: string): BudgetAlertItem[] {
  const alerts: BudgetAlertItem[] = [];

  // Income deficit alert
  if (metrics.isIncomeDeficit && metrics.income !== null) {
    const deficit = paiseToRupees(rupeesToPaise(metrics.totalSpent) - rupeesToPaise(metrics.income));
    alerts.push({
      type: "danger",
      title: "Cash Flow Deficit",
      message: `Total recorded spending (${formatINR(metrics.totalSpent)}) exceeds your monthly take-home income (${formatINR(metrics.income)}) by ${formatINR(deficit)}.`,
      level: "deficit",
    });
  }

  // Category thresholds: Over limit (>100%), Reached (100%), Near (90%), Warning (80%)
  Object.values(metrics.categoryMetrics).forEach((cat) => {
    if (!cat.hasLimit) return;

    if (cat.status === "over_limit") {
      alerts.push({
        type: "danger",
        category: cat.category,
        title: `Over Budget: ${cat.category}`,
        message: `Spending in ${cat.category} has exceeded your limit by ${formatINR(cat.over)}. Total spent: ${formatINR(cat.actual)} of ${formatINR(cat.limit)}.`,
        percent: cat.percentage,
        level: "over_limit",
      });
    } else if (cat.status === "reached") {
      alerts.push({
        type: "warning",
        category: cat.category,
        title: `Budget Limit Reached: ${cat.category}`,
        message: `You have reached 100% of your ${formatINR(cat.limit)} budget limit in ${cat.category}.`,
        percent: 100,
        level: "reached",
      });
    } else if (cat.status === "near_limit") {
      alerts.push({
        type: "warning",
        category: cat.category,
        title: `Near Limit: ${cat.category}`,
        message: `${cat.category} is at ${cat.percentage}% of its budget. Only ${formatINR(cat.remaining)} remains of ${formatINR(cat.limit)}.`,
        percent: cat.percentage,
        level: "near_limit",
      });
    } else if (cat.status === "warning") {
      alerts.push({
        type: "info",
        category: cat.category,
        title: `Approaching Budget: ${cat.category}`,
        message: `${cat.category} has reached ${cat.percentage}% of its budget. ${formatINR(cat.remaining)} remaining.`,
        percent: cat.percentage,
        level: "warning",
      });
    }
  });

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Month-End Daily Expense Projection (Deterministic with Labeled Assumptions)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateMonthEndProjection(
  expenses: ExpenseRecord[],
  month: string,
  asOfDate?: string | Date,
): MonthEndProjection {
  if (!isValidMonthKey(month)) {
    return {
      projectedTotal: 0,
      dailyAverage: 0,
      daysPassed: 0,
      daysInMonth: 30,
      confidence: "low",
      assumptionNote: "Invalid month specified for projection.",
    };
  }

  const parts = month.split("-");
  const yearStr = parts[0] ?? "1970";
  const monthStr = parts[1] ?? "01";
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, m, 0).getDate();

  const refDate = asOfDate
    ? typeof asOfDate === "string"
      ? new Date(asOfDate)
      : asOfDate
    : new Date();

  const currentMonthKey = getMonthKeyFromDate(refDate);

  let daysPassed: number;
  if (month < currentMonthKey) {
    // Past month
    daysPassed = daysInMonth;
  } else if (month > currentMonthKey) {
    // Future month
    daysPassed = 0;
  } else {
    // Current month
    daysPassed = Math.min(daysInMonth, Math.max(1, refDate.getDate()));
  }

  const monthExpenses = getExpensesForMonth(expenses, month);
  const totalSpent = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  if (daysPassed <= 0 || totalSpent <= 0) {
    return {
      projectedTotal: totalSpent,
      dailyAverage: 0,
      daysPassed,
      daysInMonth,
      confidence: "low",
      assumptionNote:
        daysPassed <= 0
          ? "Future month; projection requires at least one recorded day."
          : "No expenses recorded this month yet.",
    };
  }

  const dailyAverage = totalSpent / daysPassed;
  const projectedTotal = Math.round(dailyAverage * daysInMonth * 100) / 100;
  const remainingDays = daysInMonth - daysPassed;

  const confidence: "low" | "medium" | "high" =
    daysPassed >= 20 ? "high" : daysPassed >= 7 ? "medium" : "low";

  const assumptionNote =
    remainingDays === 0
      ? `Month complete (${daysInMonth} of ${daysInMonth} days). Actual total: ${formatINR(totalSpent)}.`
      : `Based on an average of ${formatINR(dailyAverage)}/day across ${daysPassed} day(s). Assumes consistent daily spending for the remaining ${remainingDays} day(s).`;

  return {
    projectedTotal,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    daysPassed,
    daysInMonth,
    confidence,
    assumptionNote,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Month-over-Month Trend & Category Delta Comparison
// ─────────────────────────────────────────────────────────────────────────────

export function computeMonthOverMonthComparison(
  currentMonthExpenses: ExpenseRecord[],
  previousMonthExpenses: ExpenseRecord[],
  currentMonth: string,
  previousMonth: string,
): MonthOverMonthComparison {
  const currentTotals = getMonthlyCategoryTotals(currentMonthExpenses, currentMonth);
  const prevTotals = getMonthlyCategoryTotals(previousMonthExpenses, previousMonth);

  const currentTotal = Object.values(currentTotals).reduce((s, a) => s + a, 0);
  const previousTotal = Object.values(prevTotals).reduce((s, a) => s + a, 0);

  const diffAmount = paiseToRupees(rupeesToPaise(currentTotal) - rupeesToPaise(previousTotal));
  const diffPercent =
    previousTotal > 0
      ? Math.round((diffAmount / previousTotal) * 1000) / 10
      : currentTotal > 0
        ? 100
        : 0;

  const trend: "up" | "down" | "flat" =
    diffAmount > 0 ? "up" : diffAmount < 0 ? "down" : "flat";

  const allCats = Array.from(new Set([...Object.keys(currentTotals), ...Object.keys(prevTotals)]));
  const categoryDeltas: Record<string, CategoryComparisonDelta> = {};

  allCats.forEach((cat) => {
    const cur = Number(currentTotals[cat] || 0);
    const prev = Number(prevTotals[cat] || 0);
    const delta = paiseToRupees(rupeesToPaise(cur) - rupeesToPaise(prev));
    const deltaPercent =
      prev > 0 ? Math.round((delta / prev) * 1000) / 10 : cur > 0 ? 100 : 0;
    categoryDeltas[cat] = {
      current: cur,
      previous: prev,
      delta,
      deltaPercent,
      trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    };
  });

  return {
    currentTotal,
    previousTotal,
    diffAmount,
    diffPercent,
    trend,
    categoryDeltas,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-Based Suggestions (Preserves compatibility with test suite & advisor)
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialGoalReference {
  id: string;
  name: string;
  target: number;
  saved: number;
}

export function generateRuleBasedSuggestions(
  expenses: ExpenseRecord[],
  month: string,
  plan: BudgetPlanRecord | { income?: number | "" | null; limits?: Record<string, number> },
  totals: Record<string, number>,
  goal?: FinancialGoalReference | null,
): Array<{ type: string; title: string; text: string }> {
  const monthExpenses = getExpensesForMonth(expenses, month);
  const optionalExpenses = monthExpenses.filter((e) => e.type === "optional");
  const optionalTotal = optionalExpenses.reduce(
    (sum, e) => sum + (Number.isFinite(e.amount) && e.amount > 0 ? e.amount : 0),
    0,
  );
  const totalSpent = Object.values(totals).reduce((sum, amt) => sum + amt, 0);

  const rawIncome = plan.income;
  const income =
    rawIncome !== "" && rawIncome !== null && rawIncome !== undefined && Number.isFinite(Number(rawIncome))
      ? Number(rawIncome)
      : null;
  const remainingIncome = income !== null ? income - totalSpent : null;

  const metrics = computeBudgetMetrics(plan, totals);
  const suggestions: Array<{ type: string; title: string; text: string }> = [];

  // Rule 1: Overspending mitigation
  if (metrics.overspentCategories.length > 0) {
    metrics.overspentCategories.forEach((item) => {
      const catOptional = optionalExpenses
        .filter(
          (e) =>
            (DEFAULT_BUDGET_CATEGORIES.includes(e.category as any) ? e.category : "Other") ===
            item.category,
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

/**
 * Validate a proposed custom category name against length, non-empty, and case-insensitive duplicates.
 */
export function validateCategoryName(
  name: string,
  existingCustom: readonly string[],
  defaultCategories: readonly string[] = DEFAULT_BUDGET_CATEGORIES,
): { isValid: boolean; error?: string; sanitizedName?: string } {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return { isValid: false, error: "Please enter a category name." };
  }
  if (trimmed.length > 30) {
    return { isValid: false, error: "Category name cannot exceed 30 characters." };
  }
  const lower = trimmed.toLowerCase();
  if (lower === "other" || defaultCategories.some((c) => c.toLowerCase() === lower)) {
    return { isValid: false, error: `"${trimmed}" is already a default category.` };
  }
  if (existingCustom.some((c) => c.toLowerCase() === lower)) {
    return { isValid: false, error: `Category "${trimmed}" already exists.` };
  }
  return { isValid: true, sanitizedName: trimmed };
}

/**
 * Returns true if at least one category budget limit is configured (> 0).
 * If all limits are absent, 0, or removed, returns false.
 */
export function shouldShowCategoryProgress(
  limits: Record<string, number> | null | undefined,
): boolean {
  if (!limits) return false;
  return Object.values(limits).some((val) => typeof val === "number" && val > 0);
}

export type ExpenseSortMode = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

/**
 * Sorts an array of expense records deterministically based on date or amount.
 */
export function sortExpenses(
  expenses: readonly ExpenseRecord[],
  sortMode: ExpenseSortMode = "date-desc",
): ExpenseRecord[] {
  const copy = [...expenses];
  copy.sort((a, b) => {
    if (sortMode === "date-asc") return (a.date || "").localeCompare(b.date || "");
    if (sortMode === "amount-desc") return Number(b.amount || 0) - Number(a.amount || 0);
    if (sortMode === "amount-asc") return Number(a.amount || 0) - Number(b.amount || 0);
    return (b.date || "").localeCompare(a.date || ""); // default date-desc
  });
  return copy;
}
