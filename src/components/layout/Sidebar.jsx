import React from "react";
import { NavLink } from "react-router-dom";
import { Building2, BedDouble, Tag, Settings, LogOut, Radar, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/portal/properties", label: "Properties", icon: Building2 },
  { to: "/portal/rooms", label: "Rooms", icon: BedDouble },
  { to: "/portal/rate-plans", label: "Rate Plans", icon: Tag },
  { to: "/portal/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ mobileOpen = false, onClose }) {
  const { logout } = useAuth();
  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">
          <Radar size={20} strokeWidth={2} />
        </div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-title">Rate Intelligence</span>
          <span className="sidebar__brand-sub">Platform</span>
        </div>
        <button className="sidebar__close" onClick={onClose} aria-label="Close navigation menu">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
          >
            <item.icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="sidebar__logout" onClick={logout}>
        <LogOut size={18} strokeWidth={2} />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}
