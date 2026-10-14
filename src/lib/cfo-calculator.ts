/**
 * CFO Calculator Module (Deterministic, No-AI)
 * Model Version: 1.0.0
 *
 * Implements transparent, deterministic business scenario planning formulas:
 * - Multi-role payroll with headcount and post-12-month raise support
 * - Salary cap checking per role
 * - Strict budget comparison with distinct time-period enforcement
 * - Month-by-month financial projection with compounded revenue growth
 * - Profit/loss and cash runway tracking with missing baseline omission
 * - Excluded costs inventory and legal estimate disclaimer
 */

export const CFO_MODEL_VERSION = "1.0.0";

export type ScenarioType = "hire" | "marketing" | "budget";
export type BudgetType = "monthly_cap" | "total_period";
export type RaiseType = "percent" | "fixed";
export type GrowthRule = "compounded_monthly" | "linear_monthly";

export interface RoleInput {
  id: string;
  title: string;
  headcount: number;
  monthlySalaryPerPerson: number;
  maxAffordableSalaryPerPerson?: number;
  raiseType?: RaiseType;
  raiseValue?: number; // e.g. 10 for 10% or 5000 for ₹5,000
  startMonth?: number; // 1-indexed, default 1
}

export interface CFOScenarioInputs {
  scenarioType: ScenarioType;
  scenarioName?: string;
  forecastMonths: number; // typically 3, 6, 12, 18, 24

  // Hiring Specifics
  roles?: RoleInput[];
  budgetType?: BudgetType;
  budgetAmount?: number;

  // Operating Expenses & Marketing
  monthlyMarketingSpend?: number;
  monthlyOperatingExpenses?: number;

  // Growth Assumption
  monthlyRevenueGrowthRate?: number; // percentage, e.g. 5
  growthRule?: GrowthRule;

  // Optional Baseline Figures
  baselineMonthlyRevenue?: number | null;
  currentCashReserves?: number | null;
  existingMonthlyPayroll?: number | null;
}

export interface MonthProjection {
  month: number;
  revenue: number | null;
  newPayroll: number;
  existingPayroll: number | null;
  marketing: number;
  operatingExpenses: number;
  totalCosts: number;
  profitOrLoss: number | null;
  cashBalance: number | null;
}

export interface SalaryCapAlert {
  roleId: string;
  title: string;
  plannedSalary: number;
  maxAffordableSalary: number;
  overagePerPerson: number;
  totalMonthlyOverage: number;
}

export interface BudgetComparisonResult {
  budgetType: BudgetType;
  budgetAmount: number;
  actualAmount: number;
  remaining: number; // positive = under budget, negative = over budget
  isOverBudget: boolean;
  explanation: string;
}

export interface OmittedMetric {
  metric: string;
  reason: string;
  prerequisiteInput: string;
}

export interface CFOCalculationResult {
  modelVersion: string;
  calculatedAt: string;
  scenarioType: ScenarioType;
  scenarioName: string;
  forecastMonths: number;

  // Payroll Metrics
  totalHeadcount: number;
  initialMonthlyNewPayroll: number;
  totalNewPayrollOverHorizon: number;
  salaryCapAlerts: SalaryCapAlert[];

  // Budget
  budgetComparison: BudgetComparisonResult | null;

  // Projections
  projections: MonthProjection[];

  // Top-level financial summaries
  totalCostsOverHorizon: number;
  averageMonthlyBurn: number;
  month1Revenue: number | null;
  endRevenue: number | null;
  cashRunwayMonths: number | null | "infinite";
  breakEvenMonth: number | null | "already_profitable" | "never";
  endCashBalance: number | null;

  // Transparency metadata
  omittedMetrics: OmittedMetric[];
  assumptions: string[];
  excludedCosts: string[];
  disclaimer: string;
}

/** Round money to 2 decimal places to avoid floating point anomalies */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/** Format currency in Indian Rupees for display */
export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(val);
}

/**
 * Pure calculation function for business planning scenario.
 */
export function calculateCFOScenario(inputs: CFOScenarioInputs): CFOCalculationResult {
  const modelVersion = CFO_MODEL_VERSION;
  const calculatedAt = new Date().toISOString();
  const scenarioType = inputs.scenarioType || "hire";
  const scenarioName = (inputs.scenarioName || "").trim() || "Untitled Scenario";
  const forecastMonths = Math.max(1, Math.min(60, Math.round(Number(inputs.forecastMonths) || 12)));

  const roles = (inputs.roles || []).map((r, idx) => ({
    id: r.id || `role-${idx + 1}`,
    title: (r.title || "").trim() || `Role ${idx + 1}`,
    headcount: Math.max(1, Math.round(Number(r.headcount) || 1)),
    monthlySalaryPerPerson: Math.max(0, roundCurrency(Number(r.monthlySalaryPerPerson) || 0)),
    maxAffordableSalaryPerPerson:
      r.maxAffordableSalaryPerPerson !== undefined && r.maxAffordableSalaryPerPerson !== null
        ? Math.max(0, roundCurrency(Number(r.maxAffordableSalaryPerPerson)))
        : undefined,
    raiseType: r.raiseType === "fixed" ? ("fixed" as const) : ("percent" as const),
    raiseValue: Math.max(0, Number(r.raiseValue) || 0),
    startMonth: Math.max(1, Math.round(Number(r.startMonth) || 1)),
  }));

  const marketingSpend = Math.max(0, roundCurrency(Number(inputs.monthlyMarketingSpend) || 0));
  const operatingExpenses = Math.max(0, roundCurrency(Number(inputs.monthlyOperatingExpenses) || 0));
  const growthRate = Number(inputs.monthlyRevenueGrowthRate) || 0;
  const growthRule: GrowthRule = inputs.growthRule || "compounded_monthly";

  const baselineRevenue =
    inputs.baselineMonthlyRevenue !== null && inputs.baselineMonthlyRevenue !== undefined
      ? Math.max(0, roundCurrency(Number(inputs.baselineMonthlyRevenue)))
      : null;

  const currentCash =
    inputs.currentCashReserves !== null && inputs.currentCashReserves !== undefined
      ? roundCurrency(Number(inputs.currentCashReserves))
      : null;

  const existingPayroll =
    inputs.existingMonthlyPayroll !== null && inputs.existingMonthlyPayroll !== undefined
      ? Math.max(0, roundCurrency(Number(inputs.existingMonthlyPayroll)))
      : null;

  // 1. Salary Cap Alerts
  const salaryCapAlerts: SalaryCapAlert[] = [];
  roles.forEach((r) => {
    if (
      r.maxAffordableSalaryPerPerson !== undefined &&
      r.monthlySalaryPerPerson > r.maxAffordableSalaryPerPerson
    ) {
      const overagePerPerson = roundCurrency(r.monthlySalaryPerPerson - r.maxAffordableSalaryPerPerson);
      salaryCapAlerts.push({
        roleId: r.id,
        title: r.title,
        plannedSalary: r.monthlySalaryPerPerson,
        maxAffordableSalary: r.maxAffordableSalaryPerPerson,
        overagePerPerson,
        totalMonthlyOverage: roundCurrency(overagePerPerson * r.headcount),
      });
    }
  });

  // 2. Headcount & Month-by-Month Payroll Calculation
  const totalHeadcount = roles.reduce((sum, r) => sum + r.headcount, 0);

  function getRoleSalaryInMonth(role: (typeof roles)[0], monthNumber: number): number {
    if (monthNumber < role.startMonth) return 0;
    const monthsActive = monthNumber - role.startMonth + 1;
    let salary = role.monthlySalaryPerPerson;
    // Apply raise after 12 completed months of employment (i.e., starting month 13)
    if (monthsActive > 12 && role.raiseValue > 0) {
      if (role.raiseType === "percent") {
        salary = roundCurrency(role.monthlySalaryPerPerson * (1 + role.raiseValue / 100));
      } else {
        salary = roundCurrency(role.monthlySalaryPerPerson + role.raiseValue);
      }
    }
    return salary;
  }

  const monthlyNewPayrolls: number[] = [];
  for (let m = 1; m <= forecastMonths; m++) {
    let monthCost = 0;
    roles.forEach((r) => {
      const salary = getRoleSalaryInMonth(r, m);
      monthCost += salary * r.headcount;
    });
    monthlyNewPayrolls.push(roundCurrency(monthCost));
  }

  const initialMonthlyNewPayroll = monthlyNewPayrolls[0] || 0;
  const totalNewPayrollOverHorizon = roundCurrency(
    monthlyNewPayrolls.reduce((sum, val) => sum + val, 0)
  );

  // 3. Budget Comparison
  let budgetComparison: BudgetComparisonResult | null = null;
  if (inputs.budgetAmount !== undefined && inputs.budgetAmount !== null && inputs.budgetAmount > 0) {
    const budgetAmount = roundCurrency(inputs.budgetAmount);
    const budgetType = inputs.budgetType === "total_period" ? "total_period" : "monthly_cap";

    if (budgetType === "monthly_cap") {
      const actualAmount = initialMonthlyNewPayroll;
      const remaining = roundCurrency(budgetAmount - actualAmount);
      budgetComparison = {
        budgetType,
        budgetAmount,
        actualAmount,
        remaining,
        isOverBudget: remaining < 0,
        explanation:
          remaining >= 0
            ? `Planned initial new payroll (${formatINR(actualAmount)}/mo) is within your monthly payroll cap of ${formatINR(budgetAmount)}/mo (margin: ${formatINR(remaining)}/mo).`
            : `Planned initial new payroll (${formatINR(actualAmount)}/mo) exceeds your monthly payroll cap of ${formatINR(budgetAmount)}/mo by ${formatINR(Math.abs(remaining))}/mo.`,
      };
    } else {
      const actualAmount = totalNewPayrollOverHorizon;
      const remaining = roundCurrency(budgetAmount - actualAmount);
      budgetComparison = {
        budgetType,
        budgetAmount,
        actualAmount,
        remaining,
        isOverBudget: remaining < 0,
        explanation:
          remaining >= 0
            ? `Cumulative new payroll over ${forecastMonths} months (${formatINR(actualAmount)}) is within your total period budget of ${formatINR(budgetAmount)} (margin: ${formatINR(remaining)}).`
            : `Cumulative new payroll over ${forecastMonths} months (${formatINR(actualAmount)}) exceeds your total period budget of ${formatINR(budgetAmount)} by ${formatINR(Math.abs(remaining))}.`,
      };
    }
  }

  // 4. Month-by-Month Projections
  const projections: MonthProjection[] = [];
  let rollingCash = currentCash;
  let totalCostsSum = 0;
  let runwayDetectedMonth: number | null = null;

  for (let m = 1; m <= forecastMonths; m++) {
    // Revenue projection
    let revenue: number | null = null;
    if (baselineRevenue !== null) {
      if (growthRule === "compounded_monthly") {
        revenue = roundCurrency(baselineRevenue * Math.pow(1 + growthRate / 100, m - 1));
      } else {
        revenue = roundCurrency(baselineRevenue * (1 + (growthRate / 100) * (m - 1)));
      }
    }

    const newPayroll = monthlyNewPayrolls[m - 1] || 0;
    const existingPayrollAmount = existingPayroll ?? 0;
    const totalCosts = roundCurrency(existingPayrollAmount + newPayroll + marketingSpend + operatingExpenses);
    totalCostsSum += totalCosts;

    // Profit / loss
    let profitOrLoss: number | null = null;
    if (revenue !== null) {
      profitOrLoss = roundCurrency(revenue - totalCosts);
    }

    // Cash balance
    let cashBalance: number | null = null;
    if (rollingCash !== null) {
      const netCashChange = profitOrLoss !== null ? profitOrLoss : -totalCosts;
      rollingCash = roundCurrency(rollingCash + netCashChange);
      cashBalance = rollingCash;

      if (cashBalance <= 0 && runwayDetectedMonth === null) {
        runwayDetectedMonth = m;
      }
    }

    projections.push({
      month: m,
      revenue,
      newPayroll,
      existingPayroll,
      marketing: marketingSpend,
      operatingExpenses,
      totalCosts,
      profitOrLoss,
      cashBalance,
    });
  }

  const totalCostsOverHorizon = roundCurrency(totalCostsSum);
  const averageMonthlyBurn = roundCurrency(totalCostsOverHorizon / forecastMonths);
  const month1Revenue = projections[0]?.revenue ?? null;
  const endRevenue = projections[projections.length - 1]?.revenue ?? null;
  const endCashBalance = rollingCash;

  // 5. Cash Runway Determination
  let cashRunwayMonths: number | null | "infinite" = null;
  if (currentCash !== null) {
    if (runwayDetectedMonth !== null) {
      cashRunwayMonths = runwayDetectedMonth;
    } else {
      // Check if monthly net profit is positive or cash never runs out
      const isConsistentlyNetPositive = projections.every((p) => p.profitOrLoss !== null && p.profitOrLoss >= 0);
      if (isConsistentlyNetPositive) {
        cashRunwayMonths = "infinite";
      } else {
        // Average burn rate based runway
        const netCashChangeTotal = projections.reduce((acc, p) => {
          return acc + (p.profitOrLoss !== null ? p.profitOrLoss : -p.totalCosts);
        }, 0);
        if (netCashChangeTotal >= 0) {
          cashRunwayMonths = "infinite";
        } else {
          const monthlyNetBurn = Math.abs(netCashChangeTotal) / forecastMonths;
          cashRunwayMonths = Math.max(0, Math.floor(currentCash / monthlyNetBurn));
        }
      }
    }
  }

  // 6. Break-Even Month Determination
  let breakEvenMonth: number | null | "already_profitable" | "never" = null;
  if (baselineRevenue !== null) {
    if (projections[0]?.profitOrLoss !== null && projections[0].profitOrLoss >= 0) {
      breakEvenMonth = "already_profitable";
    } else {
      const profitableIndex = projections.findIndex((p) => p.profitOrLoss !== null && p.profitOrLoss >= 0);
      if (profitableIndex >= 0) {
        breakEvenMonth = profitableIndex + 1;
      } else {
        breakEvenMonth = "never";
      }
    }
  }

  // 7. Transparency: Omitted Metrics
  const omittedMetrics: OmittedMetric[] = [];
  if (currentCash === null) {
    omittedMetrics.push({
      metric: "Cash Runway & Cash Balance",
      reason: "Initial available cash reserves were not provided (skipped).",
      prerequisiteInput: "Current Available Cash / Reserves",
    });
  }
  if (baselineRevenue === null) {
    omittedMetrics.push({
      metric: "Monthly Revenue Projections & Profit / Loss",
      reason: "Baseline monthly revenue was not provided (skipped).",
      prerequisiteInput: "Current Baseline Monthly Revenue",
    });
    omittedMetrics.push({
      metric: "Break-Even Point",
      reason: "Requires baseline revenue to determine time to net profitability.",
      prerequisiteInput: "Current Baseline Monthly Revenue",
    });
  }
  if (existingPayroll === null) {
    omittedMetrics.push({
      metric: "Company-Wide Total Payroll",
      reason: "Existing team payroll was not provided (skipped); only new hire payroll is reflected.",
      prerequisiteInput: "Existing Monthly Payroll",
    });
  }

  // 8. Documented Assumptions
  const assumptions: string[] = [
    `Forecast horizon: ${forecastMonths} months.`,
    growthRule === "compounded_monthly"
      ? `Revenue growth rule: Compounded monthly at ${growthRate}%: R(t) = R_0 * (1 + ${growthRate / 100})^(t-1).`
      : `Revenue growth rule: Linear monthly at ${growthRate}%: R(t) = R_0 * (1 + (${growthRate / 100}) * (t-1)).`,
    "Annual raises for new roles are scheduled after 12 completed months from hire start date.",
    "Payroll calculations reflect base salaries and specified raises only.",
  ];

  // 9. Excluded Costs Inventory
  const excludedCosts: string[] = [
    "Employer payroll taxes, statutory PF, and gratuity obligations",
    "Employee benefits, health insurance, and wellness allowances",
    "Recruitment agency fees, job board posting, and referral bonuses",
    "Hardware, software licenses, onboarding, and workspace stipends",
    "Customer churn, seasonal sales variation, and pricing elasticity",
  ];

  const disclaimer =
    "Estimate based on your assumptions. This scenario model provides structured planning assistance and does not constitute professional financial, tax, or legal advice, nor a financial guarantee.";

  return {
    modelVersion,
    calculatedAt,
    scenarioType,
    scenarioName,
    forecastMonths,
    totalHeadcount,
    initialMonthlyNewPayroll,
    totalNewPayrollOverHorizon,
    salaryCapAlerts,
    budgetComparison,
    projections,
    totalCostsOverHorizon,
    averageMonthlyBurn,
    month1Revenue,
    endRevenue,
    cashRunwayMonths,
    breakEvenMonth,
    endCashBalance,
    omittedMetrics,
    assumptions,
    excludedCosts,
    disclaimer,
  };
}

