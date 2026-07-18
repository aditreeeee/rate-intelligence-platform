import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { GlobalSearch } from "../GlobalSearch.jsx";

export function Topbar({ title, subtitle, hideSearch = false }) {
  const { user, accounts, loginAsAccount } = useAuth();
  const initials = (user?.username || "A").slice(0, 2).toUpperCase();
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title display">{title}</h1>
        {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
      </div>
      <div className="topbar__right">
        {!hideSearch && <GlobalSearch />}

        {/* Dev-only mock account switcher: stands in for real multi-account
            auth so both roles can be QA'd without a backend. */}
        {accounts?.length > 1 && (
          <select
            className="input select topbar__role-switch"
            style={{ maxWidth: 170, fontWeight: 700 }}
            value={user?.username || ""}
            onChange={(e) => loginAsAccount(e.target.value)}
            title="Switch mock account (demo only)"
            aria-label="Switch mock account"
          >
            {accounts.map((acct) => (
              <option key={acct.username} value={acct.username}>
                {acct.displayName}
              </option>
            ))}
          </select>
        )}

        <div className="topbar__user">
          <div className="topbar__avatar">{initials}</div>
          <div className="topbar__user-info">
            <span className="topbar__user-name">{user?.username}</span>
            <span className="topbar__user-role">{user?.displayName || "Portal User"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
