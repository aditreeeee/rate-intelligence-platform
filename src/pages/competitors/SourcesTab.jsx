import React, { useState, useMemo } from "react";
import { Plus, Pencil, Copy, Archive, RotateCcw, Trash2, PlugZap } from "lucide-react";
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

// Module 5 — Source Configuration. Belongs directly to a Competitor, not to
// a Comparison Group. Configures where a *future* collection pass would
// look for this competitor's rates — nothing here fetches or scrapes
// anything. Source types come from the extensible `sourceTypes` master
// table (Settings → Sources, or the Manage button inside the form).
export function SourcesTab({ competitor }) {
  const data = useData();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sources = useMemo(() => data.sourceConfigs.filter((s) => s.competitorId === competitor.id), [data.sourceConfigs, competitor.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => [s.sourceName, s.sourceType, s.sourceUrl].some((f) => String(f).toLowerCase().includes(q)));
  }, [sources, search]);

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
        <div className="page-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search sources..." />
          <div className="page-toolbar__spacer" />
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>Add Source</Button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <Table
          columns={[
            { key: "name", label: "Source", width: 220 },
            { key: "type", label: "Type", width: 130 },
            { key: "priority", label: "Priority", width: 100 },
            { key: "status", label: "Status", width: 110 },
            { key: "actions", label: "", width: 150 },
          ]}
          data={filtered}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={PlugZap}
              title="No sources configured yet"
              message="Configure future collection sources (Direct Website, OTAs) for this competitor."
              action={<Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Source</Button>}
            />
          }
          renderRow={(s) => (
            <tr key={s.id}>
              <td>
                <div className="table__cell-primary">{s.sourceName}</div>
                <div className="table__cell-muted" style={{ wordBreak: "break-all" }}>{s.sourceUrl}</div>
              </td>
              <td><Badge variant="info">{s.sourceType}</Badge></td>
              <td><Badge variant={s.priority === "High" ? "danger" : s.priority === "Medium" ? "warning" : "info"}>{s.priority}</Badge></td>
              <td><StatusBadge status={s.status} /></td>
              <td>
                <div className="table__actions">
                  {s.status !== "Archived" ? (
                    <>
                      <button className="table__action-btn" title="Edit" onClick={() => openEdit(s)}><Pencil size={15} strokeWidth={2} /></button>
                      <button className="table__action-btn" title="Duplicate" onClick={() => handleDuplicate(s)}><Copy size={15} strokeWidth={2} /></button>
                      <button className="table__action-btn" title="Archive" onClick={() => handleArchive(s)}><Archive size={15} strokeWidth={2} /></button>
                    </>
                  ) : (
                    <>
                      <button className="table__action-btn" title="Restore" onClick={() => handleRestore(s)}><RotateCcw size={15} strokeWidth={2} /></button>
                      <button className="table__action-btn table__action-btn--danger" title="Delete Permanently" onClick={() => setConfirmDelete(s)}><Trash2 size={15} strokeWidth={2} /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          )}
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
