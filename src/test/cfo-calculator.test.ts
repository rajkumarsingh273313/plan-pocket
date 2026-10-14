import { describe, it, expect } from "vitest";
import {
  calculateCFOScenario,
  CFO_MODEL_VERSION,
  roundCurrency,
  formatINR,
  type CFOScenarioInputs,
} from "../lib/cfo-calculator";

describe("CFO Calculator (Deterministic No-AI Planning)", () => {
  it("verifies model version", () => {
    expect(CFO_MODEL_VERSION).toBe("1.0.0");
  });

  describe("Hiring Payroll & Headcount", () => {
    it("calculates multi-role payroll with headcounts correctly", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 6,
        roles: [
          {
            id: "r1",
            title: "Senior Engineer",
            headcount: 2,
            monthlySalaryPerPerson: 100000,
          },
          {
            id: "r2",
            title: "Product Designer",
            headcount: 1,
            monthlySalaryPerPerson: 70000,
          },
        ],
      };

      const result = calculateCFOScenario(inputs);
      expect(result.totalHeadcount).toBe(3);
      // 2 * 100,000 + 1 * 70,000 = 270,000 / month
      expect(result.initialMonthlyNewPayroll).toBe(270000);
      // Over 6 months: 270,000 * 6 = 1,620,000
      expect(result.totalNewPayrollOverHorizon).toBe(1620000);
      expect(result.salaryCapAlerts).toHaveLength(0);
    });

    it("detects salary cap exceedances per role", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 12,
        roles: [
          {
            id: "r1",
            title: "Lead Architect",
            headcount: 2,
            monthlySalaryPerPerson: 180000,
            maxAffordableSalaryPerPerson: 150000,
          },
          {
            id: "r2",
            title: "Junior Dev",
            headcount: 1,
            monthlySalaryPerPerson: 40000,
            maxAffordableSalaryPerPerson: 50000,
          },
        ],
      };

      const result = calculateCFOScenario(inputs);
      expect(result.salaryCapAlerts).toHaveLength(1);
      const alert = result.salaryCapAlerts[0];
      expect(alert.title).toBe("Lead Architect");
      expect(alert.plannedSalary).toBe(180000);
      expect(alert.maxAffordableSalary).toBe(150000);
      expect(alert.overagePerPerson).toBe(30000);
      expect(alert.totalMonthlyOverage).toBe(60000); // 2 people * 30k
    });

    it("applies annual raises strictly after 12 completed months (month 13)", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 14,
        roles: [
          {
            id: "r1",
            title: "Staff Engineer",
            headcount: 1,
            monthlySalaryPerPerson: 100000,
            raiseType: "percent",
            raiseValue: 10, // 10% raise
            startMonth: 1,
          },
          {
            id: "r2",
            title: "QA Engineer",
            headcount: 1,
            monthlySalaryPerPerson: 50000,
            raiseType: "fixed",
            raiseValue: 5000, // ₹5,000 fixed raise
            startMonth: 1,
          },
        ],
      };

      const result = calculateCFOScenario(inputs);
      // Month 1 to 12: 100,000 + 50,000 = 150,000
      expect(result.projections[0].newPayroll).toBe(150000);
      expect(result.projections[11].newPayroll).toBe(150000);

      // Month 13: 100,000 * 1.10 = 110,000 + (50,000 + 5,000) = 55,000 -> 165,000
      expect(result.projections[12].newPayroll).toBe(165000);
      expect(result.projections[13].newPayroll).toBe(165000);
    });

    it("respects deferred start months for hiring and raises", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 15,
        roles: [
          {
            id: "r1",
            title: "Designer",
            headcount: 1,
            monthlySalaryPerPerson: 60000,
            startMonth: 3, // starts in month 3
            raiseType: "percent",
            raiseValue: 10,
          },
        ],
      };

      const result = calculateCFOScenario(inputs);
      expect(result.projections[0].newPayroll).toBe(0); // Month 1
      expect(result.projections[1].newPayroll).toBe(0); // Month 2
      expect(result.projections[2].newPayroll).toBe(60000); // Month 3 (first active month)
      // Raise occurs after 12 completed months of employment, i.e., in month (3 + 12) = 15
      expect(result.projections[13].newPayroll).toBe(60000); // Month 14 (12th month of work)
      expect(result.projections[14].newPayroll).toBe(66000); // Month 15 (13th month of work, raise applied)
    });
  });

  describe("Budget Comparison & Time Period Mismatch Prevention", () => {
    it("compares monthly payroll cap without conflating with total period budget", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 12,
        roles: [
          {
            id: "r1",
            title: "Dev",
            headcount: 2,
            monthlySalaryPerPerson: 60000,
          },
        ],
        budgetType: "monthly_cap",
        budgetAmount: 150000,
      };

      const result = calculateCFOScenario(inputs);
      expect(result.budgetComparison).not.toBeNull();
      expect(result.budgetComparison?.budgetType).toBe("monthly_cap");
      expect(result.budgetComparison?.budgetAmount).toBe(150000);
      expect(result.budgetComparison?.actualAmount).toBe(120000); // month 1 new payroll
      expect(result.budgetComparison?.remaining).toBe(30000);
      expect(result.budgetComparison?.isOverBudget).toBe(false);
    });

    it("flags monthly budget overage when planned payroll exceeds cap", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 6,
        roles: [
          {
            id: "r1",
            title: "Manager",
            headcount: 1,
            monthlySalaryPerPerson: 200000,
          },
        ],
        budgetType: "monthly_cap",
        budgetAmount: 150000,
      };

      const result = calculateCFOScenario(inputs);
      expect(result.budgetComparison?.isOverBudget).toBe(true);
      expect(result.budgetComparison?.remaining).toBe(-50000);
    });

    it("compares cumulative multi-month budget against total period budget", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 6,
        roles: [
          {
            id: "r1",
            title: "Engineer",
            headcount: 1,
            monthlySalaryPerPerson: 50000,
          },
        ],
        budgetType: "total_period",
        budgetAmount: 350000, // 3.5L total pool
      };

      const result = calculateCFOScenario(inputs);
      expect(result.budgetComparison?.budgetType).toBe("total_period");
      expect(result.budgetComparison?.budgetAmount).toBe(350000);
      // 50,000 * 6 months = 300,000
      expect(result.budgetComparison?.actualAmount).toBe(300000);
      expect(result.budgetComparison?.remaining).toBe(50000);
      expect(result.budgetComparison?.isOverBudget).toBe(false);
    });
  });

  describe("Month-by-Month Projections, Growth & Cash Runway", () => {
    it("projects compounded revenue growth accurately", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 3,
        baselineMonthlyRevenue: 100000,
        monthlyRevenueGrowthRate: 10, // 10% monthly growth
        growthRule: "compounded_monthly",
        roles: [],
      };

      const result = calculateCFOScenario(inputs);
      // Month 1: 100,000
      expect(result.projections[0].revenue).toBe(100000);
      // Month 2: 100,000 * 1.1 = 110,000
      expect(result.projections[1].revenue).toBe(110000);
      // Month 3: 110,000 * 1.1 = 121,000
      expect(result.projections[2].revenue).toBe(121000);
    });

    it("calculates profit and loss when baseline revenue is provided", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 3,
        baselineMonthlyRevenue: 200000,
        monthlyRevenueGrowthRate: 0,
        monthlyMarketingSpend: 20000,
        monthlyOperatingExpenses: 30000,
        roles: [
          {
            id: "r1",
            title: "Engineer",
            headcount: 1,
            monthlySalaryPerPerson: 100000,
          },
        ],
      };

      const result = calculateCFOScenario(inputs);
      // Total costs = 100k payroll + 20k marketing + 30k opex = 150k
      expect(result.projections[0].totalCosts).toBe(150000);
      // Profit = 200k - 150k = 50k
      expect(result.projections[0].profitOrLoss).toBe(50000);
      expect(result.breakEvenMonth).toBe("already_profitable");
    });

    it("calculates cash runway in months when burning cash", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 12,
        currentCashReserves: 300000, // ₹3,00,000 cash
        baselineMonthlyRevenue: 50000,
        monthlyRevenueGrowthRate: 0,
        monthlyOperatingExpenses: 20000,
        roles: [
          {
            id: "r1",
            title: "Engineer",
            headcount: 1,
            monthlySalaryPerPerson: 100000,
          },
        ],
      };

      const result = calculateCFOScenario(inputs);
      // Total costs = 100k + 20k = 120k / month. Revenue = 50k / month. Net monthly burn = -70k.
      // Month 1 cash: 300k - 70k = 230k
      // Month 2 cash: 230k - 70k = 160k
      // Month 3 cash: 160k - 70k = 90k
      // Month 4 cash: 90k - 70k = 20k
      // Month 5 cash: 20k - 70k = -50k (hits <= 0 in month 5)
      expect(result.cashRunwayMonths).toBe(5);
      expect(result.projections[4].cashBalance).toBe(-50000);
    });

    it("marks cash runway as infinite when business is net positive", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 6,
        currentCashReserves: 500000,
        baselineMonthlyRevenue: 300000,
        monthlyRevenueGrowthRate: 0,
        monthlyOperatingExpenses: 50000,
        roles: [
          {
            id: "r1",
            title: "Dev",
            headcount: 1,
            monthlySalaryPerPerson: 100000,
          },
        ],
      };

      const result = calculateCFOScenario(inputs);
      expect(result.cashRunwayMonths).toBe("infinite");
    });
  });

  describe("Missing Baseline Value Handling & Transparency", () => {
    it("omits runway and revenue metrics when baselines are skipped without inventing numbers", () => {
      const inputs: CFOScenarioInputs = {
        scenarioType: "hire",
        forecastMonths: 6,
        roles: [
          {
            id: "r1",
            title: "Dev",
            headcount: 1,
            monthlySalaryPerPerson: 80000,
          },
        ],
        monthlyOperatingExpenses: 20000,
        // Baselines skipped:
        baselineMonthlyRevenue: null,
        currentCashReserves: null,
        existingMonthlyPayroll: null,
      };

      const result = calculateCFOScenario(inputs);
      expect(result.month1Revenue).toBeNull();
      expect(result.projections[0].revenue).toBeNull();
      expect(result.projections[0].profitOrLoss).toBeNull();
      expect(result.projections[0].cashBalance).toBeNull();
      expect(result.cashRunwayMonths).toBeNull();
      expect(result.breakEvenMonth).toBeNull();

      // Check omitted metrics explanations
      expect(result.omittedMetrics.length).toBeGreaterThanOrEqual(2);
      const runwayOmission = result.omittedMetrics.find((m) => m.metric.includes("Runway"));
      expect(runwayOmission).toBeDefined();
      expect(runwayOmission?.prerequisiteInput).toBe("Current Available Cash / Reserves");

      const revenueOmission = result.omittedMetrics.find((m) => m.metric.includes("Revenue"));
      expect(revenueOmission).toBeDefined();

      // Check excluded costs and disclaimer
      expect(result.excludedCosts.length).toBeGreaterThanOrEqual(4);
      expect(result.disclaimer).toContain("professional financial, tax, or legal advice");
    });
  });

  describe("Utility Formatting", () => {
    it("formats Indian rupees correctly", () => {
      expect(formatINR(100000)).toMatch(/₹\s*1,00,000/);
      expect(formatINR(0)).toMatch(/₹\s*0/);
      expect(formatINR(null)).toBe("N/A");
    });

    it("rounds currency values cleanly", () => {
      expect(roundCurrency(100.555)).toBe(100.56);
      expect(roundCurrency(200.1)).toBe(200.1);
    });
  });
});
