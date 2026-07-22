import React, { useState, useEffect, useRef } from "react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { TagPicker } from "../../components/ui/TagChips.jsx";
import { COMPARISON_GROUP_STATUSES, COMPARISON_GROUP_TAGS } from "../../mocks/competitors.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

function buildEmpty(scopePropertyId) {
  return { propertyId: scopePropertyId || "", name: "", market: "", status: "Draft", tags: [], notes: "" };
}

function validate(form, { skipProperty = false } = {}) {
  const errors = {};
  if (!skipProperty && !form.propertyId) errors.propertyId = "Property is required.";
  if (!form.name || !form.name.trim()) errors.name = "Comparison group name is required.";
  return errors;
}

// A Comparison Group represents one market for one Phase 1 property (e.g.
// "Luxury Hotels – Bengaluru") — the container Competitors, the Benchmark,
// and every mapping/source/URL/validation module nest under. It never
// duplicates or edits Phase 1 property data; `propertyId` is purely a
// read-only reference chosen once at creation.
export function ComparisonGroupForm({ open, onClose, onSubmit, initial, properties = [], scopePropertyId }) {
  const [form, setForm] = useState(initial || buildEmpty(scopePropertyId));
  const [errors, setErrors] = useState({});
  const baselineRef = useRef(form);

  const isEditing = !!initial;

  useEffect(() => {
    const baseline = initial ? { ...buildEmpty(scopePropertyId), ...initial } : buildEmpty(scopePropertyId);
    setForm(baseline);
    setErrors({});
    baselineRef.current = baseline;
  }, [initial, open, scopePropertyId]);

  const scopedProperty = properties.find((p) => p.id === form.propertyId);

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
      title={initial ? "Edit Comparison Group" : "Add Comparison Group"}
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="comparison-group-form">
            {initial ? "Save Changes" : "Create Group"}
          </Button>
        </>
      }
    >
      <form id="comparison-group-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-grid__full">
            <Field label="Property" required id="cg-property" error={errors.propertyId}>
              {scopePropertyId || isEditing ? (
                <Input value={scopedProperty?.name || form.propertyId} disabled />
              ) : (
                <Select
                  id="cg-property"
                  placeholder="Select a property"
                  options={properties.map((p) => p.name)}
                  value={scopedProperty?.name || ""}
                  onChange={(e) => {
                    const p = properties.find((pp) => pp.name === e.target.value);
                    setForm((f) => ({ ...f, propertyId: p?.id || "" }));
                  }}
                />
              )}
            </Field>
          </div>
          <div className="form-grid__full">
            <Field label="Group Name" required id="cg-name" error={errors.name} hint='e.g. "Luxury Hotels – Bengaluru"'>
              <Input id="cg-name" value={form.name} onChange={set("name")} required placeholder="e.g. Luxury Hotels – Bengaluru" />
            </Field>
          </div>
          <Field label="Market / Segment" id="cg-market">
            <Input id="cg-market" value={form.market} onChange={set("market")} placeholder="e.g. Luxury, Business, Resort" />
          </Field>
          <Field label="Status" required id="cg-status">
            <Select id="cg-status" options={COMPARISON_GROUP_STATUSES} value={form.status} onChange={set("status")} />
          </Field>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Field label="Tags" id="cg-tags">
            <TagPicker options={COMPARISON_GROUP_TAGS} value={form.tags} onChange={setField("tags")} />
          </Field>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Field label="Notes" id="cg-notes">
            <Textarea id="cg-notes" rows={4} value={form.notes} onChange={set("notes")} placeholder="Internal notes about this comparison group..." />
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
