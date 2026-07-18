import { useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getPermissions } from "../lib/permissions.js";

// Sourced from AuthContext's current mock user today; once a real backend
// exists this hook is the only place that needs to change (e.g. read
// permissions/claims straight off the decoded JWT instead of role -> map).
export function usePermissions() {
  const { user } = useAuth();
  return useMemo(() => getPermissions(user?.role), [user?.role]);
}
