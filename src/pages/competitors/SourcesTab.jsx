import React, { useState, useMemo } from "react";
import { Plus, Pencil, Copy, Archive, RotateCcw, Trash2, PlugZap, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge, StatusBadge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { SourceConfigForm } from "./SourceConfigForm.jsx";

const URL_REGEX = /^https?:\/\/.+\..+/i;

// Module 5 — Sources. Belongs directly to a Competitor, not to a Competitive
// Set. This tab used to be two separate tabs — "Sources" (Source
// Configuration, `sourceConfigs`) and "URL Manager" (`urlRecords`) — but both
// were really the same underlying concept: "how do we reach this
// competitor's rates." Splitting them meant each tab only validated its own
// rows, so a duplicate URL between a Source and the competitor's own
// Website/OTA field could slip through unnoticed. They're unified here into
// one place to manage every link/source for a competitor, with one
// consistent cross-row validation pass over the FULL combined list —
// read-only rows sourced from the competitor record (Website, OTA URLs)
// plus editable `sourceConfigs` rows. `urlRecords` no longer exists; any
// former custom URL record is now a `sourceConfigs` row with sourceType
// "Custom" (see mocks/competitors.js). Configures where a *future*
// collection pass would look for this competitor's rates — nothing here
// fetches or scrapes anything. Source types come from the extensible
// `sourceTypes` master table (Settings → Sources, or the Manage button
// inside the form).
export function SourcesTab({ competitor }) {
  const data = useData();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sources = useMemo(() => data.sourceConfigs.filter((s) => s.competitorId === competitor.id), [data.sourceConfigs, competitor.id]);

  // The full combined list validation runs over: read-only rows derived
  // from the competitor's own Website/OTA fields, plus every editable
  // sourceConfigs row. A duplicate URL is only detectable once both sides
  // are considered together — the gap the old two-tab split had.
  const allRows = useMemo(() => {
    const rows = [];
    if (competitor.website) {
      rows.push({ id: `${competitor.id}-website`, kind: "synthetic", label: "Website", type: "Website", url: competitor.website, editable: false });
    }
    for (const [i, ota] of (competitor.otaUrls || []).entries()) {
      rows.push({ id: `${competitor.id}-ota-${i}`, kind: "synthetic", label: ota.label || "OTA", type: ota.label || "OTA", url: ota.url, editable: false });
    }
    for (const s of sources) {
      rows.push({ id: s.id, kind: "source", label: s.sourceName, type: s.sourceType, url: s.sourceUrl, editable: true, raw: s });
    }
    return rows;
  }, [competitor, sources]);

  const urlCounts = useMemo(() => {
    const counts = new Map();
    for (const row of allRows) if (row.url) counts.set(row.url, (counts.get(row.url) || 0) + 1);
    return counts;
  }, [allRows]);

  const rowStatus = (row) => {
    if (!row.url) return { key: "missing", label: "Missing", icon: HelpCircle, variant: "warning" };
    if (!URL_REGEX.test(row.url)) return { key: "invalid", label: "Invalid Format", icon: XCircle, variant: "danger" };
    if ((urlCounts.get(row.url) || 0) > 1) return { key: "duplicate", label: "Duplicate", icon: AlertTriangle, variant: "danger" };
    return { key: "valid", label: "Valid", icon: CheckCircle2, variant: "success" };
  };

  const statusById = useMemo(() => {
    const map = new Map();
    for (const row of allRows) map.set(row.id, rowStatus(row));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, urlCounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => [r.label, r.type, r.url].some((f) => String(f).toLowerCase().includes(q)));
  }, [allRows, search]);

  const missing = allRows.length === 0;

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s) => { setEditing(s); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateSourceConfig({ ...editing, ...form });
      toast.success(`${form.sourceName} updated.`);
    } else {
      const created = data.addSourceConfig({ ...form, competitorId: competitor.id });
      toast.success(`${created.sourceName} added.`);
    }
    setFormOpen(false);
  };

  const handleDuplicate = (s) => { const copy = data.duplicateSourceConfig(s); toast.info(`Duplicated as ${copy.id}.`); };
  const handleArchive = (s) => { data.archiveSourceConfig(s); toast.info(`${s.sourceName} archived.`); };
  const handleRestore = (s) => { data.restoreSourceConfig(s); toast.success(`${s.sourceName} restored.`); };
  const handleDelete = () => { data.deleteSourceConfigPermanently(confirmDelete.id); toast.success(`${confirmDelete.sourceName} permanently deleted.`); setConfirmDelete(null); };

  return (
    <Card padded={false}>
      <div style={{ padding: "20px 20px 0" }}>
        {missing && (
          <div className="master-manager__hint" style={{ color: "var(--color-danger)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} strokeWidth={2} /> This competitor has no source or URL configured.
          </div>
        )}
        <div className="page-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search sources & URLs..." />
          <div className="page-toolbar__spacer" />
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Source</Button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <Table
          columns={[
            { key: "name", label: "Source / URL", width: 220 },
            { key: "type", label: "Type", width: 120 },
            { key: "priority", label: "Priority", width: 90 },
            { key: "validation", label: "Validation", width: 120 },
            { key: "status", label: "Status", width: 110 },
            { key: "actions", label: "", width: 150 },
          ]}
          data={filtered}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={PlugZap}
              title="No sources or URLs configured yet"
              message="Configure future collection sources (Direct Website, OTAs, custom links) for this competitor."
              action={<Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Source</Button>}
            />
          }
          renderRow={(row) => {
            const status = statusById.get(row.id);
            const StatusIcon = status.icon;
            return (
              <tr key={row.id}>
                <td>
                  <div className="table__cell-primary">{row.label}</div>
                  <div className="table__cell-muted" style={{ wordBreak: "break-all" }}>{row.url || "—"}</div>
                  {!row.editable && <div className="table__cell-muted" style={{ fontSize: 11 }}>From Competitor Profile — edit via Overview</div>}
                </td>
                <td><Badge variant="info">{row.type}</Badge></td>
                <td>{row.editable ? <Badge variant={row.raw.priority === "High" ? "danger" : row.raw.priority === "Medium" ? "warning" : "info"}>{row.raw.priority}</Badge> : <span className="table__cell-muted">—</span>}</td>
                <td><Badge variant={status.variant}><StatusIcon size={11} strokeWidth={2} style={{ marginRight: 3, verticalAlign: -2 }} />{status.label}</Badge></td>
                <td>{row.editable ? <StatusBadge status={row.raw.status} /> : <span className="table__cell-muted">—</span>}</td>
                <td>
                  {row.editable ? (
                    <div className="table__actions">
                      {row.raw.status !== "Archived" ? (
                        <>
                          <button className="table__action-btn" title="Edit" onClick={() => openEdit(row.raw)}><Pencil size={15} strokeWidth={2} /></button>
                          <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(row.raw)}><Copy size={15} strokeWidth={2} /></button>
                          <button className="table__action-btn" title="Archive" onClick={() => handleArchive(row.raw)}><Archive size={15} strokeWidth={2} /></button>
                        </>
                      ) : (
                        <>
                          <button className="table__action-btn" title="Restore" onClick={() => handleRestore(row.raw)}><RotateCcw size={15} strokeWidth={2} /></button>
                          <button className="table__action-btn table__action-btn--danger" title="Delete Permanently" onClick={() => setConfirmDelete(row.raw)}><Trash2 size={15} strokeWidth={2} /></button>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="table__cell-muted" style={{ fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            );
          }}
        />
      </div>

      <SourceConfigForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={editing} competitorName={competitor.hotelName} />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Source Permanently"
        message={`Permanently delete "${confirmDelete?.sourceName}"? This cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </Card>
  );
}
