import React, { useState, useMemo } from "react";
import { Search, Check, RotateCcw } from "lucide-react";
import { featureIcon as roomFeatureIcon } from "../../lib/roomFeatureIcons.js";

const SEARCH_THRESHOLD = 8;

export function FeatureChipGrid({
  label, options = [], value, onChange, multiple = true, resetValue, hint, getIcon = roomFeatureIcon,
}) {
  const [query, setQuery] = useState("");
  const selected = multiple ? (value || []) : value ? [value] : [];

  const filtered = useMemo(() => {
    const list = query ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : options;
    return [...list].sort((a, b) => Number(selected.includes(b)) - Number(selected.includes(a)));
  }, [options, query, selected.join("|")]);

  const toggle = (opt) => {
    if (multiple) {
      onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt]);
    } else {
      onChange(opt);
    }
  };

  const selectAll = () => onChange([...new Set([...selected, ...(query ? filtered : options)])]);
  const clearAll = () => onChange(multiple ? [] : "");
  const canReset = resetValue !== undefined && JSON.stringify(resetValue) !== JSON.stringify(value);
  const doReset = () => onChange(resetValue);

  return (
    <div className="feature-grid">
      <div className="feature-grid__header">
        <div className="feature-grid__title">
          {label}
          <span className="feature-grid__count">
            {multiple ? `${selected.length} selected` : (value || "Not set")}
          </span>
        </div>
        <div className="feature-grid__actions">
          {multiple && (
            <>
              <button type="button" className="feature-grid__action" onClick={selectAll}>Select All</button>
              <button type="button" className="feature-grid__action" onClick={clearAll}>Clear All</button>
            </>
          )}
          {canReset && (
            <button type="button" className="feature-grid__action feature-grid__action--reset" onClick={doReset}>
              <RotateCcw size={12} strokeWidth={2} /> Reset
            </button>
          )}
        </div>
      </div>
      {hint && <p className="field__hint" style={{ marginBottom: 10 }}>{hint}</p>}
      {options.length > SEARCH_THRESHOLD && (
        <div className="feature-grid__search">
          <Search size={13} strokeWidth={2} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} />
        </div>
      )}
      <div className="feature-grid__grid">
        {filtered.length === 0 && <div className="multiselect__empty">No matches</div>}
        {filtered.map((opt) => {
          const isSelected = selected.includes(opt);
          const Icon = getIcon(opt);
          return (
            <button
              key={opt}
              type="button"
              className={`feature-chip ${isSelected ? "feature-chip--selected" : ""}`}
              onClick={() => toggle(opt)}
              aria-pressed={isSelected}
            >
              <span className="feature-chip__icon"><Icon size={18} strokeWidth={2} /></span>
              <span className="feature-chip__label">{opt}</span>
              {isSelected && <Check size={14} strokeWidth={2.5} className="feature-chip__check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
