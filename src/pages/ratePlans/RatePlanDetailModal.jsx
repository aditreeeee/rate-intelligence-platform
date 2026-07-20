import React from "react";
import { Tag, Pencil } from "lucide-react";
import { Modal } from "../../components/ui/Modal.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { RoomClassificationSummary } from "../../components/ui/RoomClassificationSummary.jsx";
import { formatCurrency, formatDate } from "../../lib/format.js";
import { useData } from "../../context/DataContext.jsx";
import { mealPlanLabel } from "../../mocks/ratePlans.js";

export function RatePlanDetailModal({ ratePlan, onClose, onEdit }) {
  const data = useData();
  if (!ratePlan) return null;

  const room = data.rooms.find((r) => r.id === ratePlan.roomId);
  const property = room ? data.properties.find((p) => p.id === room.propertyId) : null;
  const currency = property?.currency || "USD";

  return (
    <Modal
      open={!!ratePlan}
      onClose={onClose}
      title="Rate Plan Details"
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={onClose}>Close</button>
          <Button variant="primary" size="md" icon={Pencil} onClick={() => onEdit(ratePlan)}>Edit Rate Plan</Button>
        </>
      }
    >
      <div className="detail-view">
        <div className="detail-view__header">
          <div className="property-thumb property-thumb--lg"><Tag size={22} strokeWidth={2} /></div>
          <div>
            <div className="detail-view__title">{ratePlan.name}</div>
            <div className="detail-view__subtitle">{room?.name || "Unlinked room"} &middot; {property?.name}</div>
          </div>
          <div className="detail-view__header-badge"><StatusBadge status={ratePlan.status} /></div>
        </div>

        <RoomClassificationSummary room={room} />

        <div className="detail-grid">
          <div className="detail-field"><span>Rate Plan ID</span><strong className="tabular">{ratePlan.id}</strong></div>
          <div className="detail-field" title={mealPlanLabel(ratePlan.mealPlan)}>
            <span>Meal Plan</span>
            <strong>{ratePlan.mealPlan} &middot; {mealPlanLabel(ratePlan.mealPlan)}</strong>
          </div>
          <div className="detail-field"><span>Cancellation Policy</span><strong>{ratePlan.cancellationPolicy}</strong></div>
          <div className="detail-field"><span>Base Price</span><strong className="tabular">{formatCurrency(ratePlan.basePrice, currency)}</strong></div>
          <div className="detail-field"><span>Weekend Price</span><strong className="tabular">{formatCurrency(ratePlan.weekendPrice, currency)}</strong></div>
          <div className="detail-field"><span>Extra Adult Price</span><strong className="tabular">{formatCurrency(ratePlan.extraAdultPrice, currency)}</strong></div>
          <div className="detail-field"><span>Child Price</span><strong className="tabular">{formatCurrency(ratePlan.childPrice, currency)}</strong></div>
          <div className="detail-field"><span>Valid From</span><strong className="tabular">{formatDate(ratePlan.validFrom)}</strong></div>
          <div className="detail-field"><span>Valid To</span><strong className="tabular">{formatDate(ratePlan.validTo)}</strong></div>
        </div>
      </div>
    </Modal>
  );
}
