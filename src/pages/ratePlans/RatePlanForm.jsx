import React, { useState, useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { RoomClassificationSummary } from "../../components/ui/RoomClassificationSummary.jsx";
import { MEAL_PLANS, CANCELLATION_POLICIES, RATE_PLAN_STATUSES, mealPlanLabel } from "../../mocks/ratePlans.js";
import { RATE_PLAN_TEMPLATES } from "../../mocks/ratePlanTemplates.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

const EMPTY = {
  name: "", mealPlan: MEAL_PLANS[0], cancellationPolicy: CANCELLATION_POLICIES[0],
  basePrice: 0, weekendPrice: 0, extraAdultPrice: 0, childPrice: 0,
  validFrom: "", validTo: "", status: "Active", roomId: "",
};

function validate(form) {
  const errors = {};
  if (!form.roomId) errors.roomId = "Room is required.";
  if (!form.name || !form.name.trim()) errors.name = "Rate plan name is required.";
  for (const [key, label] of [
    ["basePrice", "Base price"],
    ["weekendPrice", "Weekend price"],
    ["extraAdultPrice", "Extra adult price"],
    ["childPrice", "Child price"],
  ]) {
    const val = form[key];
    if (val === "" || val === null || Number.isNaN(Number(val))) errors[key] = `${label} must be a number.`;
    else if (Number(val) < 0) errors[key] = `${label} cannot be negative.`;
  }
  if (!form.validFrom) errors.validFrom = "Valid from date is required.";
  if (!form.validTo) errors.validTo = "Valid to date is required.";
  if (form.validFrom && form.validTo && form.validTo < form.validFrom) {
    errors.validTo = "Valid to date must be on or after the valid from date.";
  }
  return errors;
}

export function RatePlanForm({ open, onClose, onSubmit, initial, roomLabel, rooms = [], allRooms = [], scopeRoomId }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});
  const baselineRef = useRef(EMPTY);

  useEffect(() => {
    const baseline = initial
      ? { ...EMPTY, ...initial }
      : { ...EMPTY, roomId: scopeRoomId || "" };
    setForm(baseline);
    setErrors({});
    baselineRef.current = baseline;
  }, [initial, open, scopeRoomId]);

  const scopedRoom = rooms.find((r) => r.id === form.roomId);

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  const { confirmOpen, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);
  const guardedClose = () => requestAction(onClose);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value === "" ? "" : Number(e.target.value) }));

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
      title={initial ? "Edit Rate Plan" : "Add Rate Plan"}
      size="lg"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="rp-form">
            {initial ? "Save Changes" : "Create Rate Plan"}
          </Button>
        </>
      }
    >
      {scopeRoomId && roomLabel && (
        <div className="rp-form__room-context">
          Linked Room: <strong>{roomLabel}</strong>
        </div>
      )}
      {form.roomId && (
        <RoomClassificationSummary room={allRooms.find((r) => r.id === form.roomId)} />
      )}
      {!initial && (
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
        <div className="form-grid">
          {!scopeRoomId && (
            <div className="form-grid__full">
              <Field label="Room" required id="rp-room" error={errors.roomId}>
                <Select
                  id="rp-room"
                  placeholder="Select a room"
                  options={rooms.map((r) => r.label)}
                  value={scopedRoom ? scopedRoom.label : ""}
                  onChange={(e) => {
                    const r = rooms.find((rr) => rr.label === e.target.value);
                    setForm((f) => ({ ...f, roomId: r?.id || "" }));
                  }}
                  disabled={!!initial}
                />
              </Field>
            </div>
          )}
          <div className="form-grid__full">
            <Field label="Rate Plan Name" required id="rp-name" error={errors.name}>
              <Input id="rp-name" value={form.name} onChange={set("name")} required placeholder="e.g. Best Flexible Rate" />
            </Field>
          </div>
          <Field label="Meal Plan" required id="rp-meal" hint={mealPlanLabel(form.mealPlan)}>
            <Select id="rp-meal" options={MEAL_PLANS} value={form.mealPlan} onChange={set("mealPlan")} title={mealPlanLabel(form.mealPlan)} />
          </Field>
          <Field label="Cancellation Policy" required id="rp-cancel">
            <Select id="rp-cancel" options={CANCELLATION_POLICIES} value={form.cancellationPolicy} onChange={set("cancellationPolicy")} />
          </Field>
          <Field label="Base Price" required id="rp-base" error={errors.basePrice}>
            <Input id="rp-base" type="number" min="0" step="0.01" tabular value={form.basePrice} onChange={setNum("basePrice")} required />
          </Field>
          <Field label="Weekend Price" required id="rp-weekend" error={errors.weekendPrice}>
            <Input id="rp-weekend" type="number" min="0" step="0.01" tabular value={form.weekendPrice} onChange={setNum("weekendPrice")} required />
          </Field>
          <Field label="Extra Adult Price" id="rp-extra-adult" error={errors.extraAdultPrice}>
            <Input id="rp-extra-adult" type="number" min="0" step="0.01" tabular value={form.extraAdultPrice} onChange={setNum("extraAdultPrice")} />
          </Field>
          <Field label="Child Price" id="rp-child" error={errors.childPrice}>
            <Input id="rp-child" type="number" min="0" step="0.01" tabular value={form.childPrice} onChange={setNum("childPrice")} />
          </Field>
          <Field label="Valid From" required id="rp-from" error={errors.validFrom}>
            <Input id="rp-from" type="date" tabular value={form.validFrom} onChange={set("validFrom")} required />
          </Field>
          <Field label="Valid To" required id="rp-to" error={errors.validTo}>
            <Input id="rp-to" type="date" tabular value={form.validTo} onChange={set("validTo")} required />
          </Field>
          <Field label="Status" required id="rp-status">
            <Select id="rp-status" options={RATE_PLAN_STATUSES} value={form.status} onChange={set("status")} />
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
