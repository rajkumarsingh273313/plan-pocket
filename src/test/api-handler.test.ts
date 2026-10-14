import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleApiRequest } from "../server/api-handler";
import * as serverAuth from "../lib/server-auth";
import * as mongodb from "../lib/mongodb";

describe("API Handler & Server Endpoints", () => {
  // In-memory mock stores for MongoDB collections
  let goalsStore: any[] = [];
  let investmentsStore: any[] = [];
  let cfoScenariosStore: any[] = [];

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
      const idx = goalsStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.id === filter.id,
      );
      if (idx >= 0) {
        goalsStore[idx] = { ...goalsStore[idx], ...update.$set, updatedAt: new Date() };
      } else if (options?.upsert) {
        goalsStore.push({ ...update.$set, ...update.$setOnInsert, updatedAt: new Date() });
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
      const idx = investmentsStore.findIndex(
        (doc) => doc.userId === filter.userId && doc.id === filter.id,
      );
      if (idx >= 0) {
        investmentsStore[idx] = { ...investmentsStore[idx], ...update.$set, updatedAt: new Date() };
      } else if (options?.upsert) {
        investmentsStore.push({ ...update.$set, ...update.$setOnInsert, updatedAt: new Date() });
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
        cfoScenariosStore.push({ ...update.$set, ...update.$setOnInsert, updatedAt: new Date() });
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

  beforeEach(() => {
    goalsStore = [];
    investmentsStore = [];
    cfoScenariosStore = [];
    vi.restoreAllMocks();

    vi.spyOn(mongodb, "getGoalsCollection").mockResolvedValue(mockGoalsCol as any);
    vi.spyOn(mongodb, "getInvestmentsCollection").mockResolvedValue(mockInvestmentsCol as any);
    vi.spyOn(mongodb, "getCFOScenariosCollection").mockResolvedValue(mockCfoCol as any);
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
});
