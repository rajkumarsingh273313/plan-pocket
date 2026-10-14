import {
  verifyAuthToken,
  AuthError,
  isServerSupabaseConfigured,
  getServerSupabaseConfig,
} from "../lib/server-auth";
import {
  getGoalsCollection,
  getInvestmentsCollection,
  getCFOScenariosCollection,
  getExpensesCollection,
  getBudgetsCollection,
  getCategoriesCollection,
  isMongoConfigured,
  type GoalContributionRecord,
  type GoalDocument,
  type InvestmentScenarioDocument,
  type CFOScenarioDocument,
  type ExpenseDocument,
  type BudgetDocument,
  type CategoryDocument,
} from "../lib/mongodb";
import {
  rupeesToPaise,
  paiseToRupees,
  isValidCurrencyAmount,
  isValidMonthKey,
  isValidIsoDate,
} from "../lib/budget-expenses";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function calculateSaved(initialSaved: number, contributions: GoalContributionRecord[]): number {
  const sum = contributions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  return Number(((Number(initialSaved) || 0) + sum).toFixed(2));
}

function sanitizeGoal(doc: GoalDocument) {
  return {
    id: doc.id,
    name: doc.name,
    target: doc.target,
    saved: doc.saved,
    initialSaved: doc.initialSaved,
    contributions: doc.contributions || [],
    monthly: doc.monthly,
    startDate: doc.startDate,
    endDate: doc.endDate,
    durationMonths: doc.durationMonths,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeInvestment(doc: InvestmentScenarioDocument) {
  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    mode: doc.mode,
    inputs: doc.inputs || {},
    results: doc.results || {},
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeCFOScenario(doc: CFOScenarioDocument) {
  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    modelVersion: doc.modelVersion,
    currency: doc.currency,
    inputs: doc.inputs || {},
    results: doc.results || {},
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeExpense(doc: ExpenseDocument) {
  return {
    id: doc.id,
    description: doc.description,
    amount: doc.amount,
    amountPaise: doc.amountPaise ?? rupeesToPaise(doc.amount),
    category: doc.category,
    date: doc.date,
    note: doc.note,
    type: doc.type,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeBudget(doc: BudgetDocument) {
  return {
    month: doc.month,
    income: doc.income ?? null,
    limits: doc.limits || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function sanitizeCategory(doc: CategoryDocument) {
  return {
    id: doc.id,
    name: doc.name,
    color: doc.color,
    icon: doc.icon,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method.toUpperCase();

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Public config endpoint: returns Supabase public client configuration
  if (path === "/api/auth/config" && method === "GET") {
    const config = getServerSupabaseConfig();
    return jsonResponse({
      configured: isServerSupabaseConfigured(),
      supabaseUrl: config.url || "",
      supabaseAnonKey: config.anonKey || "",
      mongoConfigured: isMongoConfigured(),
    });
  }

  try {
    // All following endpoints require Supabase Auth verification
    const authUser = await verifyAuthToken(request);
    const userId = authUser.userId;

    // --- GOAL PLANNER ENDPOINTS ---

    // GET /api/goals: List all goals for the authenticated user
    if (path === "/api/goals" && method === "GET") {
      const goalsCol = await getGoalsCollection();
      const docs = await goalsCol.find({ userId }).sort({ createdAt: -1 }).toArray();
      return jsonResponse({ goals: docs.map(sanitizeGoal) });
    }

    // POST /api/goals: Create a new goal (or upsert)
    if (path === "/api/goals" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid request body. Expected JSON object.");
      }

      const name = String(body.name || "").trim();
      const target = Number(body.target);
      const initialSaved = Math.max(0, Number(body.initialSaved) || 0);
      const monthly = Math.max(0, Number(body.monthly) || 0);
      const startDate = String(body.startDate || "").trim();
      const endDate = String(body.endDate || "").trim();
      const durationMonths = Math.max(1, Math.round(Number(body.durationMonths) || 1));
      const id = String(body.id || "").trim() || crypto.randomUUID();

      if (!name) {
        return errorResponse("Goal name is required and cannot be empty.");
      }
      if (!Number.isFinite(target) || target <= 0) {
        return errorResponse("Target amount must be a positive number.");
      }
      if (!startDate) {
        return errorResponse("Start date is required.");
      }
      if (!endDate) {
        return errorResponse("End date is required.");
      }

      const rawContributions = Array.isArray(body.contributions) ? body.contributions : [];
      const contributions: GoalContributionRecord[] = rawContributions
        .filter(
          (c: unknown) =>
            c && typeof c === "object" && Number((c as Record<string, unknown>)["amount"]) > 0,
        )
        .map((c: Record<string, unknown>) => ({
          id: String(c["id"] || "").trim() || crypto.randomUUID(),
          amount: Number(Number(c["amount"]).toFixed(2)),
          date: String(c["date"] || "").trim() || new Date().toISOString().slice(0, 10),
          reference: c["reference"] ? String(c["reference"]).trim() : undefined,
        }));

      // Server enforces math invariant: saved = initialSaved + sum(contributions.amount)
      const saved = calculateSaved(initialSaved, contributions);

      const now = new Date();
      const goalDoc: GoalDocument = {
        userId,
        id,
        name,
        target: Number(target.toFixed(2)),
        saved,
        initialSaved: Number(initialSaved.toFixed(2)),
        contributions,
        monthly: Number(monthly.toFixed(2)),
        startDate,
        endDate,
        durationMonths,
        createdAt: now,
        updatedAt: now,
      };

      const goalsCol = await getGoalsCollection();
      await goalsCol.updateOne(
        { userId, id },
        {
          $set: {
            ...goalDoc,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      );

      return jsonResponse({ success: true, goal: sanitizeGoal(goalDoc) }, 201);
    }

    // POST /api/goals/import: Batch idempotent migration from localStorage
    if (path === "/api/goals/import" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || !Array.isArray(body.goals)) {
        return errorResponse("Invalid import payload. Expected 'goals' array.");
      }

      const goalsCol = await getGoalsCollection();
      const imported: ReturnType<typeof sanitizeGoal>[] = [];

      for (const item of body.goals) {
        if (!item || typeof item !== "object") continue;
        const name = String(item.name || "").trim();
        const target = Number(item.target);
        if (!name || !Number.isFinite(target) || target <= 0) continue;

        const id = String(item.id || "").trim() || crypto.randomUUID();
        const initialSaved = Math.max(0, Number(item.initialSaved) || 0);
        const monthly = Math.max(0, Number(item.monthly) || 0);
        const startDate =
          String(item.startDate || "").trim() || new Date().toISOString().slice(0, 10);
        const endDate = String(item.endDate || "").trim() || startDate;
        const durationMonths = Math.max(1, Math.round(Number(item.durationMonths) || 1));

        const rawContributions = Array.isArray(item.contributions) ? item.contributions : [];
        const contributions: GoalContributionRecord[] = rawContributions
          .filter(
            (c: unknown) =>
              c && typeof c === "object" && Number((c as Record<string, unknown>)["amount"]) > 0,
          )
          .map((c: Record<string, unknown>) => ({
            id: String(c["id"] || "").trim() || crypto.randomUUID(),
            amount: Number(Number(c["amount"]).toFixed(2)),
            date: String(c["date"] || "").trim() || new Date().toISOString().slice(0, 10),
            reference: c["reference"] ? String(c["reference"]).trim() : undefined,
          }));

        const saved = calculateSaved(initialSaved, contributions);
        const now = new Date();
        const goalDoc: GoalDocument = {
          userId,
          id,
          name,
          target: Number(target.toFixed(2)),
          saved,
          initialSaved: Number(initialSaved.toFixed(2)),
          contributions,
          monthly: Number(monthly.toFixed(2)),
          startDate,
          endDate,
          durationMonths,
          createdAt: now,
          updatedAt: now,
        };

        await goalsCol.updateOne(
          { userId, id },
          {
            $set: { ...goalDoc, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true },
        );

        imported.push(sanitizeGoal(goalDoc));
      }

      return jsonResponse({
        success: true,
        importedCount: imported.length,
        goals: imported,
      });
    }

    // Match /api/goals/:goalId/contributions/:contribId
    const contribDeleteMatch = path.match(/^\/api\/goals\/([^/]+)\/contributions\/([^/]+)$/);
    if (contribDeleteMatch && method === "DELETE") {
      const rawGoalId = contribDeleteMatch[1];
      const rawContribId = contribDeleteMatch[2];
      if (!rawGoalId || !rawContribId) {
        return errorResponse("Invalid goal or contribution ID.", 400);
      }
      const goalId = decodeURIComponent(rawGoalId);
      const contribId = decodeURIComponent(rawContribId);
      const goalsCol = await getGoalsCollection();
      const existing = await goalsCol.findOne({ userId, id: goalId });
      if (!existing) {
        return errorResponse("Goal not found or not owned by user.", 404);
      }

      const updatedContribs = (existing.contributions || []).filter((c) => c.id !== contribId);
      const saved = calculateSaved(existing.initialSaved, updatedContribs);
      const now = new Date();

      await goalsCol.updateOne(
        { userId, id: goalId },
        {
          $set: {
            contributions: updatedContribs,
            saved,
            updatedAt: now,
          },
        },
      );

      const updatedGoal = { ...existing, contributions: updatedContribs, saved, updatedAt: now };
      return jsonResponse({ success: true, goal: sanitizeGoal(updatedGoal) });
    }

    // Match /api/goals/:goalId/contributions
    const contribPostMatch = path.match(/^\/api\/goals\/([^/]+)\/contributions$/);
    if (contribPostMatch && method === "POST") {
      const rawGoalId = contribPostMatch[1];
      if (!rawGoalId) {
        return errorResponse("Invalid goal ID.", 400);
      }
      const goalId = decodeURIComponent(rawGoalId);
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid contribution payload.");
      }

      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return errorResponse("Contribution amount must be greater than ₹0.");
      }

      const goalsCol = await getGoalsCollection();
      const existing = await goalsCol.findOne({ userId, id: goalId });
      if (!existing) {
        return errorResponse("Goal not found or not owned by user.", 404);
      }

      const newContribution: GoalContributionRecord = {
        id: String(body.id || "").trim() || crypto.randomUUID(),
        amount: Number(amount.toFixed(2)),
        date: String(body.date || "").trim() || new Date().toISOString().slice(0, 10),
        reference: body.reference ? String(body.reference).trim() : undefined,
      };

      const updatedContribs = [...(existing.contributions || []), newContribution];
      const saved = calculateSaved(existing.initialSaved, updatedContribs);
      const now = new Date();

      await goalsCol.updateOne(
        { userId, id: goalId },
        {
          $set: {
            contributions: updatedContribs,
            saved,
            updatedAt: now,
          },
        },
      );

      const updatedGoal = { ...existing, contributions: updatedContribs, saved, updatedAt: now };
      return jsonResponse({ success: true, goal: sanitizeGoal(updatedGoal) });
    }

    // Match /api/goals/:goalId
    const goalItemMatch = path.match(/^\/api\/goals\/([^/]+)$/);
    if (goalItemMatch) {
      const rawGoalId = goalItemMatch[1];
      if (!rawGoalId) {
        return errorResponse("Invalid goal ID.", 400);
      }
      const goalId = decodeURIComponent(rawGoalId);
      const goalsCol = await getGoalsCollection();

      if (method === "GET") {
        const existing = await goalsCol.findOne({ userId, id: goalId });
        if (!existing) return errorResponse("Goal not found.", 404);
        return jsonResponse({ goal: sanitizeGoal(existing) });
      }

      if (method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return errorResponse("Invalid request body.");
        }

        const existing = await goalsCol.findOne({ userId, id: goalId });
        if (!existing) return errorResponse("Goal not found or unauthorized.", 404);

        const name = body.name !== undefined ? String(body.name).trim() : existing.name;
        const target = body.target !== undefined ? Number(body.target) : existing.target;
        const initialSaved =
          body.initialSaved !== undefined
            ? Math.max(0, Number(body.initialSaved))
            : existing.initialSaved;
        const monthly =
          body.monthly !== undefined ? Math.max(0, Number(body.monthly)) : existing.monthly;
        const startDate =
          body.startDate !== undefined ? String(body.startDate).trim() : existing.startDate;
        const endDate = body.endDate !== undefined ? String(body.endDate).trim() : existing.endDate;
        const durationMonths =
          body.durationMonths !== undefined
            ? Math.max(1, Math.round(Number(body.durationMonths)))
            : existing.durationMonths;

        if (!name) return errorResponse("Goal name cannot be empty.");
        if (!Number.isFinite(target) || target <= 0) {
          return errorResponse("Target amount must be a positive number.");
        }

        const contributions = Array.isArray(body.contributions)
          ? body.contributions.map((c: Record<string, unknown>) => ({
              id: String(c["id"] || "").trim() || crypto.randomUUID(),
              amount: Number(Number(c["amount"]).toFixed(2)),
              date: String(c["date"] || "").trim() || new Date().toISOString().slice(0, 10),
              reference: c["reference"] ? String(c["reference"]).trim() : undefined,
            }))
          : existing.contributions;

        const saved = calculateSaved(initialSaved, contributions);
        const now = new Date();

        const updatedGoalDoc: GoalDocument = {
          ...existing,
          name,
          target: Number(target.toFixed(2)),
          saved,
          initialSaved: Number(initialSaved.toFixed(2)),
          contributions,
          monthly: Number(monthly.toFixed(2)),
          startDate,
          endDate,
          durationMonths,
          updatedAt: now,
        };

        await goalsCol.updateOne({ userId, id: goalId }, { $set: updatedGoalDoc });
        return jsonResponse({ success: true, goal: sanitizeGoal(updatedGoalDoc) });
      }

      if (method === "DELETE") {
        const result = await goalsCol.deleteOne({ userId, id: goalId });
        if (result.deletedCount === 0) {
          return errorResponse("Goal not found or unauthorized.", 404);
        }
        return jsonResponse({ success: true, deleted: true });
      }
    }

    // --- INVESTMENT SCENARIO ENDPOINTS ---

    // GET /api/investments: List saved scenarios
    if (path === "/api/investments" && method === "GET") {
      const invCol = await getInvestmentsCollection();
      const docs = await invCol.find({ userId }).sort({ updatedAt: -1 }).toArray();
      return jsonResponse({ investments: docs.map(sanitizeInvestment) });
    }

    // POST /api/investments: Save or update an investment scenario
    if (path === "/api/investments" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid investment scenario payload.");
      }

      const title = String(body.title || "").trim();
      const type = String(body.type || "").trim();
      const mode = body.mode ? String(body.mode).trim() : undefined;
      const inputs = body.inputs && typeof body.inputs === "object" ? body.inputs : {};
      const results = body.results && typeof body.results === "object" ? body.results : {};
      const notes = body.notes ? String(body.notes).trim() : undefined;
      const id = String(body.id || "").trim() || crypto.randomUUID();

      if (!title) {
        return errorResponse("Scenario title is required.");
      }
      if (!type) {
        return errorResponse(
          "Investment type is required (e.g. 'sip', 'lump-sum', 'elss', 'mutual-fund').",
        );
      }

      const now = new Date();
      const invDoc: InvestmentScenarioDocument = {
        userId,
        id,
        title,
        type,
        mode,
        inputs,
        results,
        notes,
        createdAt: now,
        updatedAt: now,
      };

      const invCol = await getInvestmentsCollection();
      await invCol.updateOne(
        { userId, id },
        {
          $set: { ...invDoc, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      return jsonResponse({ success: true, investment: sanitizeInvestment(invDoc) }, 201);
    }

    // DELETE /api/investments/:id: Delete an investment scenario
    const invItemMatch = path.match(/^\/api\/investments\/([^/]+)$/);
    if (invItemMatch && method === "DELETE") {
      const rawInvId = invItemMatch[1];
      if (!rawInvId) {
        return errorResponse("Invalid investment ID.", 400);
      }
      const invId = decodeURIComponent(rawInvId);
      const invCol = await getInvestmentsCollection();
      const result = await invCol.deleteOne({ userId, id: invId });
      if (result.deletedCount === 0) {
        return errorResponse("Investment scenario not found or unauthorized.", 404);
      }
      return jsonResponse({ success: true, deleted: true });
    }

    // --- CFO SCENARIOS ENDPOINTS ---

    // GET /api/cfo-scenarios: List saved CFO scenarios
    if (path === "/api/cfo-scenarios" && method === "GET") {
      const cfoCol = await getCFOScenariosCollection();
      const docs = await cfoCol.find({ userId }).sort({ updatedAt: -1 }).toArray();
      return jsonResponse({ scenarios: docs.map(sanitizeCFOScenario) });
    }

    // POST /api/cfo-scenarios: Save or update a CFO scenario
    if (path === "/api/cfo-scenarios" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid CFO scenario payload.");
      }

      const title = String(body.title || "").trim();
      const type = String(body.type || "hire").trim();
      const modelVersion = String(body.modelVersion || "1.0.0").trim();
      const currency = String(body.currency || "INR").trim();
      const inputs = body.inputs && typeof body.inputs === "object" ? body.inputs : {};
      const results = body.results && typeof body.results === "object" ? body.results : {};
      const notes = body.notes ? String(body.notes).trim() : undefined;
      const id = String(body.id || "").trim() || crypto.randomUUID();

      if (!title) {
        return errorResponse("Scenario title is required.");
      }

      const now = new Date();
      const cfoDoc: CFOScenarioDocument = {
        userId,
        id,
        title,
        type,
        modelVersion,
        currency,
        inputs,
        results,
        notes,
        createdAt: now,
        updatedAt: now,
      };

      const cfoCol = await getCFOScenariosCollection();
      await cfoCol.updateOne(
        { userId, id },
        {
          $set: { ...cfoDoc, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      return jsonResponse({ success: true, scenario: sanitizeCFOScenario(cfoDoc) }, 201);
    }

    // GET /api/cfo-scenarios/:id: Retrieve a single CFO scenario
    const cfoGetMatch = path.match(/^\/api\/cfo-scenarios\/([^/]+)$/);
    if (cfoGetMatch && method === "GET") {
      const rawScenarioId = cfoGetMatch[1];
      if (!rawScenarioId) {
        return errorResponse("Invalid CFO scenario ID.", 400);
      }
      const scenarioId = decodeURIComponent(rawScenarioId);
      const cfoCol = await getCFOScenariosCollection();
      const existing = await cfoCol.findOne({ userId, id: scenarioId });
      if (!existing) {
        return errorResponse("CFO scenario not found or unauthorized.", 404);
      }
      return jsonResponse({ scenario: sanitizeCFOScenario(existing) });
    }

    // DELETE /api/cfo-scenarios/:id: Delete a CFO scenario
    const cfoDeleteMatch = path.match(/^\/api\/cfo-scenarios\/([^/]+)$/);
    if (cfoDeleteMatch && method === "DELETE") {
      const rawScenarioId = cfoDeleteMatch[1];
      if (!rawScenarioId) {
        return errorResponse("Invalid CFO scenario ID.", 400);
      }
      const scenarioId = decodeURIComponent(rawScenarioId);
      const cfoCol = await getCFOScenariosCollection();
      const result = await cfoCol.deleteOne({ userId, id: scenarioId });
      if (result.deletedCount === 0) {
        return errorResponse("CFO scenario not found or unauthorized.", 404);
      }
      return jsonResponse({ success: true, deleted: true });
    }

    // --- EXPENSES ENDPOINTS ---

    // GET /api/expenses: List expenses (supports optional ?month=YYYY-MM)
    if (path === "/api/expenses" && method === "GET") {
      const monthParam = url.searchParams.get("month");
      if (monthParam && !isValidMonthKey(monthParam)) {
        return errorResponse("Invalid month parameter. Expected YYYY-MM format.", 400);
      }
      const expensesCol = await getExpensesCollection();
      const filter: Record<string, unknown> = { userId };
      if (monthParam) {
        filter["date"] = { $regex: `^${monthParam}` };
      }
      const docs = await expensesCol.find(filter).sort({ date: -1, createdAt: -1 }).toArray();
      return jsonResponse({ expenses: docs.map(sanitizeExpense) });
    }

    // POST /api/expenses: Create/record a new expense
    if (path === "/api/expenses" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid request body. Expected JSON object.", 400);
      }

      const description = String(body.description || "").trim();
      const category = String(body.category || "").trim();
      const date = String(body.date || "").trim();
      const amount = body.amount;

      if (!description || description.length > 200) {
        return errorResponse("Description is required and must not exceed 200 characters.", 400);
      }
      if (!isValidCurrencyAmount(amount)) {
        return errorResponse("Amount must be a positive number with at most 2 decimal places.", 400);
      }
      const numAmount = Number(amount);
      if (numAmount > 100000000) {
        return errorResponse("Amount exceeds maximum affordable limit (₹100,000,000).", 400);
      }
      if (!category || category.length > 50) {
        return errorResponse("Category is required and must not exceed 50 characters.", 400);
      }
      if (!isValidIsoDate(date)) {
        return errorResponse("Date must be a valid calendar date in YYYY-MM-DD format.", 400);
      }

      const id = String(body.id || "").trim() || crypto.randomUUID();
      const note = body.note ? String(body.note).trim().slice(0, 500) : undefined;
      const type = body.type === "optional" || body.type === "essential" ? body.type : undefined;
      const now = new Date();

      const expenseDoc: ExpenseDocument = {
        userId,
        id,
        description,
        amount: Number(numAmount.toFixed(2)),
        amountPaise: rupeesToPaise(numAmount),
        category,
        date,
        note,
        type,
        createdAt: now,
        updatedAt: now,
      };

      const expensesCol = await getExpensesCollection();
      await expensesCol.updateOne(
        { userId, id },
        {
          $set: { ...expenseDoc, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      return jsonResponse({ success: true, expense: sanitizeExpense(expenseDoc) }, 201);
    }

    // POST /api/expenses/import: Batch import expenses
    if (path === "/api/expenses/import" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || !Array.isArray(body.expenses)) {
        return errorResponse("Invalid import payload. Expected 'expenses' array.", 400);
      }

      const expensesCol = await getExpensesCollection();
      const imported: ReturnType<typeof sanitizeExpense>[] = [];
      const now = new Date();

      for (const item of body.expenses) {
        if (!item || typeof item !== "object") continue;
        const desc = String(item.description || "").trim().slice(0, 200);
        const cat = String(item.category || "").trim().slice(0, 50);
        const dt = String(item.date || "").trim();
        const amt = Number(item.amount);

        if (!desc || !cat || !isValidIsoDate(dt) || !isValidCurrencyAmount(amt)) continue;

        const id = String(item.id || "").trim() || crypto.randomUUID();
        const note = item.note ? String(item.note).trim().slice(0, 500) : undefined;
        const type = item.type === "optional" || item.type === "essential" ? item.type : undefined;

        const doc: ExpenseDocument = {
          userId,
          id,
          description: desc,
          amount: Number(amt.toFixed(2)),
          amountPaise: rupeesToPaise(amt),
          category: cat,
          date: dt,
          note,
          type,
          createdAt: now,
          updatedAt: now,
        };

        await expensesCol.updateOne(
          { userId, id },
          {
            $set: { ...doc, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true },
        );
        imported.push(sanitizeExpense(doc));
      }

      return jsonResponse({
        success: true,
        importedCount: imported.length,
        expenses: imported,
      });
    }

    // PUT /api/expenses/:id: Update an existing expense
    const expenseIdMatch = path.match(/^\/api\/expenses\/([^/]+)$/);
    if (expenseIdMatch && method === "PUT") {
      const rawId = expenseIdMatch[1];
      if (!rawId) return errorResponse("Invalid expense ID.", 400);
      const expenseId = decodeURIComponent(rawId);

      const expensesCol = await getExpensesCollection();
      const existing = await expensesCol.findOne({ userId, id: expenseId });
      if (!existing) {
        return errorResponse("Expense not found or unauthorized.", 404);
      }

      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid request body. Expected JSON object.", 400);
      }

      const updates: Partial<ExpenseDocument> = { updatedAt: new Date() };

      if (body.description !== undefined) {
        const desc = String(body.description || "").trim();
        if (!desc || desc.length > 200) {
          return errorResponse("Description must not be empty or exceed 200 characters.", 400);
        }
        updates.description = desc;
      }
      if (body.amount !== undefined) {
        if (!isValidCurrencyAmount(body.amount)) {
          return errorResponse("Amount must be a positive number with at most 2 decimal places.", 400);
        }
        const numAmt = Number(body.amount);
        if (numAmt > 100000000) {
          return errorResponse("Amount exceeds maximum limit.", 400);
        }
        updates.amount = Number(numAmt.toFixed(2));
        updates.amountPaise = rupeesToPaise(numAmt);
      }
      if (body.category !== undefined) {
        const cat = String(body.category || "").trim();
        if (!cat || cat.length > 50) {
          return errorResponse("Category must not be empty or exceed 50 characters.", 400);
        }
        updates.category = cat;
      }
      if (body.date !== undefined) {
        const dt = String(body.date || "").trim();
        if (!isValidIsoDate(dt)) {
          return errorResponse("Date must be a valid ISO date in YYYY-MM-DD format.", 400);
        }
        updates.date = dt;
      }
      if (body.note !== undefined) {
        updates.note = body.note ? String(body.note).trim().slice(0, 500) : undefined;
      }
      if (body.type !== undefined) {
        updates.type = body.type === "optional" || body.type === "essential" ? body.type : undefined;
      }

      await expensesCol.updateOne({ userId, id: expenseId }, { $set: updates });
      const updated = await expensesCol.findOne({ userId, id: expenseId });
      return jsonResponse({ success: true, expense: updated ? sanitizeExpense(updated) : null });
    }

    // DELETE /api/expenses/:id: Delete an expense
    if (expenseIdMatch && method === "DELETE") {
      const rawId = expenseIdMatch[1];
      if (!rawId) return errorResponse("Invalid expense ID.", 400);
      const expenseId = decodeURIComponent(rawId);

      const expensesCol = await getExpensesCollection();
      const result = await expensesCol.deleteOne({ userId, id: expenseId });
      if (result.deletedCount === 0) {
        return errorResponse("Expense not found or unauthorized.", 404);
      }
      return jsonResponse({ success: true, deleted: true, deletedId: expenseId });
    }

    // --- BUDGETS ENDPOINTS ---

    // GET /api/budgets: List monthly budgets (supports optional ?month=YYYY-MM)
    if (path === "/api/budgets" && method === "GET") {
      const monthParam = url.searchParams.get("month");
      const budgetsCol = await getBudgetsCollection();

      if (monthParam) {
        if (!isValidMonthKey(monthParam)) {
          return errorResponse("Invalid month parameter. Expected YYYY-MM format.", 400);
        }
        const doc = await budgetsCol.findOne({ userId, month: monthParam });
        if (!doc) {
          return jsonResponse({
            budget: { month: monthParam, income: null, limits: {} },
          });
        }
        return jsonResponse({ budget: sanitizeBudget(doc) });
      }

      const docs = await budgetsCol.find({ userId }).sort({ month: -1 }).toArray();
      return jsonResponse({ budgets: docs.map(sanitizeBudget) });
    }

    // PUT /api/budgets/:month or POST /api/budgets: Save/update monthly budget plan
    const budgetMonthMatch = path.match(/^\/api\/budgets\/([^/]+)$/);
    if ((budgetMonthMatch && method === "PUT") || (path === "/api/budgets" && method === "POST")) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid request body. Expected JSON object.", 400);
      }

      const rawMonth = budgetMonthMatch ? budgetMonthMatch[1] : body.month;
      const month = String(rawMonth || "").trim();

      if (!isValidMonthKey(month)) {
        return errorResponse("Month must be a valid YYYY-MM string.", 400);
      }

      let income: number | null = null;
      let incomePaise: number | null = null;
      if (body.income !== undefined && body.income !== null && body.income !== "") {
        const inc = Number(body.income);
        if (!Number.isFinite(inc) || inc < 0) {
          return errorResponse("Income must be a non-negative number.", 400);
        }
        income = Number(inc.toFixed(2));
        incomePaise = rupeesToPaise(inc);
      }

      const limits: Record<string, number> = {};
      const limitsPaise: Record<string, number> = {};
      if (body.limits && typeof body.limits === "object") {
        for (const [cat, lim] of Object.entries(body.limits)) {
          const catName = String(cat).trim();
          const limVal = Number(lim);
          if (catName && catName.length <= 50 && Number.isFinite(limVal) && limVal >= 0) {
            limits[catName] = Number(limVal.toFixed(2));
            limitsPaise[catName] = rupeesToPaise(limVal);
          }
        }
      }

      const now = new Date();
      const budgetDoc: BudgetDocument = {
        userId,
        month,
        income,
        incomePaise,
        limits,
        limitsPaise,
        createdAt: now,
        updatedAt: now,
      };

      const budgetsCol = await getBudgetsCollection();
      await budgetsCol.updateOne(
        { userId, month },
        {
          $set: { ...budgetDoc, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      return jsonResponse({ success: true, budget: sanitizeBudget(budgetDoc) });
    }

    // DELETE /api/budgets/:month: Delete a monthly budget plan
    if (budgetMonthMatch && method === "DELETE") {
      const rawMonth = budgetMonthMatch[1];
      const month = String(rawMonth || "").trim();
      if (!isValidMonthKey(month)) {
        return errorResponse("Invalid month parameter. Expected YYYY-MM format.", 400);
      }

      const budgetsCol = await getBudgetsCollection();
      const result = await budgetsCol.deleteOne({ userId, month });
      if (result.deletedCount === 0) {
        return errorResponse("Budget not found or unauthorized.", 404);
      }
      return jsonResponse({ success: true, deleted: true, month });
    }

    // POST /api/budgets/import: Batch import budgets
    if (path === "/api/budgets/import" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid import payload.", 400);
      }

      const budgetsCol = await getBudgetsCollection();
      const now = new Date();
      let importedCount = 0;

      const rawBudgets = Array.isArray(body.budgets)
        ? body.budgets
        : typeof body.budgets === "object"
          ? Object.entries(body.budgets).map(([m, p]: [string, any]) => ({ month: m, ...p }))
          : [];

      for (const item of rawBudgets) {
        if (!item || typeof item !== "object") continue;
        const month = String(item.month || "").trim();
        if (!isValidMonthKey(month)) continue;

        let income: number | null = null;
        let incomePaise: number | null = null;
        if (item.income !== undefined && item.income !== null && item.income !== "") {
          const inc = Number(item.income);
          if (Number.isFinite(inc) && inc >= 0) {
            income = Number(inc.toFixed(2));
            incomePaise = rupeesToPaise(inc);
          }
        }

        const limits: Record<string, number> = {};
        const limitsPaise: Record<string, number> = {};
        if (item.limits && typeof item.limits === "object") {
          for (const [c, l] of Object.entries(item.limits)) {
            const lim = Number(l);
            if (c && Number.isFinite(lim) && lim >= 0) {
              limits[String(c).trim()] = Number(lim.toFixed(2));
              limitsPaise[String(c).trim()] = rupeesToPaise(lim);
            }
          }
        }

        const doc: BudgetDocument = {
          userId,
          month,
          income,
          incomePaise,
          limits,
          limitsPaise,
          createdAt: now,
          updatedAt: now,
        };

        await budgetsCol.updateOne(
          { userId, month },
          {
            $set: { ...doc, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true },
        );
        importedCount++;
      }

      return jsonResponse({ success: true, importedCount });
    }

    // --- CATEGORIES ENDPOINTS ---

    // GET /api/categories: List custom categories for user
    if (path === "/api/categories" && method === "GET") {
      const categoriesCol = await getCategoriesCollection();
      const docs = await categoriesCol.find({ userId }).sort({ name: 1 }).toArray();
      return jsonResponse({ categories: docs.map(sanitizeCategory) });
    }

    // POST /api/categories: Create a custom category
    if (path === "/api/categories" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return errorResponse("Invalid request body. Expected JSON object.", 400);
      }

      const name = String(body.name || "").trim();
      if (!name || name.length > 50) {
        return errorResponse("Category name is required and must not exceed 50 characters.", 400);
      }

      const categoriesCol = await getCategoriesCollection();

      // Case-insensitive duplicate check
      const existing = await categoriesCol.findOne({
        userId,
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (existing) {
        return errorResponse(`A category named "${name}" already exists.`, 409);
      }

      const id = String(body.id || "").trim() || crypto.randomUUID();
      const color = body.color ? String(body.color).trim().slice(0, 30) : undefined;
      const icon = body.icon ? String(body.icon).trim().slice(0, 50) : undefined;
      const now = new Date();

      const catDoc: CategoryDocument = {
        userId,
        id,
        name,
        color,
        icon,
        createdAt: now,
        updatedAt: now,
      };

      await categoriesCol.updateOne(
        { userId, id },
        {
          $set: { ...catDoc, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      return jsonResponse({ success: true, category: sanitizeCategory(catDoc) }, 201);
    }

    // DELETE /api/categories/:id: Delete a custom category with in-use safety check
    const catDeleteMatch = path.match(/^\/api\/categories\/([^/]+)$/);
    if (catDeleteMatch && method === "DELETE") {
      const rawId = catDeleteMatch[1];
      if (!rawId) return errorResponse("Invalid category ID.", 400);
      const catId = decodeURIComponent(rawId);

      const categoriesCol = await getCategoriesCollection();
      const existing = await categoriesCol.findOne({ userId, id: catId });
      if (!existing) {
        return errorResponse("Category not found or unauthorized.", 404);
      }

      // Requirement 5: Prevent deleting a category in a way that loses or orphans past transactions
      const expensesCol = await getExpensesCollection();
      const inUseCount = await expensesCol.countDocuments({ userId, category: existing.name });
      if (inUseCount > 0) {
        return errorResponse(
          `Cannot delete category "${existing.name}": ${inUseCount} expense transaction(s) are currently assigned to it. Please reassign or delete these transactions first.`,
          400,
        );
      }

      await categoriesCol.deleteOne({ userId, id: catId });
      return jsonResponse({ success: true, deleted: true, deletedId: catId });
    }

    // POST /api/categories/import: Batch import custom categories
    if (path === "/api/categories/import" && method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || !Array.isArray(body.categories)) {
        return errorResponse("Invalid import payload. Expected 'categories' array.", 400);
      }

      const categoriesCol = await getCategoriesCollection();
      const imported: ReturnType<typeof sanitizeCategory>[] = [];
      const now = new Date();

      for (const item of body.categories) {
        const name = typeof item === "string" ? item.trim() : String(item?.name || "").trim();
        if (!name || name.length > 50) continue;

        const id =
          typeof item === "object" && item?.id
            ? String(item.id).trim()
            : crypto.randomUUID();

        const doc: CategoryDocument = {
          userId,
          id,
          name,
          createdAt: now,
          updatedAt: now,
        };

        await categoriesCol.updateOne(
          { userId, id },
          {
            $set: { ...doc, updatedAt: now },
            $setOnInsert: { createdAt: now },
          },
          { upsert: true },
        );
        imported.push(sanitizeCategory(doc));
      }

      return jsonResponse({
        success: true,
        importedCount: imported.length,
        categories: imported,
      });
    }

    return errorResponse(`API endpoint not found: ${method} ${path}`, 404);
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.statusCode);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("API Request Error:", err);
    return errorResponse(`Server error: ${message}`, 500);
  }
}
