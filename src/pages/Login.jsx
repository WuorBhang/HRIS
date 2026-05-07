import { useState } from "react";
import { useLocation } from "wouter";
import { sendPasswordResetEmail } from "firebase/auth";
import { Users, Lock, FileText, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

export default function Login() {
  const { signIn } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setPending(false);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.code === "pending_approval") {
        setPending(true);
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Sign in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError(
        "Enter your email above first, then click Forgot your password?",
      );
      return;
    }
    setShowReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(`Password reset link sent to ${email.trim()}. Check your inbox.`);
      // Note: we can't audit unauthenticated reset requests because
      // Firestore rules require performedBy == auth.uid for activity_logs.
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account exists for that email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email.");
      } else {
        setError(err.message || "Could not send reset email.");
      }
    } finally {
      setShowReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex items-center px-4 sm:px-6 lg:px-16 py-6 sm:py-10">
      {/* Mobile-only: SafiHub logo + login card */}
      <div className="lg:hidden w-full max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="bg-accent w-11 h-11 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-accent-foreground" />
          </div>
          <div className="text-xl font-bold leading-tight">SafiHub HRIS</div>
        </div>
        <div className="bg-card text-card-foreground rounded-lg shadow-xl p-6">
          <LoginCardContent
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
            info={info}
            pending={pending}
            loading={loading}
            showReset={showReset}
            handleSubmit={handleSubmit}
            handleReset={handleReset}
          />
        </div>
      </div>

      {/* Desktop / large-tablet: full split layout with marketing copy */}
      <div className="hidden lg:grid w-full max-w-6xl mx-auto lg:grid-cols-2 gap-12 items-center">
        {/* Left: brand + marketing */}
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-accent w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <div className="text-xl font-bold leading-tight">
                HRIS Platform
              </div>
              <div className="text-sm text-white/70">
                Human Resource Information System
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Manage your workforce
            <br />
            with confidence
          </h1>
          <p className="text-white/80 mb-8 max-w-md">
            A secure, role-based HR platform for employers to manage employee
            records, documents, and access controls.
          </p>

          <ul className="space-y-3 max-w-md">
            <Feature
              icon={<Lock className="w-4 h-4 text-accent" />}
              text="Role-based access control (Admin, Employer, Employee)"
            />
            <Feature
              icon={<ShieldCheck className="w-4 h-4 text-accent" />}
              text="Full employee lifecycle management"
            />
            <Feature
              icon={<FileText className="w-4 h-4 text-accent" />}
              text="Secure document storage & retrieval"
            />
          </ul>
        </div>

        {/* Right: sign-in card */}
        <div className="bg-card text-card-foreground rounded-lg shadow-xl p-8">
          <LoginCardContent
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
            info={info}
            pending={pending}
            loading={loading}
            showReset={showReset}
            handleSubmit={handleSubmit}
            handleReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}

function LoginCardContent({
  email,
  setEmail,
  password,
  setPassword,
  error,
  info,
  pending,
  loading,
  showReset,
  handleSubmit,
  handleReset,
}) {
  return (
    <>
      <h2 className="text-2xl font-bold text-primary mb-1">Welcome back</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Sign in to your account to continue
      </p>

      {pending && (
        <div className="mb-4 p-3 rounded-md border border-accent/40 bg-accent/10 text-sm">
          <p className="font-semibold text-accent">Awaiting admin approval</p>
          <p className="text-foreground/80 mt-1">
            Your account has been created but is not yet approved. Please wait
            for the admin to approve it before signing in.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      {info && (
        <div className="mb-4 p-3 rounded-md border border-green-300 bg-green-50 text-sm text-green-700">
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Email address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            placeholder="email.address@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-card focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            placeholder="Your Password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Signing in" : "Sign in"}
        </button>
      </form>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={handleReset}
          disabled={showReset}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {showReset ? "Sendingâ€¦" : "Forgot your password?"}
        </button>
      </div>
    </>
  );
}

function Feature({ icon, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="text-sm text-white/90">{text}</span>
    </li>
  );
}
