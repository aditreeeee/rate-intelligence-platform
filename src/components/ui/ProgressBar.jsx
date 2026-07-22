import React from "react";
import { ArrowRight } from "lucide-react";

// Generic labeled progress bar — used wherever Phase 2 shows mapping/
// coverage completion as a percentage instead of a bare count (Room
// Mapping, Rate Plan Mapping, Source Coverage). `variant` follows the same
// success/warning/danger/info vocabulary as Badge so a bar at 100% reads as
// unambiguously "done" and a bar at 0% reads as unambiguously "needs work."
// `actionLabel`/`onAction` render a small "jump to the tab that fixes this"
// link, but only while incomplete — a finished bar has nothing left to fix.
export function ProgressBar({ label, value = 0, meta, variant, actionLabel = "Complete this", onAction }) {
  const pct = Math.max(0, Math.min(100, value));
  const resolvedVariant = variant || (pct === 100 ? "success" : pct === 0 ? "danger" : "warning");
  return (
    <div className="progress-bar">
      <div className="progress-bar__header">
        <div className="progress-bar__label-group">
          {label && <span className="progress-bar__label">{label}</span>}
          <span className={`progress-bar__pct progress-bar__pct--${resolvedVariant} tabular`}>{pct}%</span>
        </div>
        {meta && <span className="progress-bar__meta tabular">{meta}</span>}
      </div>
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill progress-bar__fill--${resolvedVariant}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {pct < 100 && onAction && (
        <button type="button" className="progress-bar__action" onClick={onAction}>
          {actionLabel} <ArrowRight size={11} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
