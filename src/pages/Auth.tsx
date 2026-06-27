import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Smartphone, Key } from "lucide-react";
import apiClient from "@/lib/apiClient";

type AuthView = "login" | "forgot_request" | "forgot_reset";

export default function Auth() {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot password state
  const [phone, setPhone] = useState("");
  const [resetId, setResetId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: "Gagal masuk",
        description: error.message,
      });
    }

    setLoading(false);
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Nomor telefon harus diisi" });
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post<{ message: string; reset_id: string }>(
        "/auth/forgot-password",
        { phone_number: phone }
      );
      setResetId(response.reset_id);
      toast({
        title: "OTP Berhasil Dikirim",
        description: "Kode verifikasi OTP telah dikirim ke nomor WhatsApp Anda.",
      });
      setView("forgot_reset");
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Gagal meminta OTP",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      toast({ variant: "destructive", title: "OTP harus 6 digit angka" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Password baru minimal 8 karakter" });
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", {
        reset_id: resetId,
        otp,
        new_password: newPassword,
      });
      toast({
        title: "Password Berhasil Direset",
        description: "Silakan masuk menggunakan password baru Anda.",
      });
      setView("login");
      // Clear reset state
      setPhone("");
      setResetId("");
      setOtp("");
      setNewPassword("");
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Gagal mereset password",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-muted/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-card">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md text-white">
            {view === "forgot_request" ? (
              <Smartphone className="h-7 w-7" />
            ) : view === "forgot_reset" ? (
              <Key className="h-7 w-7" />
            ) : (
              <Building2 className="h-7 w-7" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground font-sans">
            {view === "login" && "Toko Bahan Bangunan"}
            {view === "forgot_request" && "Lupa Password"}
            {view === "forgot_reset" && "Reset Password"}
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {view === "login" && "Masuk ke dashboard penjualan"}
            {view === "forgot_request" && "Masukkan nomor telfon untuk menerima kode verifikasi OTP via WhatsApp."}
            {view === "forgot_reset" && "Masukkan kode OTP 6-digit dan buat password baru Anda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* LOGIN FORM */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {view === "login" && (
                    <button
                      type="button"
                      onClick={() => setView("forgot_request")}
                      className="text-xs font-semibold text-primary hover:underline transition-all"
                    >
                      Lupa Password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading}>
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          )}

          {/* REQUEST OTP FORM */}
          {view === "forgot_request" && (
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Contoh: 6281234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim OTP"}
              </Button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground w-full py-1.5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Kembali ke Login
              </button>
            </form>
          )}

          {/* RESET PASSWORD WITH OTP FORM */}
          {view === "forgot_reset" && (
            <form onSubmit={handleForgotReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Kode OTP (6 Digit)</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Masukkan 6 digit kode"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="rounded-xl text-center font-mono tracking-widest text-lg"
                  required
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 font-semibold" disabled={loading}>
                {loading ? "Mereset..." : "Reset Password"}
              </Button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground w-full py-1.5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Batal &amp; Kembali ke Login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
