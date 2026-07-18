import React, { useState, useMemo } from "react";
import { Plus, BedDouble, Pencil, Copy, Trash2, Users, Cigarette, RotateCcw, Upload, Archive, Building2 } from "lucide-react";
import { Topbar } from "../../components/layout/Topbar.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { Pagination } from "../../components/ui/Pagination.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Select } from "../../components/ui/Input.jsx";
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
import { PropertyFilterPanel } from "../../components/ui/PropertyFilterPanel.jsx";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useSelection } from "../../hooks/useSelection.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { usePaginatedSortedFiltered } from "../../lib/format.js";
import { BED_TYPES, ROOM_STATUSES } from "../../mocks/rooms.js";
import { RoomForm } from "./RoomForm.jsx";
import { RoomDetailModal } from "./RoomDetailModal.jsx";

const PAGE_SIZE = 10;

const BASE_COLUMNS = [
  { key: "id", label: "Room ID", sortable: true, width: 110 },
  { key: "name", label: "Room Name", sortable: true },
  { key: "property", label: "Property", sortable: false, width: 170 },
  { key: "bedType", label: "Bed Type", sortable: true, width: 100 },
  { key: "occupancy", label: "Occupancy", sortable: true, width: 100 },
  { key: "view", label: "View", sortable: false, width: 130 },
  { key: "status", label: "Status", sortable: true, width: 100 },
  { key: "actions", label: "", sortable: false, width: 150 },
];

const VIEW_TABS = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
];

export function RoomsPage() {
  const data = useData();
  const toast = useToast();
  const permissions = usePermissions();
  const { selectedPropertyIds } = usePropertyContext();
  const [search, setSearch] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState("");
  const [bedTypeFilter, setBedTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState("active");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const hasPropertySelection = selectedPropertyIds.length > 0;
  const roomsInScope = useMemo(
    () => data.rooms.filter((r) => selectedPropertyIds.includes(r.propertyId)),
    [data.rooms, selectedPropertyIds]
  );
  const roomsInView = useMemo(
    () => roomsInScope.filter((r) => (viewMode === "archived" ? r.status === "Archived" : r.status !== "Archived")),
    [roomsInScope, viewMode]
  );
  const selectedProperties = useMemo(
    () => data.properties.filter((p) => selectedPropertyIds.includes(p.id)),
    [data.properties, selectedPropertyIds]
  );
  const selectedProperty = selectedProperties.length === 1 ? selectedProperties[0] : null;
  const propertyName = (id) => data.properties.find((p) => p.id === id)?.name || "—";

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtersActive = search || occupancyFilter || bedTypeFilter;
  const resetFilters = () => {
    setSearch(""); setOccupancyFilter(""); setBedTypeFilter("");
    setPage(1);
  };

  const { pageData, total } = useMemo(
    () =>
      usePaginatedSortedFiltered({
        data: roomsInView,
        search,
        searchFields: ["id", "name", "bedType", "view"],
        filters: {
          occupancy: occupancyFilter ? Number(occupancyFilter) : "",
          bedType: bedTypeFilter,
        },
        sortKey,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [roomsInView, search, occupancyFilter, bedTypeFilter, sortKey, sortDir, page]
  );

  const visibleIds = pageData.map((r) => r.id);
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
  const openEdit = (r) => { setViewing(null); setEditing(r); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateRoom({ ...editing, ...form });
      toast.success(`${form.name} updated.`);
    } else {
      const created = data.addRoom(form);
      toast.success(`${created.name} created as ${created.id}.`);
    }
    setFormOpen(false);
  };

  const handleDuplicate = (r) => {
    const copy = data.duplicateRoom(r);
    toast.info(`Duplicated as ${copy.id}.`);
  };

  const handleArchive = (r) => { data.archiveRoom(r); toast.info(`${r.name} archived.`); };
  const handleRestore = (r) => { data.restoreRoom(r); toast.success(`${r.name} restored.`); };

  const handleDelete = () => {
    data.deleteRoomPermanently(confirmDelete.id);
    toast.success(`${confirmDelete.name} permanently deleted.`);
    setConfirmDelete(null);
  };

  const handleBulkArchive = () => {
    data.bulkArchiveRooms(selection.selected);
    toast.info(`${selection.count} room(s) archived.`);
    selection.clear();
  };
  const handleBulkRestore = () => {
    data.bulkRestoreRooms(selection.selected);
    toast.success(`${selection.count} room(s) restored.`);
    selection.clear();
  };
  const handleBulkDuplicate = () => {
    const copies = data.bulkDuplicateRooms(selection.selected);
    toast.info(`${copies.length} room(s) duplicated.`);
    selection.clear();
  };
  const handleBulkDelete = () => {
    data.bulkDeleteRooms(selection.selected);
    toast.success(`${selection.count} room(s) permanently deleted.`);
    selection.clear();
    setConfirmBulkDelete(false);
  };
  const handleBulkStatus = (status) => {
    data.bulkChangeStatusRooms(selection.selected, status);
    toast.info(`Status updated to ${status} for ${selection.count} room(s).`);
    selection.clear();
  };

  const archivedView = viewMode === "archived";
  const changeStatusOptions = ROOM_STATUSES.filter((s) => s !== "Archived");

  const exportColumns = [
    { label: "Room ID", value: (r) => r.id },
    { label: "Name", value: (r) => r.name },
    { label: "Property", value: (r) => propertyName(r.propertyId) },
    { label: "Bed Type", value: (r) => r.bedType },
    { label: "View", value: (r) => r.view },
    { label: "Max Adults", value: (r) => r.maxAdults },
    { label: "Max Children", value: (r) => r.maxChildren },
    { label: "Status", value: (r) => r.status },
  ];
  const exportRowsData = selection.count ? roomsInView.filter((r) => selection.selected.includes(r.id)) : pageData;

  const roomCountForProperty = (propertyId) => data.rooms.filter((r) => r.propertyId === propertyId && r.status !== "Archived").length;

  return (
    <div>
      <Breadcrumbs
        items={
          selectedProperty
            ? [{ label: "Properties", to: "/portal/properties" }, { label: selectedProperty.name, to: `/portal/properties/${selectedProperty.id}` }, { label: "Rooms" }]
            : [{ label: "Rooms" }]
        }
      />
      <Topbar title="Rooms" subtitle="Rooms are managed within their parent property." hidePropertySelector />

      <div className="property-scoped-layout">
        <PropertyFilterPanel getCount={roomCountForProperty} />

        <div className="property-scoped-layout__content">
          {!hasPropertySelection ? (
            <Card>
              <EmptyState
                icon={Building2}
                title="Select a property to get started"
                message="Select one or more properties from the panel on the left to view their rooms."
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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search rooms..." />
            <Select options={["1", "2", "3", "4"]} placeholder="Occupancy" value={occupancyFilter} onChange={(e) => { setOccupancyFilter(e.target.value); setPage(1); }} style={{ maxWidth: 130 }} />
            <Select options={BED_TYPES} placeholder="Bed Type" value={bedTypeFilter} onChange={(e) => { setBedTypeFilter(e.target.value); setPage(1); }} style={{ maxWidth: 140 }} />
            {filtersActive && (
              <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
                <RotateCcw size={13} strokeWidth={2} /> Reset
              </button>
            )}
            <div className="page-toolbar__spacer" />
            <button className="btn btn--ghost btn--md" onClick={() => setImportOpen(true)}>
              <Upload size={16} strokeWidth={2} /><span>Import</span>
            </button>
            <ExportMenu rows={exportRowsData} columns={exportColumns} filenameBase="rooms" selectedCount={selection.count} />
            <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Room</Button>
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
            canDelete={permissions.canDeleteRoomPermanently}
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
                icon={BedDouble}
                title={archivedView ? "No archived rooms" : "No Rooms Found"}
                message={archivedView ? "Try adjusting your filters." : "This property has no rooms yet. Add one to get started."}
                action={!archivedView && <Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Room</Button>}
              />
            }
            renderRow={(r) => (
              <tr key={r.id}>
                <td>
                  <Checkbox checked={selection.selected.includes(r.id)} onChange={() => selection.toggle(r.id)} label={`Select ${r.name}`} />
                </td>
                <td className="tabular table__cell-muted">{r.id}</td>
                <td className="row-link" onClick={() => setViewing(r)}>
                  <div className="table__cell-primary">{r.name}</div>
                  <div className="table__cell-muted">{r.description}</div>
                </td>
                <td className="table__cell-muted">{propertyName(r.propertyId)}</td>
                <td>{r.bedType}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Users size={13} strokeWidth={2} style={{ color: "var(--color-text-faint)" }} />
                    <span className="tabular">{r.maxAdults}A / {r.maxChildren}C</span>
                    {r.smoking && <Cigarette size={13} strokeWidth={2} style={{ color: "var(--color-text-faint)" }} />}
                  </span>
                </td>
                <td>{r.view}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="table__actions">
                    {r.status !== "Archived" ? (
                      <>
                        <button className="table__action-btn" title="Edit" onClick={() => openEdit(r)}><Pencil size={15} strokeWidth={2} /></button>
                        <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(r)}><Copy size={15} strokeWidth={2} /></button>
                        <button className="table__action-btn" title="Archive" onClick={() => handleArchive(r)}><Archive size={15} strokeWidth={2} /></button>
                      </>
                    ) : (
                      <>
                        <button className="table__action-btn" title="Restore" onClick={() => handleRestore(r)}><RotateCcw size={15} strokeWidth={2} /></button>
                        {permissions.canDeleteRoomPermanently && (
                          <button className="table__action-btn table__action-btn--danger" title="Delete Permanently" onClick={() => setConfirmDelete(r)}><Trash2 size={15} strokeWidth={2} /></button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </div>
          </Card>
          </>
          )}
        </div>
      </div>

      <RoomForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initial={editing}
        properties={selectedProperties}
        scopePropertyId={selectedProperty?.id || ""}
      />

      <RoomDetailModal room={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />

      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} defaultEntityType="rooms" />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Room Permanently"
        message={`"${confirmDelete?.name}" is archived. Permanently deleting it will also remove its rate plans. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Rooms Permanently"
        message={`Permanently delete ${selection.count} selected room(s), along with their rate plans? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
