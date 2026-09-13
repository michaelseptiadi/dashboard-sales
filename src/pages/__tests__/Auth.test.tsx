// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Auth from "../Auth";
import apiClient from "@/lib/apiClient";
import "@testing-library/jest-dom";

// Mock the hooks and clients
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    user: null,
    loading: false,
  }),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@/lib/apiClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe("Auth Component - Forgot Password Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render an accessible mobile-friendly login form", () => {
    render(<Auth />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    expect(screen.getByText("Toko Bahan Bangunan")).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("autocomplete", "email");
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Tampilkan password" }));
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Sembunyikan password" })).toBeInTheDocument();

    const forgotPasswordBtn = screen.getByText("Lupa Password?");
    expect(forgotPasswordBtn).toBeInTheDocument();

    // Click Lupa Password
    fireEvent.click(forgotPasswordBtn);

    // Verify it switched to request screen
    expect(screen.getByText("Lupa Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Nomor WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Kirim OTP")).toBeInTheDocument();
  });

  it("should request OTP, display toast, and proceed to Reset Password view on success", async () => {
    render(<Auth />);
    
    // Go to forgot request view
    fireEvent.click(screen.getByText("Lupa Password?"));

    // Enter phone number
    const phoneInput = screen.getByLabelText("Nomor WhatsApp");
    fireEvent.change(phoneInput, { target: { value: "628822113345" } });

    // Mock successful post response
    const mockPost = vi.mocked(apiClient.post);
    mockPost.mockResolvedValueOnce({
      message: "OTP sent",
      reset_id: "test-reset-id",
    });

    // Click Kirim OTP
    fireEvent.click(screen.getByText("Kirim OTP"));

    // Wait for endpoint call and view update
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/auth/forgot-password", {
        phone_number: "628822113345",
      });
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "OTP Berhasil Dikirim",
    }));

    // Verify we are on the Reset Password page
    expect(screen.getByRole("heading", { name: "Reset Password" })).toBeInTheDocument();
    expect(screen.getByLabelText("Kode OTP (6 Digit)")).toBeInTheDocument();
    expect(screen.getByLabelText("Password Baru")).toBeInTheDocument();
  });

  it("should reset password successfully and go back to Login page", async () => {
    render(<Auth />);
    
    // 1. Navigate to Forgot Request
    fireEvent.click(screen.getByText("Lupa Password?"));

    // 2. Request OTP
    const phoneInput = screen.getByLabelText("Nomor WhatsApp");
    fireEvent.change(phoneInput, { target: { value: "628822113345" } });

    const mockPost = vi.mocked(apiClient.post);
    mockPost.mockResolvedValueOnce({
      message: "OTP sent",
      reset_id: "test-reset-id",
    });

    fireEvent.click(screen.getByText("Kirim OTP"));

    // Wait for transition to reset screen
    await screen.findByText("Kode OTP (6 Digit)");

    // 3. Fill OTP & new password
    const otpInput = screen.getByLabelText("Kode OTP (6 Digit)");
    const passwordInput = screen.getByLabelText("Password Baru");

    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.change(passwordInput, { target: { value: "newpassword123" } });

    // Mock successful reset response
    mockPost.mockResolvedValueOnce({
      message: "Password reset successful",
    });

    // Submit reset password form
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenLastCalledWith("/auth/reset-password", {
        reset_id: "test-reset-id",
        otp: "123456",
        new_password: "newpassword123",
      });
    });

    expect(mockToast).toHaveBeenLastCalledWith(expect.objectContaining({
      title: "Password Berhasil Direset",
    }));

    // Check that we are back to the Login page
    expect(screen.getByText("Toko Bahan Bangunan")).toBeInTheDocument();
  });
});
