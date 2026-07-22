import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Tag, AlertTriangle } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { RatePlanMappingForm } from "./RatePlanMappingForm.jsx";

const STATUS_VARIANT = { Mapped: "success", "Needs Review": "warning", Unmapped: "danger" };

// Module 4b — Rate Plan Mapping. This is the real comparison unit — rate
// plans, not whole properties. Belongs directly to a Competitor, not to a
// Comparison Group. "Internal Rate Plan" options come strictly from the
// benchmark property (the Phase 1 property this competitor is scoped
// under), scoped to that property's own rooms; never edited here.
export function RatePlanMappingTab({ competitor }) {
  const data = useData();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const propertyRoomIds = useMemo(() => new Set(data.rooms.filter((r) => r.propertyId === competitor.propertyId).map((r) => r.id)), [data.rooms, competitor.propertyId]);
  const ratePlans = useMemo(() => data.ratePlans.filter((rp) => propertyRoomIds.has(rp.roomId) && rp.status !== "Archived"), [data.ratePlans, propertyRoomIds]);
  const mappings = useMemo(() => data.ratePlanMappings.filter((m) => m.competitorId === competitor.id), [data.ratePlanMappings, competitor.id]);
  const roomMappings = useMemo(() => data.roomMappings.filter((m) => m.competitorId === competitor.id), [data.roomMappings, competitor.id]);

  const ratePlanName = (id) => data.ratePlans.find((rp) => rp.id === id)?.name || id;
  const linkedRoomLabel = (roomMappingId) => data.roomMappings.find((m) => m.id === roomMappingId)?.competitorRoomLabel || null;

  const duplicateKeys = useMemo(() => {
    const seen = new Map();
    for (const m of mappings) seen.set(m.internalRatePlanId, (seen.get(m.internalRatePlanId) || 0) + 1);
    return seen;
  }, [mappings]);
  const isDuplicate = (m) => (duplicateKeys.get(m.internalRatePlanId) || 0) > 1;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mappings;
    return mappings.filter((m) => [ratePlanName(m.internalRatePlanId), m.competitorRatePlanName].some((f) => String(f).toLowerCase().includes(q)));
  }, [mappings, search, data.ratePlans]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (m) => { setEditing(m); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateRatePlanMapping({ ...editing, ...form });
      toast.success("Rate plan mapping updated.");
    } else {
      data.addRatePlanMapping({ ...form, competitorId: competitor.id });
      toast.success("Rate plan mapping added.");
    }
    setFormOpen(false);
  };

  const handleDelete = () => { data.deleteRatePlanMapping(confirmDelete.id); toast.success("Rate plan mapping removed."); setConfirmDelete(null); };

  return (
    <Card padded={false}>
      <div style={{ padding: "20px 20px 0" }}>
        <div className="page-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search rate plan mappings..." />
          <div className="page-toolbar__spacer" />
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate} disabled={ratePlans.length === 0}>Add Rate Plan Mapping</Button>
        </div>
        {ratePlans.length === 0 && <p className="master-manager__hint" style={{ marginTop: 8 }}>This property has no active rate plans to map.</p>}
      </div>
      <div style={{ padding: 20 }}>
        <Table
          columns={[
            { key: "internal", label: "Internal Rate Plan", width: 180 },
            { key: "competitorPlan", label: "Competitor Rate Plan" },
            { key: "mealPlan", label: "Meal Plan", width: 100 },
            { key: "currency", label: "Currency", width: 90 },
            { key: "priority", label: "Priority", width: 100 },
            { key: "status", label: "Status", width: 130 },
            { key: "actions", label: "", width: 90 },
          ]}
          data={filtered}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={Tag}
              title="No rate plan mappings yet"
              message="Map internal rate plans to this competitor's rate plans to enable rate comparison in Phase 3."
              action={<Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Rate Plan Mapping</Button>}
            />
          }
          renderRow={(m) => (
            <tr key={m.id}>
              <td className="table__cell-muted">{ratePlanName(m.internalRatePlanId)}</td>
              <td>
                <div className="table__cell-primary">{m.competitorRatePlanName}</div>
                {linkedRoomLabel(m.roomMappingId) && (
                  <div className="table__cell-muted">Room: {linkedRoomLabel(m.roomMappingId)}</div>
                )}
                {isDuplicate(m) && (
                  <div className="table__cell-muted" style={{ color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={12} strokeWidth={2} /> Duplicate mapping detected
                  </div>
                )}
              </td>
              <td>{m.mealPlan}</td>
              <td>{m.currency}</td>
              <td><Badge variant={m.priority === "High" ? "danger" : m.priority === "Medium" ? "warning" : "info"}>{m.priority}</Badge></td>
              <td><Badge variant={STATUS_VARIANT[m.status] || "info"}>{m.status}</Badge></td>
              <td>
                <div className="table__actions">
                  <button className="table__action-btn" title="Edit" onClick={() => openEdit(m)}><Pencil size={15} strokeWidth={2} /></button>
                  <button className="table__action-btn table__action-btn--danger" title="Delete" onClick={() => setConfirmDelete(m)}><Trash2 size={15} strokeWidth={2} /></button>
                </div>
              </td>
            </tr>
          )}
        />
      </div>

      <RatePlanMappingForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={editing} ratePlans={ratePlans} roomMappings={roomMappings} competitorName={competitor.hotelName} />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Rate Plan Mapping"
        message="Remove this rate plan mapping? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </Card>
  );
}
