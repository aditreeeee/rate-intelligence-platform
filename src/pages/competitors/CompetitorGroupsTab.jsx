import React, { useMemo, useState } from "react";
import { Plus, X, FolderCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import { Checkbox } from "../../components/ui/Checkbox.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

// Group membership management for one competitor — the only place a
// Competitor and a Comparison Group are linked (`groupMemberships`).
// Removing a chip here only deletes the membership row; the competitor and
// the group both remain fully intact.
export function CompetitorGroupsTab({ competitor }) {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState([]);

  const memberGroupIds = useMemo(
    () => new Set(data.groupMemberships.filter((m) => m.competitorId === competitor.id).map((m) => m.groupId)),
    [data.groupMemberships, competitor.id]
  );
  const memberGroups = useMemo(
    () => data.comparisonGroups.filter((g) => memberGroupIds.has(g.id)),
    [data.comparisonGroups, memberGroupIds]
  );
  const availableGroups = useMemo(
    () => data.comparisonGroups.filter((g) => g.propertyId === competitor.propertyId && g.status !== "Archived" && !memberGroupIds.has(g.id)),
    [data.comparisonGroups, competitor.propertyId, memberGroupIds]
  );

  const handleRemove = (group) => {
    data.removeGroupMembership(group.id, competitor.id);
    toast.info(`Removed from ${group.name}.`);
  };

  const togglePicked = (id) => setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleAdd = () => {
    for (const groupId of picked) data.addGroupMembership(groupId, competitor.id);
    toast.success(`Added to ${picked.length} group(s).`);
    setPicked([]);
    setPickerOpen(false);
  };

  return (
    <Card>
      <div className="config-summary__section-title">
        <span className="config-summary__section-title-text"><FolderCog size={14} strokeWidth={2} /> Comparison Group Membership</span>
        <button type="button" className="config-summary__view-all" onClick={() => navigate("/portal/comparison-groups")}>Manage Groups</button>
      </div>
      <p className="master-manager__hint" style={{ marginBottom: 16 }}>
        Groups are optional collections used only for categorization — removing this competitor from a group never
        deletes the competitor or any of its configuration.
      </p>

      {memberGroups.length === 0 ? (
        <EmptyState
          icon={FolderCog}
          title="Not in any group yet"
          message="This competitor works fully without belonging to any Comparison Group. Add it to one for market-segment organization."
          action={<Button variant="secondary" size="sm" icon={Plus} onClick={() => setPickerOpen(true)} disabled={availableGroups.length === 0}>Add to Group</Button>}
        />
      ) : (
        <>
          <div className="tag-chips" style={{ marginBottom: 16 }}>
            {memberGroups.map((g) => (
              <span key={g.id} className="tag-chip tag-chip--removable" title={g.name} style={{ fontSize: 12.5, padding: "5px 10px" }}>
                <span className="tag-chip__label">{g.name}</span>
                <button type="button" onClick={() => handleRemove(g)} aria-label={`Remove from ${g.name}`}><X size={11} strokeWidth={2.5} /></button>
              </span>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => setPickerOpen(true)} disabled={availableGroups.length === 0}>Add to Another Group</Button>
        </>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add to Comparison Group(s)" size="sm"
        footer={
          <>
            <button className="btn btn--ghost btn--md" type="button" onClick={() => setPickerOpen(false)}>Cancel</button>
            <Button variant="primary" size="md" onClick={handleAdd} disabled={picked.length === 0}>Add to {picked.length || ""} Group{picked.length === 1 ? "" : "s"}</Button>
          </>
        }
      >
        {availableGroups.length === 0 ? (
          <EmptyState icon={FolderCog} title="No other groups available" message="Every group under this property already includes this competitor, or no groups exist yet." />
        ) : (
          <div className="master-manager__list">
            {availableGroups.map((g) => {
              const checked = picked.includes(g.id);
              return (
                <div key={g.id} className="master-manager__row" style={{ cursor: "pointer" }} onClick={() => togglePicked(g.id)}>
                  <Checkbox checked={checked} onChange={() => togglePicked(g.id)} label={g.name} />
                  <span className="master-manager__name">{g.name}</span>
                  <Badge variant="info">{g.market || "—"}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </Card>
  );
}
