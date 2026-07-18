import React, { createContext, useContext, useState, useCallback } from "react";
import { ROLES } from "../lib/permissions.js";

const AuthContext = createContext(null);

// Mock credential directory. A real backend would replace this with an
// ASP.NET Identity + JWT exchange; `role` (and `ownerId` for scoped roles)
// would then come from the token's claims instead of this table.
export const MOCK_ACCOUNTS = [
  {
    username: "admin@ratebuzz.com",
    password: "Admin@123",
    role: ROLES.SUPER_ADMIN,
    ownerId: null,
    displayName: "Portal Administrator",
  },
  {
    username: "owner@ratebuzz.com",
    password: "Owner@123",
    role: ROLES.PROPERTY_OWNER,
    ownerId: "OWNER-1",
    displayName: "Property Owner",
  },
];

function toSessionUser(account) {
  const { password, ...rest } = account;
  return rest;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback((username, password) => {
    const match = MOCK_ACCOUNTS.find(
      (acct) => acct.username.toLowerCase() === username.trim().toLowerCase() && acct.password === password
    );
    if (match) {
      setUser(toSessionUser(match));
      return { ok: true };
    }
    return { ok: false, error: "Invalid username or password." };
  }, []);

  // Dev-only convenience: instantly switch the active mock session to
  // another seeded account, without a full logout/login round trip. This
  // stands in for "test as a different role" until real multi-account auth
  // exists; it is intentionally exposed only for QA/demo purposes.
  const loginAsAccount = useCallback((username) => {
    const match = MOCK_ACCOUNTS.find((acct) => acct.username === username);
    if (match) setUser(toSessionUser(match));
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loginAsAccount, accounts: MOCK_ACCOUNTS.map(toSessionUser) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
