import { createClient, type User } from "@supabase/supabase-js";

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  user: User;
}

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Reads server-side Supabase configuration from process.env.
 * Supports both VITE_ prefixed and standard SUPABASE_ variable names.
 */
export function getServerSupabaseConfig(): {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
} {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  return { url, anonKey, serviceRoleKey };
}

/**
 * Checks whether Supabase Auth is configured on the server.
 */
export function isServerSupabaseConfigured(): boolean {
  const { url, anonKey } = getServerSupabaseConfig();
  return Boolean(
    url &&
    anonKey &&
    !url.includes("your-supabase-project") &&
    !anonKey.includes("your-supabase-anon-key")
  );
}

/**
 * Extracts and verifies the bearer token from the incoming Request.
 * Derives user identity strictly from the verified Supabase JWT.
 * Never trusts client-supplied user ID parameters.
 */
export async function verifyAuthToken(request: Request): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!authHeader) {
    throw new AuthError("Authentication token is required. Please sign in.", 401);
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    throw new AuthError("Invalid authorization format. Format must be 'Bearer <token>'.", 401);
  }

  const token = parts[1].trim();
  if (!token) {
    throw new AuthError("Authentication token cannot be empty.", 401);
  }

  const { url, anonKey } = getServerSupabaseConfig();
  if (!url || !anonKey || !isServerSupabaseConfigured()) {
    throw new AuthError(
      "Supabase Auth is not configured on the server. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      503
    );
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new AuthError(
        error?.message || "Invalid or expired authentication session. Please sign in again.",
        401
      );
    }

    return {
      userId: data.user.id,
      email: data.user.email,
      user: data.user,
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError(
      `Authentication verification failed: ${err instanceof Error ? err.message : String(err)}`,
      401
    );
  }
}

