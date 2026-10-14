import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-handler";
import * as serverAuth from "../lib/server-auth";
import * as mongodb from "../lib/mongodb";

describe("API Handler & Server Endpoints", () => {
  // In-memory mock stores for MongoDB collections
  let goalsStore: any[] = [];
  let investmentsStore: any[] = [];
  let cfoScenariosStore: any[] = [];

  function assertNoUpdateConflict(update: any) {
    if (update?.$set && update?.$setOnInsert) {
      const setKeys = Object.keys(update.$set);
      const setOnInsertKeys = Object.keys(update.$setOnInsert);
      for (const key of setKeys) {
        if (setOnInsertKeys.includes(key)) {
          throw new Error(
            `MongoServerError: Updating the path '${key}' would create a conflict at '${key}'`,
          );
        }
      }
    }
  }

  const mockGoalsCol = {
    find: (filter: any) => ({
      sort: () => ({
        toArray: async () =>
          goalsStore.filter((doc) => !filter.userId || doc.userId === filter.userId),
      }),
    }),
    findOne: async (filter: any) => {
      return (
        goalsStore.find(
          (doc) =>
            (!filter.userId || doc.userId === filter.userId) &&
            (!filter.id || doc.id === filter.id),
        ) || null
      );
    },
    updateOne: async (filter: any, update: any, options?: any) => {
      assertNoUpdateConflict(update);
      const idx = goalsStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.id === filter.id,
      );
      if (idx >= 0) {
        goalsStore[idx] = { ...goalsStore[idx], ...update.$set, updatedAt: new Date() };
      } else if (options?.upsert) {
        goalsStore.push({ ...update.$setOnInsert, ...update.$set, updatedAt: new Date() });
      }
      return { acknowledged: true };
    },
    deleteOne: async (filter: any) => {
      const initialLength = goalsStore.length;
      goalsStore = goalsStore.filter(
        (doc) => !(doc.userId === filter.userId && doc.id === filter.id),
      );
      return { deletedCount: initialLength - goalsStore.length };
    },
  };

  const mockInvestmentsCol = {
    find: (filter: any) => ({
      sort: () => ({
        toArray: async () =>
          investmentsStore.filter((doc) => !filter.userId || doc.userId === filter.userId),
      }),
    }),
    findOne: async (filter: any) => {
      return (
        investmentsStore.find(
          (doc) =>
            (!filter.userId || doc.userId === filter.userId) &&
            (!filter.id || doc.id === filter.id),
        ) || null
      );
    },
    updateOne: async (filter: any, update: any, options?: any) => {
      assertNoUpdateConflict(update);
      const idx = investmentsStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.id === filter.id,
      );
      if (idx >= 0) {
        investmentsStore[idx] = { ...investmentsStore[idx], ...update.$set, updatedAt: new Date() };
      } else if (options?.upsert) {
        investmentsStore.push({ ...update.$setOnInsert, ...update.$set, updatedAt: new Date() });
      }
      return { acknowledged: true };
    },
    deleteOne: async (filter: any) => {
      const initialLength = investmentsStore.length;
      investmentsStore = investmentsStore.filter(
        (doc) => !(doc.userId === filter.userId && doc.id === filter.id),
      );
      return { deletedCount: initialLength - investmentsStore.length };
    },
  };

  const mockCfoCol = {
    find: (filter: any) => ({
      sort: () => ({
        toArray: async () =>
          cfoScenariosStore.filter((doc) => !filter.userId || doc.userId === filter.userId),
      }),
    }),
    findOne: async (filter: any) => {
      return (
        cfoScenariosStore.find(
          (doc) =>
            (!filter.userId || doc.userId === filter.userId) &&
            (!filter.id || doc.id === filter.id),
        ) || null
      );
    },
    updateOne: async (filter: any, update: any, options?: any) => {
      assertNoUpdateConflict(update);
      const idx = cfoScenariosStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.id === filter.id,
      );
      if (idx >= 0) {
        cfoScenariosStore[idx] = {
          ...cfoScenariosStore[idx],
          ...update.$set,
          updatedAt: new Date(),
        };
      } else if (options?.upsert) {
        cfoScenariosStore.push({ ...update.$setOnInsert, ...update.$set, updatedAt: new Date() });
      }
      return { acknowledged: true };
    },
    deleteOne: async (filter: any) => {
      const initialLength = cfoScenariosStore.length;
      cfoScenariosStore = cfoScenariosStore.filter(
        (doc) => !(doc.userId === filter.userId && doc.id === filter.id),
      );
      return { deletedCount: initialLength - cfoScenariosStore.length };
    },
  };

  let expensesStore: any[] = [];
  let budgetsStore: any[] = [];
  let categoriesStore: any[] = [];

  const mockExpensesCol = {
    find: (filter: any) => ({
      sort: () => ({
        toArray: async () =>
          expensesStore.filter((doc) => {
            if (filter.userId && doc.userId !== filter.userId) return false;
            if (filter.date?.$regex) {
              const reg = new RegExp(filter.date.$regex);
              if (!reg.test(doc.date)) return false;
            }
            return true;
          }),
      }),
    }),
    findOne: async (filter: any) => {
      return (
        expensesStore.find(
          (doc) =>
            (!filter.userId || doc.userId === filter.userId) &&
            (!filter.id || doc.id === filter.id),
        ) || null
      );
    },
    countDocuments: async (filter: any) => {
      return expensesStore.filter((doc) => {
        if (filter.userId && doc.userId !== filter.userId) return false;
        if (filter.category && doc.category !== filter.category) return false;
        return true;
      }).length;
    },
    updateOne: async (filter: any, update: any, options?: any) => {
      assertNoUpdateConflict(update);
      const idx = expensesStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.id === filter.id,
      );
      if (idx >= 0) {
        expensesStore[idx] = {
          ...expensesStore[idx],
          ...update.$set,
          updatedAt: new Date(),
        };
      } else if (options?.upsert) {
        expensesStore.push({ ...update.$setOnInsert, ...update.$set, updatedAt: new Date() });
      }
      return { acknowledged: true };
    },
    deleteOne: async (filter: any) => {
      const initialLength = expensesStore.length;
      expensesStore = expensesStore.filter(
        (doc) => !(doc.userId === filter.userId && doc.id === filter.id),
      );
      return { deletedCount: initialLength - expensesStore.length };
    },
  };

  const mockBudgetsCol = {
    find: (filter: any) => ({
      sort: () => ({
        toArray: async () =>
          budgetsStore.filter((doc) => !filter.userId || doc.userId === filter.userId),
      }),
    }),
    findOne: async (filter: any) => {
      return (
        budgetsStore.find(
          (doc) =>
            (!filter.userId || doc.userId === filter.userId) &&
            (!filter.month || doc.month === filter.month),
        ) || null
      );
    },
    updateOne: async (filter: any, update: any, options?: any) => {
      assertNoUpdateConflict(update);
      const idx = budgetsStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.month === filter.month,
      );
      if (idx >= 0) {
        budgetsStore[idx] = {
          ...budgetsStore[idx],
          ...update.$set,
          updatedAt: new Date(),
        };
      } else if (options?.upsert) {
        budgetsStore.push({ ...update.$setOnInsert, ...update.$set, updatedAt: new Date() });
      }
      return { acknowledged: true };
    },
    deleteOne: async (filter: any) => {
      const initialLength = budgetsStore.length;
      budgetsStore = budgetsStore.filter(
        (doc) => !(doc.userId === filter.userId && doc.month === filter.month),
      );
      return { deletedCount: initialLength - budgetsStore.length };
    },
  };

  const mockCategoriesCol = {
    find: (filter: any) => ({
      sort: () => ({
        toArray: async () =>
          categoriesStore.filter((doc) => !filter.userId || doc.userId === filter.userId),
      }),
    }),
    findOne: async (filter: any) => {
      return (
        categoriesStore.find((doc) => {
          if (filter.userId && doc.userId !== filter.userId) return false;
          if (filter.id && doc.id !== filter.id) return false;
          if (filter.name?.$regex) {
            return filter.name.$regex.test(doc.name);
          }
          if (filter.name && doc.name !== filter.name) return false;
          return true;
        }) || null
      );
    },
    updateOne: async (filter: any, update: any, options?: any) => {
      assertNoUpdateConflict(update);
      const idx = categoriesStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.id === filter.id,
      );
      if (idx >= 0) {
        categoriesStore[idx] = {
          ...categoriesStore[idx],
          ...update.$set,
          updatedAt: new Date(),
        };
      } else if (options?.upsert) {
        categoriesStore.push({ ...update.$setOnInsert, ...update.$set, updatedAt: new Date() });
      }
      return { acknowledged: true };
    },
    deleteOne: async (filter: any) => {
      const initialLength = categoriesStore.length;
      categoriesStore = categoriesStore.filter(
        (doc) => !(doc.userId === filter.userId && doc.id === filter.id),
      );
      return { deletedCount: initialLength - categoriesStore.length };
    },
  };

  beforeEach(() => {
    goalsStore = [];
    investmentsStore = [];
    cfoScenariosStore = [];
    expensesStore = [];
    budgetsStore = [];
    categoriesStore = [];
    vi.restoreAllMocks();

    vi.spyOn(mongodb, "getGoalsCollection").mockResolvedValue(mockGoalsCol as any);
    vi.spyOn(mongodb, "getInvestmentsCollection").mockResolvedValue(mockInvestmentsCol as any);
    vi.spyOn(mongodb, "getCFOScenariosCollection").mockResolvedValue(mockCfoCol as any);
    vi.spyOn(mongodb, "getExpensesCollection").mockResolvedValue(mockExpensesCol as any);
    vi.spyOn(mongodb, "getBudgetsCollection").mockResolvedValue(mockBudgetsCol as any);
    vi.spyOn(mongodb, "getCategoriesCollection").mockResolvedValue(mockCategoriesCol as any);
  });

  describe("Public Configuration Endpoint", () => {
    it("returns Supabase configuration status via GET /api/auth/config", async () => {
      const req = new Request("http://localhost/api/auth/config", { method: "GET" });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty("configured");
      expect(data).toHaveProperty("supabaseUrl");
      expect(data).toHaveProperty("supabaseAnonKey");
    });

    it("handles CORS OPTIONS preflight request", async () => {
      const req = new Request("http://localhost/api/goals", { method: "OPTIONS" });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
  });

  describe("Authentication Guard & Token Verification", () => {
    it("rejects request without Authorization header with 401", async () => {
      const req = new Request("http://localhost/api/goals", { method: "GET" });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toContain("Authentication token is required");
    });

    it("rejects malformed Authorization header with 401", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "GET",
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });
      const res = await handleApiRequest(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toContain("Invalid authorization format");
    });
  });

  describe("Goal Planner CRUD & Invariant Enforcement", () => {
    const userA = { userId: "user-alpha-123", email: "alpha@example.com", user: {} as any };
    const userB = { userId: "user-bravo-456", email: "bravo@example.com", user: {} as any };

    beforeEach(() => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);
    });

    it("creates a goal and enforces server-side calculation of saved amount", async () => {
      const goalPayload = {
        name: "Emergency Fund",
        target: 100000,
        initialSaved: 20000,
        // Client attempts to claim saved is 999999 (tampering), server must enforce initialSaved + contributions
        saved: 999999,
        contributions: [
          { id: "c1", amount: 5000, date: "2026-10-01", reference: "Oct deposit" },
          { id: "c2", amount: 7500, date: "2026-10-10", reference: "Bonus" },
        ],
        monthly: 5000,
        startDate: "2026-10-01",
        endDate: "2027-10-01",
        durationMonths: 12,
      };

      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token-alpha",
        },
        body: JSON.stringify(goalPayload),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.goal.name).toBe("Emergency Fund");
      // 20000 (initial) + 5000 + 7500 = 32500, NOT 999999!
      expect(data.goal.saved).toBe(32500);
      expect(data.goal.contributions).toHaveLength(2);
    });

    it("rejects goal creation with non-positive target amount", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          name: "Invalid Goal",
          target: -500,
          startDate: "2026-10-01",
          endDate: "2027-10-01",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Target amount must be a positive number");
    });

    it("rejects goal creation with empty name", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          name: "   ",
          target: 10000,
          startDate: "2026-10-01",
          endDate: "2027-10-01",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Goal name is required");
    });

    it("adds a contribution and recalculates total saved", async () => {
      // First create a goal
      goalsStore.push({
        userId: userA.userId,
        id: "goal-1",
        name: "Car Fund",
        target: 500000,
        initialSaved: 50000,
        saved: 50000,
        contributions: [],
        monthly: 10000,
        startDate: "2026-10-01",
        endDate: "2027-10-01",
        durationMonths: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new Request("http://localhost/api/goals/goal-1/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          id: "c-new",
          amount: 15000,
          date: "2026-10-15",
          reference: "Festival Bonus",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.goal.contributions).toHaveLength(1);
      expect(data.goal.saved).toBe(65000); // 50000 + 15000
    });

    it("deletes a contribution and recalculates total saved", async () => {
      goalsStore.push({
        userId: userA.userId,
        id: "goal-1",
        name: "Car Fund",
        target: 500000,
        initialSaved: 50000,
        saved: 70000,
        contributions: [
          { id: "c1", amount: 10000, date: "2026-10-01" },
          { id: "c2", amount: 10000, date: "2026-10-10" },
        ],
        monthly: 10000,
        startDate: "2026-10-01",
        endDate: "2027-10-01",
        durationMonths: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new Request("http://localhost/api/goals/goal-1/contributions/c1", {
        method: "DELETE",
        headers: { Authorization: "Bearer valid-token" },
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.goal.contributions).toHaveLength(1);
      expect(data.goal.contributions[0].id).toBe("c2");
      expect(data.goal.saved).toBe(60000); // 50000 + 10000
    });

    it("enforces IDOR isolation: User B cannot access or modify User A's goal", async () => {
      goalsStore.push({
        userId: userA.userId,
        id: "goal-private-a",
        name: "User A Private Goal",
        target: 100000,
        initialSaved: 10000,
        saved: 10000,
        contributions: [],
        monthly: 5000,
        startDate: "2026-10-01",
        endDate: "2027-10-01",
        durationMonths: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Switch context to User B
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userB);

      // User B attempts to GET User A's goal
      const getReq = new Request("http://localhost/api/goals/goal-private-a", {
        method: "GET",
        headers: { Authorization: "Bearer token-user-b" },
      });
      const getRes = await handleApiRequest(getReq);
      expect(getRes.status).toBe(404);

      // User B attempts to DELETE User A's goal
      const delReq = new Request("http://localhost/api/goals/goal-private-a", {
        method: "DELETE",
        headers: { Authorization: "Bearer token-user-b" },
      });
      const delRes = await handleApiRequest(delReq);
      expect(delRes.status).toBe(404);

      // Verify the goal is still intact for User A
      expect(goalsStore.find((g) => g.id === "goal-private-a")).toBeDefined();
    });

    it("idempotently imports legacy goals from localStorage payload", async () => {
      const legacyGoals = [
        {
          id: "legacy-g1",
          name: "Trip to Goa",
          target: 40000,
          initialSaved: 5000,
          contributions: [{ id: "lc1", amount: 5000, date: "2026-09-01" }],
          monthly: 3000,
          startDate: "2026-09-01",
          endDate: "2027-03-01",
          durationMonths: 6,
        },
        {
          id: "legacy-g2",
          name: "New Laptop",
          target: 80000,
          initialSaved: 10000,
          contributions: [],
          monthly: 10000,
          startDate: "2026-10-01",
          endDate: "2027-05-01",
          durationMonths: 7,
        },
      ];

      const req = new Request("http://localhost/api/goals/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({ goals: legacyGoals }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.importedCount).toBe(2);
      expect(data.goals[0].saved).toBe(10000); // 5000 + 5000
    });
  });

  describe("Investment Calculator Scenario Persistence", () => {
    const userA = { userId: "user-alpha-123", email: "alpha@example.com", user: {} as any };
    const userB = { userId: "user-bravo-456", email: "bravo@example.com", user: {} as any };

    beforeEach(() => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);
    });

    it("saves and retrieves an investment scenario", async () => {
      const scenarioPayload = {
        title: "Retirement SIP Strategy",
        type: "sip",
        mode: "sip",
        inputs: { monthly: 15000, rate: 12, years: 15, months: 0 },
        results: { invested: 2700000, returns: 4868846, total: 7568846 },
        notes: "Long term equity mutual fund",
      };

      const saveReq = new Request("http://localhost/api/investments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify(scenarioPayload),
      });

      const saveRes = await handleApiRequest(saveReq);
      expect(saveRes.status).toBe(201);
      const savedData = await saveRes.json();
      expect(savedData.success).toBe(true);
      expect(savedData.investment.title).toBe("Retirement SIP Strategy");
      expect(savedData.investment.id).toBeDefined();

      // Retrieve list
      const listReq = new Request("http://localhost/api/investments", {
        method: "GET",
        headers: { Authorization: "Bearer valid-token" },
      });
      const listRes = await handleApiRequest(listReq);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.investments).toHaveLength(1);
      expect(listData.investments[0].title).toBe("Retirement SIP Strategy");
    });

    it("deletes an investment scenario and prevents cross-user deletion", async () => {
      investmentsStore.push({
        userId: userA.userId,
        id: "inv-alpha-1",
        title: "Alpha SIP",
        type: "sip",
        inputs: {},
        results: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // User B attempts to delete User A's investment scenario
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userB);
      const delReqB = new Request("http://localhost/api/investments/inv-alpha-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer token-user-b" },
      });
      const delResB = await handleApiRequest(delReqB);
      expect(delResB.status).toBe(404);
      expect(investmentsStore).toHaveLength(1);

      // User A deletes own scenario
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);
      const delReqA = new Request("http://localhost/api/investments/inv-alpha-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer token-user-a" },
      });
      const delResA = await handleApiRequest(delReqA);
      expect(delResA.status).toBe(200);
      expect(investmentsStore).toHaveLength(0);
    });
  });

  describe("CFO Scenarios CRUD & Security (IDOR Prevention)", () => {
    const userA = { userId: "user-alpha-123", email: "alpha@example.com", user: {} as any };
    const userB = { userId: "user-bravo-456", email: "bravo@example.com", user: {} as any };

    beforeEach(() => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);
    });

    it("creates, retrieves, and lists a CFO hiring scenario for authenticated user", async () => {
      const scenarioPayload = {
        title: "Q4 Engineering Expansion",
        type: "hire",
        modelVersion: "1.0.0",
        currency: "INR",
        inputs: {
          roles: [
            { id: "r1", title: "Senior Backend Engineer", headcount: 2, monthlySalary: 120000 },
          ],
          budgetAmount: 300000,
          budgetPeriod: "monthly_cap",
          durationMonths: 12,
        },
        results: {
          initialMonthlyPayroll: 240000,
          cumulativePayrollCost: 2880000,
          isWithinBudget: true,
        },
      };

      const postReq = new Request("http://localhost/api/cfo-scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify(scenarioPayload),
      });

      const postRes = await handleApiRequest(postReq);
      expect(postRes.status).toBe(201);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);
      expect(postData.scenario.title).toBe("Q4 Engineering Expansion");
      expect(postData.scenario.modelVersion).toBe("1.0.0");
      expect(postData.scenario.id).toBeDefined();

      const createdId = postData.scenario.id;

      // GET single scenario
      const getReq = new Request(`http://localhost/api/cfo-scenarios/${createdId}`, {
        method: "GET",
        headers: { Authorization: "Bearer valid-token" },
      });
      const getRes = await handleApiRequest(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.scenario.id).toBe(createdId);
      expect(getData.scenario.title).toBe("Q4 Engineering Expansion");

      // GET all scenarios
      const listReq = new Request("http://localhost/api/cfo-scenarios", {
        method: "GET",
        headers: { Authorization: "Bearer valid-token" },
      });
      const listRes = await handleApiRequest(listReq);
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.scenarios).toHaveLength(1);
      expect(listData.scenarios[0].title).toBe("Q4 Engineering Expansion");
    });

    it("rejects creation when scenario title is missing", async () => {
      const invalidPayload = {
        title: "",
        type: "hire",
        inputs: {},
      };

      const postReq = new Request("http://localhost/api/cfo-scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify(invalidPayload),
      });

      const postRes = await handleApiRequest(postReq);
      expect(postRes.status).toBe(400);
      const data = await postRes.json();
      expect(data.error).toContain("Scenario title is required");
    });

    it("enforces strict user scoping (IDOR prevention) on GET and DELETE", async () => {
      cfoScenariosStore.push({
        userId: userA.userId,
        id: "cfo-alpha-1",
        title: "Alpha Expansion Plan",
        type: "hire",
        modelVersion: "1.0.0",
        currency: "INR",
        inputs: {},
        results: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // User B tries to GET User A's scenario
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userB);
      const getReqB = new Request("http://localhost/api/cfo-scenarios/cfo-alpha-1", {
        method: "GET",
        headers: { Authorization: "Bearer token-user-b" },
      });
      const getResB = await handleApiRequest(getReqB);
      expect(getResB.status).toBe(404);

      // User B tries to DELETE User A's scenario
      const delReqB = new Request("http://localhost/api/cfo-scenarios/cfo-alpha-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer token-user-b" },
      });
      const delResB = await handleApiRequest(delReqB);
      expect(delResB.status).toBe(404);
      expect(cfoScenariosStore).toHaveLength(1);

      // User A deletes own scenario
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);
      const delReqA = new Request("http://localhost/api/cfo-scenarios/cfo-alpha-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer token-user-a" },
      });
      const delResA = await handleApiRequest(delReqA);
      expect(delResA.status).toBe(200);
      expect(cfoScenariosStore).toHaveLength(0);
    });
  });

  describe("Expenses Protected Endpoints", () => {
    const userA = { userId: "user-alpha", email: "alpha@example.com", user: {} as any };

    it("rejects unauthenticated requests with 401", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockRejectedValue(
        new serverAuth.AuthError("Missing or invalid Authorization header", 401),
      );

      const getReq = new Request("http://localhost/api/expenses", { method: "GET" });
      const getRes = await handleApiRequest(getReq);
      expect(getRes.status).toBe(401);

      const postReq = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Test", amount: 100, category: "Food", date: "2026-10-01" }),
      });
      const postRes = await handleApiRequest(postReq);
      expect(postRes.status).toBe(401);
    });

    it("validates expense input and rejects invalid payloads with 400", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      // Negative amount
      const req1 = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ description: "Invalid", amount: -50, category: "Food", date: "2026-10-01" }),
      });
      expect((await handleApiRequest(req1)).status).toBe(400);

      // More than 2 decimal places
      const req2 = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ description: "Invalid", amount: 10.999, category: "Food", date: "2026-10-01" }),
      });
      expect((await handleApiRequest(req2)).status).toBe(400);

      // Empty description
      const req3 = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ description: "", amount: 100, category: "Food", date: "2026-10-01" }),
      });
      expect((await handleApiRequest(req3)).status).toBe(400);

      // Invalid date
      const req4 = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ description: "Valid", amount: 100, category: "Food", date: "not-a-date" }),
      });
      expect((await handleApiRequest(req4)).status).toBe(400);
    });

    it("performs full CRUD on expenses with month filtering and integer paise arithmetic", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      // Create
      const postReq = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({
          description: "Grocery run",
          amount: 1250.5,
          category: "Food",
          date: "2026-10-15",
          note: "Weekly market",
        }),
      });
      const postRes = await handleApiRequest(postReq);
      expect(postRes.status).toBe(201);
      const postBody = await postRes.json();
      expect(postBody.expense.description).toBe("Grocery run");
      expect(postBody.expense.amount).toBe(1250.5);
      expect(postBody.expense.amountPaise).toBe(125050);
      const expenseId = postBody.expense.id;

      // Filter by month
      const getOctReq = new Request("http://localhost/api/expenses?month=2026-10", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
      const getOctRes = await handleApiRequest(getOctReq);
      expect(getOctRes.status).toBe(200);
      const getOctBody = await getOctRes.json();
      expect(getOctBody.expenses).toHaveLength(1);

      const getNovReq = new Request("http://localhost/api/expenses?month=2026-11", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
      const getNovRes = await handleApiRequest(getNovReq);
      expect((await getNovRes.json()).expenses).toHaveLength(0);

      // Update
      const putReq = new Request(`http://localhost/api/expenses/${expenseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ amount: 1500 }),
      });
      const putRes = await handleApiRequest(putReq);
      expect(putRes.status).toBe(200);
      const putBody = await putRes.json();
      expect(putBody.expense.amount).toBe(1500);
      expect(putBody.expense.amountPaise).toBe(150000);

      // Delete
      const delReq = new Request(`http://localhost/api/expenses/${expenseId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer token" },
      });
      const delRes = await handleApiRequest(delReq);
      expect(delRes.status).toBe(200);
      expect(expensesStore).toHaveLength(0);
    });
  });

  describe("Budgets Protected Endpoints", () => {
    const userA = { userId: "user-alpha", email: "alpha@example.com", user: {} as any };

    it("saves and retrieves monthly budget plans with take-home income and category limits", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      const putReq = new Request("http://localhost/api/budgets/2026-10", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({
          income: 50000,
          limits: { Food: 15000, Transport: 5000 },
        }),
      });
      const putRes = await handleApiRequest(putReq);
      expect(putRes.status).toBe(200);
      const putBody = await putRes.json();
      expect(putBody.budget.month).toBe("2026-10");
      expect(putBody.budget.income).toBe(50000);
      expect(putBody.budget.limits.Food).toBe(15000);

      // Retrieve by month
      const getReq = new Request("http://localhost/api/budgets?month=2026-10", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
      const getRes = await handleApiRequest(getReq);
      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.budget.income).toBe(50000);
      expect(getBody.budget.limits.Food).toBe(15000);

      // Retrieve non-existent month returns default empty structure
      const getEmptyReq = new Request("http://localhost/api/budgets?month=2026-05", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
      const getEmptyRes = await handleApiRequest(getEmptyReq);
      expect(getEmptyRes.status).toBe(200);
      const getEmptyBody = await getEmptyRes.json();
      expect(getEmptyBody.budget.month).toBe("2026-05");
      expect(getEmptyBody.budget.limits).toEqual({});
    });

    it("rejects invalid month format and negative income with 400", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      const req1 = new Request("http://localhost/api/budgets/bad-month", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ income: 50000, limits: {} }),
      });
      expect((await handleApiRequest(req1)).status).toBe(400);

      const req2 = new Request("http://localhost/api/budgets/2026-10", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ income: -100, limits: {} }),
      });
      expect((await handleApiRequest(req2)).status).toBe(400);
    });
  });

  describe("Categories Protected Endpoints & In-Use Safety", () => {
    const userA = { userId: "user-alpha", email: "alpha@example.com", user: {} as any };

    it("creates custom categories and prevents duplicate case-insensitive names", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      const postReq1 = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ name: "Gym & Fitness" }),
      });
      const postRes1 = await handleApiRequest(postReq1);
      expect(postRes1.status).toBe(201);
      const cat1 = (await postRes1.json()).category;
      expect(cat1.name).toBe("Gym & Fitness");

      // Attempt duplicate with different casing
      const postReq2 = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ name: "gym & fitness" }),
      });
      const postRes2 = await handleApiRequest(postReq2);
      expect(postRes2.status).toBe(409);
    });

    it("prevents deleting a category in use by active expenses (Requirement 5)", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      // Create category "Freelance"
      const postCatReq = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ id: "cat-freelance", name: "Freelance" }),
      });
      await handleApiRequest(postCatReq);

      // Create an expense assigned to "Freelance"
      const postExpReq = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({
          id: "exp-client-1",
          description: "Client hosting",
          amount: 500,
          category: "Freelance",
          date: "2026-10-10",
        }),
      });
      await handleApiRequest(postExpReq);

      // Attempt to DELETE category "Freelance" -> MUST REJECT (cannot orphan past transactions!)
      const delCatReq = new Request("http://localhost/api/categories/cat-freelance", {
        method: "DELETE",
        headers: { Authorization: "Bearer token" },
      });
      const delCatRes = await handleApiRequest(delCatReq);
      expect(delCatRes.status).toBe(400);
      const delCatErr = await delCatRes.json();
      expect(delCatErr.error).toContain("Cannot delete category");
      expect(delCatErr.error).toContain("1 expense transaction(s) are currently assigned");

      // Now delete the expense
      const delExpReq = new Request("http://localhost/api/expenses/exp-client-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer token" },
      });
      await handleApiRequest(delExpReq);

      // Deleting category now succeeds!
      const delCatRes2 = await handleApiRequest(delCatReq);
      expect(delCatRes2.status).toBe(200);
      expect(categoriesStore).toHaveLength(0);
    });
  });

  describe("User Isolation & IDOR Protection across Expenses & Budgets", () => {
    const userA = { userId: "user-alpha", email: "alpha@example.com", user: {} as any };
    const userB = { userId: "user-beta", email: "beta@example.com", user: {} as any };

    it("enforces strict user isolation on expenses and budgets", async () => {
      // User A creates an expense and budget
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);
      await handleApiRequest(
        new Request("http://localhost/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer token-a" },
          body: JSON.stringify({ id: "exp-a", description: "Alpha Groceries", amount: 1000, category: "Food", date: "2026-10-01" }),
        }),
      );
      await handleApiRequest(
        new Request("http://localhost/api/budgets/2026-10", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: "Bearer token-a" },
          body: JSON.stringify({ income: 80000, limits: { Food: 20000 } }),
        }),
      );

      // User B cannot view User A's expenses
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userB);
      const listReqB = new Request("http://localhost/api/expenses", {
        method: "GET",
        headers: { Authorization: "Bearer token-b" },
      });
      const listResB = await handleApiRequest(listReqB);
      expect((await listResB.json()).expenses).toHaveLength(0);

      // User B cannot update User A's expense
      const putReqB = new Request("http://localhost/api/expenses/exp-a", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token-b" },
        body: JSON.stringify({ amount: 99999 }),
      });
      expect((await handleApiRequest(putReqB)).status).toBe(404);

      // User B cannot delete User A's expense
      const delExpReqB = new Request("http://localhost/api/expenses/exp-a", {
        method: "DELETE",
        headers: { Authorization: "Bearer token-b" },
      });
      expect((await handleApiRequest(delExpReqB)).status).toBe(404);
      expect(expensesStore).toHaveLength(1);

      // User B cannot delete User A's budget
      const delBudReqB = new Request("http://localhost/api/budgets/2026-10", {
        method: "DELETE",
        headers: { Authorization: "Bearer token-b" },
      });
      expect((await handleApiRequest(delBudReqB)).status).toBe(404);
      expect(budgetsStore).toHaveLength(1);
    });
  });

  describe("Batch Import Endpoints", () => {
    const userA = { userId: "user-alpha", email: "alpha@example.com", user: {} as any };

    it("imports offline expense records and budget plans idempotently", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      // Import expenses
      const importExpReq = new Request("http://localhost/api/expenses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({
          expenses: [
            { id: "imp-1", description: "Import 1", amount: 100, category: "Food", date: "2026-10-01" },
            { id: "imp-2", description: "Import 2", amount: 200, category: "Transport", date: "2026-10-02" },
          ],
        }),
      });
      const importExpRes = await handleApiRequest(importExpReq);
      expect(importExpRes.status).toBe(200);
      const importExpBody = await importExpRes.json();
      expect(importExpBody.importedCount).toBe(2);

      // Import budgets
      const importBudReq = new Request("http://localhost/api/budgets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({
          budgets: [
            { month: "2026-10", income: 50000, limits: { Food: 15000 } },
            { month: "2026-11", income: 52000, limits: { Food: 16000 } },
          ],
        }),
      });
      const importBudRes = await handleApiRequest(importBudReq);
      expect(importBudRes.status).toBe(200);
      expect((await importBudRes.json()).importedCount).toBe(2);
    });
  });

  describe("Investment Response Wrapper Handling (FEAT-004)", () => {
    const userA = { userId: "user-alpha", email: "alpha@example.com", user: {} as any };

    it("returns investments in { investments: [...] } wrapper format", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      // Create test investment
      const createReq = new Request("http://localhost/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({
          title: "Test SIP",
          type: "sip",
          inputs: { monthly: 5000, rate: 12, years: 10 },
          results: { total: 1162695 },
        }),
      });
      await handleApiRequest(createReq);

      // Verify GET returns wrapper format
      const getReq = new Request("http://localhost/api/investments", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
      const getRes = await handleApiRequest(getReq);
      expect(getRes.status).toBe(200);

      const body = await getRes.json();

      // CRITICAL: Response MUST be an object with "investments" key, not a bare array
      expect(body).toHaveProperty("investments");
      expect(Array.isArray(body.investments)).toBe(true);
      expect(body.investments).toHaveLength(1);
      expect(body.investments[0].title).toBe("Test SIP");
    });

    it("client must extract .investments from response wrapper", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      investmentsStore.push({
        userId: userA.userId,
        id: "inv-1",
        title: "Scenario 1",
        type: "sip",
        inputs: {},
        results: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new Request("http://localhost/api/investments", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
      const res = await handleApiRequest(req);
      const data = await res.json();

      // Simulating client-side extraction
      const investments = data.investments;
      expect(Array.isArray(investments)).toBe(true);
      expect(investments[0].title).toBe("Scenario 1");
    });

    it("handles empty investments array in wrapper format", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue(userA);

      const req = new Request("http://localhost/api/investments", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
      const res = await handleApiRequest(req);
      const data = await res.json();

      expect(data).toHaveProperty("investments");
      expect(Array.isArray(data.investments)).toBe(true);
      expect(data.investments).toHaveLength(0);
    });
  });

  describe("401 Unauthorized Access Protection (FEAT-004)", () => {
    it("returns 401 when accessing /api/goals without Authorization header", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "GET",
      });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Authentication token is required");
    });

    it("returns 401 when creating goal without Authorization header", async () => {
      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Goal",
          target: 10000,
          startDate: "2026-10-01",
          endDate: "2027-10-01",
        }),
      });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("returns 401 when accessing /api/investments without token", async () => {
      const req = new Request("http://localhost/api/investments", {
        method: "GET",
      });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when accessing /api/expenses without token", async () => {
      const req = new Request("http://localhost/api/expenses", {
        method: "GET",
      });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 with invalid Bearer token format", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockRejectedValue(
        new serverAuth.AuthError("Invalid authorization format", 401),
      );

      const req = new Request("http://localhost/api/goals", {
        method: "GET",
        headers: { Authorization: "InvalidFormat" },
      });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when token is expired or invalid", async () => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockRejectedValue(
        new serverAuth.AuthError("Invalid or expired authentication session", 401),
      );

      const req = new Request("http://localhost/api/goals", {
        method: "GET",
        headers: { Authorization: "Bearer expired-or-invalid-token" },
      });
      const res = await handleApiRequest(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("expired");
    });
  });

  describe("MongoDB Upsert Conflict Prevention & createdAt Preservation", () => {
    beforeEach(() => {
      vi.spyOn(serverAuth, "verifyAuthToken").mockResolvedValue({
        userId: "test-user-id",
        email: "test@example.com",
        user: {} as any,
      });
    });

    it("rejects an update document that sets the same field in both $set and $setOnInsert", async () => {
      await expect(
        mockGoalsCol.updateOne(
          { userId: "u1", id: "g1" },
          {
            $set: { name: "Test", createdAt: new Date() },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        ),
      ).rejects.toThrow(
        "MongoServerError: Updating the path 'createdAt' would create a conflict at 'createdAt'",
      );
    });

    it("saves and updates goals while preserving original createdAt and excluding it from $set", async () => {
      const initialDate = new Date("2026-01-01T00:00:00.000Z");
      // Seed existing goal
      goalsStore.push({
        userId: "test-user-id",
        id: "goal-preserve-1",
        name: "Old Goal",
        target: 50000,
        saved: 10000,
        initialSaved: 10000,
        contributions: [],
        monthly: 5000,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        durationMonths: 12,
        createdAt: initialDate,
        updatedAt: initialDate,
      });

      const req = new Request("http://localhost/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          id: "goal-preserve-1",
          name: "Updated Goal",
          target: 60000,
          initialSaved: 10000,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.goal.name).toBe("Updated Goal");
      expect(new Date(body.goal.createdAt).toISOString()).toBe(initialDate.toISOString());

      // Confirm in store that createdAt was not overwritten
      const stored = goalsStore.find((g) => g.id === "goal-preserve-1");
      expect(stored.createdAt.toISOString()).toBe(initialDate.toISOString());
      expect(stored.name).toBe("Updated Goal");
    });

    it("imports goals without createdAt conflicts", async () => {
      const req = new Request("http://localhost/api/goals/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          goals: [
            {
              id: "import-goal-1",
              name: "Imported Goal",
              target: 25000,
              initialSaved: 5000,
              startDate: "2026-02-01",
              endDate: "2026-08-01",
            },
          ],
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.importedCount).toBe(1);

      const stored = goalsStore.find((g) => g.id === "import-goal-1");
      expect(stored).toBeDefined();
      expect(stored.createdAt).toBeDefined();
    });

    it("saves and updates expenses while preserving original createdAt and excluding it from $set", async () => {
      const initialDate = new Date("2026-01-01T00:00:00.000Z");
      expensesStore.push({
        userId: "test-user-id",
        id: "exp-preserve-1",
        description: "Old Expense",
        amount: 1500,
        amountPaise: 150000,
        category: "Food",
        date: "2026-03-01",
        createdAt: initialDate,
        updatedAt: initialDate,
      });

      const req = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          id: "exp-preserve-1",
          description: "Updated Expense",
          amount: 2000,
          category: "Groceries",
          date: "2026-03-02",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.expense.description).toBe("Updated Expense");
      expect(new Date(body.expense.createdAt).toISOString()).toBe(initialDate.toISOString());

      const stored = expensesStore.find((e) => e.id === "exp-preserve-1");
      expect(stored.createdAt.toISOString()).toBe(initialDate.toISOString());
      expect(stored.description).toBe("Updated Expense");
    });

    it("imports expenses without createdAt conflicts", async () => {
      const req = new Request("http://localhost/api/expenses/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          expenses: [
            {
              id: "import-exp-1",
              description: "Bulk Item",
              amount: 500,
              category: "Utilities",
              date: "2026-04-10",
            },
          ],
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.importedCount).toBe(1);

      const stored = expensesStore.find((e) => e.id === "import-exp-1");
      expect(stored).toBeDefined();
      expect(stored.createdAt).toBeDefined();
    });

    it("saves and updates budgets while preserving original createdAt and excluding it from $set", async () => {
      const initialDate = new Date("2026-01-01T00:00:00.000Z");
      budgetsStore.push({
        userId: "test-user-id",
        month: "2026-05",
        income: 80000,
        incomePaise: 8000000,
        limits: { Food: 15000 },
        limitsPaise: { Food: 1500000 },
        createdAt: initialDate,
        updatedAt: initialDate,
      });

      const req = new Request("http://localhost/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          month: "2026-05",
          income: 90000,
          limits: { Food: 18000, Rent: 25000 },
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.budget.income).toBe(90000);
      expect(new Date(body.budget.createdAt).toISOString()).toBe(initialDate.toISOString());

      const stored = budgetsStore.find((b) => b.month === "2026-05");
      expect(stored.createdAt.toISOString()).toBe(initialDate.toISOString());
      expect(stored.income).toBe(90000);
    });

    it("imports budgets without createdAt conflicts", async () => {
      const req = new Request("http://localhost/api/budgets/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          budgets: [
            {
              month: "2026-06",
              income: 75000,
              limits: { Travel: 10000 },
            },
          ],
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.importedCount).toBe(1);

      const stored = budgetsStore.find((b) => b.month === "2026-06");
      expect(stored).toBeDefined();
      expect(stored.createdAt).toBeDefined();
    });

    it("saves and updates investments while preserving original createdAt and excluding it from $set", async () => {
      const initialDate = new Date("2026-01-01T00:00:00.000Z");
      investmentsStore.push({
        userId: "test-user-id",
        id: "inv-preserve-1",
        title: "Old Investment",
        type: "sip",
        inputs: { monthly: 5000 },
        results: {},
        createdAt: initialDate,
        updatedAt: initialDate,
      });

      const req = new Request("http://localhost/api/investments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          id: "inv-preserve-1",
          title: "Updated Investment",
          type: "sip",
          inputs: { monthly: 10000 },
          results: { total: 1000000 },
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.investment.title).toBe("Updated Investment");
      expect(new Date(body.investment.createdAt).toISOString()).toBe(initialDate.toISOString());

      const stored = investmentsStore.find((i) => i.id === "inv-preserve-1");
      expect(stored.createdAt.toISOString()).toBe(initialDate.toISOString());
      expect(stored.title).toBe("Updated Investment");
    });

    it("saves and updates CFO scenarios while preserving original createdAt and excluding it from $set", async () => {
      const initialDate = new Date("2026-01-01T00:00:00.000Z");
      cfoScenariosStore.push({
        userId: "test-user-id",
        id: "cfo-preserve-1",
        title: "Old CFO Scenario",
        type: "hire",
        modelVersion: "1.0.0",
        currency: "INR",
        inputs: {},
        results: {},
        createdAt: initialDate,
        updatedAt: initialDate,
      });

      const req = new Request("http://localhost/api/cfo-scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          id: "cfo-preserve-1",
          title: "Updated CFO Scenario",
          type: "hire",
          inputs: { roles: [] },
          results: { totalCost: 5000000 },
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.scenario.title).toBe("Updated CFO Scenario");
      expect(new Date(body.scenario.createdAt).toISOString()).toBe(initialDate.toISOString());

      const stored = cfoScenariosStore.find((c) => c.id === "cfo-preserve-1");
      expect(stored.createdAt.toISOString()).toBe(initialDate.toISOString());
      expect(stored.title).toBe("Updated CFO Scenario");
    });

    it("saves and updates categories while preserving original createdAt and excluding it from $set", async () => {
      const initialDate = new Date("2026-01-01T00:00:00.000Z");
      categoriesStore.push({
        userId: "test-user-id",
        id: "cat-preserve-1",
        name: "Old Category",
        createdAt: initialDate,
        updatedAt: initialDate,
      });

      const req = new Request("http://localhost/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          id: "cat-preserve-1",
          name: "Updated Category",
          color: "#FF5733",
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.category.name).toBe("Updated Category");
      expect(new Date(body.category.createdAt).toISOString()).toBe(initialDate.toISOString());

      const stored = categoriesStore.find((c) => c.id === "cat-preserve-1");
      expect(stored.createdAt.toISOString()).toBe(initialDate.toISOString());
      expect(stored.name).toBe("Updated Category");
    });

    it("imports categories without createdAt conflicts", async () => {
      const req = new Request("http://localhost/api/categories/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({
          categories: [
            {
              id: "import-cat-1",
              name: "Imported Category",
            },
          ],
        }),
      });

      const res = await handleApiRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.importedCount).toBe(1);

      const stored = categoriesStore.find((c) => c.id === "import-cat-1");
      expect(stored).toBeDefined();
      expect(stored.createdAt).toBeDefined();
    });
  });
});
