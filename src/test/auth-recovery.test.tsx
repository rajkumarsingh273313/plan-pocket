import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { ResetPasswordPage } from "@/routes/auth.reset-password";
import * as supabaseModule from "@/lib/supabase";

describe("Password Recovery Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.location.hash = "";
    window.location.search = "";
  });

  describe("Routing", () => {
    it("registers /auth/reset-password in the route tree", () => {
      const router = createRouter({
        routeTree,
        context: { queryClient: new QueryClient() },
      });

      const matches = router.matchRoutes("/auth/reset-password");
      expect(matches.at(-1)?.routeId).toBe("/auth/reset-password");
    });
  });

  describe("ResetPasswordPage Component", () => {
    it("shows unconfigured state when Supabase environment variables are missing", async () => {
      vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(false);

      render(<ResetPasswordPage />);

      expect(
        await screen.findByText("Supabase Auth Not Configured"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Password recovery requires a connected Supabase project/i),
      ).toBeInTheDocument();
    });

    it("shows invalid link state when error parameters are in URL", async () => {
      vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);
      window.location.hash =
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

      render(<ResetPasswordPage />);

      expect(
        await screen.findByText("Reset Link Expired or Invalid"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Email link is invalid or has expired"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Request New Reset Email/i }),
      ).toBeInTheDocument();
    });

    it("shows the password reset form when a recovery session is present", async () => {
      vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);

      const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });
      const mockUnsubscribe = vi.fn();

      const mockSupabase = {
        auth: {
          onAuthStateChange: vi.fn((callback) => {
            callback("PASSWORD_RECOVERY", { access_token: "mock-token" });
            return {
              data: {
                subscription: {
                  unsubscribe: mockUnsubscribe,
                },
              },
            };
          }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: "mock-token" } },
            error: null,
          }),
          updateUser: mockUpdateUser,
          signOut: mockSignOut,
        },
      };

      vi.spyOn(supabaseModule, "getSupabaseClient").mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof supabaseModule.getSupabaseClient>,
      );

      render(<ResetPasswordPage />);

      expect(
        await screen.findByRole("heading", { name: "Choose a New Password" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("New Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Reset Password" }),
      ).toBeDisabled();
    });

    it("validates password requirements and enables submit only when matching and valid", async () => {
      vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);

      const mockUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        auth: {
          onAuthStateChange: vi.fn((callback) => {
            callback("PASSWORD_RECOVERY", { access_token: "mock-token" });
            return { data: { subscription: { unsubscribe: vi.fn() } } };
          }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: "mock-token" } },
            error: null,
          }),
          updateUser: mockUpdateUser,
          signOut: mockSignOut,
        },
      };

      vi.spyOn(supabaseModule, "getSupabaseClient").mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof supabaseModule.getSupabaseClient>,
      );

      render(<ResetPasswordPage />);

      const newPasswordInput = await screen.findByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText("Confirm Password");
      const submitBtn = screen.getByRole("button", { name: "Reset Password" });

      // Partially valid password (no number or special character)
      fireEvent.change(newPasswordInput, { target: { value: "Short" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Short" } });
      expect(submitBtn).toBeDisabled();

      // Strong password meeting all criteria
      fireEvent.change(newPasswordInput, { target: { value: "PlanPocket2026!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Mismatch!" } });
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText("✗ Passwords do not match")).toBeInTheDocument();

      // Passwords match and meet all criteria
      fireEvent.change(confirmPasswordInput, { target: { value: "PlanPocket2026!" } });
      expect(screen.getByText("✓ Passwords match")).toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();

      // Submit password update
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          password: "PlanPocket2026!",
        });
      });

      expect(
        await screen.findByText("Password Reset Successfully"),
      ).toBeInTheDocument();
      expect(mockSignOut).toHaveBeenCalled();
    });

    it("displays an error message when Supabase updateUser returns an error", async () => {
      vi.spyOn(supabaseModule, "isSupabaseConfigured").mockReturnValue(true);

      const mockUpdateUser = vi.fn().mockResolvedValue({
        data: {},
        error: { message: "New password should be different from old password." },
      });

      const mockSupabase = {
        auth: {
          onAuthStateChange: vi.fn((callback) => {
            callback("PASSWORD_RECOVERY", { access_token: "mock-token" });
            return { data: { subscription: { unsubscribe: vi.fn() } } };
          }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: "mock-token" } },
            error: null,
          }),
          updateUser: mockUpdateUser,
          signOut: vi.fn(),
        },
      };

      vi.spyOn(supabaseModule, "getSupabaseClient").mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof supabaseModule.getSupabaseClient>,
      );

      render(<ResetPasswordPage />);

      const newPasswordInput = await screen.findByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText("Confirm Password");
      const submitBtn = screen.getByRole("button", { name: "Reset Password" });

      fireEvent.change(newPasswordInput, { target: { value: "PlanPocket2026!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "PlanPocket2026!" } });

      fireEvent.click(submitBtn);

      expect(
        await screen.findByText(
          "New password should be different from old password.",
        ),
      ).toBeInTheDocument();
    });
  });
});

