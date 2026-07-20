import React, { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown } from "lucide-react";

export function MultiSelectChips({ options = [], value = [], onChange, placeholder = "Search..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const remove = (opt) => (e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== opt));
  };

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="multiselect" ref={ref}>
      <button type="button" className="multiselect__trigger" onClick={() => setOpen((o) => !o)}>
        <div className="multiselect__chips">
          {value.length === 0 && <span className="multiselect__placeholder">{placeholder}</span>}
          {value.map((v) => (
            <span key={v} className="tag-chip multiselect__chip">
              {v}
              <X size={11} strokeWidth={2.5} onClick={remove(v)} />
            </span>
          ))}
        </div>
        <ChevronDown size={15} strokeWidth={2} className="multiselect__chevron" />
      </button>
      {open && (
        <div className="multiselect__popover">
          <div className="multiselect__search">
            <Search size={13} strokeWidth={2} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter options..."
            />
          </div>
          <div className="multiselect__options">
            {filtered.length === 0 && <div className="multiselect__empty">No matches</div>}
            {filtered.map((opt) => (
              <label key={opt} className="multiselect__option">
                <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
