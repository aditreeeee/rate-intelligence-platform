import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, BedDouble, AlertTriangle } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Table } from "../../components/ui/Table.jsx";
import { SearchBar } from "../../components/ui/SearchBar.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { RoomMappingForm } from "./RoomMappingForm.jsx";

const STATUS_VARIANT = { Mapped: "success", "Needs Review": "warning", Unmapped: "danger" };

// Module 4a — Room Mapping. This is the real comparison unit — rooms, not
// whole properties. Belongs directly to a Competitor, not to a Comparison
// Group. "Internal Room(s)" are read strictly from the benchmark property
// (the Phase 1 property this competitor is scoped under, `data.rooms`
// filtered to `competitor.propertyId`) — never written to, and never any
// other property's rooms. Duplicate detection means the same internal room
// mapped more than once for this competitor, which is almost always
// unintentional.
export function RoomMappingTab({ competitor }) {
  const data = useData();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const rooms = useMemo(() => data.rooms.filter((r) => r.propertyId === competitor.propertyId && r.status !== "Archived"), [data.rooms, competitor.propertyId]);
  const mappings = useMemo(() => data.roomMappings.filter((m) => m.competitorId === competitor.id), [data.roomMappings, competitor.id]);

  const roomName = (id) => data.rooms.find((r) => r.id === id)?.name || id;

  const duplicateKeys = useMemo(() => {
    const seen = new Map();
    for (const m of mappings) {
      for (const roomId of m.internalRoomIds) seen.set(roomId, (seen.get(roomId) || 0) + 1);
    }
    return seen;
  }, [mappings]);
  const isDuplicate = (m) => m.internalRoomIds.some((roomId) => (duplicateKeys.get(roomId) || 0) > 1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mappings;
    return mappings.filter((m) => [m.internalRoomIds.map(roomName).join(" "), m.competitorRoomLabel].some((f) => String(f).toLowerCase().includes(q)));
  }, [mappings, search, data.rooms]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (m) => { setEditing(m); setFormOpen(true); };

  const handleSubmit = (form) => {
    if (editing) {
      data.updateRoomMapping({ ...editing, ...form });
      toast.success("Room mapping updated.");
    } else {
      data.addRoomMapping({ ...form, competitorId: competitor.id });
      toast.success("Room mapping added.");
    }
    setFormOpen(false);
  };

  const handleDelete = () => { data.deleteRoomMapping(confirmDelete.id); toast.success("Room mapping removed."); setConfirmDelete(null); };

  return (
    <Card padded={false}>
      <div style={{ padding: "20px 20px 0" }}>
        <div className="page-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search room mappings..." />
          <div className="page-toolbar__spacer" />
          <Button variant="primary" size="md" icon={Plus} onClick={openCreate} disabled={rooms.length === 0}>Add Room Mapping</Button>
        </div>
        {rooms.length === 0 && <p className="master-manager__hint" style={{ marginTop: 8 }}>This property has no active rooms to map.</p>}
      </div>
      <div style={{ padding: 20 }}>
        <Table
          columns={[
            { key: "internal", label: "Internal Room(s)", width: 220 },
            { key: "competitorRoom", label: "Competitor Room" },
            { key: "type", label: "Mapping Type", width: 130 },
            { key: "confidence", label: "Confidence", width: 100 },
            { key: "status", label: "Status", width: 130 },
            { key: "actions", label: "", width: 100 },
          ]}
          data={filtered}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={BedDouble}
              title="No room mappings yet"
              message="Map internal rooms to this competitor's room labels to enable rate comparison in Phase 3."
              action={<Button variant="secondary" size="sm" icon={Plus} onClick={openCreate}>Add Room Mapping</Button>}
            />
          }
          renderRow={(m) => (
            <tr key={m.id}>
              <td className="table__cell-muted">{m.internalRoomIds.map(roomName).join(", ") || "—"}</td>
              <td>
                <div className="table__cell-primary">{m.competitorRoomLabel}</div>
                {isDuplicate(m) && (
                  <div className="table__cell-muted" style={{ color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={12} strokeWidth={2} /> Duplicate mapping detected
                  </div>
                )}
              </td>
              <td>{m.mappingType}</td>
              <td className="tabular">{m.confidence}%</td>
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

      <RoomMappingForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={editing} rooms={rooms} competitorName={competitor.hotelName} />

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Room Mapping"
        message="Remove this room mapping? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </Card>
  );
}
