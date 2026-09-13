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
    <main className="relative min-h-screen min-h-dvh overflow-hidden bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:flex sm:items-center sm:justify-center sm:p-6">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <section className="relative mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col sm:min-h-0 sm:rounded-[2rem] sm:border sm:bg-card sm:p-8 sm:shadow-xl sm:shadow-slate-900/5">
        <header className="pb-9 pt-3 sm:pt-0">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              {view === "login" ? <Building2 className="h-6 w-6" /> : view === "forgot_request" ? <Smartphone className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Makmur POS</p>
              <p className="text-xs text-muted-foreground">Sistem operasional toko</p>
            </div>
          </div>
          <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight">{heading}</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        </header>

        <div className="flex-1">
          {view === "login" && (
            <form onSubmit={handleLogin} className="flex h-full flex-col">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-2xl border-slate-300 bg-card px-4 text-base sm:text-sm dark:border-border" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" onClick={() => setView("forgot_request")} className="min-h-11 px-1 text-xs font-bold text-primary active:opacity-70">Lupa Password?</button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-2xl border-slate-300 bg-card px-4 pr-12 text-base sm:text-sm dark:border-border" required minLength={6} />
                    <button type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button type="submit" className="mt-8 h-12 w-full rounded-full text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>{loading ? "Memproses..." : "Masuk ke Dashboard"}</Button>
            </form>
          )}

          {view === "forgot_request" && (
            <form onSubmit={handleForgotRequest} className="flex h-full flex-col">
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor WhatsApp</Label>
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Contoh: 6281234567890" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-2xl border-slate-300 bg-card px-4 text-base sm:text-sm dark:border-border" required />
                <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Nomor hanya digunakan untuk verifikasi.</p>
              </div>
              <Button type="submit" className="mt-8 h-12 w-full rounded-full text-base font-bold" disabled={loading}>{loading ? "Mengirim..." : "Kirim OTP"}</Button>
              <BackButton onClick={() => setView("login")}>Kembali ke Login</BackButton>
            </form>
          )}

          {view === "forgot_reset" && (
            <form onSubmit={handleForgotReset} className="flex h-full flex-col">
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="otp">Kode OTP (6 Digit)</Label>
                  <InputOTP id="otp" aria-label="Kode OTP (6 Digit)" maxLength={6} inputMode="numeric" value={otp} onChange={setOtp} containerClassName="justify-between">
                    <InputOTPGroup className="w-full justify-between gap-2">
                      {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} className="h-12 min-w-0 flex-1 rounded-xl border bg-card text-lg font-bold first:rounded-xl first:border last:rounded-xl" />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showNewPassword ? "text" : "password"} autoComplete="new-password" placeholder="Minimal 8 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-2xl border-slate-300 bg-card px-4 pr-12 text-base sm:text-sm dark:border-border" required minLength={8} />
                    <button type="button" aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"} onClick={() => setShowNewPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground">
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button type="submit" className="mt-8 h-12 w-full rounded-full text-base font-bold" disabled={loading}>{loading ? "Mereset..." : "Reset Password"}</Button>
              <BackButton onClick={() => setView("login")}>Batal &amp; Kembali ke Login</BackButton>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function BackButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{children}</button>;
}
