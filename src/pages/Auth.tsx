import { useState } from "react";
import { ArrowLeft, Building2, Eye, EyeOff, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/apiClient";

 type AuthView = "login" | "forgot_request" | "forgot_reset";

export default function Auth() {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [resetId, setResetId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast({ variant: "destructive", title: "Gagal masuk", description: error.message });
    setLoading(false);
  };

  const handleForgotRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Nomor telefon harus diisi" });
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post<{ message: string; reset_id: string }>("/auth/forgot-password", { phone_number: phone });
      setResetId(response.reset_id);
      toast({ title: "OTP Berhasil Dikirim", description: "Kode verifikasi OTP telah dikirim ke nomor WhatsApp Anda." });
      setView("forgot_reset");
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal meminta OTP", description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "OTP harus 6 digit angka" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Password baru minimal 8 karakter" });
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { reset_id: resetId, otp, new_password: newPassword });
      toast({ title: "Password Berhasil Direset", description: "Silakan masuk menggunakan password baru Anda." });
      setView("login");
      setPhone("");
      setResetId("");
      setOtp("");
      setNewPassword("");
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal mereset password", description: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const heading = view === "login" ? "Toko Bahan Bangunan" : view === "forgot_request" ? "Lupa Password" : "Reset Password";
  const description = view === "login"
    ? "Kelola penjualan dan stok toko dalam satu tempat."
    : view === "forgot_request"
      ? "Masukkan nomor WhatsApp yang terdaftar untuk menerima kode OTP."
      : "Masukkan kode 6 digit yang kami kirim, lalu buat password baru.";

  return (
    <main className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-slate-50/60 dark:bg-slate-950">
      {/* Ambient background glows */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

      {/* Symmetrical Frosted Glass Card */}
      <section className="relative w-full max-w-[380px] sm:max-w-md rounded-3xl border border-white/70 dark:border-white/10 bg-card/90 dark:bg-card/80 p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150">
        <header className="pb-5 text-center">
          <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            {view === "login" ? <Building2 className="h-5 w-5" /> : view === "forgot_request" ? <Smartphone className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">ProMaterial</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">{heading}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </header>

        <div>
          {view === "login" && (
            <form onSubmit={handleLogin} className="flex flex-col">
              <div className="space-y-3.5">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 sm:h-11 rounded-xl border-border/70 bg-background/60 focus:bg-background px-3.5 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
                    <button
                      type="button"
                      onClick={() => setView("forgot_request")}
                      className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 sm:h-11 rounded-xl border-border/70 bg-background/60 focus:bg-background px-3.5 pr-10 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="mt-5 h-10 sm:h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/25 hover:shadow-lg active:scale-[0.98] transition-all"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Masuk ke Dashboard"}
              </Button>
            </form>
          )}

          {view === "forgot_request" && (
            <form onSubmit={handleForgotRequest} className="flex flex-col">
              <div className="space-y-2 text-left">
                <Label htmlFor="phone" className="text-xs font-semibold text-foreground">Nomor WhatsApp</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Contoh: 6281234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 sm:h-11 rounded-xl border-border/70 bg-background/60 focus:bg-background px-3.5 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                  required
                />
                <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Nomor hanya digunakan untuk verifikasi.
                </p>
              </div>
              <Button
                type="submit"
                className="mt-5 h-10 sm:h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/25 hover:shadow-lg active:scale-[0.98] transition-all"
                disabled={loading}
              >
                {loading ? "Mengirim..." : "Kirim OTP"}
              </Button>
              <BackButton onClick={() => setView("login")}>Kembali ke Login</BackButton>
            </form>
          )}

          {view === "forgot_reset" && (
            <form onSubmit={handleForgotReset} className="flex flex-col">
              <div className="space-y-3.5">
                <div className="space-y-2 text-left">
                  <Label htmlFor="otp" className="text-xs font-semibold text-foreground">Kode OTP (6 Digit)</Label>
                  <InputOTP id="otp" aria-label="Kode OTP (6 Digit)" maxLength={6} inputMode="numeric" value={otp} onChange={setOtp} containerClassName="justify-between">
                    <InputOTPGroup className="w-full justify-between gap-2">
                      {Array.from({ length: 6 }, (_, index) => (
                        <InputOTPSlot key={index} index={index} className="h-10 sm:h-11 min-w-0 flex-1 rounded-xl border bg-background/60 text-base font-bold first:rounded-xl first:border last:rounded-xl" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="newPassword" className="text-xs font-semibold text-foreground">Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Minimal 8 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 sm:h-11 rounded-xl border-border/70 bg-background/60 focus:bg-background px-3.5 pr-10 text-sm transition-all focus:ring-2 focus:ring-primary/20"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
                      onClick={() => setShowNewPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="mt-5 h-10 sm:h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/25 hover:shadow-lg active:scale-[0.98] transition-all"
                disabled={loading}
              >
                {loading ? "Mereset..." : "Reset Password"}
              </Button>
              <BackButton onClick={() => setView("login")}>Batal &amp; Kembali ke Login</BackButton>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function BackButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
