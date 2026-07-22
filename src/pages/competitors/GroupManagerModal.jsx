import React, { useState } from "react";
import { Plus, Pencil, Check, X, Archive, RotateCcw, Trash2, ExternalLink, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";

// Lightweight create/rename/archive/delete for Comparison Groups, reachable
// directly from the Competitor Hotels page — no navigation away needed for
// everyday group housekeeping. Every action here only ever touches the
// group row itself (or its `groupMemberships` references); a competitor's
// own record and configuration are never read from or written to by this
// modal. The full Comparison Groups Manager page (merge, per-group mapping/
// source/readiness stats) stays one link away for the rarer, heavier tasks.
export function GroupManagerModal({ open, onClose, groups = [], propertyId }) {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const memberCountFor = (groupId) => data.groupMemberships.filter((m) => m.groupId === groupId).length;

  const handleCreate = () => {
    const name = newName.trim();
    if (!name || !propertyId) return;
    const created = data.addComparisonGroup({ propertyId, name, market: "", status: "Active", tags: [], notes: "" });
    toast.success(`${created.name} created.`);
    setNewName("");
  };

  const startEdit = (g) => { setEditingId(g.id); setDraftName(g.name); };
  const cancelEdit = () => { setEditingId(null); setDraftName(""); };
  const saveEdit = () => {
    const name = draftName.trim();
    if (!name) return;
    const group = groups.find((g) => g.id === editingId);
    data.updateComparisonGroup({ ...group, name });
    toast.success("Comparison group renamed.");
    cancelEdit();
  };

  const handleArchive = (g) => { data.archiveComparisonGroup(g); toast.info(`${g.name} archived. Its competitors are unaffected.`); };
  const handleRestore = (g) => { data.restoreComparisonGroup(g); toast.success(`${g.name} restored.`); };
  const handleDelete = () => {
    const group = groups.find((g) => g.id === confirmDeleteId);
    data.deleteComparisonGroupPermanently(confirmDeleteId);
    toast.success(`${group?.name || "Group"} permanently deleted. Its competitors were not affected.`);
    setConfirmDeleteId(null);
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Comparison Groups"
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--md" type="button" onClick={onClose}>Close</button>
          <Button variant="secondary" size="md" icon={ExternalLink} onClick={() => { onClose(); navigate("/portal/comparison-groups"); }}>
            Full Manager (Stats &amp; Merge)
          </Button>
        </>
      }
    >
      <p className="master-manager__hint" style={{ marginBottom: 16 }}>
        Groups are optional collections that only reference competitors — creating, renaming, archiving, or deleting one
        here never changes any competitor's configuration (mappings, sources, notes, readiness stay exactly as they are).
      </p>

      <div className="master-manager__row" style={{ marginBottom: 12 }}>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New comparison group name..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          disabled={!propertyId}
        />
        <button type="button" className="master-manager__icon-btn" onClick={handleCreate} aria-label="Create group" disabled={!newName.trim() || !propertyId}>
          <Plus size={15} strokeWidth={2} />
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Target}
          title={propertyId ? "No comparison groups yet" : "Select a property first"}
          message={
            propertyId
              ? "Create your first one above whenever you want to organize competitors into a collection."
              : "Select a property from the left filter panel to create or manage its comparison groups."
          }
        />
      ) : (
        <div className="master-manager__list">
          {groups.map((g) => (
            <div key={g.id} className="master-manager__row">
              {editingId === g.id ? (
                <>
                  <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
                  <button type="button" className="master-manager__icon-btn" onClick={saveEdit} aria-label="Save"><Check size={15} strokeWidth={2.5} /></button>
                  <button type="button" className="master-manager__icon-btn" onClick={cancelEdit} aria-label="Cancel"><X size={15} strokeWidth={2} /></button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="master-manager__name">{g.name}</span>
                    {g.status === "Archived" && <Badge variant="danger">Archived</Badge>}
                    <span className="table__cell-muted tabular">{memberCountFor(g.id)} members</span>
                  </div>
                  <button type="button" className="master-manager__icon-btn" onClick={() => startEdit(g)} aria-label={`Rename ${g.name}`}><Pencil size={14} strokeWidth={2} /></button>
                  {g.status !== "Archived" ? (
                    <button type="button" className="master-manager__icon-btn" onClick={() => handleArchive(g)} aria-label={`Archive ${g.name}`}><Archive size={14} strokeWidth={2} /></button>
                  ) : (
                    <button type="button" className="master-manager__icon-btn" onClick={() => handleRestore(g)} aria-label={`Restore ${g.name}`}><RotateCcw size={14} strokeWidth={2} /></button>
                  )}
                  {permissions.canDeleteComparisonGroupPermanently && (
                    <button type="button" className="master-manager__icon-btn master-manager__icon-btn--danger" onClick={() => setConfirmDeleteId(g.id)} aria-label={`Delete ${g.name}`}><Trash2 size={14} strokeWidth={2} /></button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>

    <ConfirmModal
      open={!!confirmDeleteId}
      onClose={() => setConfirmDeleteId(null)}
      onConfirm={handleDelete}
      title="Delete Comparison Group Permanently"
      message="This removes only the group and its membership references — member competitors and all of their configuration are completely unaffected. This action cannot be undone."
      confirmLabel="Delete Permanently"
      danger
    />
    </>
  );
}
