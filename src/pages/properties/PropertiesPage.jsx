import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, BedDouble, Tag, Settings, Copy, Archive, Trash2, Pencil, MapPin, ArrowUpRight } from "lucide-react";
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
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePaginatedSortedFiltered } from "../../lib/format.js";
import { STATUSES, PROPERTY_TYPES } from "../../mocks/properties.js";
import { PropertyForm } from "./PropertyForm.jsx";
import { PropertyIdLookup } from "./PropertyIdLookup.jsx";

const PAGE_SIZE = 5;

const COLUMNS = [
  { key: "id", label: "Property ID", sortable: true, width: 130 },
  { key: "name", label: "Name", sortable: true },
  { key: "propertyType", label: "Type", sortable: true },
  { key: "city", label: "Location", sortable: false },
  { key: "rooms", label: "Rooms", sortable: false, width: 90 },
  { key: "ratePlans", label: "Rate Plans", sortable: false, width: 100 },
  { key: "status", label: "Status", sortable: true, width: 110 },
  { key: "actions", label: "", sortable: false, width: 160 },
];

export function PropertiesPage() {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const { pageData, total } = useMemo(
    () =>
      usePaginatedSortedFiltered({
        data: data.properties,
        search,
        searchFields: ["id", "name", "city", "country", "brand"],
        filters: { propertyType: typeFilter, status: statusFilter },
        sortKey,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [data.properties, search, typeFilter, statusFilter, sortKey, sortDir, page]
  );

  const stats = [
    { label: "Total Properties", value: data.properties.length, icon: Building2, to: "/portal/properties" },
    { label: "Total Rooms", value: data.rooms.length, icon: BedDouble, to: "/portal/rooms" },
    { label: "Total Rate Plans", value: data.ratePlans.length, icon: Tag, to: "/portal/rate-plans" },
    { label: "Integrations", value: 6, icon: Settings, to: "/portal/settings" },
  ];

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateProperty({ ...editing, ...form });
      toast.success(`${form.name} updated.`);
    } else {
      const created = data.addProperty(form);
      toast.success(`${created.name} created as ${created.id}.`);
    }
    setFormOpen(false);
  };

  const handleDuplicate = (p) => {
    const copy = data.duplicateProperty(p);
    toast.info(`Duplicated as ${copy.id}.`);
  };

  const handleArchive = (p) => {
    data.archiveProperty(p);
    toast.info(`${p.name} archived.`);
  };

  const handleDelete = () => {
    data.deleteProperty(confirmDelete.id);
    toast.success(`${confirmDelete.name} deleted.`);
    setConfirmDelete(null);
  };

  return (
    <div>
      <Topbar title="Properties" subtitle="Manage your property portfolio across every market." />

      <div className="stat-row">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="stat-card stat-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => navigate(s.to)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(s.to)}
          >
            <div className="stat-card__icon"><s.icon size={20} strokeWidth={2} /></div>
            <div className="stat-card__body">
              <div className="stat-card__value tabular">{s.value}</div>
              <div className="stat-card__label">{s.label}</div>
            </div>
            <ArrowUpRight size={16} strokeWidth={2} className="stat-card__arrow" />
          </Card>
        ))}
      </div>

      <div className="page-section">
        <PropertyIdLookup />
      </div>

      <Card padded={false}>
        <div style={{ padding: "20px 20px 0" }}>
          <div className="page-toolbar">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search properties..." />
            <Select
              options={PROPERTY_TYPES}
              placeholder="All Types"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              style={{ maxWidth: 170 }}
            />
            <Select
              options={STATUSES}
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ maxWidth: 170 }}
            />
            <div className="page-toolbar__spacer" />
            <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Property</Button>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <Table
            columns={COLUMNS}
            data={pageData}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            rowKey={(row) => row.id}
            emptyState={
              <EmptyState
                icon={Building2}
                title="No properties found"
                message="Try adjusting your search or filters, or add a new property."
                action={<Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Property</Button>}
              />
            }
            renderRow={(p) => (
              <tr key={p.id}>
                <td className="tabular table__cell-muted">{p.id}</td>
                <td>
                  <div className="table__cell-primary">{p.name}</div>
                  <div className="table__cell-muted">{p.brand}</div>
                </td>
                <td>{p.propertyType}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={13} strokeWidth={2} style={{ color: "var(--color-text-faint)" }} />
                    {p.city}, {p.country}
                  </span>
                </td>
                <td className="tabular">{data.roomCountFor(p.id)}</td>
                <td className="tabular">{data.ratePlanCountFor(p.id)}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>
                  <div className="table__actions">
                    <button className="table__action-btn" title="Edit" onClick={() => openEdit(p)}><Pencil size={15} strokeWidth={2} /></button>
                    <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(p)}><Copy size={15} strokeWidth={2} /></button>
                    <button className="table__action-btn" title="Archive" onClick={() => handleArchive(p)}><Archive size={15} strokeWidth={2} /></button>
                    <button className="table__action-btn table__action-btn--danger" title="Delete" onClick={() => setConfirmDelete(p)}><Trash2 size={15} strokeWidth={2} /></button>
                  </div>
                </td>
              </tr>
            )}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </Card>

      <PropertyForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={editing} />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Property"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This will also remove its rooms and rate plans. This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
