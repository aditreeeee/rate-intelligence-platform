import React, { useState, useMemo, useEffect } from "react";
import { SlidersHorizontal, LayoutList, PlugZap, Palette, Building2, BedDouble, Tag } from "lucide-react";
import { Topbar } from "../../components/layout/Topbar.jsx";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { INTEGRATION_DEFINITIONS } from "../../mocks/integrations.js";
import { IntegrationCard } from "./IntegrationCard.jsx";
import { GeneralSettings } from "./GeneralSettings.jsx";
import { DefaultsSettings } from "./DefaultsSettings.jsx";
import { AppearanceSettings } from "./AppearanceSettings.jsx";
import { PropertiesSettings } from "./PropertiesSettings.jsx";
import { RoomsSettings } from "./RoomsSettings.jsx";
import { RatePlansSettings } from "./RatePlansSettings.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";

// Full catalog of settings tabs. Which ones actually render is decided by
// permissions.canAccessSettingsSection(key) below — never by role checks
// scattered through this file.
const ALL_TABS = [
  { key: "general", label: "General", icon: SlidersHorizontal },
  { key: "defaults", label: "Defaults", icon: LayoutList },
  { key: "properties", label: "Properties", icon: Building2 },
  { key: "rooms", label: "Rooms", icon: BedDouble },
  { key: "ratePlans", label: "Rate Plans", icon: Tag },
  { key: "integrations", label: "Integrations", icon: PlugZap },
  { key: "appearance", label: "Appearance", icon: Palette },
];

export function SettingsPage() {
  const permissions = usePermissions();
  const tabs = useMemo(
    () => ALL_TABS.filter((t) => permissions.canAccessSettingsSection(t.key)),
    [permissions]
  );
  const [active, setActive] = useState(tabs[0]?.key || "general");

  useEffect(() => {
    if (!tabs.some((t) => t.key === active)) setActive(tabs[0]?.key || "general");
  }, [tabs, active]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <Topbar title="Settings" subtitle="Configure platform defaults and future integrations." hidePropertySelector />

      <div className="page-section">
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>

      {active === "general" && <GeneralSettings />}
      {active === "defaults" && <DefaultsSettings />}
      {active === "properties" && <PropertiesSettings />}
      {active === "rooms" && <RoomsSettings />}
      {active === "ratePlans" && <RatePlansSettings />}
      {active === "appearance" && <AppearanceSettings />}

      {active === "integrations" && permissions.canManageIntegrations && (
        <div className="integrations-grid">
          {INTEGRATION_DEFINITIONS.map((def) => (
            <IntegrationCard key={def.key} definition={def} />
          ))}
        </div>
      )}
    </div>
  );
}
