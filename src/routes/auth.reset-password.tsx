import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — PLANPOCKET" },
      {
        name: "description",
        content: "Choose a new password for your PLANPOCKET account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

type PageStatus = "checking" | "ready" | "invalid" | "submitting" | "success" | "unconfigured";

export function ResetPasswordPage() {
  const [status, setStatus] = useState<PageStatus>("checking");
  const [invalidReason, setInvalidReason] = useState<string>(
    "The password reset link is invalid, expired, or has already been used.",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus("unconfigured");
      return;
    }

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(search.replace(/^\?/, ""));

    const errorCode = hashParams.get("error_code") || searchParams.get("error_code");
    const errorDesc = hashParams.get("error_description") || searchParams.get("error_description");

    if (errorCode || errorDesc) {
      setStatus("invalid");
      setInvalidReason(errorDesc || "The password reset link is invalid or has expired.");
      return;
    }

    try {
      const client = getSupabaseClient();
      let hasResolved = false;

      const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          hasResolved = true;
          setStatus("ready");
        } else if (
          event === "SIGNED_IN" &&
          (hashParams.get("type") === "recovery" || Boolean(session))
        ) {
          hasResolved = true;
          setStatus("ready");
        }
      });

      client.auth
        .getSession()
        .then(({ data, error }) => {
          if (error) {
            hasResolved = true;
            setStatus("invalid");
            setInvalidReason(error.message);
            return;
          }

          if (data.session) {
            hasResolved = true;
            setStatus("ready");
            return;
          }

          const hasRecoveryToken =
            Boolean(hashParams.get("access_token")) || Boolean(searchParams.get("code"));

          if (!hasRecoveryToken) {
            hasResolved = true;
            setStatus("invalid");
            setInvalidReason(
              "No active password reset token was found in the link. Please request a new password reset email.",
            );
          }
        })
        .catch((err: unknown) => {
          hasResolved = true;
          setStatus("invalid");
          setInvalidReason(err instanceof Error ? err.message : "Unable to verify session.");
        });

      const timeout = setTimeout(() => {
        if (!hasResolved) {
          setStatus((current) => {
            if (current === "checking") {
              setInvalidReason(
                "Password recovery session timed out or link is expired. Please request a new password reset email.",
              );
              return "invalid";
            }
            return current;
          });
        }
      }, 2500);

      return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timeout);
      };
    } catch (err: unknown) {
      setStatus("invalid");
      setInvalidReason(
        err instanceof Error ? err.message : "Authentication service encountered an error.",
      );
      return;
    }
  }, []);

  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
  };

  const satisfiedCount = Object.values(requirements).filter(Boolean).length;
  const allRequirementsMet = satisfiedCount === 5;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!allRequirementsMet) {
      setErrorMessage("Please meet all listed password requirements before continuing.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("New Password and Confirm Password must match.");
      return;
    }

    setStatus("submitting");

    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.updateUser({ password });

      if (error) {
        setStatus("ready");
        setErrorMessage(error.message || "Failed to update password. Please try again.");
        return;
      }

      setStatus("success");
      setSuccessMessage("Your password has been updated successfully! Redirecting you to login...");

      try {
        await client.auth.signOut();
      } catch {
        // Sign-out cleanup is best-effort
      }

      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = "/app?page=login";
        }
      }, 2000);
    } catch (err: unknown) {
      setStatus("ready");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while updating your password.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-base">
              P
            </div>
            <span>PLANPOCKET</span>
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            Calm, intelligent financial planning & scenario management
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {status === "checking" && (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]" />
              <p className="mt-4 text-sm font-medium text-foreground">
                Verifying password recovery link...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Please wait a moment while we establish a secure session.
              </p>
            </div>
          )}

          {status === "unconfigured" && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Supabase Auth Not Configured
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Password recovery requires a connected Supabase project. Set{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  VITE_SUPABASE_URL
                </code>{" "}
                and{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  VITE_SUPABASE_ANON_KEY
                </code>{" "}
                in your environment variables.
              </p>
              <div className="mt-6">
                <a
                  href="/app?page=login"
                  className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
                >
                  Return to Login
                </a>
              </div>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Reset Link Expired or Invalid
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{invalidReason}</p>
              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href="/app?page=forgot"
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  Request New Reset Email
                </a>
                <a
                  href="/app?page=login"
                  className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
                >
                  Return to Sign In
                </a>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Password Reset Successfully
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {successMessage ||
                  "Your new password has been saved. You can now sign in with your updated credentials."}
              </p>
              <div className="mt-6">
                <a
                  href="/app?page=login"
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  Proceed to Login
                </a>
              </div>
            </div>
          )}

          {(status === "ready" || status === "submitting") && (
            <div>
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Choose a New Password
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a strong password to protect your PLANPOCKET account.
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
                >
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="resetNewPasswordInput"
                    className="block text-xs font-medium text-foreground"
                  >
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="resetNewPasswordInput"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      disabled={status === "submitting"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="resetConfirmPasswordInput"
                    className="block text-xs font-medium text-foreground"
                  >
                    Confirm Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="resetConfirmPasswordInput"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      disabled={status === "submitting"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                    <button
                      type="button"
                      aria-label={
                        showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                      }
                      aria-pressed={showConfirmPassword}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-1 text-xs ${
                        passwordsMatch
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {passwordsMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Password Strength Indicator */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Password Strength</span>
                    <span className="font-medium text-foreground">
                      {satisfiedCount === 5 ? "Strong" : satisfiedCount >= 3 ? "Moderate" : "Weak"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-300 ${
                        satisfiedCount === 5
                          ? "bg-emerald-500 w-full"
                          : satisfiedCount >= 3
                            ? "bg-amber-500 w-3/5"
                            : "bg-destructive w-1/5"
                      }`}
                    />
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1 text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">Password Requirements:</div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      requirements.length
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : ""
                    }`}
                  >
                    <span>{requirements.length ? "✓" : "•"}</span>
                    <span>At least 8 characters long</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      requirements.uppercase
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : ""
                    }`}
                  >
                    <span>{requirements.uppercase ? "✓" : "•"}</span>
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      requirements.lowercase
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : ""
                    }`}
                  >
                    <span>{requirements.lowercase ? "✓" : "•"}</span>
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      requirements.number
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : ""
                    }`}
                  >
                    <span>{requirements.number ? "✓" : "•"}</span>
                    <span>At least one number (0-9)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      requirements.special
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : ""
                    }`}
                  >
                    <span>{requirements.special ? "✓" : "•"}</span>
                    <span>At least one special character (!@#$%^&*)</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={status === "submitting" || !allRequirementsMet || !passwordsMatch}
                  className="mt-4 flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "submitting" ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                      Updating Password...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/app?page=login" className="font-medium text-primary hover:underline">
            ← Back to PLANPOCKET Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
