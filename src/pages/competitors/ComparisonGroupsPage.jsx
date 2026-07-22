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
import { ComparisonGroupFilterPanel } from "../../components/ui/ComparisonGroupFilterPanel.jsx";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useSelection } from "../../hooks/useSelection.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { usePersistedState } from "../../hooks/usePersistedState.js";
import { usePaginatedSortedFiltered, formatDate } from "../../lib/format.js";
import { computeCompetitorReadiness } from "../../lib/competitorReadiness.js";
import { ComparisonGroupForm } from "./ComparisonGroupForm.jsx";

const PAGE_SIZE = 10;

const VIEW_TABS = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

// Secondary, optional page — Comparison Groups are pure organizational
// collections here, reached only from the Competitors page's "Manage
// Comparison Groups" toolbar button or its Comparison Group filter, never
// the Phase 2 starting workflow. A group never owns a competitor: this page
// only does group CRUD (create/rename/archive/duplicate/delete) plus a
// member count column; membership itself is managed either from a group's
// own profile page or the Competitors page's bulk "Assign to Group(s)."
export function ComparisonGroupsPage() {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { selectedPropertyIds } = usePropertyContext();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = usePersistedState("comparisonGroups.tagFilter", []);
  const [viewMode, setViewMode] = useState("active");
  const [sortKey, setSortKey] = usePersistedState("comparisonGroups.sortKey", "name");
  const [sortDir, setSortDir] = usePersistedState("comparisonGroups.sortDir", "asc");
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

  const groupsInScope = useMemo(
    () => data.comparisonGroups.filter((g) => selectedPropertyIds.includes(g.propertyId)),
    [data.comparisonGroups, selectedPropertyIds]
  );
  const groupsInView = useMemo(
    () =>
      groupsInScope
        .filter((g) => (viewMode === "archived" ? g.status === "Archived" : g.status !== "Archived"))
        .filter((g) => tagFilter.length === 0 || tagFilter.some((t) => (g.tags || []).includes(t))),
    [groupsInScope, viewMode, tagFilter]
  );

  const memberCountFor = (groupId) => data.groupMemberships.filter((m) => m.groupId === groupId).length;

  // Group Manager statistics — each group is an intelligent organizational
  // container, not a plain label: it surfaces mapping completeness, source
  // coverage, and readiness aggregated across its member competitors. None
  // of this is stored on the group itself; it's re-derived from each
  // member competitor's own mappings/sources every render, since those
  // always belong to the competitor, never to the group.
  const groupStatsById = useMemo(() => {
    const map = new Map();
    for (const g of groupsInView) {
      const competitorIds = data.groupMemberships.filter((m) => m.groupId === g.id).map((m) => m.competitorId);
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
  }, [groupsInView, data.groupMemberships, data.competitors, data.roomMappings, data.ratePlanMappings, data.sourceConfigs]);

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
        data: groupsInView,
        search,
        searchFields: ["id", "name", "market"],
        filters: {},
        sortKey,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [groupsInView, search, sortKey, sortDir, page]
  );

  const visibleIds = pageData.map((g) => g.id);
  const selection = useSelection(visibleIds);

  const columns = [
    { key: "select", label: <Checkbox checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} label="Select all" />, width: 40 },
    { key: "id", label: "Group ID", sortable: true, width: 96 },
    { key: "name", label: "Comparison Group", sortable: true },
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
  // "Comparison Group" the widest column on comfortable screens while
  // guaranteeing a horizontal scrollbar (never a squeezed, unreadable name
  // column) on narrower ones.
  const NAME_COLUMN_FLOOR = 220;
  const tableMinWidth = columns.reduce((sum, c) => sum + (c.width || NAME_COLUMN_FLOOR), 0);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (g) => { setEditing(g); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateComparisonGroup({ ...editing, ...form });
      toast.success(`${form.name} updated.`);
    } else {
      const created = data.addComparisonGroup(form);
      toast.success(`${created.name} created as ${created.id}.`);
    }
    setFormOpen(false);
  };

  const handleDuplicate = (g) => { const copy = data.duplicateComparisonGroup(g); toast.info(`Duplicated as ${copy.id}, keeping the same members.`); };
  const handleArchive = (g) => { data.archiveComparisonGroup(g); toast.info(`${g.name} archived. Its member competitors are unaffected.`); };
  const handleRestore = (g) => { data.restoreComparisonGroup(g); toast.success(`${g.name} restored.`); };
  const handleDelete = () => { data.deleteComparisonGroupPermanently(confirmDelete.id); toast.success(`${confirmDelete.name} permanently deleted. Its member competitors were not affected.`); setConfirmDelete(null); };

  const handleBulkArchive = () => { data.bulkArchiveComparisonGroups(selection.selected); toast.info(`${selection.count} group(s) archived.`); selection.clear(); };
  const handleBulkRestore = () => { data.bulkRestoreComparisonGroups(selection.selected); toast.success(`${selection.count} group(s) restored.`); selection.clear(); };
  const handleBulkDuplicate = () => { const copies = data.bulkDuplicateComparisonGroups(selection.selected); toast.info(`${copies.length} group(s) duplicated.`); selection.clear(); };
  const handleBulkDelete = () => { data.bulkDeleteComparisonGroups(selection.selected); toast.success(`${selection.count} group(s) permanently deleted.`); selection.clear(); setConfirmBulkDelete(false); };
  const handleBulkStatus = (status) => { data.bulkChangeStatusComparisonGroups(selection.selected, status); toast.info(`Status updated to ${status} for ${selection.count} group(s).`); selection.clear(); };

  // Merge = move every member of the non-target selected groups into the
  // target group, then archive the now-redundant source groups. Member
  // competitors and all of their configuration are never touched — only
  // `groupMemberships` rows move, exactly like any other group action.
  const selectedGroupsForMerge = groupsInScope.filter((g) => selection.selected.includes(g.id));
  const handleOpenMerge = () => { setMergeTargetId(selection.selected[0] || null); setMergeModalOpen(true); };
  const handleMerge = () => {
    const sourceIds = selection.selected.filter((id) => id !== mergeTargetId);
    const competitorIds = [...new Set(data.groupMemberships.filter((m) => sourceIds.includes(m.groupId)).map((m) => m.competitorId))];
    if (competitorIds.length) data.bulkAssignCompetitorsToGroups(competitorIds, [mergeTargetId]);
    data.bulkArchiveComparisonGroups(sourceIds);
    const targetName = groupsInScope.find((g) => g.id === mergeTargetId)?.name || "the target group";
    toast.success(`Merged ${sourceIds.length} group(s) into ${targetName}.`);
    selection.clear();
    setMergeModalOpen(false);
    setMergeTargetId(null);
  };

  const archivedView = viewMode === "archived";
  const groupCountForProperty = (propertyId) => data.comparisonGroups.filter((g) => g.propertyId === propertyId && g.status !== "Archived").length;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Competitors", to: "/portal/competitors" },
          { label: "Comparison Groups" },
        ]}
      />
      <Topbar
        title="Comparison Groups"
        subtitle="Optional organizational containers — competitors keep their own mappings and readiness regardless of group."
        hidePropertySelector
      />

      <div className="property-scoped-layout">
        <ComparisonGroupFilterPanel getCount={groupCountForProperty} tagFilter={tagFilter} setTagFilter={setTagFilter} />

        <div className="property-scoped-layout__content">
          <div className="page-section">
            <Tabs tabs={VIEW_TABS} active={viewMode} onChange={setViewMode} />
          </div>

          <Card padded={false}>
            <div style={{ padding: "20px 20px 0" }}>
              <div className="page-toolbar">
                <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search comparison groups..." disabled={!hasPropertySelection} />
                {filtersActive && (
                  <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
                    <RotateCcw size={13} strokeWidth={2} /> Reset
                  </button>
                )}
                <div className="page-toolbar__spacer" />
                <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Comparison Group</Button>
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
                canDelete={permissions.canDeleteComparisonGroupPermanently}
              />
              {selection.count >= 2 && !archivedView && (
                <div className="page-toolbar" style={{ marginTop: -8, marginBottom: 16 }}>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={handleOpenMerge}>
                    <GitMerge size={13} strokeWidth={2} /> Merge into One Group
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
                    <EmptyState icon={Building2} title="Select a property to get started" message="Select one or more properties from the panel on the left to view their comparison groups." />
                  ) : (
                    <EmptyState
                      icon={Target}
                      title={archivedView ? "No archived comparison groups" : filtersActive ? "No comparison groups match your filters" : "No comparison groups yet"}
                      message={
                        archivedView || filtersActive
                          ? "Try adjusting your search or filters."
                          : "Groups are entirely optional organizational tools, not a required setup step — every competitor already works fully without one. Create a group only when you want to organize competitors by market segment, location, hotel category, or your own custom collection."
                      }
                      action={
                        archivedView ? null : filtersActive ? (
                          <Button variant="secondary" size="sm" onClick={resetFilters}>Clear Filters</Button>
                        ) : (
                          <Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Create Comparison Group</Button>
                        )
                      }
                    />
                  )
                }
                renderRow={(g) => {
                  const stats = groupStatsById.get(g.id) || { count: 0, mappingPct: 0, sourcePct: 0, readinessPct: 0 };
                  return (
                  <tr key={g.id}>
                    <td><Checkbox checked={selection.selected.includes(g.id)} onChange={() => selection.toggle(g.id)} label={`Select ${g.name}`} /></td>
                    <td className="tabular table__cell-muted" style={{ whiteSpace: "nowrap" }}>{g.id}</td>
                    <td className="row-link" onClick={() => navigate(`/portal/comparison-groups/${g.id}`)}>
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
                            {permissions.canDeleteComparisonGroupPermanently && (
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

      <ComparisonGroupForm
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
        title="Merge Comparison Groups"
        size="sm"
        footer={
          <>
            <button className="btn btn--ghost btn--md" type="button" onClick={() => setMergeModalOpen(false)}>Cancel</button>
            <Button variant="primary" size="md" icon={GitMerge} onClick={handleMerge} disabled={!mergeTargetId}>Merge</Button>
          </>
        }
      >
        <p className="master-manager__hint" style={{ marginBottom: 16 }}>
          Every competitor in the other selected group(s) will be added to the group you keep — no competitor, mapping,
          source, or URL is touched. The other group(s) are archived afterward, not deleted, so you can restore them later if needed.
        </p>
        <div className="master-manager__list">
          {selectedGroupsForMerge.map((g) => (
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
        title="Delete Comparison Group Permanently"
        message={`Permanently delete "${confirmDelete?.name}"? Its member competitors and all of their configuration (mappings, sources, URLs) are completely unaffected — only the group and its membership references are removed. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Comparison Groups Permanently"
        message={`Permanently delete ${selection.count} selected comparison group(s)? Their member competitors are completely unaffected. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
