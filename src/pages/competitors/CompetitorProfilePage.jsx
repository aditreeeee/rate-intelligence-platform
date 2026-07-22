import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building2, MapPin, Pencil, Copy, Archive, RotateCcw, Trash2, Award,
  LayoutGrid, BedDouble, Tag as TagIcon, PlugZap, ShieldCheck, StickyNote, History,
  CheckCircle2, AlertTriangle, ArrowRight, ListChecks, Activity, Globe, Star, MapPinned, FolderCog,
} from "lucide-react";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { StatusBadge, Badge } from "../../components/ui/Badge.jsx";
import { Textarea } from "../../components/ui/Input.jsx";
import { ConfirmModal, Modal } from "../../components/ui/Modal.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { formatDate } from "../../lib/format.js";
import { computeCompetitorReadiness, computeRecentActivity } from "../../lib/competitorReadiness.js";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { CompetitorForm } from "./CompetitorForm.jsx";
import { RoomMappingTab } from "./RoomMappingTab.jsx";
import { RatePlanMappingTab } from "./RatePlanMappingTab.jsx";
import { SourcesTab } from "./SourcesTab.jsx";
import { ValidationTab } from "./ValidationTab.jsx";
import { CompetitorCompSetsTab } from "./CompetitorCompSetsTab.jsx";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "roomMapping", label: "Room Mapping", icon: BedDouble },
  { key: "ratePlanMapping", label: "Rate Plan Mapping", icon: TagIcon },
  { key: "sources", label: "Sources", icon: PlugZap },
  { key: "validation", label: "Validation", icon: ShieldCheck },
  { key: "compsets", label: "Comp Sets", icon: FolderCog },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "audit", label: "Audit Information", icon: History },
];

const ACTIVITY_ICON = { competitor: Building2, roomMapping: BedDouble, ratePlanMapping: TagIcon, sourceConfig: PlugZap };

function kpiRingVariant(pct) {
  return pct === 100 ? "success" : pct === 0 ? "danger" : "warning";
}

// Room/Rate Plan Mapping, Source Configuration, URL Manager, Validation,
// Notes, Configuration Readiness, and Audit History all belong directly to
// a Competitor — this page works identically whether or not the competitor
// belongs to any Competitive Set. The benchmark is never this competitor:
// it's always the Phase 1 Property record it's scoped under (`property`
// below) — every mapping tab compares this competitor's rooms/rate plans
// against that property's own rooms/rate plans, never property vs. property.
export function CompetitorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const toast = useToast();
  const permissions = usePermissions();
  const [active, setActive] = useState("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState("");
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  const competitor = data.competitors.find((c) => c.id === id);
  const property = competitor ? data.properties.find((p) => p.id === competitor.propertyId) : null;

  if (!competitor) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Competitors", to: "/portal/competitors" }, { label: "Not found" }]} />
        <EmptyState icon={Building2} title="Competitor not found" message="It may have been deleted." action={<Button variant="secondary" onClick={() => navigate("/portal/competitors")}>Back to Competitors</Button>} />
      </div>
    );
  }

  const roomMappings = data.roomMappings.filter((m) => m.competitorId === competitor.id);
  const ratePlanMappings = data.ratePlanMappings.filter((m) => m.competitorId === competitor.id);
  const sourceConfigs = data.sourceConfigs.filter((s) => s.competitorId === competitor.id);
  const compSetCount = data.compSetMemberships.filter((m) => m.competitorId === competitor.id).length;

  const readiness = useMemo(
    () => computeCompetitorReadiness({ competitor, roomMappings, ratePlanMappings, sourceConfigs }),
    [competitor, roomMappings, ratePlanMappings, sourceConfigs]
  );
  const recentActivityAll = useMemo(
    () => computeRecentActivity({ competitor, roomMappings, ratePlanMappings, sourceConfigs }, 30),
    [competitor, roomMappings, ratePlanMappings, sourceConfigs]
  );
  const recentActivity = recentActivityAll.slice(0, 6);

  const handleSubmit = (form) => {
    data.updateCompetitor({ ...competitor, ...form });
    toast.success(`${form.hotelName} updated.`);
    setFormOpen(false);
  };

  const handleDuplicate = () => {
    const copy = data.duplicateCompetitor(competitor);
    toast.info(`Duplicated as ${copy.id}.`);
    navigate(`/portal/competitors/${copy.id}`);
  };

  const handleArchive = () => { data.archiveCompetitor(competitor); toast.info(`${competitor.hotelName} archived.`); };
  const handleRestore = () => { data.restoreCompetitor(competitor); toast.success(`${competitor.hotelName} restored.`); };
  const handleDeletePermanently = () => {
    data.deleteCompetitorPermanently(competitor.id);
    toast.success(`${competitor.hotelName} permanently deleted.`);
    navigate("/portal/competitors");
  };

  const renderActivityRow = (entry) => {
    const EntryIcon = ACTIVITY_ICON[entry.type] || Activity;
    return (
      <div key={entry.key} className="activity-feed__item">
        <span className="activity-feed__icon"><EntryIcon size={13} strokeWidth={2} /></span>
        <div className="activity-feed__body">
          <div className="activity-feed__label">
            <strong>{entry.label}</strong> <span className="table__cell-muted">({entry.meta})</span>
          </div>
          <div className="activity-feed__meta">{entry.by} &middot; {formatDate(entry.at)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container--narrow">
      <Breadcrumbs
        items={[
          { label: "Properties", to: "/portal/properties" },
          ...(property ? [{ label: property.name, to: `/portal/properties/${property.id}` }] : []),
          { label: "Competitors", to: "/portal/competitors" },
          { label: competitor.hotelName },
        ]}
      />

      <Card>
        <div className="profile-header" style={{ marginBottom: 0 }}>
          <div className="property-thumb property-thumb--lg"><Building2 size={22} strokeWidth={2} /></div>
          <div className="profile-header__info">
            <div className="profile-header__title">{competitor.hotelName}</div>
            <div className="profile-header__subtitle">
              <MapPin size={13} strokeWidth={2} /> Benchmarked against {property?.name || "—"} &middot; {competitor.city}, {competitor.country}
              <span style={{ marginLeft: 8 }}><StatusBadge status={competitor.status} /></span>
            </div>
          </div>
          <div className="profile-header__actions">
            <Button variant="ghost" size="md" icon={Copy} onClick={handleDuplicate}>Duplicate</Button>
            {competitor.status !== "Archived" ? (
              <Button variant="ghost" size="md" icon={Archive} onClick={handleArchive}>Archive</Button>
            ) : (
              <>
                <Button variant="ghost" size="md" icon={RotateCcw} onClick={handleRestore}>Restore</Button>
                {permissions.canManageCompetitors && (
                  <Button variant="danger" size="md" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete Permanently</Button>
                )}
              </>
            )}
            <Button variant="primary" size="md" icon={Pencil} onClick={() => setFormOpen(true)}>Edit</Button>
          </div>
        </div>
      </Card>

      <div className="page-section" style={{ marginTop: "var(--space-5)" }}>
        <div className="stat-row stat-row--kpi">
          <Card className="stat-card stat-card--clickable" role="button" tabIndex={0} onClick={() => setActive("validation")} onKeyDown={(e) => e.key === "Enter" && setActive("validation")}>
            <div className={`kpi-ring kpi-ring--${kpiRingVariant(readiness.score)}`} style={{ "--ring-pct": readiness.score }}>
              <span className="kpi-ring__value tabular">{readiness.score}%</span>
            </div>
            <div className="stat-card__body"><div className="stat-card__label">Readiness</div></div>
          </Card>
          <Card
            className="stat-card stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => property && navigate(`/portal/properties/${property.id}`)}
            onKeyDown={(e) => e.key === "Enter" && property && navigate(`/portal/properties/${property.id}`)}
          >
            <div className="stat-card__icon"><Award size={20} strokeWidth={2} /></div>
            <div className="stat-card__body"><div className="stat-card__value stat-card__value--text">{property?.name || "—"}</div><div className="stat-card__label">Benchmark Property</div></div>
          </Card>
          <Card className="stat-card stat-card--clickable" role="button" tabIndex={0} onClick={() => setActive("roomMapping")} onKeyDown={(e) => e.key === "Enter" && setActive("roomMapping")}>
            <div className="stat-card__icon"><BedDouble size={20} strokeWidth={2} /></div>
            <div className="stat-card__body"><div className="stat-card__value tabular">{roomMappings.length}</div><div className="stat-card__label">Room Mappings</div></div>
          </Card>
          <Card className="stat-card stat-card--clickable" role="button" tabIndex={0} onClick={() => setActive("ratePlanMapping")} onKeyDown={(e) => e.key === "Enter" && setActive("ratePlanMapping")}>
            <div className="stat-card__icon"><TagIcon size={20} strokeWidth={2} /></div>
            <div className="stat-card__body"><div className="stat-card__value tabular">{ratePlanMappings.length}</div><div className="stat-card__label">Rate Plan Mappings</div></div>
          </Card>
          <Card className="stat-card stat-card--clickable" role="button" tabIndex={0} onClick={() => setActive("sources")} onKeyDown={(e) => e.key === "Enter" && setActive("sources")}>
            <div className="stat-card__icon"><PlugZap size={20} strokeWidth={2} /></div>
            <div className="stat-card__body"><div className="stat-card__value tabular">{sourceConfigs.length}</div><div className="stat-card__label">Sources</div></div>
          </Card>
          <Card className="stat-card stat-card--clickable" role="button" tabIndex={0} onClick={() => setActive("compsets")} onKeyDown={(e) => e.key === "Enter" && setActive("compsets")}>
            <div className="stat-card__icon"><FolderCog size={20} strokeWidth={2} /></div>
            <div className="stat-card__body"><div className="stat-card__value tabular">{compSetCount}</div><div className="stat-card__label">Comp Sets</div></div>
          </Card>
        </div>
      </div>

      <div className="page-section page-section--sticky-tabs">
        <Tabs tabs={TABS} active={active} onChange={setActive} />
      </div>

      {active === "overview" && (
        <div className="overview-grid">
          <div className="overview-grid__col">
            <Card>
              <div className="config-summary__section-title">
                <span className="config-summary__section-title-text"><LayoutGrid size={14} strokeWidth={2} /> Competitor Details</span>
              </div>
              <div className="detail-grid">
                <div className="detail-field"><span><Star size={11} strokeWidth={2} style={{ verticalAlign: -1, marginRight: 3 }} />Star Rating</span><strong className="tabular">{competitor.starRating || "—"}★</strong></div>
                <div className="detail-field"><span><MapPinned size={11} strokeWidth={2} style={{ verticalAlign: -1, marginRight: 3 }} />Location</span><strong>{competitor.city}, {competitor.state ? `${competitor.state}, ` : ""}{competitor.country}</strong></div>
                <div className="detail-field"><span>Distance</span><strong className="tabular">{competitor.distance !== "" && competitor.distance != null ? `${competitor.distance} km` : "—"}</strong></div>
                <div className="detail-field"><span><Globe size={11} strokeWidth={2} style={{ verticalAlign: -1, marginRight: 3 }} />Website</span><strong>{competitor.website ? <a href={competitor.website} target="_blank" rel="noreferrer">Visit</a> : "—"}</strong></div>
                <div className="detail-field"><span>Priority</span><strong><Badge variant={competitor.priority === "High" ? "danger" : competitor.priority === "Medium" ? "warning" : "info"}>{competitor.priority}</Badge></strong></div>
                <div className="detail-field"><span>Status</span><strong><StatusBadge status={competitor.status} /></strong></div>
                <div className="detail-field"><span>Last Modified</span><strong className="tabular">{formatDate(readiness.lastModifiedAt)}</strong></div>
              </div>
            </Card>

            <Card>
              <div className="config-summary__section-title">
                <span className="config-summary__section-title-text"><Award size={14} strokeWidth={2} /> Benchmark Property</span>
              </div>
              <p className="master-manager__hint" style={{ marginBottom: 12 }}>
                Every mapping, source, and validation check for this competitor compares against {property?.name || "your property"}'s own rooms and
                rate plans — never property vs. property. Competitors can never be set as the benchmark; it's always one of your own managed properties.
              </p>
              {property ? (
                <Button variant="secondary" size="sm" icon={Building2} onClick={() => navigate(`/portal/properties/${property.id}`)}>
                  View {property.name}
                </Button>
              ) : (
                <div className="table__cell-muted">Reference property not found.</div>
              )}
            </Card>

            <Card>
              <div className="config-summary__section-title">
                <span className="config-summary__section-title-text"><ListChecks size={14} strokeWidth={2} /> Quick Summary</span>
              </div>
              <div className="detail-grid">
                <div className="detail-field"><span>Room Mappings</span><strong className="tabular">{roomMappings.length}</strong></div>
                <div className="detail-field"><span>Rate Plan Mappings</span><strong className="tabular">{ratePlanMappings.length}</strong></div>
                <div className="detail-field"><span>Sources Configured</span><strong className="tabular">{sourceConfigs.length}</strong></div>
                <div className="detail-field"><span>Competitive Sets</span><strong className="tabular">{compSetCount}</strong></div>
              </div>
            </Card>
          </div>

          <div className="overview-grid__col">
            <Card>
              <div className="config-summary__section-title">
                <span className="config-summary__section-title-text"><CheckCircle2 size={14} strokeWidth={2} /> Configuration Readiness</span>
                <button type="button" className="config-summary__view-all" onClick={() => setActive("validation")}>Full Checklist</button>
              </div>
              <div className="readiness-checklist">
                {readiness.checks.map((check) => (
                  <div key={check.key} className="readiness-checklist__row">
                    {check.passed ? (
                      <CheckCircle2 size={14} strokeWidth={2} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                    ) : (
                      <AlertTriangle size={14} strokeWidth={2} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                    )}
                    <span className="readiness-checklist__label">{check.label}</span>
                    <Badge variant={check.passed ? "success" : "warning"}>{check.passed ? "Done" : "Pending"}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="config-summary__section-title">
                <span className="config-summary__section-title-text"><AlertTriangle size={14} strokeWidth={2} /> Missing Configuration Items</span>
              </div>
              {readiness.missingItems.length === 0 ? (
                <div className="all-clear">
                  <CheckCircle2 size={16} strokeWidth={2} /> Everything required is configured — ready for Phase 3.
                </div>
              ) : (
                <div className="missing-items-list">
                  {readiness.missingItems.map((item) => (
                    <div key={item.key} className={`missing-item missing-item--${item.severity}`}>
                      <AlertTriangle size={14} strokeWidth={2} className="missing-item__icon" />
                      <div className="missing-item__body">
                        <div className="missing-item__label">{item.label}</div>
                        <div className="missing-item__hint">{item.hint}</div>
                      </div>
                      <button type="button" className="btn btn--ghost btn--sm missing-item__action" onClick={() => setActive(item.tab)}>
                        Fix <ArrowRight size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <Card>
              <div className="config-summary__section-title">
                <span className="config-summary__section-title-text"><Activity size={14} strokeWidth={2} /> Recent Activity</span>
                {recentActivityAll.length > 6 && (
                  <button type="button" className="config-summary__view-all" onClick={() => setActivityModalOpen(true)}>View All</button>
                )}
              </div>
              {recentActivity.length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" message="Changes to this competitor's mappings, sources, and URLs will show up here." />
              ) : (
                <div className="activity-feed">{recentActivity.map(renderActivityRow)}</div>
              )}
            </Card>
          </div>
        </div>
      )}

      {active === "roomMapping" && <RoomMappingTab competitor={competitor} />}
      {active === "ratePlanMapping" && <RatePlanMappingTab competitor={competitor} />}
      {active === "sources" && <SourcesTab competitor={competitor} />}
      {active === "validation" && <ValidationTab competitor={competitor} onNavigateTab={setActive} />}
      {active === "compsets" && <CompetitorCompSetsTab competitor={competitor} />}

      {active === "notes" && (
        <Card>
          <div className="notes-panel">
            <Textarea
              placeholder="Add internal notes about this competitor..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
            />
            <div>
              <Button variant="primary" size="sm" onClick={() => toast.success("Notes saved (session only).")}>Save Notes</Button>
            </div>
            <p className="notes-panel__hint">Notes are kept in this session only — a real notes/audit endpoint will replace this once the backend exists.</p>
          </div>
        </Card>
      )}

      {active === "audit" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Competitor ID</span><strong className="tabular">{competitor.id}</strong></div>
            <div className="detail-field"><span>Property ID</span><strong className="tabular">{competitor.propertyId}</strong></div>
            <div className="detail-field"><span>Last Modified</span><strong className="tabular">{formatDate(competitor.lastModifiedAt)}</strong></div>
            <div className="detail-field"><span>Last Modified By</span><strong>{competitor.lastModifiedBy || "—"}</strong></div>
          </div>
        </Card>
      )}

      <CompetitorForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={competitor} />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeletePermanently}
        title="Delete Competitor Permanently"
        message={`"${competitor.hotelName}" is archived. Permanently deleting it removes its mappings, sources, and URLs too — any Competitive Sets it belongs to are unaffected. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />

      <Modal open={activityModalOpen} onClose={() => setActivityModalOpen(false)} title="Recent Activity — Full History" size="md">
        <div className="activity-feed">{recentActivityAll.map(renderActivityRow)}</div>
      </Modal>
    </div>
  );
}
