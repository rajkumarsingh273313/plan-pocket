/**
 * PlanPocket Budget & Expenses Client Library
 * Compiled/mirrored from src/lib/budget-expenses.ts for the standalone HTML app
 */
(function (global) {
  const DEFAULT_BUDGET_CATEGORIES = Object.freeze([
    "Food",
    "Transport",
    "Housing",
    "Utilities",
    "Health",
    "Shopping",
    "Entertainment",
    "Other",
  ]);

  const ALERT_THRESHOLDS = Object.freeze({
    WARNING: 80,
    NEAR_LIMIT: 90,
    REACHED: 100,
    OVER_LIMIT: 100,
  });

  function rupeesToPaise(rupees) {
    const val = typeof rupees === "string" ? parseFloat(rupees) : rupees;
    if (!Number.isFinite(val)) return 0;
    return Math.round(val * 100);
  }

  function paiseToRupees(paise) {
    if (!Number.isFinite(paise)) return 0;
    return Math.round(paise) / 100;
  }

  function formatINR(rupees) {
    const safe = Number.isFinite(rupees) ? paiseToRupees(rupeesToPaise(rupees)) : 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  }

  function isValidCurrencyAmount(amount) {
    if (typeof amount === "number") {
      if (!Number.isFinite(amount) || amount <= 0) return false;
      const str = amount.toString();
      const parts = str.split(".");
      return (parts[1]?.length || 0) <= 2;
    }
    if (typeof amount === "string") {
      const trimmed = amount.trim();
      if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
      const num = parseFloat(trimmed);
      return Number.isFinite(num) && num > 0;
    }
    return false;
  }

  function isValidMonthKey(month) {
    if (typeof month !== "string") return false;
    return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month.trim());
  }

  function isValidIsoDate(date) {
    if (typeof date !== "string") return false;
    if (!/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(date.trim())) return false;
    const parsed = new Date(date.trim());
    return !isNaN(parsed.getTime());
  }

  function getMonthKeyFromDate(date) {
    const d = typeof date === "string" ? new Date(date) : date || new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function getPreviousMonthKey(month) {
    if (!isValidMonthKey(month)) return "";
    const parts = month.split("-");
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    return `${y}-${String(m).padStart(2, "0")}`;
  }

  function getExpensesForMonth(expenses, month) {
    if (!isValidMonthKey(month) || !Array.isArray(expenses)) return [];
    return expenses.filter(
      (e) => typeof e.date === "string" && e.date.startsWith(month) && Number(e.amount) > 0,
    );
  }

  function getMonthlyCategoryTotals(expenses, month, categoriesList) {
    const totalsPaise = {};
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

    const result = {};
    Object.entries(totalsPaise).forEach(([cat, p]) => {
      result[cat] = paiseToRupees(p);
    });
    return result;
  }

  function computeBudgetMetrics(plan, totals, categoriesList) {
    plan = plan || {};
    const limits = plan.limits || {};
    totals = totals || {};
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

    const overspentCategories = [];
    const categoryMetrics = {};

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

      let status = "normal";
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

  function getCategoryAlertStatus(actual, limit) {
    if (limit <= 0) return { status: "no_limit", percent: 0 };
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
      return { status: "reached", percent: 100, message: "100% of budget limit reached" };
    }
    if (ratio >= 0.9) {
      return { status: "near_limit", percent: pct, message: `Near limit: ${pct}% of budget spent` };
    }
    if (ratio >= 0.8) {
      return { status: "warning", percent: pct, message: `Approaching limit: ${pct}% spent` };
    }
    return { status: "normal", percent: pct };
  }

  function getBudgetAlerts(metrics, month) {
    const alerts = [];
    if (!metrics) return alerts;

    if (metrics.isIncomeDeficit && metrics.income !== null) {
      const deficit = paiseToRupees(rupeesToPaise(metrics.totalSpent) - rupeesToPaise(metrics.income));
      alerts.push({
        type: "danger",
        title: "Cash Flow Deficit",
        message: `Total recorded spending (${formatINR(metrics.totalSpent)}) exceeds your monthly take-home income (${formatINR(metrics.income)}) by ${formatINR(deficit)}.`,
        level: "deficit",
      });
    }

    Object.values(metrics.categoryMetrics || {}).forEach((cat) => {
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

  function calculateMonthEndProjection(expenses, month, asOfDate) {
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
    const year = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const daysInMonth = new Date(year, m, 0).getDate();

    const refDate = asOfDate
      ? typeof asOfDate === "string"
        ? new Date(asOfDate)
        : asOfDate
      : new Date();
    const currentMonthKey = getMonthKeyFromDate(refDate);

    let daysPassed;
    if (month < currentMonthKey) {
      daysPassed = daysInMonth;
    } else if (month > currentMonthKey) {
      daysPassed = 0;
    } else {
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

    const confidence = daysPassed >= 20 ? "high" : daysPassed >= 7 ? "medium" : "low";

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

  function computeMonthOverMonthComparison(
    currentMonthExpenses,
    previousMonthExpenses,
    currentMonth,
    previousMonth,
  ) {
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

    const trend = diffAmount > 0 ? "up" : diffAmount < 0 ? "down" : "flat";

    const allCats = Array.from(new Set([...Object.keys(currentTotals), ...Object.keys(prevTotals)]));
    const categoryDeltas = {};

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

  function validateCategoryName(name, existingCustom, defaultCategories) {
    const defaults = defaultCategories || DEFAULT_BUDGET_CATEGORIES;
    const trimmed = (name || "").trim();
    if (!trimmed) {
      return { isValid: false, error: "Please enter a category name." };
    }
    if (trimmed.length > 30) {
      return { isValid: false, error: "Category name cannot exceed 30 characters." };
    }
    const lower = trimmed.toLowerCase();
    if (lower === "other" || defaults.some((c) => c.toLowerCase() === lower)) {
      return { isValid: false, error: `"${trimmed}" is already a default category.` };
    }
    if ((existingCustom || []).some((c) => c.toLowerCase() === lower)) {
      return { isValid: false, error: `Category "${trimmed}" already exists.` };
    }
    return { isValid: true, sanitizedName: trimmed };
  }

  function shouldShowCategoryProgress(limits) {
    if (!limits || typeof limits !== "object") return false;
    return Object.values(limits).some((val) => typeof val === "number" && val > 0);
  }

  function sortExpenses(expenses, sortMode) {
    const mode = sortMode || "date-desc";
    const copy = Array.isArray(expenses) ? [...expenses] : [];
    copy.sort((a, b) => {
      if (mode === "date-asc") return (a.date || "").localeCompare(b.date || "");
      if (mode === "amount-desc") return Number(b.amount || 0) - Number(a.amount || 0);
      if (mode === "amount-asc") return Number(a.amount || 0) - Number(b.amount || 0);
      return (b.date || "").localeCompare(a.date || ""); // default date-desc
    });
    return copy;
  }

  const PlanPocketBudget = {
    DEFAULT_BUDGET_CATEGORIES,
    ALERT_THRESHOLDS,
    rupeesToPaise,
    paiseToRupees,
    formatINR,
    isValidCurrencyAmount,
    isValidMonthKey,
    isValidIsoDate,
    getMonthKeyFromDate,
    getPreviousMonthKey,
    getExpensesForMonth,
    getMonthlyCategoryTotals,
    computeBudgetMetrics,
    getCategoryAlertStatus,
    getBudgetAlerts,
    calculateMonthEndProjection,
    computeMonthOverMonthComparison,
    validateCategoryName,
    shouldShowCategoryProgress,
    sortExpenses,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PlanPocketBudget;
  }
  global.PlanPocketBudget = PlanPocketBudget;
})(typeof window !== "undefined" ? window : globalThis);
