import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

export function SearchBar({ value, onChange, placeholder = "Search...", debounceMs = 250, disabled = false }) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);

  // Keep local state in sync when the parent value changes externally (e.g. a "Reset" button).
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalValue(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  return (
    <div className="search-bar">
      <Search size={16} strokeWidth={2} className="search-bar__icon" />
      <input
        className="search-bar__input"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
