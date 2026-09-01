import { memo } from "react";
import type { Theme } from "../hooks/useTheme";
import type { AuthUser } from "../types";
import ThemeToggle from "./ThemeToggle";

type HeroProps = {
  totalCount?: number;
  completedCount?: number;
  remainingCount?: number;
  theme: Theme;
  onToggleTheme: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
  hideStats?: boolean;
};

function Hero({
  totalCount = 0,
  completedCount = 0,
  remainingCount = 0,
  theme,
  onToggleTheme,
  user,
  onLogout,
  hideStats = false,
}: HeroProps) {
  return (
    <section className="hero-panel">
      <div className="hero-brand">
        <p className="eyebrow">TaskTracker</p>
        <h1>Task board</h1>
      </div>

      <div className="hero-controls">
        {!hideStats && (
          <div className="stats">
            <div>
              <strong>{totalCount}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{completedCount}</strong>
              <span>Done</span>
            </div>
            <div>
              <strong>{remainingCount}</strong>
              <span>Open</span>
            </div>
          </div>
        )}

        {user && onLogout && (
          <div className="user-profile-badge">
            <div className="user-avatar" title={user.email}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            <span className="user-email-text" title={user.email}>
              {user.email}
            </span>
            <button
              type="button"
              className="user-logout-btn"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        )}

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </section>
  );
}

export default memo(Hero);

