import React, { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Modal } from "../../components/ui/Modal.jsx";
import { Checkbox } from "../../components/ui/Checkbox.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

// Bulk-assigns the given competitors to one or more Competitive Sets —
// purely additive (creates `compSetMemberships` rows); never touches the
// competitor record or the comp set record itself. `groups` should already be
// scoped to the relevant property/properties by the caller.
//
// Also lets the user create a brand-new comp set inline (name only — the
// full Competitive Set form covers market/tags/notes for later editing)
// without leaving the Competitor Hotels page, since Competitive Sets are
// meant to be organized *from* the competitor workflow, never a prerequisite
// to it.
export function CompSetAssignModal({ open, onClose, competitorIds = [], groups = [], propertyId, onAssign }) {
  const data = useData();
  const toast = useToast();
  const [selectedCompSetIds, setSelectedCompSetIds] = useState([]);
  const [newCompSetName, setNewCompSetName] = useState("");

  const toggle = (id) => setSelectedCompSetIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleClose = () => {
    setSelectedCompSetIds([]);
    setNewCompSetName("");
    onClose();
  };

  const handleAssign = () => {
    onAssign(selectedCompSetIds);
    handleClose();
  };

  const handleCreateCompSet = () => {
    const name = newCompSetName.trim();
    if (!name || !propertyId) return;
    const created = data.addCompSet({ propertyId, name, market: "", status: "Active", tags: [], notes: "" });
    toast.success(`${created.name} created.`);
    setSelectedCompSetIds((ids) => [...ids, created.id]);
    setNewCompSetName("");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Assign ${competitorIds.length} Competitor${competitorIds.length === 1 ? "" : "s"} to Comp Set(s)`}
      size="sm"
      footer={
        <>
          <button className="btn btn--ghost btn--md" type="button" onClick={handleClose}>Cancel</button>
          <Button variant="primary" size="md" onClick={handleAssign} disabled={selectedCompSetIds.length === 0}>
            Assign to {selectedCompSetIds.length || ""} Comp Set{selectedCompSetIds.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="master-manager__row" style={{ marginBottom: 12 }}>
        <Input
          value={newCompSetName}
          onChange={(e) => setNewCompSetName(e.target.value)}
          placeholder="New competitive set name..."
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateCompSet())}
        />
        <button type="button" className="master-manager__icon-btn" onClick={handleCreateCompSet} aria-label="Create competitive set" disabled={!newCompSetName.trim()}>
          <Plus size={15} strokeWidth={2} />
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No competitive sets yet"
          message="Create your first one above — competitive sets are optional collections you organize competitors into whenever you like."
        />
      ) : (
        <div className="master-manager__list">
          {groups.map((g) => {
            const checked = selectedCompSetIds.includes(g.id);
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
