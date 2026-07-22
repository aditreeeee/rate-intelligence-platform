import React, { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Modal } from "../../components/ui/Modal.jsx";
import { Checkbox } from "../../components/ui/Checkbox.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

// Bulk-assigns the given competitors to one or more Comparison Groups —
// purely additive (creates `groupMemberships` rows); never touches the
// competitor record or the group record itself. `groups` should already be
// scoped to the relevant property/properties by the caller.
//
// Also lets the user create a brand-new group inline (name only — the
// full Comparison Group form covers market/tags/notes for later editing)
// without leaving the Competitor Hotels page, since Comparison Groups are
// meant to be organized *from* the competitor workflow, never a prerequisite
// to it.
export function GroupAssignModal({ open, onClose, competitorIds = [], groups = [], propertyId, onAssign }) {
  const data = useData();
  const toast = useToast();
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");

  const toggle = (id) => setSelectedGroupIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleClose = () => {
    setSelectedGroupIds([]);
    setNewGroupName("");
    onClose();
  };

  const handleAssign = () => {
    onAssign(selectedGroupIds);
    handleClose();
  };

  const handleCreateGroup = () => {
    const name = newGroupName.trim();
    if (!name || !propertyId) return;
    const created = data.addComparisonGroup({ propertyId, name, market: "", status: "Active", tags: [], notes: "" });
    toast.success(`${created.name} created.`);
    setSelectedGroupIds((ids) => [...ids, created.id]);
    setNewGroupName("");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Assign ${competitorIds.length} Competitor${competitorIds.length === 1 ? "" : "s"} to Group(s)`}
      size="sm"
      footer={
        <>
          <button className="btn btn--ghost btn--md" type="button" onClick={handleClose}>Cancel</button>
          <Button variant="primary" size="md" onClick={handleAssign} disabled={selectedGroupIds.length === 0}>
            Assign to {selectedGroupIds.length || ""} Group{selectedGroupIds.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="master-manager__row" style={{ marginBottom: 12 }}>
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New comparison group name..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateGroup())}
        />
        <button type="button" className="master-manager__icon-btn" onClick={handleCreateGroup} aria-label="Create group" disabled={!newGroupName.trim()}>
          <Plus size={15} strokeWidth={2} />
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No comparison groups yet"
          message="Create your first one above — groups are optional collections you organize competitors into whenever you like."
        />
      ) : (
        <div className="master-manager__list">
          {groups.map((g) => {
            const checked = selectedGroupIds.includes(g.id);
            return (
              <div key={g.id} className="master-manager__row" onClick={() => toggle(g.id)} style={{ cursor: "pointer" }}>
                <Checkbox checked={checked} onChange={() => toggle(g.id)} label={g.name} />
                <span className="master-manager__name">{g.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
