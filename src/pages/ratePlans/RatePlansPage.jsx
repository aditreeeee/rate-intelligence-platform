import React, { useState, useMemo, useEffect } from "react";
import { Plus, Tag, Pencil, Copy, Trash2, RotateCcw, Archive, Upload, Building2 } from "lucide-react";
import { Topbar } from "../../components/layout/Topbar.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { Pagination } from "../../components/ui/Pagination.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Select, Input } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { Checkbox } from "../../components/ui/Checkbox.jsx";
import { BulkActionBar } from "../../components/ui/BulkActionBar.jsx";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { ExportMenu } from "../../components/ui/ExportMenu.jsx";
import { ImportWizard } from "../../components/ui/ImportWizard.jsx";
import { PropertyRoomTreeFilter, useSelectedRooms } from "../../components/ui/PropertyRoomTreeFilter.jsx";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useSelection } from "../../hooks/useSelection.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { usePaginatedSortedFiltered, formatCurrency, formatDate } from "../../lib/format.js";
import { MEAL_PLANS, RATE_PLAN_STATUSES, mealPlanLabel } from "../../mocks/ratePlans.js";
import { RatePlanForm } from "./RatePlanForm.jsx";
import { RatePlanDetailModal } from "./RatePlanDetailModal.jsx";

const PAGE_SIZE = 10;

const BASE_COLUMNS = [
  { key: "id", label: "Rate Plan ID", sortable: true, width: 120 },
  { key: "name", label: "Name", sortable: true },
  { key: "room", label: "Room", sortable: false, width: 150 },
  { key: "property", label: "Property", sortable: false, width: 160 },
  { key: "mealPlan", label: "Meal Plan", sortable: false, width: 150 },
  { key: "basePrice", label: "Base Price", sortable: true, width: 110 },
  { key: "validTo", label: "Valid Through", sortable: true, width: 130 },
  { key: "status", label: "Status", sortable: true, width: 100 },
  { key: "actions", label: "", sortable: false, width: 150 },
];

const VIEW_TABS = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

export function RatePlansPage() {
  const data = useData();
  const toast = useToast();
  const permissions = usePermissions();
  const { selectedPropertyIds, setSelectedPropertyIds } = usePropertyContext();
  // Room-level selection is new and Rate-Plans-specific, so it's kept as
  // page-local state rather than added to the shared PropertyContext — Rooms
  // page and other consumers of that context don't need this granularity.
  // Property-level selection still reuses PropertyContext so breadcrumbs and
  // any other property-scoped consumer stay in sync.
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [search, setSearch] = useState("");
  const [mealPlanFilter, setMealPlanFilter] = useState("");
  const [viewMode, setViewMode] = useState("active");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const selectedProperties = useMemo(
    () => data.properties.filter((p) => selectedPropertyIds.includes(p.id)),
    [data.properties, selectedPropertyIds]
  );
  const selectedProperty = selectedProperties.length === 1 ? selectedProperties[0] : null;

  // Keep room-level selection valid if the underlying scoped rooms change
  // (e.g. role switch, or a room gets deleted) — mirrors the same cleanup
  // PropertyContext already does for selectedPropertyIds.
  useEffect(() => {
    const validRoomIds = new Set(data.rooms.map((r) => r.id));
    setSelectedRoomIds((ids) => ids.filter((id) => validRoomIds.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rooms]);

  // Effective selected rooms = union of rooms under any selected property,
  // plus any individually-selected room. This is the single source of truth
  // the table and the Add Rate Plan prefill both read from.
  const effectiveRoomIds = useSelectedRooms({
    properties: data.properties,
    rooms: data.rooms,
    selectedPropertyIds,
    selectedRoomIds,
  });
  const hasSelection = selectedPropertyIds.length > 0 || selectedRoomIds.length > 0;

  const roomsForProperty = useMemo(
    () => data.rooms.filter((r) => effectiveRoomIds.includes(r.id)),
    [data.rooms, effectiveRoomIds]
  );

  const roomLookup = (id) => data.rooms.find((r) => r.id === id);
  const propertyForRoom = (room) => data.properties.find((p) => p.id === room?.propertyId);
  const roomOptions = useMemo(
    () => roomsForProperty.map((r) => ({ id: r.id, label: `${r.name} — ${propertyForRoom(r)?.name || "Unknown Property"}` })),
    [roomsForProperty, data.properties]
  );

  // Prefill the Add Rate Plan form's room only when the current selection
  // resolves to exactly one room — otherwise let the user pick explicitly.
  const scopeRoomId = effectiveRoomIds.length === 1 ? effectiveRoomIds[0] : "";
  const selectedRoom = data.rooms.find((r) => r.id === scopeRoomId);

  const ratePlansInScope = useMemo(() => {
    const roomIdSet = new Set(effectiveRoomIds);
    return data.ratePlans.filter((rp) => roomIdSet.has(rp.roomId));
  }, [data.ratePlans, effectiveRoomIds]);

  const ratePlansInView = useMemo(
    () => ratePlansInScope.filter((rp) => (viewMode === "archived" ? rp.status === "Archived" : rp.status !== "Archived")),
    [ratePlansInScope, viewMode]
  );

  const dateFiltered = useMemo(
    () =>
      ratePlansInView.filter((rp) => {
        if (dateFrom && rp.validFrom < dateFrom) return false;
        if (dateTo && rp.validTo > dateTo) return false;
        return true;
      }),
    [ratePlansInView, dateFrom, dateTo]
  );

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtersActive = search || mealPlanFilter || dateFrom || dateTo;
  const resetFilters = () => {
    setSearch(""); setMealPlanFilter(""); setDateFrom(""); setDateTo("");
    setPage(1);
  };

  const { pageData, total } = useMemo(
    () =>
      usePaginatedSortedFiltered({
        data: dateFiltered,
        search,
        searchFields: ["id", "name", "mealPlan"],
        filters: { mealPlan: mealPlanFilter },
        sortKey,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [dateFiltered, search, mealPlanFilter, sortKey, sortDir, page]
  );

  const visibleIds = pageData.map((rp) => rp.id);
  const selection = useSelection(visibleIds);

  const columns = [
    {
      key: "select",
      label: <Checkbox checked={selection.allChecked} indeterminate={selection.someChecked} onChange={selection.toggleAll} label="Select all" />,
      sortable: false,
      width: 40,
    },
    ...BASE_COLUMNS,
  ];

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (rp) => { setViewing(null); setEditing(rp); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateRatePlan({ ...editing, ...form });
      toast.success(`${form.name} updated.`);
    } else {
      const created = data.addRatePlan(form);
      toast.success(`${created.name} created as ${created.id}.`);
    }
    setFormOpen(false);
  };

  const handleDuplicate = (rp) => {
    const copy = data.duplicateRatePlan(rp);
    toast.info(`Duplicated as ${copy.id}.`);
  };

  const handleArchive = (rp) => { data.archiveRatePlan(rp); toast.info(`${rp.name} archived.`); };
  const handleRestore = (rp) => { data.restoreRatePlan(rp); toast.success(`${rp.name} restored.`); };

  const handleDelete = () => {
    data.deleteRatePlanPermanently(confirmDelete.id);
    toast.success(`${confirmDelete.name} permanently deleted.`);
    setConfirmDelete(null);
  };

  const handleBulkArchive = () => {
    data.bulkArchiveRatePlans(selection.selected);
    toast.info(`${selection.count} rate plan(s) archived.`);
    selection.clear();
  };
  const handleBulkRestore = () => {
    data.bulkRestoreRatePlans(selection.selected);
    toast.success(`${selection.count} rate plan(s) restored.`);
    selection.clear();
  };
  const handleBulkDuplicate = () => {
    const copies = data.bulkDuplicateRatePlans(selection.selected);
    toast.info(`${copies.length} rate plan(s) duplicated.`);
    selection.clear();
  };
  const handleBulkDelete = () => {
    data.bulkDeleteRatePlans(selection.selected);
    toast.success(`${selection.count} rate plan(s) permanently deleted.`);
    selection.clear();
    setConfirmBulkDelete(false);
  };
  const handleBulkStatus = (status) => {
    data.bulkChangeStatusRatePlans(selection.selected, status);
    toast.info(`Status updated to ${status} for ${selection.count} rate plan(s).`);
    selection.clear();
  };

  const archivedView = viewMode === "archived";
  const changeStatusOptions = RATE_PLAN_STATUSES.filter((s) => s !== "Archived");

  const exportColumns = [
    { label: "Rate Plan ID", value: (rp) => rp.id },
    { label: "Name", value: (rp) => rp.name },
    { label: "Room", value: (rp) => roomLookup(rp.roomId)?.name || "" },
    { label: "Property", value: (rp) => propertyForRoom(roomLookup(rp.roomId))?.name || "" },
    { label: "Meal Plan", value: (rp) => `${rp.mealPlan} (${mealPlanLabel(rp.mealPlan)})` },
    { label: "Base Price", value: (rp) => rp.basePrice },
    { label: "Valid From", value: (rp) => formatDate(rp.validFrom) },
    { label: "Valid To", value: (rp) => formatDate(rp.validTo) },
    { label: "Status", value: (rp) => rp.status },
  ];
  const exportRowsData = selection.count ? ratePlansInView.filter((rp) => selection.selected.includes(rp.id)) : pageData;

  return (
    <div>
      <Breadcrumbs
        items={
          selectedProperty
            ? [{ label: "Properties", to: "/portal/properties" }, { label: selectedProperty.name, to: `/portal/properties/${selectedProperty.id}` }, { label: "Rate Plans" }]
            : [{ label: "Rate Plans" }]
        }
      />
      <Topbar title="Rate Plans" subtitle="Rate plans always live under Property → Room." hidePropertySelector />

      <div className="property-scoped-layout">
        <PropertyRoomTreeFilter
          selectedPropertyIds={selectedPropertyIds}
          setSelectedPropertyIds={setSelectedPropertyIds}
          selectedRoomIds={selectedRoomIds}
          setSelectedRoomIds={setSelectedRoomIds}
        />

        <div className="property-scoped-layout__content">
          {!hasSelection ? (
            <Card>
              <EmptyState
                icon={Building2}
                title="Select a property or room to view rate plans"
                message="Select one or more properties or rooms from the panel on the left to view their rate plans."
              />
            </Card>
          ) : (
          <>
          <div className="page-section">
            <Tabs tabs={VIEW_TABS} active={viewMode} onChange={setViewMode} />
          </div>

          <Card padded={false}>
        <div style={{ padding: "20px 20px 0" }}>
          <div className="page-toolbar">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search rate plans..." />
            <Select options={MEAL_PLANS} placeholder="Meal Plan" value={mealPlanFilter} onChange={(e) => { setMealPlanFilter(e.target.value); setPage(1); }} style={{ maxWidth: 150 }} />
            <Input type="date" tabular value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={{ maxWidth: 150 }} title="Valid from" />
            <Input type="date" tabular value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={{ maxWidth: 150 }} title="Valid to" />
            {filtersActive && (
              <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
                <RotateCcw size={13} strokeWidth={2} /> Reset
              </button>
            )}
            <div className="page-toolbar__spacer" />
            <button className="btn btn--ghost btn--md" onClick={() => setImportOpen(true)}>
              <Upload size={16} strokeWidth={2} /><span>Import</span>
            </button>
            <ExportMenu rows={exportRowsData} columns={exportColumns} filenameBase="rate-plans" selectedCount={selection.count} />
            <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Rate Plan</Button>
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
            statusOptions={changeStatusOptions}
            onChangeStatus={handleBulkStatus}
            archived={archivedView}
            canDelete={permissions.canDeleteRatePlanPermanently}
          />
          <Table
            columns={columns}
            data={pageData}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            rowKey={(row) => row.id}
            emptyState={
              <EmptyState
                icon={Tag}
                title={archivedView ? "No archived rate plans" : "No Rate Plans Found"}
                message={archivedView ? "Try adjusting your filters." : "This selection has no rate plans yet. Add one to get started."}
                action={!archivedView && <Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Rate Plan</Button>}
              />
            }
            renderRow={(rp) => {
              const room = roomLookup(rp.roomId);
              const property = propertyForRoom(room);
              return (
                <tr key={rp.id}>
                  <td>
                    <Checkbox checked={selection.selected.includes(rp.id)} onChange={() => selection.toggle(rp.id)} label={`Select ${rp.name}`} />
                  </td>
                  <td className="tabular table__cell-muted">{rp.id}</td>
                  <td className="row-link" onClick={() => setViewing(rp)}>
                    <div className="table__cell-primary">{rp.name}</div>
                    <div className="table__cell-muted">{rp.cancellationPolicy}</div>
                  </td>
                  <td className="table__cell-muted">{room?.name || "—"}</td>
                  <td className="table__cell-muted">{property?.name || "—"}</td>
                  <td title={mealPlanLabel(rp.mealPlan)}>{rp.mealPlan}</td>
                  <td className="tabular">{formatCurrency(rp.basePrice, property?.currency || "USD")}</td>
                  <td className="tabular">{formatDate(rp.validTo)}</td>
                  <td><StatusBadge status={rp.status} /></td>
                  <td>
                    <div className="table__actions">
                      {rp.status !== "Archived" ? (
                        <>
                          <button className="table__action-btn" title="Edit" onClick={() => openEdit(rp)}><Pencil size={15} strokeWidth={2} /></button>
                          <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(rp)}><Copy size={15} strokeWidth={2} /></button>
                          <button className="table__action-btn" title="Archive" onClick={() => handleArchive(rp)}><Archive size={15} strokeWidth={2} /></button>
                        </>
                      ) : (
                        <>
                          <button className="table__action-btn" title="Restore" onClick={() => handleRestore(rp)}><RotateCcw size={15} strokeWidth={2} /></button>
                          {permissions.canDeleteRatePlanPermanently && (
                            <button className="table__action-btn table__action-btn--danger" title="Delete Permanently" onClick={() => setConfirmDelete(rp)}><Trash2 size={15} strokeWidth={2} /></button>
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
          </>
          )}
        </div>
      </div>

      <RatePlanForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        roomLabel={selectedRoom?.name}
        rooms={roomOptions}
        scopeRoomId={scopeRoomId}
      />

      <RatePlanDetailModal ratePlan={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />

      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} defaultEntityType="ratePlans" />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Rate Plan Permanently"
        message={`Permanently delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Rate Plans Permanently"
        message={`Permanently delete ${selection.count} selected rate plan(s)? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
