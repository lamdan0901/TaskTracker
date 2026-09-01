import { useState, type FormEvent } from "react";
import { fetchMe, login, register, toErrorMessage } from "../api";
import { setSession } from "../auth";
import type { AuthUser } from "../types";

type LoginFormProps = {
  onSuccess: (user: AuthUser) => void;
};

type Mode = "login" | "register";

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "register") {
        await register(trimmedEmail, password);
      }

      // Login and retrieve token
      const authRes = await login(trimmedEmail, password);
      setSession(authRes.accessToken, authRes.refreshToken);

      // Fetch user profile from /api/auth/me
      const profile = await fetchMe();
      setSession(authRes.accessToken, authRes.refreshToken, profile);

      onSuccess(profile);
    } catch (err) {
      const msg = toErrorMessage(
        err,
        mode === "login" ? "Login failed. Please check your credentials." : "Registration failed.",
      );
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">Security & Scoping</div>
          <h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Sign in to access your scoped tasks and categories."
              : "Register to get your own isolated workspace and tasks."}
          </p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => handleModeChange("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => handleModeChange("register")}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="alert auth-alert" role="alert">
            <svg
              className="alert-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              width="18"
              height="18"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="auth-email">Email address</label>
            <div className="auth-input-wrapper">
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-input-wrapper">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="auth-show-pass-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <div className="auth-input-wrapper">
                <input
                  id="auth-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner-label">
                <span className="auth-spinner" aria-hidden="true" />
                {mode === "login" ? "Signing In..." : "Creating Account..."}
              </span>
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "login" ? (
            <p>
              Don&apos;t have an account yet?{" "}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleModeChange("register")}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => handleModeChange("login")}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
