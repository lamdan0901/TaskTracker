import { memo } from "react";
import type { Theme } from "../hooks/useTheme";
import ThemeToggle from "./ThemeToggle";

type HeroProps = {
  totalCount: number;
  completedCount: number;
  remainingCount: number;
  theme: Theme;
  onToggleTheme: () => void;
};

function Hero({
  totalCount,
  completedCount,
  remainingCount,
  theme,
  onToggleTheme,
}: HeroProps) {
  return (
    <section className="hero-panel">
      <div className="hero-brand">
        <p className="eyebrow">TaskTracker</p>
        <h1>Task board</h1>
      </div>

      <div className="hero-controls">
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

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </section>
  );
}

export default memo(Hero);
