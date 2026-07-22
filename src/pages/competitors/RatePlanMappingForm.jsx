import React, { useState, useEffect, useRef } from "react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { MEAL_PLANS, CANCELLATION_POLICIES, mealPlanLabel } from "../../mocks/ratePlans.js";
import { CURRENCIES } from "../../mocks/properties.js";
import { PRIORITY_LEVELS, MAPPING_STATUSES } from "../../mocks/competitors.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

function buildEmpty() {
  return {
    internalRatePlanId: "", competitorRatePlanName: "", competitorRatePlanCode: "", roomMappingId: "",
    mealPlan: MEAL_PLANS[0], cancellationPolicy: CANCELLATION_POLICIES[0], currency: CURRENCIES[0],
    priority: "Medium", status: "Needs Review", notes: "",
  };
}

function validate(form) {
  const errors = {};
  if (!form.internalRatePlanId) errors.internalRatePlanId = "Internal rate plan is required.";
  if (!form.competitorRatePlanName || !form.competitorRatePlanName.trim()) errors.competitorRatePlanName = "Competitor rate plan name is required.";
  return errors;
}

// Maps one internal Phase 1 Rate Plan (read-only reference, `ratePlans`
// prop) to this competitor's advertised rate plan — the competitor is fixed
// by the profile page this form is opened from, so there's no competitor
// picker here. Meal plan / cancellation policy / currency describe the
// *competitor's* rate plan terms for comparison purposes — they never
// modify the internal rate plan itself.
//
// `roomMappingId` (optional) links this rate plan to one of the competitor's
// own Room Mappings — every real hotel/OTA site nests a rate plan under a
// specific room type, so a Python scraper needs to know *which* competitor
// room block a given rate belongs to, not just "this competitor has a BAR
// rate plan somewhere." Left blank, mapping still works exactly as before
// (a rate-level-only comparison); set it once the corresponding room has
// been mapped, for exact room+rate scraping targets in Phase 3.
// `competitorRatePlanCode` is the rate-plan equivalent of Room Mapping's
// `competitorRoomCode` — an optional stable site identifier, independent of
// the human-readable name.
export function RatePlanMappingForm({ open, onClose, onSubmit, initial, ratePlans = [], roomMappings = [], competitorName }) {
  const [form, setForm] = useState(initial || buildEmpty());
  const [errors, setErrors] = useState({});
  const baselineRef = useRef(form);

  useEffect(() => {
    const baseline = initial ? { ...buildEmpty(), ...initial } : buildEmpty();
    setForm(baseline);
    setErrors({});
    baselineRef.current = baseline;
  }, [initial, open]);

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  const { confirmOpen, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);
  const guardedClose = () => requestAction(onClose);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setField = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(form);
  };

  return (
    <>
    <Modal
      open={open}
      onClose={guardedClose}
      title={initial ? "Edit Rate Plan Mapping" : "Add Rate Plan Mapping"}
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="rate-plan-mapping-form">
            {initial ? "Save Changes" : "Add Mapping"}
          </Button>
        </>
      }
    >
      <form id="rate-plan-mapping-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="Internal Rate Plan" required id="rpm-internal" error={errors.internalRatePlanId}>
            <Select
              id="rpm-internal"
              placeholder="Select rate plan"
              options={ratePlans.map((rp) => rp.name)}
              value={ratePlans.find((rp) => rp.id === form.internalRatePlanId)?.name || ""}
              onChange={(e) => {
                const rp = ratePlans.find((r) => r.name === e.target.value);
                setForm((f) => ({ ...f, internalRatePlanId: rp?.id || "" }));
              }}
            />
          </Field>
          {competitorName && (
            <Field label="Competitor" id="rpm-competitor">
              <Input value={competitorName} disabled />
            </Field>
          )}
          <div className="form-grid__full">
            <Field label="Competitor Rate Plan Name" required id="rpm-name" error={errors.competitorRatePlanName}>
              <Input id="rpm-name" value={form.competitorRatePlanName} onChange={set("competitorRatePlanName")} placeholder="e.g. Best Available Rate" />
            </Field>
          </div>
          <Field label="Source Rate Plan Code (optional)" id="rpm-code" hint="A stable ID/slug from the competitor's site, if known.">
            <Input id="rpm-code" value={form.competitorRatePlanCode} onChange={set("competitorRatePlanCode")} placeholder="e.g. RP-BAR-01" />
          </Field>
          <Field label="Linked Room Mapping (optional)" id="rpm-room" hint="Which of this competitor's mapped rooms this rate plan belongs to.">
            <Select
              id="rpm-room"
              placeholder="Not linked to a specific room"
              options={roomMappings.map((m) => m.competitorRoomLabel)}
              value={roomMappings.find((m) => m.id === form.roomMappingId)?.competitorRoomLabel || ""}
              onChange={(e) => {
                const m = roomMappings.find((rm) => rm.competitorRoomLabel === e.target.value);
                setForm((f) => ({ ...f, roomMappingId: m?.id || "" }));
              }}
            />
          </Field>
          <Field label="Meal Plan" id="rpm-meal" hint={mealPlanLabel(form.mealPlan)}>
            <Select id="rpm-meal" options={MEAL_PLANS} value={form.mealPlan} onChange={set("mealPlan")} />
          </Field>
          <Field label="Cancellation Policy" id="rpm-cancel">
            <Select id="rpm-cancel" options={CANCELLATION_POLICIES} value={form.cancellationPolicy} onChange={set("cancellationPolicy")} />
          </Field>
          <Field label="Currency" id="rpm-currency">
            <Select id="rpm-currency" options={CURRENCIES} value={form.currency} onChange={set("currency")} />
          </Field>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="Priority" options={PRIORITY_LEVELS} value={form.priority} onChange={setField("priority")} multiple={false} />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="Mapping Status" options={MAPPING_STATUSES} value={form.status} onChange={setField("status")} multiple={false} />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Field label="Notes" id="rpm-notes">
            <Textarea id="rpm-notes" rows={3} value={form.notes} onChange={set("notes")} />
          </Field>
        </div>
      </form>
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
