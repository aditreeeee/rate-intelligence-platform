import React, { useState } from "react";
import { SlidersHorizontal, ListChecks, BedDouble, Tag, PlugZap, Upload } from "lucide-react";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { CompetitorGeneralSettings } from "../competitors/CompetitorGeneralSettings.jsx";
import { ComparisonRulesSettings } from "../competitors/ComparisonRulesSettings.jsx";
import { CompetitorRoomMappingSettings } from "../competitors/CompetitorRoomMappingSettings.jsx";
import { CompetitorRatePlanMappingSettings } from "../competitors/CompetitorRatePlanMappingSettings.jsx";
import { CompetitorSourceSettings } from "../competitors/CompetitorSourceSettings.jsx";
import { CompetitorImportExportSettings } from "../competitors/CompetitorImportExportSettings.jsx";

const SUB_TABS = [
  { key: "general", label: "General", icon: SlidersHorizontal },
  { key: "comparisonRules", label: "Comparison Rules", icon: ListChecks },
  { key: "roomMapping", label: "Room Mapping", icon: BedDouble },
  { key: "ratePlanMapping", label: "Rate Plan Mapping", icon: Tag },
  { key: "sources", label: "Sources & URL Validation", icon: PlugZap },
  { key: "importExport", label: "Import & Export", icon: Upload },
];

// Configuration Settings — a dedicated top-level category inside the main
// Settings module (not a separate Phase 2 page/route) holding only
// competitor-configuration preferences: Comparison Rules, Room/Rate Plan
// Mapping defaults, Source Configuration + URL validation, and Import/Export
// preferences. Deliberately excludes Appearance — density/accent are
// app-wide and already live in Settings' own Appearance tab.
export function CompetitorConfigSettings() {
  const [active, setActive] = useState("general");

  return (
    <div>
      <div className="page-section">
        <Tabs tabs={SUB_TABS} active={active} onChange={setActive} />
      </div>
      {active === "general" && <CompetitorGeneralSettings />}
      {active === "comparisonRules" && <ComparisonRulesSettings />}
      {active === "roomMapping" && <CompetitorRoomMappingSettings />}
      {active === "ratePlanMapping" && <CompetitorRatePlanMappingSettings />}
      {active === "sources" && <CompetitorSourceSettings />}
      {active === "importExport" && <CompetitorImportExportSettings />}
    </div>
  );
}
