import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Pencil, Copy, Archive, RotateCcw, Trash2, Award, Building2, Users2,
  RotateCcw as ResetIcon, Upload, FolderCog, X, BedDouble, Tag as TagIcon, PlugZap,
} from "lucide-react";
import { Topbar } from "../../components/layout/Topbar.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { Pagination } from "../../components/ui/Pagination.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { StatusBadge, Badge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { Checkbox } from "../../components/ui/Checkbox.jsx";
import { BulkActionBar } from "../../components/ui/BulkActionBar.jsx";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { ExportMenu } from "../../components/ui/ExportMenu.jsx";
import { ImportWizard } from "../../components/ui/ImportWizard.jsx";
import { CompetitorFilterPanel } from "../../components/ui/CompetitorFilterPanel.jsx";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useSelection } from "../../hooks/useSelection.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { usePersistedState } from "../../hooks/usePersistedState.js";
import { formatDate } from "../../lib/format.js";
import { computeCompetitorReadiness, readinessBucket } from "../../lib/competitorReadiness.js";
import { PRIORITY_LEVELS } from "../../mocks/competitors.js";
import { CompetitorForm } from "./CompetitorForm.jsx";
import { GroupAssignModal } from "./GroupAssignModal.jsx";
import { GroupManagerModal } from "./GroupManagerModal.jsx";

const PAGE_SIZE = 10;

function kpiRingVariant(pct) {
  return pct === 100 ? "success" : pct === 0 ? "danger" : "warning";
}

// Module 1 (redesigned) — Competitors is Phase 2's primary workflow and
// homepage: Select Benchmark Property (the left filter panel) -> Add
// Competitor Hotels -> Room Mapping -> Rate Plan Mapping -> Source
// Configuration -> Validation, all owned directly by the competitor with
// zero requirement to belong to any Comparison Group. Groups are reachable
// from here only as an optional filter facet plus the "Manage Comparison
// Groups" toolbar action (create/rename/archive/delete inline, via
// GroupManagerModal, without ever navigating away) and the bulk "Assign to
// Group(s)" action (GroupAssignModal) — always a step *after* competitors
// already exist, never the starting workflow.
export function CompetitorsPage() {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { selectedPropertyIds } = usePropertyContext();

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = usePersistedState("competitors.groupFilter", []);
  const [statusFilter, setStatusFilter] = usePersistedState("competitors.statusFilter", []);
  const [readinessFilter, setReadinessFilter] = usePersistedState("competitors.readinessFilter", []);
  const [sortKey, setSortKey] = usePersistedState("competitors.sortKey", "hotelName");
  const [sortDir, setSortDir] = usePersistedState("competitors.sortDir", "asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);

  const hasPropertySelection = selectedPropertyIds.length > 0;
  const selectedProperties = useMemo(() => data.properties.filter((p) => selectedPropertyIds.includes(p.id)), [data.properties, selectedPropertyIds]);
  const selectedProperty = selectedProperties.length === 1 ? selectedProperties[0] : null;
  const propertyName = (id) => data.properties.find((p) => p.id === id)?.name || "—";

  const competitorsInScope = useMemo(
    () => data.competitors.filter((c) => selectedPropertyIds.includes(c.propertyId)),
    [data.competitors, selectedPropertyIds]
  );
  const groupsInScope = useMemo(
    () => data.comparisonGroups.filter((g) => selectedPropertyIds.includes(g.propertyId) && g.status !== "Archived"),
    [data.comparisonGroups, selectedPropertyIds]
  );
  // Includes archived groups too — used only by the inline Group Manager
  // modal, which needs to offer Restore/Delete for them.
  const allGroupsInScope = useMemo(
    () => data.comparisonGroups.filter((g) => selectedPropertyIds.includes(g.propertyId)),
    [data.comparisonGroups, selectedPropertyIds]
  );

  const groupsForCompetitor = (competitorId) =>
    data.groupMemberships.filter((m) => m.competitorId === competitorId).map((m) => data.comparisonGroups.find((g) => g.id === m.groupId)).filter(Boolean);
  const tagsForCompetitor = (competitorId) => {
    const groups = groupsForCompetitor(competitorId);
    return [...new Set(groups.flatMap((g) => g.tags || []))];
  };

  const readinessByCompetitor = useMemo(() => {
    const map = new Map();
    for (const c of competitorsInScope) {
      map.set(
        c.id,
        computeCompetitorReadiness({
          competitor: c,
          roomMappings: data.roomMappings.filter((m) => m.competitorId === c.id),
          ratePlanMappings: data.ratePlanMappings.filter((m) => m.competitorId === c.id),
          sourceConfigs: data.sourceConfigs.filter((s) => s.competitorId === c.id),
        })
      );
    }
    return map;
  }, [competitorsInScope, data.roomMappings, data.ratePlanMappings, data.sourceConfigs]);

  // Property-level KPI summary — aggregated across every selected property's
  // active competitors. Re-derived on every render from mock state, so it
  // always reflects whatever CRUD just happened. There's no "Benchmarks"
  // count here: the benchmark is always the property itself (never a
  // competitor), so it's shown as a fixed reference tile instead of a metric.
  const summary = useMemo(() => {
    const active = competitorsInScope.filter((c) => c.status !== "Archived");
    const roomMapped = active.filter((c) => data.roomMappings.some((m) => m.competitorId === c.id)).length;
    const ratePlanMapped = active.filter((c) => data.ratePlanMappings.some((m) => m.competitorId === c.id)).length;
    const sourceConfigured = active.filter((c) => data.sourceConfigs.some((s) => s.competitorId === c.id && s.sourceUrl)).length;
    const avgReadiness = active.length ? Math.round(active.reduce((sum, c) => sum + (readinessByCompetitor.get(c.id)?.score || 0), 0) / active.length) : 0;
    return {
      total: active.length,
      roomMappingPct: active.length ? Math.round((roomMapped / active.length) * 100) : 0,
      ratePlanMappingPct: active.length ? Math.round((ratePlanMapped / active.length) * 100) : 0,
      sourceCoveragePct: active.length ? Math.round((sourceConfigured / active.length) * 100) : 0,
      readiness: avgReadiness,
    };
  }, [competitorsInScope, data.roomMappings, data.ratePlanMappings, data.sourceConfigs, readinessByCompetitor]);

  const competitorsFiltered = useMemo(() => {
    let result = statusFilter.length ? competitorsInScope.filter((c) => statusFilter.includes(c.status)) : competitorsInScope.filter((c) => c.status !== "Archived");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => {
        const groups = groupsForCompetitor(c.id);
        const urls = [c.website, ...(c.otaUrls || []).map((o) => o.url)];
        return [c.hotelName, propertyName(c.propertyId), c.city, ...tagsForCompetitor(c.id), ...groups.map((g) => g.name), ...urls]
          .some((f) => String(f || "").toLowerCase().includes(q));
      });
    }
    if (groupFilter.length) {
      const memberCompetitorIds = new Set(data.groupMemberships.filter((m) => groupFilter.includes(m.groupId)).map((m) => m.competitorId));
      result = result.filter((c) => memberCompetitorIds.has(c.id));
    }
    if (readinessFilter.length) {
      result = result.filter((c) => readinessFilter.includes(readinessBucket(readinessByCompetitor.get(c.id)?.score ?? 0)));
    }

    result = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av ?? "").localeCompare(String(bv ?? "")) : String(bv ?? "").localeCompare(String(av ?? ""));
    });
    return result;
  }, [
    competitorsInScope, search, groupFilter, statusFilter, readinessFilter,
    sortKey, sortDir, data.groupMemberships, data.comparisonGroups, readinessByCompetitor,
  ]);

  const total = competitorsFiltered.length;
  const pageData = useMemo(() => competitorsFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [competitorsFiltered, page]);

  const filtersActive = Boolean(search) || [groupFilter, statusFilter, readinessFilter].some((f) => f.length);
  const resetFilters = () => {
    setSearch(""); setGroupFilter([]); setStatusFilter([]); setReadinessFilter([]); setPage(1);
  };

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyIds, groupFilter, statusFilter, readinessFilter, search]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const visibleIds = pageData.map((c) => c.id);
  const selection = useSelection(visibleIds);

  // Column widths are hand-tuned for a stable, enterprise-grade grid:
  // Competitor Hotel is the only column without an explicit width, so
  // `table-layout: fixed` gives it all the remaining space (the widest
  // column by construction, not by guesswork) — including whatever used to
  // go to the removed Brand column, with no other width needing to change.
  // City/Star Rating stay narrow since they hold little data; Room/Rate Plan
  // Mapping and Source Status get enough room for their badge to never wrap.
  const columns = [
    { key: "select", label: <Checkbox checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} label="Select all" />, width: 40 },
    { key: "hotel", label: "Competitor Hotel", sortable: true },
    { key: "city", label: "City", sortable: true, width: 88 },
    { key: "star", label: "Star", sortable: true, width: 60 },
    { key: "groups", label: "Groups", width: 160 },
    { key: "roomMapping", label: "Room Mapping", width: 116 },
    { key: "ratePlanMapping", label: "Rate Plan Mapping", width: 124 },
    { key: "source", label: "Source Status", width: 116 },
    { key: "readiness", label: "Readiness", width: 76 },
    { key: "status", label: "Status", sortable: true, width: 88 },
    { key: "lastUpdated", label: "Last Updated", sortable: true, width: 102 },
    { key: "actions", label: "", width: 122 },
  ];
  // Floor for the flexible "hotel" column, plus every fixed column's own
  // width — passed to <Table minWidth> so the grid scrolls horizontally on
  // narrower viewports instead of squeezing the hotel name to nothing.
  const HOTEL_COLUMN_FLOOR = 220;
  const tableMinWidth = columns.reduce((sum, c) => sum + (c.width || HOTEL_COLUMN_FLOOR), 0);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c) => { setEditing(c); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateCompetitor({ ...editing, ...form });
      toast.success(`${form.hotelName} updated.`);
    } else {
      const created = data.addCompetitor({ ...form, propertyId: selectedProperty?.id || selectedPropertyIds[0], pinned: false, futurePropertyId: null });
      toast.success(`${created.hotelName} created.`);
    }
    setFormOpen(false);
  };

  const handleDuplicate = (c) => { const copy = data.duplicateCompetitor(c); toast.info(`Duplicated as ${copy.id}.`); };
  const handleArchive = (c) => { data.archiveCompetitor(c); toast.info(`${c.hotelName} archived.`); };
  const handleDelete = () => { data.deleteCompetitorPermanently(confirmDelete.id); toast.success(`${confirmDelete.hotelName} permanently deleted.`); setConfirmDelete(null); };
  const handleRemoveFromGroup = (competitorId, groupId, groupName) => {
    data.removeGroupMembership(groupId, competitorId);
    toast.info(`Removed from ${groupName}.`);
  };

  const handleBulkArchive = () => { data.bulkArchiveCompetitors(selection.selected); toast.info(`${selection.count} competitor(s) archived.`); selection.clear(); };
  const handleBulkRestore = () => { data.bulkRestoreCompetitors(selection.selected); toast.success(`${selection.count} competitor(s) restored.`); selection.clear(); };
  const handleBulkDuplicate = () => { const copies = data.bulkDuplicateCompetitors(selection.selected); toast.info(`${copies.length} competitor(s) duplicated.`); selection.clear(); };
  const handleBulkDelete = () => { data.bulkDeleteCompetitors(selection.selected); toast.success(`${selection.count} competitor(s) permanently deleted.`); selection.clear(); setConfirmBulkDelete(false); };
  const handleBulkStatus = (status) => { data.bulkChangeStatusCompetitors(selection.selected, status); toast.info(`Status updated for ${selection.count} competitor(s).`); selection.clear(); };
  const handleBulkPriority = (priority) => { data.bulkChangePriorityCompetitors(selection.selected, priority); toast.info(`Priority updated for ${selection.count} competitor(s).`); selection.clear(); };
  const handleBulkAssign = (groupIds) => {
    const created = data.bulkAssignCompetitorsToGroups(selection.selected, groupIds);
    toast.success(created.length ? `Assigned ${selection.count} competitor(s) to ${groupIds.length} group(s).` : "No new memberships — already assigned.");
    selection.clear();
  };

  const exportColumns = [
    { label: "Hotel Name", value: (c) => c.hotelName },
    { label: "Property", value: (c) => propertyName(c.propertyId) },
    { label: "City", value: (c) => c.city },
    { label: "Country", value: (c) => c.country },
    { label: "Star Rating", value: (c) => c.starRating },
    { label: "Groups", value: (c) => groupsForCompetitor(c.id).map((g) => g.name).join(", ") },
    { label: "Benchmark Property", value: (c) => propertyName(c.propertyId) },
    { label: "Readiness", value: (c) => `${readinessByCompetitor.get(c.id)?.score ?? 0}%` },
    { label: "Priority", value: (c) => c.priority },
    { label: "Status", value: (c) => c.status },
    { label: "Last Updated", value: (c) => formatDate(c.lastModifiedAt) },
  ];
  const exportRowsData = selection.count ? competitorsFiltered.filter((c) => selection.selected.includes(c.id)) : pageData;

  const competitorCountForProperty = (propertyId) => data.competitors.filter((c) => c.propertyId === propertyId && c.status !== "Archived").length;

  return (
    <div>
      <Breadcrumbs
        items={
          selectedProperty
            ? [{ label: "Properties", to: "/portal/properties" }, { label: selectedProperty.name, to: `/portal/properties/${selectedProperty.id}` }, { label: "Competitors" }]
            : [{ label: "Competitors" }]
        }
      />
      <Topbar title="Competitors" subtitle="Map competitor rooms and rate plans against your own — Comparison Groups are optional." hidePropertySelector />

      <div className="property-scoped-layout">
        <CompetitorFilterPanel
          getCount={competitorCountForProperty}
          groupOptions={groupsInScope}
          groupFilter={groupFilter} setGroupFilter={setGroupFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          readinessFilter={readinessFilter} setReadinessFilter={setReadinessFilter}
        />

        <div className="property-scoped-layout__content">
          {hasPropertySelection && (
            <div className="page-section">
              <div className="stat-row stat-row--kpi">
                <Card className="stat-card">
                  <div className="stat-card__icon"><Users2 size={20} strokeWidth={2} /></div>
                  <div className="stat-card__body"><div className="stat-card__value tabular">{summary.total}</div><div className="stat-card__label">Competitors</div></div>
                </Card>
                <Card className="stat-card">
                  <div className="stat-card__icon"><Award size={20} strokeWidth={2} /></div>
                  <div className="stat-card__body">
                    <div className="stat-card__value stat-card__value--text">{selectedProperty ? selectedProperty.name : `${selectedPropertyIds.length} Properties`}</div>
                    <div className="stat-card__label">Benchmark Property</div>
                  </div>
                </Card>
                <Card className="stat-card">
                  <div className={`kpi-ring kpi-ring--${kpiRingVariant(summary.roomMappingPct)}`} style={{ "--ring-pct": summary.roomMappingPct }}><span className="kpi-ring__value tabular">{summary.roomMappingPct}%</span></div>
                  <div className="stat-card__body"><div className="stat-card__label">Room Mapping</div></div>
                </Card>
                <Card className="stat-card">
                  <div className={`kpi-ring kpi-ring--${kpiRingVariant(summary.ratePlanMappingPct)}`} style={{ "--ring-pct": summary.ratePlanMappingPct }}><span className="kpi-ring__value tabular">{summary.ratePlanMappingPct}%</span></div>
                  <div className="stat-card__body"><div className="stat-card__label">Rate Plan Mapping</div></div>
                </Card>
                <Card className="stat-card">
                  <div className={`kpi-ring kpi-ring--${kpiRingVariant(summary.sourceCoveragePct)}`} style={{ "--ring-pct": summary.sourceCoveragePct }}><span className="kpi-ring__value tabular">{summary.sourceCoveragePct}%</span></div>
                  <div className="stat-card__body"><div className="stat-card__label">Source Coverage</div></div>
                </Card>
                <Card className="stat-card">
                  <div className={`kpi-ring kpi-ring--${kpiRingVariant(summary.readiness)}`} style={{ "--ring-pct": summary.readiness }}><span className="kpi-ring__value tabular">{summary.readiness}%</span></div>
                  <div className="stat-card__body"><div className="stat-card__label">Readiness</div></div>
                </Card>
              </div>
            </div>
          )}

          <Card padded={false}>
            <div style={{ padding: "20px 20px 0" }}>
              <div className="page-toolbar">
                <SearchBar value={search} onChange={setSearch} placeholder="Search hotel, city, tag, group, URL..." disabled={!hasPropertySelection} />
                {filtersActive && (
                  <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
                    <ResetIcon size={13} strokeWidth={2} /> Reset
                  </button>
                )}
                <div className="page-toolbar__spacer" />
                <button className="btn btn--ghost btn--md" onClick={() => setGroupManagerOpen(true)}>
                  <FolderCog size={16} strokeWidth={2} /><span>Manage Comparison Groups</span>
                </button>
                <button className="btn btn--ghost btn--md" onClick={() => setImportOpen(true)} disabled={!hasPropertySelection}>
                  <Upload size={16} strokeWidth={2} /><span>Import</span>
                </button>
                <ExportMenu rows={exportRowsData} columns={exportColumns} filenameBase="competitors" selectedCount={selection.count} />
                <Button variant="primary" size="md" icon={Plus} onClick={openCreate} disabled={!hasPropertySelection}>Add Competitor</Button>
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <BulkActionBar
                count={selection.count}
                onClear={selection.clear}
                onArchive={handleBulkArchive}
                onRestore={handleBulkRestore}
                onDuplicate={handleBulkDuplicate}
                onDelete={() => setConfirmBulkDelete(true)}
                statusOptions={["Active", "Draft"]}
                onChangeStatus={handleBulkStatus}
                canDelete={permissions.canManageCompetitors}
              />
              {selection.count > 0 && (
                <div className="page-toolbar" style={{ marginTop: -8, marginBottom: 16, flexWrap: "wrap" }}>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => setAssignModalOpen(true)}>
                    <FolderCog size={13} strokeWidth={2} /> Assign to Group(s)
                  </button>
                  <span className="table__cell-muted" style={{ fontSize: 12.5, fontWeight: 700 }}>Change priority:</span>
                  {PRIORITY_LEVELS.map((p) => (
                    <button key={p} className="btn btn--ghost btn--sm" type="button" onClick={() => handleBulkPriority(p)}>{p}</button>
                  ))}
                </div>
              )}

              <Table
                columns={columns}
                data={pageData}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                rowKey={(row) => row.id}
                stickyHeader
                minWidth={tableMinWidth}
                emptyState={
                  !hasPropertySelection ? (
                    <EmptyState icon={Building2} title="Select a property to get started" message="Select one or more properties from the panel on the left to view their competitors." />
                  ) : total === 0 && !filtersActive ? (
                    <EmptyState
                      icon={Users2}
                      title="No competitors yet"
                      message="Add a competitor hotel, then map its rooms and rate plans to your property's own rooms and rate plans — that mapping is what future rate collection compares. Comparison Groups are entirely optional and can be created later to organize competitors into market segments."
                      action={
                        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                          <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>Add First Competitor</Button>
                          <Button variant="secondary" size="sm" icon={FolderCog} onClick={() => setGroupManagerOpen(true)}>Create Comparison Group (Optional)</Button>
                        </div>
                      }
                    />
                  ) : (
                    <EmptyState icon={Users2} title="No competitors match your filters" message="Try adjusting your search or filters." action={<Button variant="secondary" size="sm" onClick={resetFilters}>Clear Filters</Button>} />
                  )
                }
                renderRow={(c) => {
                  const readiness = readinessByCompetitor.get(c.id);
                  const groups = groupsForCompetitor(c.id);
                  const hasRoomMapping = data.roomMappings.some((m) => m.competitorId === c.id);
                  const hasRatePlanMapping = data.ratePlanMappings.some((m) => m.competitorId === c.id);
                  const hasSource = data.sourceConfigs.some((s) => s.competitorId === c.id && s.sourceUrl);
                  const readinessScore = readiness?.score ?? 0;
                  const readinessVariant = readinessScore === 100 ? "success" : readinessScore >= 50 ? "warning" : "danger";
                  const visibleGroups = groups.slice(0, 2);
                  const overflowGroups = groups.slice(2);
                  return (
                    <tr key={c.id}>
                      <td><Checkbox checked={selection.selected.includes(c.id)} onChange={() => selection.toggle(c.id)} label={`Select ${c.hotelName}`} /></td>
                      <td className="row-link" onClick={() => navigate(`/portal/competitors/${c.id}`)}>
                        <div className="table__cell-primary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.hotelName}</div>
                        <div className="table__cell-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{propertyName(c.propertyId)}</div>
                      </td>
                      <td className="table__cell-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.city}</td>
                      <td className="tabular" style={{ whiteSpace: "nowrap" }}>{c.starRating ? `${c.starRating}★` : "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {groups.length === 0 ? (
                          <span className="table__cell-muted">No group</span>
                        ) : (
                          <div className="tag-chips">
                            {visibleGroups.map((g) => (
                              <span key={g.id} className="tag-chip tag-chip--removable" title={g.name}>
                                <span className="tag-chip__label">{g.name}</span>
                                <button type="button" onClick={() => handleRemoveFromGroup(c.id, g.id, g.name)} aria-label={`Remove from ${g.name}`}><X size={10} strokeWidth={2.5} /></button>
                              </span>
                            ))}
                            {overflowGroups.length > 0 && (
                              <span className="tag-chip tag-chip--more" title={overflowGroups.map((g) => g.name).join(", ")}>
                                +{overflowGroups.length}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <Badge variant={hasRoomMapping ? "success" : "warning"}><BedDouble size={10} strokeWidth={2} style={{ marginRight: 2, verticalAlign: -1 }} />{hasRoomMapping ? "Mapped" : "None"}</Badge>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <Badge variant={hasRatePlanMapping ? "success" : "warning"}><TagIcon size={10} strokeWidth={2} style={{ marginRight: 2, verticalAlign: -1 }} />{hasRatePlanMapping ? "Mapped" : "None"}</Badge>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}><Badge variant={hasSource ? "success" : "warning"}><PlugZap size={10} strokeWidth={2} style={{ marginRight: 2, verticalAlign: -1 }} />{hasSource ? "Configured" : "None"}</Badge></td>
                      <td>
                        <div className={`kpi-ring kpi-ring--sm kpi-ring--${readinessVariant}`} style={{ "--ring-pct": readinessScore }} title={`${readinessScore}% ready`}>
                          <span className="kpi-ring__value tabular">{readinessScore}</span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}><StatusBadge status={c.status} /></td>
                      <td className="table__cell-muted tabular" style={{ whiteSpace: "nowrap" }}>{formatDate(c.lastModifiedAt)}</td>
                      <td>
                        <div className="table__actions table__actions--reveal">
                          {c.status !== "Archived" ? (
                            <>
                              <button className="table__action-btn" title="Edit" onClick={() => openEdit(c)}><Pencil size={15} strokeWidth={2} /></button>
                              <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(c)}><Copy size={15} strokeWidth={2} /></button>
                              <button className="table__action-btn" title="Archive" onClick={() => handleArchive(c)}><Archive size={15} strokeWidth={2} /></button>
                            </>
                          ) : (
                            <>
                              <button className="table__action-btn" title="Restore" onClick={() => data.restoreCompetitor(c)}><RotateCcw size={15} strokeWidth={2} /></button>
                              {permissions.canManageCompetitors && (
                                <button className="table__action-btn table__action-btn--danger" title="Delete Permanently" onClick={() => setConfirmDelete(c)}><Trash2 size={15} strokeWidth={2} /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </div>
          </Card>
        </div>
      </div>

      <CompetitorForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={editing} />

      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} defaultEntityType="competitors" />

      <GroupAssignModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        competitorIds={selection.selected}
        groups={groupsInScope}
        propertyId={data.competitors.find((c) => c.id === selection.selected[0])?.propertyId || selectedProperty?.id || selectedPropertyIds[0]}
        onAssign={handleBulkAssign}
      />

      <GroupManagerModal
        open={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        groups={allGroupsInScope}
        propertyId={selectedProperty?.id || selectedPropertyIds[0]}
      />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Competitor Permanently"
        message={`Permanently delete "${confirmDelete?.hotelName}"? Its mappings, sources, and URLs will also be removed — any Comparison Groups it belongs to are unaffected. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Competitors Permanently"
        message={`Permanently delete ${selection.count} selected competitor(s)? This cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
