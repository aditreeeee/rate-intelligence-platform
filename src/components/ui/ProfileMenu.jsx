import React, { useRef, useState, useEffect } from "react";
import { ChevronDown, LogOut, Check, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

const ROLE_LABELS = { SuperAdmin: "Super Admin", PropertyOwner: "Property Owner" };

// Single compact profile menu — replaces the old always-visible avatar+name
// block plus a separate mock-account-switcher <select>, consolidating both
// into one trigger (avatar + name + chevron) with role/email/account
// switching moved into the dropdown panel, matching the pattern modern SaaS
// headers use (Microsoft 365, Jira, GitHub, Linear, Notion). Reuses the same
// popover shape (`global-search__panel`) and click-outside behavior as
// PropertySelector/GlobalSearch rather than inventing a new one.
export function ProfileMenu() {
  const { user, accounts, loginAsAccount, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = (user?.username || "A").slice(0, 2).toUpperCase();
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || "Portal User";

  const handleSwitch = (username) => {
    loginAsAccount(username);
    setOpen(false);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button type="button" className="profile-menu__trigger" onClick={() => setOpen((o) => !o)} aria-label="Open profile menu" aria-expanded={open}>
        <span className="profile-menu__avatar">{initials}</span>
        <span className="profile-menu__name">{user?.displayName || user?.username}</span>
        <ChevronDown size={14} strokeWidth={2} className={`profile-menu__chevron ${open ? "profile-menu__chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="profile-menu__panel global-search__panel">
          <div className="profile-menu__header">
            <span className="profile-menu__avatar profile-menu__avatar--lg">{initials}</span>
            <div className="profile-menu__header-info">
              <div className="profile-menu__header-name">{user?.displayName || user?.username}</div>
              <div className="profile-menu__header-email"><Mail size={11} strokeWidth={2} /> {user?.username}</div>
              <span className="badge badge--info profile-menu__role">{roleLabel}</span>
            </div>
          </div>

          {accounts?.length > 1 && (
            <>
              <div className="profile-menu__divider" />
              <div className="global-search__group-label" style={{ padding: "6px 10px 4px" }}>Switch Account (Demo)</div>
              {accounts.map((acct) => (
                <button key={acct.username} type="button" className="export-menu__item" onClick={() => handleSwitch(acct.username)}>
                  <span style={{ flex: 1 }}>{acct.displayName}</span>
                  {acct.username === user?.username && <Check size={14} strokeWidth={2.5} style={{ color: "var(--color-teal)" }} />}
                </button>
              ))}
            </>
          )}

          <div className="profile-menu__divider" />
          <button type="button" className="export-menu__item" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={2} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
