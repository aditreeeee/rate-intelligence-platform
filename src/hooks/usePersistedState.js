import { useState } from "react";

const PREFIX = "ratebuzz.";

export function usePersistedState(key, defaultValue) {
  const storageKey = PREFIX + key;
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistedState = (next) => {
    setState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // storage unavailable — state still updates in memory
      }
      return value;
    });
  };

  return [state, setPersistedState];
}
