import React from "react";
import { GlobalSearch } from "../GlobalSearch.jsx";
import { PropertySelector } from "../ui/PropertySelector.jsx";
import { ProfileMenu } from "../ui/ProfileMenu.jsx";

export function Topbar({ title, subtitle, hideSearch = false, hidePropertySelector = false }) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <h1 className="topbar__title display">{title}</h1>
        {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
      </div>
      <div className="topbar__right">
        {!hidePropertySelector && <PropertySelector />}
        {!hideSearch && <GlobalSearch />}
        <ProfileMenu />
      </div>
    </header>
  );
}
