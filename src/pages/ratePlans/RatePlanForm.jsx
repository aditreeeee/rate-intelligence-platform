import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, LayoutGrid, UtensilsCrossed, Layers, Ban, Percent,
  Check, AlertCircle, RotateCcw, ChevronUp, ChevronDown, Copy, Trash2, Plus,
} from "lucide-react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { ratePlanFeatureIcon } from "../../lib/ratePlanFeatureIcons.js";
import { MEAL_PLANS, CANCELLATION_POLICIES, RATE_PLAN_STATUSES, mealPlanLabel } from "../../mocks/ratePlans.js";
import { RATE_PLAN_TEMPLATES } from "../../mocks/ratePlanTemplates.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";
import { useData } from "../../context/DataContext.jsx";
import { PricingRangesTable } from "./PricingRangesTable.jsx";
import { conflictingRowIds } from "../../lib/pricingValidation.js";

const REFUND_UNTIL_UNITS = ["Hours", "Days"];

function blankRatePlanRoomCard(roomId = "", locked = false) {
  return {
    id: `NEW-${Math.random().toString(36).slice(2, 10)}`,
    isNew: true,
    roomId,
    pricingRanges: [],
    locked,
  };
}

// `startDate`/`endDate` (the "Pricing Range") are optional — an empty range
// means this rate plan is always applicable. `basePrice` is likewise
// optional: it's a default/base selling price, not required when pricing is
// fully defined by the Rooms' own Pricing Ranges instead. `ratePlanRooms`
// holds the in-progress room cards (each with its own in-progress Pricing
// Range rows) this form is editing; they're only reconciled into
// DataContext's `ratePlanRooms`/`pricingRanges` collections on submit, via
// the single `saveRatePlanRooms` context method (see handleSubmit).
const EMPTY = {
  name: "", mealPlan: MEAL_PLANS[0], cancellationPolicy: CANCELLATION_POLICIES[0],
  status: "Draft", taxInclusive: false, taxPercent: 0,
  startDate: "", endDate: "", basePrice: "",
  partialRefundAllowed: false, refundPercent: 50, refundUntilValue: 24, refundUntilUnit: REFUND_UNTIL_UNITS[0],
  ratePlanRooms: [],
};

function validate(form) {
  const errors = {};
  if (!form.name || !form.name.trim()) errors.name = "Rate plan name is required.";
  if (form.taxPercent === "" || form.taxPercent === null || Number.isNaN(Number(form.taxPercent))) {
    errors.taxPercent = "Tax percent must be a number.";
  } else if (Number(form.taxPercent) < 0) {
    errors.taxPercent = "Tax percent cannot be negative.";
  }
  if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
    errors.endDate = "End date must be on or after the start date.";
  }
  if (form.partialRefundAllowed) {
    if (form.refundPercent === "" || form.refundPercent === null || Number.isNaN(Number(form.refundPercent))) {
      errors.refundPercent = "Refund percentage must be a number.";
    } else if (Number(form.refundPercent) < 0 || Number(form.refundPercent) > 100) {
      errors.refundPercent = "Refund percentage must be between 0 and 100.";
    }
    if (form.refundUntilValue === "" || form.refundUntilValue === null || Number.isNaN(Number(form.refundUntilValue))) {
      errors.refundUntilValue = "Refund window must be a number.";
    } else if (Number(form.refundUntilValue) < 0) {
      errors.refundUntilValue = "Refund window cannot be negative.";
    }
  }
  return errors;
}

const SECTION_FIELDS = {
  overview: ["name", "startDate", "endDate", "basePrice"],
  mealPlan: ["mealPlan"],
  rooms: ["ratePlanRooms"],
  cancellation: ["cancellationPolicy", "partialRefundAllowed", "refundPercent", "refundUntilValue", "refundUntilUnit"],
  taxes: ["taxInclusive", "taxPercent"],
};

const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "mealPlan", label: "Meal Plan", icon: UtensilsCrossed },
  { key: "rooms", label: "Rooms", icon: Layers },
  { key: "cancellation", label: "Cancellation Policy", icon: Ban },
  { key: "taxes", label: "Taxes & Fees", icon: Percent },
];

export function RatePlanForm({ open, onClose, onSubmit, initial, roomLabel, rooms = [], allRooms = [], scopeRoomId }) {
  const data = useData();
  const [form, setForm] = useState(() => (initial ? { ...EMPTY, ...initial } : EMPTY));
  const [errors, setErrors] = useState({});
  const [active, setActive] = useState("overview");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const baselineRef = useRef(EMPTY);

  useEffect(() => {
    let baseline;
    if (initial) {
      const existingRatePlanRooms = data.roomsForRatePlan(initial.id).map((rp) => ({
        id: rp.id,
        isNew: false,
        roomId: rp.roomId,
        pricingRanges: rp.pricingRanges.map((r) => ({ ...r, isNew: false })),
      }));
      baseline = { ...EMPTY, ...initial, ratePlanRooms: existingRatePlanRooms };
    } else if (scopeRoomId) {
      baseline = { ...EMPTY, ratePlanRooms: [blankRatePlanRoomCard(scopeRoomId, true)] };
    } else {
      baseline = { ...EMPTY, ratePlanRooms: [blankRatePlanRoomCard()] };
    }
    setForm(baseline);
    setErrors({});
    setActive("overview");
    setExpandedIds(new Set(baseline.ratePlanRooms.map((c) => c.id)));
    baselineRef.current = baseline;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open, scopeRoomId]);

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  const { confirmOpen, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);
  const guardedClose = () => requestAction(onClose);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value === "" ? "" : Number(e.target.value) }));
  const setField = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const dirtyFields = useMemo(() => {
    const s = new Set();
    for (const key of Object.keys(form)) {
      if (JSON.stringify(form[key]) !== JSON.stringify(baselineRef.current[key])) s.add(key);
    }
    return s;
  }, [form]);

  // --- Rooms tab helpers ---
  const roomIdCounts = useMemo(() => {
    const counts = {};
    form.ratePlanRooms.forEach((c) => { if (c.roomId) counts[c.roomId] = (counts[c.roomId] || 0) + 1; });
    return counts;
  }, [form.ratePlanRooms]);

  const hasAnyRoomIssue = useMemo(
    () => form.ratePlanRooms.some((c) => !c.roomId || roomIdCounts[c.roomId] > 1 || conflictingRowIds(c.pricingRanges).size > 0),
    [form.ratePlanRooms, roomIdCounts]
  );

  const roomOptionsForCard = (cardId) => {
    const chosenElsewhere = new Set(form.ratePlanRooms.filter((c) => c.id !== cardId && c.roomId).map((c) => c.roomId));
    return rooms.filter((r) => !chosenElsewhere.has(r.id));
  };

  const updateCard = (cardId, patch) =>
    setForm((f) => ({ ...f, ratePlanRooms: f.ratePlanRooms.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) }));

  const addCard = () => {
    const card = blankRatePlanRoomCard();
    setForm((f) => ({ ...f, ratePlanRooms: [...f.ratePlanRooms, card] }));
    setExpandedIds((s) => new Set([...s, card.id]));
  };

  const removeCard = (cardId) => {
    setForm((f) => ({ ...f, ratePlanRooms: f.ratePlanRooms.filter((c) => c.id !== cardId) }));
    setExpandedIds((s) => {
      const n = new Set(s);
      n.delete(cardId);
      return n;
    });
  };

  const duplicateCard = (card) => {
    const copy = {
      id: `NEW-${Math.random().toString(36).slice(2, 10)}`,
      isNew: true,
      roomId: "",
      pricingRanges: card.pricingRanges.map((r) => ({ ...r, id: `NEW-${Math.random().toString(36).slice(2, 10)}`, isNew: true })),
    };
    setForm((f) => {
      const idx = f.ratePlanRooms.findIndex((c) => c.id === card.id);
      const next = [...f.ratePlanRooms];
      next.splice(idx + 1, 0, copy);
      return { ...f, ratePlanRooms: next };
    });
    setExpandedIds((s) => new Set([...s, copy.id]));
  };

  const toggleExpand = (cardId) =>
    setExpandedIds((s) => {
      const n = new Set(s);
      if (n.has(cardId)) n.delete(cardId);
      else n.add(cardId);
      return n;
    });

  const sectionHasError = (key) => {
    if (key === "rooms") return hasAnyRoomIssue;
    return (SECTION_FIELDS[key] || []).some((f) => errors[f]);
  };
  const isSectionComplete = (key) => {
    if (sectionHasError(key)) return false;
    if (key === "overview") return !!form.name.trim();
    if (key === "rooms") return form.ratePlanRooms.length > 0;
    return true;
  };

  const runValidation = () => {
    const validationErrors = validate(form);
    if (hasAnyRoomIssue) validationErrors.ratePlanRooms = "Resolve Room issues (missing/duplicate rooms, or overlapping Pricing Ranges) before saving.";
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorSection = SECTIONS.find((s) => (SECTION_FIELDS[s.key] || []).some((f) => validationErrors[f]));
      if (firstErrorSection) setActive(firstErrorSection.key);
      return null;
    }
    return {
      ...form,
      taxPercent: Number(form.taxPercent),
      refundPercent: form.partialRefundAllowed ? Number(form.refundPercent) : form.refundPercent,
      refundUntilValue: form.partialRefundAllowed ? Number(form.refundUntilValue) : form.refundUntilValue,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const valid = runValidation();
    if (!valid) return;
    const { ratePlanRooms: ratePlanRoomsDraft, ...ratePlanFields } = valid;
    onSubmit(ratePlanFields, ratePlanRoomsDraft);
  };

  const handleSaveAndContinue = (e) => {
    e.preventDefault();
    const valid = runValidation();
    if (!valid) return;
    const { ratePlanRooms: ratePlanRoomsDraft, ...ratePlanFields } = valid;
    onSubmit(ratePlanFields, ratePlanRoomsDraft, { keepOpen: true });
    baselineRef.current = valid;
    const idx = SECTIONS.findIndex((s) => s.key === active);
    const next = SECTIONS[(idx + 1) % SECTIONS.length];
    if (next) setActive(next.key);
  };

  const handleReset = () => setForm(baselineRef.current);

  return (
    <>
    <Modal
      open={open}
      onClose={guardedClose}
      title={initial ? "Edit Rate Plan" : "Add Rate Plan"}
      size="full"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          {isDirty && (
            <button className="btn btn--ghost btn--md" onClick={handleReset} type="button">
              <RotateCcw size={15} strokeWidth={2} /> Reset Changes
            </button>
          )}
          {initial && (
            <Button variant="secondary" size="md" onClick={handleSaveAndContinue} type="button">
              Save &amp; Continue
            </Button>
          )}
          <Button variant="primary" size="md" type="submit" form="rp-form">
            {initial ? "Save Changes" : "Create Rate Plan"}
          </Button>
        </>
      }
    >
      <div className="entity-wizard">
        <nav className="entity-wizard__nav">
          {SECTIONS.map((s) => {
            const complete = isSectionComplete(s.key);
            const hasError = sectionHasError(s.key);
            return (
              <button
                key={s.key}
                type="button"
                className={`entity-wizard__nav-item ${active === s.key ? "entity-wizard__nav-item--active" : ""} ${hasError ? "entity-wizard__nav-item--error" : ""}`}
                onClick={() => setActive(s.key)}
              >
                <span className="entity-wizard__nav-icon">
                  {hasError ? <AlertCircle size={16} strokeWidth={2} /> : complete ? <Check size={16} strokeWidth={2.5} /> : <s.icon size={16} strokeWidth={2} />}
                </span>
                <span className="entity-wizard__nav-label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="entity-wizard__content">
          {active === "overview" && scopeRoomId && roomLabel && (
            <div className="rp-form__room-context">
              Linked Room: <strong>{roomLabel}</strong>
            </div>
          )}
          {active === "overview" && !initial && (
            <div className="template-picker">
              <div className="template-picker__label"><Sparkles size={13} strokeWidth={2} /> Quick-fill from a template</div>
              <div className="template-picker__list">
                {RATE_PLAN_TEMPLATES.map((t) => (
                  <button
                    type="button"
                    key={t.key}
                    className="template-picker__item"
                    onClick={() => setForm((f) => ({ ...f, ...t.values }))}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form id="rp-form" onSubmit={handleSubmit}>
            {active === "overview" && (
              <div className="form-grid">
                <div className="form-grid__full">
                  <Field label="Rate Plan Name" required id="rp-name" error={errors.name} modified={dirtyFields.has("name")}>
                    <Input id="rp-name" value={form.name} onChange={set("name")} required placeholder="e.g. Best Flexible Rate" />
                  </Field>
                </div>
                <FeatureChipGrid
                  label="Status"
                  options={RATE_PLAN_STATUSES}
                  value={form.status}
                  onChange={setField("status")}
                  multiple={false}
                  getIcon={ratePlanFeatureIcon}
                  resetValue={baselineRef.current.status}
                />
                <Field label="Start Date" id="rp-start-date" modified={dirtyFields.has("startDate")}>
                  <Input id="rp-start-date" type="date" value={form.startDate || ""} onChange={set("startDate")} />
                </Field>
                <Field label="End Date" id="rp-end-date" error={errors.endDate} modified={dirtyFields.has("endDate")} hint="Leave both dates blank for a rate plan that is always applicable.">
                  <Input id="rp-end-date" type="date" value={form.endDate || ""} onChange={set("endDate")} />
                </Field>
                <Field label="Base Price" id="rp-base-price" modified={dirtyFields.has("basePrice")} hint="Default/base selling price. Leave blank if pricing is fully defined by the Rooms below.">
                  <Input id="rp-base-price" type="number" min="0" step="0.01" tabular value={form.basePrice} onChange={setNum("basePrice")} placeholder="Optional" />
                </Field>
              </div>
            )}

            {active === "mealPlan" && (
              <FeatureChipGrid
                label="Meal Plan"
                options={MEAL_PLANS}
                value={form.mealPlan}
                onChange={setField("mealPlan")}
                multiple={false}
                getIcon={ratePlanFeatureIcon}
                resetValue={baselineRef.current.mealPlan}
                hint={mealPlanLabel(form.mealPlan)}
              />
            )}

            {active === "rooms" && (
              <div>
                {errors.ratePlanRooms && (
                  <p className="rate-plan-room-card__error" style={{ marginBottom: "var(--space-4)" }}>{errors.ratePlanRooms}</p>
                )}
                {form.ratePlanRooms.map((card) => {
                  const conflicts = conflictingRowIds(card.pricingRanges);
                  const duplicate = card.roomId && roomIdCounts[card.roomId] > 1;
                  const missingRoom = !card.roomId;
                  const cardRoomOptions = roomOptionsForCard(card.id);
                  const expanded = expandedIds.has(card.id);
                  const selectedOption = rooms.find((r) => r.id === card.roomId);
                  return (
                    <Card key={card.id} className="rate-plan-room-card" padded={false} glow={false}>
                      <div className="rate-plan-room-card__header">
                        <button type="button" className="table__action-btn" onClick={() => toggleExpand(card.id)} title={expanded ? "Collapse" : "Expand"}>
                          {expanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
                        </button>
                        <div className="rate-plan-room-card__room-field">
                          <Select
                            placeholder="Select a room"
                            options={cardRoomOptions.map((r) => r.label)}
                            value={selectedOption ? selectedOption.label : ""}
                            onChange={(e) => {
                              const r = cardRoomOptions.find((rr) => rr.label === e.target.value);
                              updateCard(card.id, { roomId: r?.id || "" });
                            }}
                            disabled={!!card.locked}
                          />
                          {missingRoom && <div className="rate-plan-room-card__error">Room is required.</div>}
                          {duplicate && <div className="rate-plan-room-card__error">This room is already used by another card.</div>}
                          {conflicts.size > 0 && <div className="rate-plan-room-card__error">This card has overlapping Pricing Range rows.</div>}
                        </div>
                        <div className="rate-plan-room-card__actions">
                          <button type="button" className="table__action-btn" title="Duplicate" onClick={() => duplicateCard(card)}><Copy size={15} strokeWidth={2} /></button>
                          <button type="button" className="table__action-btn table__action-btn--danger" title="Remove Room" onClick={() => removeCard(card.id)}><Trash2 size={15} strokeWidth={2} /></button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="rate-plan-room-card__body">
                          <PricingRangesTable rows={card.pricingRanges} onChange={(rowsNext) => updateCard(card.id, { pricingRanges: rowsNext })} />
                        </div>
                      )}
                    </Card>
                  );
                })}
                <button type="button" className="btn btn--ghost btn--sm" onClick={addCard}>
                  <Plus size={14} strokeWidth={2} /> Add Room
                </button>
              </div>
            )}

            {active === "cancellation" && (
              <>
                <FeatureChipGrid
                  label="Cancellation Policy"
                  options={CANCELLATION_POLICIES}
                  value={form.cancellationPolicy}
                  onChange={setField("cancellationPolicy")}
                  multiple={false}
                  getIcon={ratePlanFeatureIcon}
                  resetValue={baselineRef.current.cancellationPolicy}
                />
                <div style={{ marginTop: "var(--space-6)" }}>
                  <FeatureChipGrid
                    label="Partial Refund"
                    options={["No", "Yes"]}
                    value={form.partialRefundAllowed ? "Yes" : "No"}
                    onChange={(v) => setForm((f) => ({ ...f, partialRefundAllowed: v === "Yes" }))}
                    multiple={false}
                    getIcon={ratePlanFeatureIcon}
                    resetValue={baselineRef.current.partialRefundAllowed ? "Yes" : "No"}
                    hint="Whether guests can receive a partial refund when cancelling within the policy window."
                  />
                </div>
                {form.partialRefundAllowed && (
                  <div className="form-grid" style={{ marginTop: "var(--space-6)" }}>
                    <Field label="Refund Percentage (%)" required id="rp-refund-percent" error={errors.refundPercent} modified={dirtyFields.has("refundPercent")}>
                      <Input id="rp-refund-percent" type="number" min="0" max="100" step="1" tabular value={form.refundPercent} onChange={setNum("refundPercent")} required />
                    </Field>
                    <Field label="Refund Until" required id="rp-refund-until" error={errors.refundUntilValue} modified={dirtyFields.has("refundUntilValue")}>
                      <Input id="rp-refund-until" type="number" min="0" step="1" tabular value={form.refundUntilValue} onChange={setNum("refundUntilValue")} required />
                    </Field>
                    <Field label="Unit" id="rp-refund-unit" modified={dirtyFields.has("refundUntilUnit")}>
                      <Select id="rp-refund-unit" options={REFUND_UNTIL_UNITS} value={form.refundUntilUnit} onChange={set("refundUntilUnit")} />
                    </Field>
                  </div>
                )}
              </>
            )}

            {active === "taxes" && (
              <>
                <FeatureChipGrid
                  label="Tax Inclusive"
                  options={["No", "Yes"]}
                  value={form.taxInclusive ? "Yes" : "No"}
                  onChange={(v) => setForm((f) => ({ ...f, taxInclusive: v === "Yes" }))}
                  multiple={false}
                  getIcon={ratePlanFeatureIcon}
                  resetValue={baselineRef.current.taxInclusive ? "Yes" : "No"}
                  hint="Whether displayed rates already include tax, or tax is added at checkout."
                />
                <div className="form-grid" style={{ marginTop: "var(--space-6)" }}>
                  <Field label="Tax Percent" required id="rp-tax-percent" error={errors.taxPercent} modified={dirtyFields.has("taxPercent")}>
                    <Input id="rp-tax-percent" type="number" min="0" step="0.1" tabular value={form.taxPercent} onChange={setNum("taxPercent")} required />
                  </Field>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </Modal>
    <ConfirmModal
      open={confirmOpen}
      onClose={cancelDiscard}
      onConfirm={confirmDiscard}
      title="Unsaved Changes"
      message="You have unsaved changes. Discard them and continue?"
      confirmLabel="Discard Changes"
      danger
    />
    </>
  );
}
