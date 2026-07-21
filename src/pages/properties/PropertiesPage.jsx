import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Building2, BedDouble, Tag, Settings, Copy, Archive, Trash2, Pencil,
  MapPin, ArrowUpRight, RotateCcw, Building, Upload,
} from "lucide-react";
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
import { TagChips } from "../../components/ui/TagChips.jsx";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { ExportMenu } from "../../components/ui/ExportMenu.jsx";
import { ImportWizard } from "../../components/ui/ImportWizard.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useSelection } from "../../hooks/useSelection.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import { usePaginatedSortedFiltered, formatDate } from "../../lib/format.js";
import { STATUSES, PROPERTY_TYPES } from "../../mocks/properties.js";
import { PropertyForm } from "./PropertyForm.jsx";
import { PropertyIdLookup } from "./PropertyIdLookup.jsx";

const PAGE_SIZE = 6;

const BASE_COLUMNS = [
  { key: "id", label: "Property ID", sortable: true, width: 120 },
  { key: "name", label: "Name", sortable: true },
  { key: "propertyType", label: "Type", sortable: true, width: 100 },
  { key: "city", label: "Location", sortable: false, width: 160 },
  { key: "tags", label: "Tags", sortable: false, width: 150 },
  { key: "rooms", label: "Rooms", sortable: false, width: 80 },
  { key: "ratePlans", label: "Rate Plans", sortable: false, width: 90 },
  { key: "status", label: "Status", sortable: true, width: 100 },
  { key: "lastModifiedAt", label: "Last Modified", sortable: true, width: 150 },
  { key: "actions", label: "", sortable: false, width: 160 },
];

export function PropertiesPage() {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [starFilter, setStarFilter] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const countries = useMemo(() => [...new Set(data.properties.map((p) => p.country))].sort(), [data.properties]);
  const cities = useMemo(() => [...new Set(data.properties.map((p) => p.city))].sort(), [data.properties]);
  const brands = useMemo(() => [...new Set(data.properties.map((p) => p.brand))].sort(), [data.properties]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtersActive = typeFilter || statusFilter || countryFilter || cityFilter || brandFilter || starFilter || search;

  const resetFilters = () => {
    setSearch(""); setTypeFilter(""); setStatusFilter("");
    setCountryFilter(""); setCityFilter(""); setBrandFilter(""); setStarFilter("");
    setPage(1);
  };

  const { pageData, total } = useMemo(
    () =>
      usePaginatedSortedFiltered({
        data: data.properties,
        search,
        searchFields: ["id", "name", "city", "country", "brand"],
        filters: {
          propertyType: typeFilter,
          status: statusFilter,
          country: countryFilter,
          city: cityFilter,
          brand: brandFilter,
          starRating: starFilter ? Number(starFilter) : "",
        },
        sortKey,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
      }),
    [data.properties, search, typeFilter, statusFilter, countryFilter, cityFilter, brandFilter, starFilter, sortKey, sortDir, page]
  );

  const visibleIds = pageData.map((p) => p.id);
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

  const stats = [
    { label: "Total Properties", value: data.properties.length, icon: Building2, to: "/portal/properties" },
    { label: "Total Rooms", value: data.rooms.length, icon: BedDouble, to: "/portal/rooms" },
    { label: "Total Rate Plans", value: data.ratePlans.length, icon: Tag, to: "/portal/rate-plans" },
    ...(permissions.canViewIntegrations
      ? [{ label: "Integrations", value: 6, icon: Settings, to: "/portal/settings" }]
      : []),
  ];

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  const handleSubmit = (form, opts) => {
    if (editing) {
      data.updateProperty({ ...editing, ...form });
      toast.success(`${form.name} updated.`);
    } else {
      const created = data.addProperty(form);
      toast.success(`${created.name} created as ${created.id}.`);
    }
    if (!opts?.keepOpen) setFormOpen(false);
  };

  const handleDuplicate = (p) => {
    const copy = data.duplicateProperty(p);
    toast.info(`Duplicated as ${copy.id}.`);
  };

  const handleArchive = (p) => {
    data.archiveProperty(p);
    toast.info(`${p.name} archived.`);
  };

  const handleRestore = (p) => {
    data.restoreProperty(p);
    toast.success(`${p.name} restored.`);
  };

  const handleDeletePermanently = () => {
    data.deletePropertyPermanently(confirmDelete.id);
    toast.success(`${confirmDelete.name} permanently deleted.`);
    setConfirmDelete(null);
  };

  const handleBulkArchive = () => {
    data.bulkArchiveProperties(selection.selected);
    toast.info(`${selection.count} propert${selection.count === 1 ? "y" : "ies"} archived.`);
    selection.clear();
  };
  const handleBulkDuplicate = () => {
    const copies = data.bulkDuplicateProperties(selection.selected);
    toast.info(`${copies.length} propert${copies.length === 1 ? "y" : "ies"} duplicated.`);
    selection.clear();
  };
  const handleBulkDelete = () => {
    data.bulkDeleteProperties(selection.selected);
    toast.success(`${selection.count} propert${selection.count === 1 ? "y" : "ies"} permanently deleted.`);
    selection.clear();
    setConfirmBulkDelete(false);
  };
  const handleBulkStatus = (status) => {
    data.bulkChangeStatusProperties(selection.selected, status);
    toast.info(`Status updated to ${status} for ${selection.count} propert${selection.count === 1 ? "y" : "ies"}.`);
    selection.clear();
  };
  const handleBulkRestore = () => {
    data.bulkRestoreProperties(selection.selected);
    toast.success(`${selection.count} propert${selection.count === 1 ? "y" : "ies"} restored.`);
    selection.clear();
  };

  const archivedView = statusFilter === "Archived";

  const exportColumns = [
    { label: "Property ID", value: (p) => p.id },
    { label: "Name", value: (p) => p.name },
    { label: "Brand", value: (p) => p.brand },
    { label: "Property Type", value: (p) => p.propertyType },
    { label: "City", value: (p) => p.city },
    { label: "Country", value: (p) => p.country },
    { label: "Star Rating", value: (p) => p.starRating },
    { label: "Currency", value: (p) => p.currency },
    { label: "Status", value: (p) => p.status },
    { label: "Rooms", value: (p) => data.roomCountFor(p.id) },
    { label: "Rate Plans", value: (p) => data.ratePlanCountFor(p.id) },
    { label: "Last Modified", value: (p) => formatDate(p.lastModifiedAt) },
  ];
  const exportRowsData = selection.count ? data.properties.filter((p) => selection.selected.includes(p.id)) : pageData;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Properties" }]} />
      <Topbar title="Properties" subtitle="Manage your property portfolio across every market." hidePropertySelector />

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
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Quick search properties..." />
            <Select options={PROPERTY_TYPES} placeholder="All Types" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ maxWidth: 140 }} />
            <Select options={STATUSES} placeholder="All Statuses" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 140 }} />
            <Select options={countries} placeholder="All Countries" value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }} style={{ maxWidth: 150 }} />
            <Select options={cities} placeholder="All Cities" value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }} style={{ maxWidth: 140 }} />
            <Select options={brands} placeholder="All Brands" value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} style={{ maxWidth: 160 }} />
            <Select options={["1", "2", "3", "4", "5"]} placeholder="All Ratings" value={starFilter} onChange={(e) => { setStarFilter(e.target.value); setPage(1); }} style={{ maxWidth: 130 }} />
            {filtersActive && (
              <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
                <RotateCcw size={13} strokeWidth={2} /> Reset
              </button>
            )}
            <div className="page-toolbar__spacer" />
            <button className="btn btn--ghost btn--md" onClick={() => setImportOpen(true)}>
              <Upload size={16} strokeWidth={2} /><span>Import</span>
            </button>
            <ExportMenu rows={exportRowsData} columns={exportColumns} filenameBase="properties" selectedCount={selection.count} />
            <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Property</Button>
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
            statusOptions={STATUSES}
            onChangeStatus={handleBulkStatus}
            archived={archivedView}
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
                icon={Building2}
                title="No properties found"
                message="Try adjusting your search or filters, or add a new property."
                action={<Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Property</Button>}
              />
            }
            renderRow={(p) => (
              <tr key={p.id}>
                <td>
                  <Checkbox checked={selection.selected.includes(p.id)} onChange={() => selection.toggle(p.id)} label={`Select ${p.name}`} />
                </td>
                <td className="tabular table__cell-muted">{p.id}</td>
                <td className="row-link" onClick={() => navigate(`/portal/properties/${p.id}`)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="property-thumb">
                      {p.logoUrl ? <img src={p.logoUrl} alt="" /> : <Building size={15} strokeWidth={2} />}
                    </div>
                    <div>
                      <div className="table__cell-primary">{p.name}</div>
                      <div className="table__cell-muted">{p.brand}</div>
                    </div>
                  </div>
                </td>
                <td>{p.propertyType}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={13} strokeWidth={2} style={{ color: "var(--color-text-faint)" }} />
                    {p.city}, {p.country}
                  </span>
                </td>
                <td><TagChips tags={p.tags} /></td>
                <td className="tabular">{data.roomCountFor(p.id)}</td>
                <td className="tabular">{data.ratePlanCountFor(p.id)}</td>
                <td><StatusBadge status={p.status} /></td>
                <td className="tabular table__cell-muted">
                  {formatDate(p.lastModifiedAt)}
                  <div className="table__cell-muted">{p.lastModifiedBy}</div>
                </td>
                <td>
                  <div className="table__actions">
                    <button className="table__action-btn" title="Edit" onClick={() => openEdit(p)}><Pencil size={15} strokeWidth={2} /></button>
                    <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(p)}><Copy size={15} strokeWidth={2} /></button>
                    {p.status !== "Archived" ? (
                      <button className="table__action-btn" title="Archive" onClick={() => handleArchive(p)}><Archive size={15} strokeWidth={2} /></button>
                    ) : (
                      <>
                        <button className="table__action-btn" title="Restore" onClick={() => handleRestore(p)}><RotateCcw size={15} strokeWidth={2} /></button>
                        <button className="table__action-btn table__action-btn--danger" title="Delete Permanently" onClick={() => setConfirmDelete(p)}><Trash2 size={15} strokeWidth={2} /></button>
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

      <PropertyForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={editing} />

      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} defaultEntityType="properties" />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeletePermanently}
        title="Delete Property Permanently"
        message={`"${confirmDelete?.name}" is archived. Permanently deleting it will also remove its rooms and rate plans. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />

      <ConfirmModal
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Properties Permanently"
        message={`Permanently delete ${selection.count} selected propert${selection.count === 1 ? "y" : "ies"}, along with their rooms and rate plans? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
