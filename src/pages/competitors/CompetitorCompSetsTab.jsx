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

// Comp set membership management for one competitor — the only place a
// Competitor and a Competitive Set are linked (`compSetMemberships`).
// Removing a chip here only deletes the membership row; the competitor and
// the comp set both remain fully intact.
export function CompetitorCompSetsTab({ competitor }) {
  const data = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState([]);

  const memberCompSetIds = useMemo(
    () => new Set(data.compSetMemberships.filter((m) => m.competitorId === competitor.id).map((m) => m.compSetId)),
    [data.compSetMemberships, competitor.id]
  );
  const memberCompSets = useMemo(
    () => data.compSets.filter((g) => memberCompSetIds.has(g.id)),
    [data.compSets, memberCompSetIds]
  );
  const availableCompSets = useMemo(
    () => data.compSets.filter((g) => g.propertyId === competitor.propertyId && g.status !== "Archived" && !memberCompSetIds.has(g.id)),
    [data.compSets, competitor.propertyId, memberCompSetIds]
  );

  const handleRemove = (compSet) => {
    data.removeCompSetMembership(compSet.id, competitor.id);
    toast.info(`Removed from ${compSet.name}.`);
  };

  const togglePicked = (id) => setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleAdd = () => {
    for (const compSetId of picked) data.addCompSetMembership(compSetId, competitor.id);
    toast.success(`Added to ${picked.length} comp set(s).`);
    setPicked([]);
    setPickerOpen(false);
  };

  return (
    <Card>
      <div className="config-summary__section-title">
        <span className="config-summary__section-title-text"><FolderCog size={14} strokeWidth={2} /> Competitive Set Membership</span>
        <button type="button" className="config-summary__view-all" onClick={() => navigate("/portal/comp-sets")}>Manage Comp Sets</button>
      </div>
      <p className="master-manager__hint" style={{ marginBottom: 16 }}>
        Comp sets are optional collections used only for categorization — removing this competitor from a comp set never
        deletes the competitor or any of its configuration.
      </p>

      {memberCompSets.length === 0 ? (
        <EmptyState
          icon={FolderCog}
          title="Not in any comp set yet"
          message="This competitor works fully without belonging to any Competitive Set. Add it to one for market-segment organization."
          action={<Button variant="secondary" size="sm" icon={Plus} onClick={() => setPickerOpen(true)} disabled={availableCompSets.length === 0}>Add to Comp Set</Button>}
        />
      ) : (
        <>
          <div className="tag-chips" style={{ marginBottom: 16 }}>
            {memberCompSets.map((g) => (
              <span key={g.id} className="tag-chip tag-chip--removable" title={g.name} style={{ fontSize: 12.5, padding: "5px 10px" }}>
                <span className="tag-chip__label">{g.name}</span>
                <button type="button" onClick={() => handleRemove(g)} aria-label={`Remove from ${g.name}`}><X size={11} strokeWidth={2.5} /></button>
              </span>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => setPickerOpen(true)} disabled={availableCompSets.length === 0}>Add to Another Comp Set</Button>
        </>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add to Competitive Set(s)" size="sm"
        footer={
          <>
            <button className="btn btn--ghost btn--md" type="button" onClick={() => setPickerOpen(false)}>Cancel</button>
            <Button variant="primary" size="md" onClick={handleAdd} disabled={picked.length === 0}>Add to {picked.length || ""} Comp Set{picked.length === 1 ? "" : "s"}</Button>
          </>
        }
      >
        {availableCompSets.length === 0 ? (
          <EmptyState icon={FolderCog} title="No other comp sets available" message="Every comp set under this property already includes this competitor, or no comp sets exist yet." />
        ) : (
          <div className="master-manager__list">
            {availableCompSets.map((g) => {
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
