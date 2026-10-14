import { MongoClient, type Db, type Collection } from "mongodb";

export interface GoalContributionRecord {
  id: string;
  amount: number;
  date: string;
  reference?: string | undefined;
}

export interface GoalDocument {
  userId: string;
  id: string;
  name: string;
  target: number;
  saved: number;
  initialSaved: number;
  contributions: GoalContributionRecord[];
  monthly: number;
  startDate: string;
  endDate: string;
  durationMonths: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentScenarioDocument {
  userId: string;
  id: string;
  title: string;
  type: string; // "mutual-fund" | "sip" | "lump-sum" | "elss" | "simple-interest" | "compound-interest" | "hra"
  mode?: string | undefined; // e.g. "sip" | "lumpsum"
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  notes?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface CFOScenarioDocument {
  userId: string;
  id: string;
  title: string;
  type: string; // "hire" | "marketing" | "budget"
  modelVersion: string;
  currency: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  notes?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseDocument {
  userId: string;
  id: string;
  description: string;
  amount: number;
  amountPaise: number;
  category: string;
  date: string; // YYYY-MM-DD
  note?: string | undefined;
  type?: "essential" | "optional" | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetDocument {
  userId: string;
  month: string; // YYYY-MM
  income?: number | null | undefined;
  incomePaise?: number | null | undefined;
  limits: Record<string, number>;
  limitsPaise?: Record<string, number> | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryDocument {
  userId: string;
  id: string;
  name: string;
  color?: string | undefined;
  icon?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoIndexesInitialized: boolean | undefined;
}

export function isMongoConfigured(): boolean {
  const uri = process.env["MONGODB_URI"];
  return Boolean(
    uri &&
    !uri.includes("your-cluster") &&
    !uri.includes("<db_password>") &&
    !uri.includes("placeholder"),
  );
}

export function getMongoDbName(): string {
  return process.env["MONGODB_DB_NAME"] || "planpocket";
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env["MONGODB_URI"];
  if (!uri || !isMongoConfigured()) {
    throw new Error(
      "MongoDB connection URI is not configured. Please set the MONGODB_URI environment variable.",
    );
  }

  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  global._mongoClientPromise = client.connect();
  return global._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(getMongoDbName());

  if (!global._mongoIndexesInitialized) {
    try {
      await Promise.all([
        db
          .collection<GoalDocument>("goals")
          .createIndex({ userId: 1, id: 1 }, { unique: true, background: true }),
        db.collection<GoalDocument>("goals").createIndex({ userId: 1 }, { background: true }),
        db
          .collection<InvestmentScenarioDocument>("investments")
          .createIndex({ userId: 1, id: 1 }, { unique: true, background: true }),
        db
          .collection<InvestmentScenarioDocument>("investments")
          .createIndex({ userId: 1 }, { background: true }),
        db
          .collection<CFOScenarioDocument>("cfo_scenarios")
          .createIndex({ userId: 1, id: 1 }, { unique: true, background: true }),
        db
          .collection<CFOScenarioDocument>("cfo_scenarios")
          .createIndex({ userId: 1 }, { background: true }),
        db
          .collection<ExpenseDocument>("expenses")
          .createIndex({ userId: 1, id: 1 }, { unique: true, background: true }),
        db
          .collection<ExpenseDocument>("expenses")
          .createIndex({ userId: 1, date: -1 }, { background: true }),
        db
          .collection<ExpenseDocument>("expenses")
          .createIndex({ userId: 1, category: 1, date: -1 }, { background: true }),
        db
          .collection<BudgetDocument>("budgets")
          .createIndex({ userId: 1, month: 1 }, { unique: true, background: true }),
        db
          .collection<BudgetDocument>("budgets")
          .createIndex({ userId: 1 }, { background: true }),
        db
          .collection<CategoryDocument>("categories")
          .createIndex({ userId: 1, id: 1 }, { unique: true, background: true }),
        db
          .collection<CategoryDocument>("categories")
          .createIndex({ userId: 1, name: 1 }, { background: true }),
      ]);
      global._mongoIndexesInitialized = true;
    } catch (indexError) {
      // Non-fatal if index creation fails or already exists
      console.warn("MongoDB index initialization notice:", indexError);
    }
  }

  return db;
}

export async function getGoalsCollection(): Promise<Collection<GoalDocument>> {
  const db = await getMongoDb();
  return db.collection<GoalDocument>("goals");
}

export async function getInvestmentsCollection(): Promise<Collection<InvestmentScenarioDocument>> {
  const db = await getMongoDb();
  return db.collection<InvestmentScenarioDocument>("investments");
}

export async function getCFOScenariosCollection(): Promise<Collection<CFOScenarioDocument>> {
  const db = await getMongoDb();
  return db.collection<CFOScenarioDocument>("cfo_scenarios");
}

export async function getExpensesCollection(): Promise<Collection<ExpenseDocument>> {
  const db = await getMongoDb();
  return db.collection<ExpenseDocument>("expenses");
}

export async function getBudgetsCollection(): Promise<Collection<BudgetDocument>> {
  const db = await getMongoDb();
  return db.collection<BudgetDocument>("budgets");
}

export async function getCategoriesCollection(): Promise<Collection<CategoryDocument>> {
  const db = await getMongoDb();
  return db.collection<CategoryDocument>("categories");
}
