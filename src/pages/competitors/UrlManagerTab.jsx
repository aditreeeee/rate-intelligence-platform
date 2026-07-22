import React, { useState, useMemo } from "react";
import { Plus, Trash2, Link2, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { UrlRecordForm } from "./UrlRecordForm.jsx";

const URL_REGEX = /^https?:\/\/.+\..+/i;

// Module 6 — URL Manager. Belongs directly to a Competitor, not to a
// Comparison Group. Centralizes *every* URL for this competitor — Website
// and OTA URLs (read from the competitor record; edited there, not here)
// plus Custom URLs (full CRUD, stored as `urlRecords`). Validation
// (duplicate, invalid format, missing) runs across the combined list.
export function UrlManagerTab({ competitor }) {
  const data = useData();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const customRecords = useMemo(() => data.urlRecords.filter((u) => u.competitorId === competitor.id), [data.urlRecords, competitor.id]);

  const allRows = useMemo(() => {
    const rows = [];
    if (competitor.website) rows.push({ id: `${competitor.id}-website`, urlType: "Website", label: "Website", url: competitor.website, editable: false });
    for (const [i, ota] of (competitor.otaUrls || []).entries()) {
      rows.push({ id: `${competitor.id}-ota-${i}`, urlType: "OTA", label: ota.label || "OTA", url: ota.url, editable: false });
    }
    for (const u of customRecords) {
      rows.push({ id: u.id, urlType: u.urlType, label: u.label, url: u.url, editable: true, raw: u });
    }
    return rows;
  }, [competitor, customRecords]);

  const urlCounts = useMemo(() => {
    const counts = new Map();
    for (const row of allRows) counts.set(row.url, (counts.get(row.url) || 0) + 1);
    return counts;
  }, [allRows]);

  const rowStatus = (row) => {
    if (!row.url) return { key: "missing", label: "Missing", icon: HelpCircle, variant: "warning" };
    if (!URL_REGEX.test(row.url)) return { key: "invalid", label: "Invalid Format", icon: XCircle, variant: "danger" };
    if ((urlCounts.get(row.url) || 0) > 1) return { key: "duplicate", label: "Duplicate", icon: AlertTriangle, variant: "danger" };
    return { key: "valid", label: "Valid", icon: CheckCircle2, variant: "success" };
  };

  const missing = !competitor.website && (competitor.otaUrls || []).length === 0 && customRecords.length === 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => [r.label, r.url, r.urlType].some((f) => String(f).toLowerCase().includes(q)));
  }, [allRows, search]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (row) => { setEditing(row.raw); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateUrlRecord({ ...editing, ...form });
      toast.success("URL updated.");
    } else {
      data.addUrlRecord({ ...form, competitorId: competitor.id });
      toast.success("URL added.");
    }
    setFormOpen(false);
  };

  const handleDelete = () => { data.deleteUrlRecordPermanently(confirmDelete.id); toast.success("URL removed."); setConfirmDelete(null); };

  return (
    <Card padded={false}>
      <div style={{ padding: "20px 20px 0" }}>
        {missing && (
          <div className="master-manager__hint" style={{ color: "var(--color-danger)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} strokeWidth={2} /> This competitor has no URL configured.
          </div>
        )}
        <div className="page-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search URLs..." />
          <div className="page-toolbar__spacer" />
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Custom URL</Button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div className="master-manager__list">
          {filtered.length === 0 && (
            <EmptyState
              icon={Link2}
              title="No URLs yet"
              message="Website and OTA URLs come from this competitor's own record — add a Custom URL for anything else (e.g. meta-search listings)."
              action={<Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Custom URL</Button>}
            />
          )}
          {filtered.map((row) => {
            const status = rowStatus(row);
            const StatusIcon = status.icon;
            return (
              <div key={row.id} className="master-manager__row" style={{ alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="master-manager__name">{row.label} <Badge variant="info">{row.urlType}</Badge></div>
                  <div className="table__cell-muted" style={{ wordBreak: "break-all" }}>{row.url || "—"}</div>
                </div>
                <Badge variant={status.variant}><StatusIcon size={11} strokeWidth={2} style={{ marginRight: 3, verticalAlign: -2 }} />{status.label}</Badge>
                {row.editable ? (
                  <>
                    <button type="button" className="master-manager__icon-btn" onClick={() => openEdit(row)} aria-label={`Edit ${row.label}`}>Edit</button>
                    <button type="button" className="master-manager__icon-btn master-manager__icon-btn--danger" onClick={() => setConfirmDelete(row.raw)} aria-label={`Delete ${row.label}`}>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <span className="table__cell-muted" style={{ fontSize: 12 }}>Edit via Overview</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <UrlRecordForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={editing} competitorName={competitor.hotelName} />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete URL"
        message="Remove this URL record? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </Card>
  );
}
