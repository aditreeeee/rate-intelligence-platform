import React, { useMemo } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { ConnectionStatus } from "../../components/ui/ConnectionStatus.jsx";
import { useData } from "../../context/DataContext.jsx";
import { computeCompetitorReadiness } from "../../lib/competitorReadiness.js";

const SUGGESTIONS = {
  info: "Fill in country, city, and either a website or an OTA URL.",
  roomMapping: "Map at least one internal room to this competitor in Room Mapping.",
  ratePlanMapping: "Map at least one internal rate plan to this competitor in Rate Plan Mapping.",
  sourceUrls: "Configure a collection source with a URL in Source Configuration.",
};

// Every failing check links to the tab that fixes it.
const CHECK_TAB = { info: "overview", roomMapping: "roomMapping", ratePlanMapping: "ratePlanMapping", sourceUrls: "sources" };

// Module 7 — Validation Center. Belongs directly to a Competitor, not to a
// Comparison Group. A pure readiness readout, not a dashboard: no pricing,
// no history, no trends — just "is this competitor configured enough for
// Phase 3 to eventually collect rates against."
export function ValidationTab({ competitor, onNavigateTab }) {
  const data = useData();

  const readiness = useMemo(
    () =>
      computeCompetitorReadiness({
        competitor,
        roomMappings: data.roomMappings.filter((m) => m.competitorId === competitor.id),
        ratePlanMappings: data.ratePlanMappings.filter((m) => m.competitorId === competitor.id),
        sourceConfigs: data.sourceConfigs.filter((s) => s.competitorId === competitor.id),
      }),
    [competitor, data.roomMappings, data.ratePlanMappings, data.sourceConfigs]
  );

  const overallVariant = readiness.score === 100 ? "success" : readiness.score >= 50 ? "warning" : "danger";
  const overallLabel = readiness.score === 100 ? "Ready" : readiness.score >= 50 ? "Needs Attention" : "Not Ready";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" }}>
          <div className={`readiness-ring readiness-ring--${overallVariant}`} style={{ "--ring-pct": readiness.score }}>
            <span className="readiness-ring__value tabular">{readiness.score}%</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Configuration Readiness — {overallLabel}</div>
            <p className="settings-section__desc" style={{ marginTop: 4 }}>
              A readiness score, not a pricing metric — it tracks how completely this competitor's rooms and rate
              plans have been mapped to the benchmark property's own rooms and rate plans, ahead of Phase 3's rate collection.
            </p>
            <div style={{ marginTop: 8 }}>
              <ConnectionStatus label="Phase 3 Collection Service" />
            </div>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: 20 }}>
          <div className="master-manager__list">
            {readiness.checks.map((check) => (
              <div key={check.key} className="master-manager__row" style={{ alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {check.passed ? (
                    <CheckCircle2 size={18} strokeWidth={2} style={{ color: "var(--color-success)" }} />
                  ) : (
                    <AlertTriangle size={18} strokeWidth={2} style={{ color: "var(--color-warning)" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="master-manager__name">{check.label}</div>
                  {!check.passed && <div className="table__cell-muted">{SUGGESTIONS[check.key]}</div>}
                </div>
                {!check.passed && onNavigateTab && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNavigateTab(CHECK_TAB[check.key])}>
                    Fix it <ArrowRight size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
