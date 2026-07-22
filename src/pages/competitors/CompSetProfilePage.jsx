import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Target, MapPin, Pencil, Copy, Archive, RotateCcw, Trash2, Plus, X, Users2, Award, Building2,
} from "lucide-react";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import { TagChips } from "../../components/ui/TagChips.jsx";
import { Textarea } from "../../components/ui/Input.jsx";
import { ConfirmModal, Modal } from "../../components/ui/Modal.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { Checkbox } from "../../components/ui/Checkbox.jsx";
import { formatDate } from "../../lib/format.js";
import { computeCompetitorReadiness } from "../../lib/competitorReadiness.js";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { CompSetForm } from "./CompSetForm.jsx";

function kpiRingVariant(pct) {
  return pct === 100 ? "success" : pct === 0 ? "danger" : "warning";
}

// Secondary, optional page — a Competitive Set's profile is just its
// details plus membership management. It never shows mapping/source/URL/
// validation tabs: those all belong directly to a Competitor now (see
// CompetitorProfilePage) and work identically whether or not this comp set
// even exists.
export function CompSetProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const toast = useToast();
  const permissions = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState([]);

  const compSet = data.compSets.find((g) => g.id === id);
  const property = compSet ? data.properties.find((p) => p.id === compSet.propertyId) : null;

  if (!compSet) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Competitive Sets", to: "/portal/comp-sets" }, { label: "Not found" }]} />
        <EmptyState icon={Target} title="Competitive set not found" message="It may have been deleted." action={<Button variant="secondary" onClick={() => navigate("/portal/comp-sets")}>Back to Competitive Sets</Button>} />
      </div>
    );
  }

  const memberCompSetCompetitorIds = useMemo(
    () => new Set(data.compSetMemberships.filter((m) => m.compSetId === compSet.id).map((m) => m.competitorId)),
    [data.compSetMemberships, compSet.id]
  );
  const memberCompetitors = useMemo(
    () => data.competitors.filter((c) => memberCompSetCompetitorIds.has(c.id)),
    [data.competitors, memberCompSetCompetitorIds]
  );
  const availableCompetitors = useMemo(
    () => data.competitors.filter((c) => c.propertyId === compSet.propertyId && c.status !== "Archived" && !memberCompSetCompetitorIds.has(c.id)),
    [data.competitors, compSet.propertyId, memberCompSetCompetitorIds]
  );

  // Comp Set Manager statistics — derived from each member competitor's own
  // mappings/sources, never stored on the comp set itself.
  const stats = useMemo(() => {
    const activeMembers = memberCompetitors.filter((c) => c.status !== "Archived");
    if (!activeMembers.length) return { mappingPct: 0, sourcePct: 0, readinessPct: 0 };
    let roomMapped = 0, ratePlanMapped = 0, sourceConfigured = 0, readinessSum = 0;
    for (const c of activeMembers) {
      const rm = data.roomMappings.filter((m) => m.competitorId === c.id);
      const rpm = data.ratePlanMappings.filter((m) => m.competitorId === c.id);
      const sc = data.sourceConfigs.filter((s) => s.competitorId === c.id);
      if (rm.length) roomMapped += 1;
      if (rpm.length) ratePlanMapped += 1;
      if (sc.some((s) => s.sourceUrl)) sourceConfigured += 1;
      readinessSum += computeCompetitorReadiness({ competitor: c, roomMappings: rm, ratePlanMappings: rpm, sourceConfigs: sc }).score;
    }
    return {
      mappingPct: Math.round(((roomMapped + ratePlanMapped) / (activeMembers.length * 2)) * 100),
      sourcePct: Math.round((sourceConfigured / activeMembers.length) * 100),
      readinessPct: Math.round(readinessSum / activeMembers.length),
    };
  }, [memberCompetitors, data.roomMappings, data.ratePlanMappings, data.sourceConfigs]);

  const handleSubmit = (form) => {
    data.updateCompSet({ ...compSet, ...form });
    toast.success(`${form.name} updated.`);
    setFormOpen(false);
  };

  const handleDuplicate = () => {
    const copy = data.duplicateCompSet(compSet);
    toast.info(`Duplicated as ${copy.id}, keeping the same members.`);
    navigate(`/portal/comp-sets/${copy.id}`);
  };

  const handleArchive = () => { data.archiveCompSet(compSet); toast.info(`${compSet.name} archived. Its member competitors are unaffected.`); };
  const handleRestore = () => { data.restoreCompSet(compSet); toast.success(`${compSet.name} restored.`); };
  const handleDeletePermanently = () => {
    data.deleteCompSetPermanently(compSet.id);
    toast.success(`${compSet.name} permanently deleted. Its member competitors were not affected.`);
    navigate("/portal/comp-sets");
  };

  const handleRemoveMember = (competitor) => {
    data.removeCompSetMembership(compSet.id, competitor.id);
    toast.info(`${competitor.hotelName} removed from ${compSet.name}.`);
  };

  const togglePicked = (id) => setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const handleAddMembers = () => {
    data.bulkAssignCompetitorsToCompSets(picked, [compSet.id]);
    toast.success(`Added ${picked.length} competitor(s) to ${compSet.name}.`);
    setPicked([]);
    setPickerOpen(false);
  };

  return (
    <div className="page-container--narrow">
      <Breadcrumbs
        items={[
          { label: "Properties", to: "/portal/properties" },
          ...(property ? [{ label: property.name, to: `/portal/properties/${property.id}` }] : []),
          { label: "Competitive Sets", to: "/portal/comp-sets" },
          { label: compSet.name },
        ]}
      />

      <Card>
        <div className="profile-header" style={{ marginBottom: 0 }}>
          <div className="property-thumb property-thumb--lg"><Target size={22} strokeWidth={2} /></div>
          <div className="profile-header__info">
            <div className="profile-header__title">{compSet.name}</div>
            <div className="profile-header__subtitle">
              <MapPin size={13} strokeWidth={2} /> {property?.name || "—"} &middot; {compSet.market || "No market set"}
              <span style={{ marginLeft: 8 }}><StatusBadge status={compSet.status} /></span>
            </div>
          </div>
          <div className="profile-header__actions">
            <Button variant="ghost" size="md" icon={Copy} onClick={handleDuplicate}>Duplicate</Button>
            {compSet.status !== "Archived" ? (
              <Button variant="ghost" size="md" icon={Archive} onClick={handleArchive}>Archive</Button>
            ) : (
              <>
                <Button variant="ghost" size="md" icon={RotateCcw} onClick={handleRestore}>Restore</Button>
                {permissions.canDeleteCompSetPermanently && (
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
          <Card className="stat-card">
            <div className="stat-card__icon"><Users2 size={20} strokeWidth={2} /></div>
            <div className="stat-card__body"><div className="stat-card__value tabular">{memberCompetitors.length}</div><div className="stat-card__label">Members</div></div>
          </Card>
          <Card className="stat-card">
            <div className={`kpi-ring kpi-ring--${kpiRingVariant(stats.mappingPct)}`} style={{ "--ring-pct": stats.mappingPct }}>
              <span className="kpi-ring__value tabular">{stats.mappingPct}%</span>
            </div>
            <div className="stat-card__body"><div className="stat-card__label">Mapping Complete</div></div>
          </Card>
          <Card className="stat-card">
            <div className={`kpi-ring kpi-ring--${kpiRingVariant(stats.sourcePct)}`} style={{ "--ring-pct": stats.sourcePct }}>
              <span className="kpi-ring__value tabular">{stats.sourcePct}%</span>
            </div>
            <div className="stat-card__body"><div className="stat-card__label">Source Coverage</div></div>
          </Card>
          <Card className="stat-card">
            <div className={`kpi-ring kpi-ring--${kpiRingVariant(stats.readinessPct)}`} style={{ "--ring-pct": stats.readinessPct }}>
              <span className="kpi-ring__value tabular">{stats.readinessPct}%</span>
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
        </div>
      </div>

      <div className="overview-grid">
        <div className="overview-grid__col">
          <Card>
            <div className="config-summary__section-title">
              <span className="config-summary__section-title-text">Competitive Set Details</span>
            </div>
            <div className="detail-grid">
              <div className="detail-field"><span>Property</span><strong>{property?.name || "—"}</strong></div>
              <div className="detail-field"><span>Market / Segment</span><strong>{compSet.market || "—"}</strong></div>
              <div className="detail-field"><span>Status</span><strong><StatusBadge status={compSet.status} /></strong></div>
              <div className="detail-field"><span>Last Modified</span><strong className="tabular">{formatDate(compSet.lastModifiedAt)}</strong></div>
            </div>
            <div className="detail-field" style={{ marginTop: "var(--space-3)" }}>
              <span>Tags</span><strong><TagChips tags={compSet.tags || []} /></strong>
            </div>
          </Card>

          <Card>
            <div className="config-summary__section-title">
              <span className="config-summary__section-title-text">Notes</span>
            </div>
            <Textarea
              placeholder="Add internal notes about this competitive set..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <div style={{ marginTop: 10 }}>
              <Button variant="primary" size="sm" onClick={() => toast.success("Notes saved (session only).")}>Save Notes</Button>
            </div>
          </Card>
        </div>

        <div className="overview-grid__col">
          <Card>
            <div className="config-summary__section-title">
              <span className="config-summary__section-title-text">Member Competitors</span>
              <button type="button" className="config-summary__view-all" onClick={() => setPickerOpen(true)} disabled={availableCompetitors.length === 0}>
                <Plus size={12} strokeWidth={2} style={{ verticalAlign: -2, marginRight: 2 }} />Add Members
              </button>
            </div>
            <p className="master-manager__hint" style={{ marginBottom: 16 }}>
              This competitive set only organizes references to competitors — it never owns their configuration. A competitor
              can belong to any number of competitive sets at once, and removing one here only removes that reference: the
              competitor, its room/rate plan mappings, sources, URLs, notes, and readiness all stay fully intact.
            </p>
            {memberCompetitors.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No members yet"
                message="Add existing competitors from this property to this competitive set."
                action={<Button variant="secondary" size="sm" icon={Plus} onClick={() => setPickerOpen(true)} disabled={availableCompetitors.length === 0}>Add Members</Button>}
              />
            ) : (
              <div className="master-manager__list">
                {memberCompetitors.map((c) => (
                  <div key={c.id} className="master-manager__row">
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/portal/competitors/${c.id}`)}>
                      <span className="master-manager__name">{c.hotelName}</span>
                      <div className="table__cell-muted">{c.city} &middot; {property?.name || "—"}</div>
                    </div>
                    <button type="button" className="master-manager__icon-btn master-manager__icon-btn--danger" onClick={() => handleRemoveMember(c)} aria-label={`Remove ${c.hotelName}`}>
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <CompSetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={compSet}
        properties={property ? [property] : []}
        scopePropertyId={compSet.propertyId}
      />

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add Competitors to Competitive Set" size="sm"
        footer={
          <>
            <button className="btn btn--ghost btn--md" type="button" onClick={() => setPickerOpen(false)}>Cancel</button>
            <Button variant="primary" size="md" onClick={handleAddMembers} disabled={picked.length === 0}>Add {picked.length || ""} Competitor{picked.length === 1 ? "" : "s"}</Button>
          </>
        }
      >
        {availableCompetitors.length === 0 ? (
          <EmptyState icon={Building2} title="No other competitors available" message="Every active competitor under this property already belongs to this competitive set." />
        ) : (
          <div className="master-manager__list">
            {availableCompetitors.map((c) => {
              const checked = picked.includes(c.id);
              return (
                <div key={c.id} className="master-manager__row" style={{ cursor: "pointer" }} onClick={() => togglePicked(c.id)}>
                  <Checkbox checked={checked} onChange={() => togglePicked(c.id)} label={c.hotelName} />
                  <span className="master-manager__name">{c.hotelName}</span>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeletePermanently}
        title="Delete Competitive Set Permanently"
        message={`"${compSet.name}" is archived. Permanently deleting it removes only the competitive set and its membership references — member competitors and their configuration are completely unaffected. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
