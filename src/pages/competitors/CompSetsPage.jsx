import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Target, Pencil, Copy, Archive, RotateCcw, Trash2, Building2, Users2, GitMerge, BedDouble, PlugZap, ShieldCheck } from "lucide-react";
import { Topbar } from "../../components/layout/Topbar.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { Pagination } from "../../components/ui/Pagination.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { StatusBadge, Badge } from "../../components/ui/Badge.jsx";
import { TagChips } from "../../components/ui/TagChips.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ConfirmModal, Modal } from "../../components/ui/Modal.jsx";
import { Checkbox } from "../../components/ui/Checkbox.jsx";
import { BulkActionBar } from "../../components/ui/BulkActionBar.jsx";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { CompSetFilterPanel } from "../../components/ui/CompSetFilterPanel.jsx";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useSelection } from "../../hooks/useSelection.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { usePersistedState } from "../../hooks/usePersistedState.js";
import { usePaginatedSortedFiltered, formatDate } from "../../lib/format.js";
import { computeCompetitorReadiness } from "../../lib/competitorReadiness.js";
import { CompSetForm } from "./CompSetForm.jsx";

const PAGE_SIZE = 10;

const VIEW_TABS = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

// Secondary, optional page — Competitive Sets are pure organizational
// collections here, reached only from the Competitors page's "Manage
// Competitive Sets" toolbar button or its Competitive Set filter, never
// the Phase 2 starting workflow. A comp set never owns a competitor: this page
// only does comp set CRUD (create/rename/archive/duplicate/delete) plus a
// member count column; membership itself is managed either from a comp set's
// own profile page or the Competitors page's bulk "Assign to Comp Set(s)."
export function CompSetsPage() {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { selectedPropertyIds } = usePropertyContext();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = usePersistedState("compSets.tagFilter", []);
  const [viewMode, setViewMode] = useState("active");
  const [sortKey, setSortKey] = usePersistedState("compSets.sortKey", "name");
  const [sortDir, setSortDir] = usePersistedState("compSets.sortDir", "asc");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState(null);

  const hasPropertySelection = selectedPropertyIds.length > 0;
  const selectedProperties = useMemo(() => data.properties.filter((p) => selectedPropertyIds.includes(p.id)), [data.properties, selectedPropertyIds]);
  const selectedProperty = selectedProperties.length === 1 ? selectedProperties[0] : null;
  const propertyName = (id) => data.properties.find((p) => p.id === id)?.name || "—";

  const compSetsInScope = useMemo(
    () => data.compSets.filter((g) => selectedPropertyIds.includes(g.propertyId)),
    [data.compSets, selectedPropertyIds]
  );
  const compSetsInView = useMemo(
    () =>
      compSetsInScope
        .filter((g) => (viewMode === "archived" ? g.status === "Archived" : g.status !== "Archived"))
        .filter((g) => tagFilter.length === 0 || tagFilter.some((t) => (g.tags || []).includes(t))),
    [compSetsInScope, viewMode, tagFilter]
  );

  const memberCountFor = (compSetId) => data.compSetMemberships.filter((m) => m.compSetId === compSetId).length;

  // Comp Set Manager statistics — each comp set is an intelligent organizational
  // container, not a plain label: it surfaces mapping completeness, source
  // coverage, and readiness aggregated across its member competitors. None
  // of this is stored on the comp set itself; it's re-derived from each
  // member competitor's own mappings/sources every render, since those
  // always belong to the competitor, never to the comp set.
  const compSetStatsById = useMemo(() => {
    const map = new Map();
    for (const g of compSetsInView) {
      const competitorIds = data.compSetMemberships.filter((m) => m.compSetId === g.id).map((m) => m.competitorId);
      const members = data.competitors.filter((c) => competitorIds.includes(c.id) && c.status !== "Archived");
      if (!members.length) {
        map.set(g.id, { count: 0, mappingPct: 0, sourcePct: 0, readinessPct: 0 });
        continue;
      }
      let roomMapped = 0, ratePlanMapped = 0, sourceConfigured = 0, readinessSum = 0;
      for (const c of members) {
        const rm = data.roomMappings.filter((m) => m.competitorId === c.id);
        const rpm = data.ratePlanMappings.filter((m) => m.competitorId === c.id);
        const sc = data.sourceConfigs.filter((s) => s.competitorId === c.id);
        if (rm.length) roomMapped += 1;
        if (rpm.length) ratePlanMapped += 1;
        if (sc.some((s) => s.sourceUrl)) sourceConfigured += 1;
        readinessSum += computeCompetitorReadiness({ competitor: c, roomMappings: rm, ratePlanMappings: rpm, sourceConfigs: sc }).score;
      }
      map.set(g.id, {
        count: members.length,
        mappingPct: Math.round(((roomMapped + ratePlanMapped) / (members.length * 2)) * 100),
        sourcePct: Math.round((sourceConfigured / members.length) * 100),
        readinessPct: Math.round(readinessSum / members.length),
      });
    }
    return map;
  }, [compSetsInView, data.compSetMemberships, data.competitors, data.roomMappings, data.ratePlanMappings, data.sourceConfigs]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtersActive = Boolean(search) || tagFilter.length > 0;
  const resetFilters = () => { setSearch(""); setTagFilter([]); setPage(1); };

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyIds, tagFilter, search, viewMode]);

  const { pageData, total } = useMemo(
    () =>
      usePaginatedSortedFiltered({
        data: compSetsInView,
        search,
        searchFields: ["id", "name", "market"],
        filters: {},
        sortKey,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [compSetsInView, search, sortKey, sortDir, page]
  );

  const visibleIds = pageData.map((g) => g.id);
  const selection = useSelection(visibleIds);

  const columns = [
    { key: "select", label: <Checkbox checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} label="Select all" />, width: 40 },
    { key: "id", label: "Comp Set ID", sortable: true, width: 96 },
    { key: "name", label: "Competitive Set", sortable: true },
    { key: "property", label: "Property", width: 130 },
    { key: "members", label: "Members", width: 84 },
    { key: "mapping", label: "Mapping", width: 92 },
    { key: "sources", label: "Source Coverage", width: 110 },
    { key: "readiness", label: "Readiness", width: 84 },
    { key: "tags", label: "Tags", width: 140 },
    { key: "status", label: "Status", sortable: true, width: 92 },
    { key: "lastModified", label: "Last Modified", sortable: true, width: 118 },
    { key: "actions", label: "", width: 150 },
  ];
  // Same floor-plus-fixed-column-sum approach as CompetitorsPage — keeps
  // "Competitive Set" the widest column on comfortable screens while
  // guaranteeing a horizontal scrollbar (never a squeezed, unreadable name
  // column) on narrower ones.
  const NAME_COLUMN_FLOOR = 220;
  const tableMinWidth = columns.reduce((sum, c) => sum + (c.width || NAME_COLUMN_FLOOR), 0);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (g) => { setEditing(g); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateCompSet({ ...editing, ...form });
      toast.success(`${form.name} updated.`);
    } else {
      const created = data.addCompSet(form);
      toast.success(`${created.name} created as ${created.id}.`);
    }
    setFormOpen(false);
  };

  const handleDuplicate = (g) => { const copy = data.duplicateCompSet(g); toast.info(`Duplicated as ${copy.id}, keeping the same members.`); };
  const handleArchive = (g) => { data.archiveCompSet(g); toast.info(`${g.name} archived. Its member competitors are unaffected.`); };
  const handleRestore = (g) => { data.restoreCompSet(g); toast.success(`${g.name} restored.`); };
  const handleDelete = () => { data.deleteCompSetPermanently(confirmDelete.id); toast.success(`${confirmDelete.name} permanently deleted. Its member competitors were not affected.`); setConfirmDelete(null); };

  const handleBulkArchive = () => { data.bulkArchiveCompSets(selection.selected); toast.info(`${selection.count} comp set(s) archived.`); selection.clear(); };
  const handleBulkRestore = () => { data.bulkRestoreCompSets(selection.selected); toast.success(`${selection.count} comp set(s) restored.`); selection.clear(); };
  const handleBulkDuplicate = () => { const copies = data.bulkDuplicateCompSets(selection.selected); toast.info(`${copies.length} comp set(s) duplicated.`); selection.clear(); };
  const handleBulkDelete = () => { data.bulkDeleteCompSets(selection.selected); toast.success(`${selection.count} comp set(s) permanently deleted.`); selection.clear(); setConfirmBulkDelete(false); };
  const handleBulkStatus = (status) => { data.bulkChangeStatusCompSets(selection.selected, status); toast.info(`Status updated to ${status} for ${selection.count} comp set(s).`); selection.clear(); };

  // Merge = move every member of the non-target selected comp sets into the
  // target comp set, then archive the now-redundant source comp sets. Member
  // competitors and all of their configuration are never touched — only
  // `compSetMemberships` rows move, exactly like any other comp set action.
  const selectedCompSetsForMerge = compSetsInScope.filter((g) => selection.selected.includes(g.id));
  const handleOpenMerge = () => { setMergeTargetId(selection.selected[0] || null); setMergeModalOpen(true); };
  const handleMerge = () => {
    const sourceIds = selection.selected.filter((id) => id !== mergeTargetId);
    const competitorIds = [...new Set(data.compSetMemberships.filter((m) => sourceIds.includes(m.compSetId)).map((m) => m.competitorId))];
    if (competitorIds.length) data.bulkAssignCompetitorsToCompSets(competitorIds, [mergeTargetId]);
    data.bulkArchiveCompSets(sourceIds);
    const targetName = compSetsInScope.find((g) => g.id === mergeTargetId)?.name || "the target comp set";
    toast.success(`Merged ${sourceIds.length} comp set(s) into ${targetName}.`);
    selection.clear();
    setMergeModalOpen(false);
    setMergeTargetId(null);
  };

  const archivedView = viewMode === "archived";
  const compSetCountForProperty = (propertyId) => data.compSets.filter((g) => g.propertyId === propertyId && g.status !== "Archived").length;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Competitors", to: "/portal/competitors" },
          { label: "Competitive Sets" },
        ]}
      />
      <Topbar
        title="Competitive Sets"
        subtitle="Optional organizational containers — competitors keep their own mappings and readiness regardless of comp set."
        hidePropertySelector
      />

      <div className="property-scoped-layout">
        <CompSetFilterPanel getCount={compSetCountForProperty} tagFilter={tagFilter} setTagFilter={setTagFilter} />

        <div className="property-scoped-layout__content">
          <div className="page-section">
            <Tabs tabs={VIEW_TABS} active={viewMode} onChange={setViewMode} />
          </div>

          <Card padded={false}>
            <div style={{ padding: "20px 20px 0" }}>
              <div className="page-toolbar">
                <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search competitive sets..." disabled={!hasPropertySelection} />
                {filtersActive && (
                  <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
                    <RotateCcw size={13} strokeWidth={2} /> Reset
                  </button>
                )}
                <div className="page-toolbar__spacer" />
                <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Competitive Set</Button>
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
                archived={archivedView}
                canDelete={permissions.canDeleteCompSetPermanently}
              />
              {selection.count >= 2 && !archivedView && (
                <div className="page-toolbar" style={{ marginTop: -8, marginBottom: 16 }}>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={handleOpenMerge}>
                    <GitMerge size={13} strokeWidth={2} /> Merge into One Comp Set
                  </button>
                </div>
              )}

              <Table
                columns={columns}
                data={pageData}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                rowKey={(row) => row.id}
                minWidth={tableMinWidth}
                emptyState={
                  !hasPropertySelection ? (
                    <EmptyState icon={Building2} title="Select a property to get started" message="Select one or more properties from the panel on the left to view their competitive sets." />
                  ) : (
                    <EmptyState
                      icon={Target}
                      title={archivedView ? "No archived competitive sets" : filtersActive ? "No competitive sets match your filters" : "No competitive sets yet"}
                      message={
                        archivedView || filtersActive
                          ? "Try adjusting your search or filters."
                          : "Competitive sets are entirely optional organizational tools, not a required setup step — every competitor already works fully without one. Create a competitive set only when you want to organize competitors by market segment, location, hotel category, or your own custom collection."
                      }
                      action={
                        archivedView ? null : filtersActive ? (
                          <Button variant="secondary" size="sm" onClick={resetFilters}>Clear Filters</Button>
                        ) : (
                          <Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Create Competitive Set</Button>
                        )
                      }
                    />
                  )
                }
                renderRow={(g) => {
                  const stats = compSetStatsById.get(g.id) || { count: 0, mappingPct: 0, sourcePct: 0, readinessPct: 0 };
                  return (
                  <tr key={g.id}>
                    <td><Checkbox checked={selection.selected.includes(g.id)} onChange={() => selection.toggle(g.id)} label={`Select ${g.name}`} /></td>
                    <td className="tabular table__cell-muted" style={{ whiteSpace: "nowrap" }}>{g.id}</td>
                    <td className="row-link" onClick={() => navigate(`/portal/comp-sets/${g.id}`)}>
                      <div className="table__cell-primary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                      <div className="table__cell-muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.market || "—"}</div>
                    </td>
                    <td className="table__cell-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{propertyName(g.propertyId)}</td>
                    <td className="tabular" style={{ whiteSpace: "nowrap" }}><Users2 size={12} strokeWidth={2} style={{ marginRight: 4, verticalAlign: -1, color: "var(--color-text-faint)" }} />{memberCountFor(g.id)}</td>
                    <td style={{ whiteSpace: "nowrap" }}><Badge variant={stats.mappingPct === 100 ? "success" : stats.mappingPct === 0 ? "danger" : "warning"}><BedDouble size={10} strokeWidth={2} style={{ marginRight: 2, verticalAlign: -1 }} />{stats.mappingPct}%</Badge></td>
                    <td style={{ whiteSpace: "nowrap" }}><Badge variant={stats.sourcePct === 100 ? "success" : stats.sourcePct === 0 ? "danger" : "warning"}><PlugZap size={10} strokeWidth={2} style={{ marginRight: 2, verticalAlign: -1 }} />{stats.sourcePct}%</Badge></td>
                    <td style={{ whiteSpace: "nowrap" }}><Badge variant={stats.readinessPct === 100 ? "success" : stats.readinessPct === 0 ? "danger" : "warning"}><ShieldCheck size={10} strokeWidth={2} style={{ marginRight: 2, verticalAlign: -1 }} />{stats.readinessPct}%</Badge></td>
                    <td style={{ whiteSpace: "nowrap" }}><TagChips tags={g.tags || []} /></td>
                    <td style={{ whiteSpace: "nowrap" }}><StatusBadge status={g.status} /></td>
                    <td className="table__cell-muted tabular" style={{ whiteSpace: "nowrap" }}>{formatDate(g.lastModifiedAt)}</td>
                    <td>
                      <div className="table__actions">
                        {g.status !== "Archived" ? (
                          <>
                            <button className="table__action-btn" title="Edit" onClick={() => openEdit(g)}><Pencil size={15} strokeWidth={2} /></button>
                            <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(g)}><Copy size={15} strokeWidth={2} /></button>
                            <button className="table__action-btn" title="Archive" onClick={() => handleArchive(g)}><Archive size={15} strokeWidth={2} /></button>
                          </>
                        ) : (
                          <>
                            <button className="table__action-btn" title="Restore" onClick={() => handleRestore(g)}><RotateCcw size={15} strokeWidth={2} /></button>
                            {permissions.canDeleteCompSetPermanently && (
                              <button className="table__action-btn table__action-btn--danger" title="Delete Permanently" onClick={() => setConfirmDelete(g)}><Trash2 size={15} strokeWidth={2} /></button>
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

      <CompSetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        properties={selectedProperties.length ? selectedProperties : data.properties}
        scopePropertyId={selectedProperty?.id || ""}
      />

      <Modal
        open={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="Merge Competitive Sets"
        size="sm"
        footer={
          <>
            <button className="btn btn--ghost btn--md" type="button" onClick={() => setMergeModalOpen(false)}>Cancel</button>
            <Button variant="primary" size="md" icon={GitMerge} onClick={handleMerge} disabled={!mergeTargetId}>Merge</Button>
          </>
        }
      >
        <p className="master-manager__hint" style={{ marginBottom: 16 }}>
          Every competitor in the other selected comp set(s) will be added to the comp set you keep — no competitor, mapping,
          source, or URL is touched. The other comp set(s) are archived afterward, not deleted, so you can restore them later if needed.
        </p>
        <div className="master-manager__list">
          {selectedCompSetsForMerge.map((g) => (
            <div key={g.id} className="master-manager__row" style={{ cursor: "pointer" }} onClick={() => setMergeTargetId(g.id)}>
              <input type="radio" checked={mergeTargetId === g.id} onChange={() => setMergeTargetId(g.id)} name="merge-target" />
              <span className="master-manager__name">{g.name}</span>
              <span className="table__cell-muted tabular">{memberCountFor(g.id)} members</span>
              {mergeTargetId === g.id && <Badge variant="info">Keep this one</Badge>}
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Competitive Set Permanently"
        message={`Permanently delete "${confirmDelete?.name}"? Its member competitors and all of their configuration (mappings, sources, URLs) are completely unaffected — only the comp set and its membership references are removed. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Competitive Sets Permanently"
        message={`Permanently delete ${selection.count} selected competitive set(s)? Their member competitors are completely unaffected. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
