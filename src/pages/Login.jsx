import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, resetPassword } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      const msg = [
        "auth/invalid-credential",
        "auth/wrong-password",
        "auth/user-not-found",
      ].includes(err.code)
        ? "Invalid email or password."
        : err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4F72] to-[#154360] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left — branding */}
        <div className="text-white hidden lg:block">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#F39C12] rounded-xl flex items-center justify-center font-bold text-white text-lg">
              SH
            </div>
            <div>
              <p className="font-bold text-xl">SafiHub HRIS</p>
              <p className="text-blue-300 text-sm">
                Human Resource Information System
              </p>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Manage your workforce
            <br />
            <span className="text-[#F39C12]">with confidence.</span>
          </h1>
          <p className="text-blue-200 mb-8">
            A secure, role-based HR platform for managing domestic workers —
            leave, overtime, timesheets, and documents.
          </p>
          <div className="space-y-3 text-sm">
            {[
              ["🔒", "Role-based access: Admin, Employer, Employee"],
              ["📋", "Contract & leave management"],
              ["📊", "Monthly timesheet approvals with locking"],
              ["📄", "Secure PDF document storage"],
              ["🔍", "Full audit trail logging"],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-blue-100">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — login form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-[#F39C12] rounded-lg flex items-center justify-center font-bold text-white text-sm">
              SH
            </div>
            <span className="font-bold text-[#1B4F72]">SafiHub HRIS</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Sign in to your account to continue
          </p>

          {!showReset ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B4F72] hover:bg-[#154360] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-[#1B4F72] text-sm hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter your email and we'll send a password reset link.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>
              {resetSent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                  ✓ Reset link sent! Check your inbox.
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || resetSent}
                className="w-full bg-[#1B4F72] hover:bg-[#154360] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
              >
                Send Reset Link
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="text-gray-500 text-sm hover:underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
