import React, { useState, useEffect, useRef } from "react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { MAPPING_TYPES, MAPPING_STATUSES } from "../../mocks/competitors.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

function buildEmpty() {
  return {
    internalRoomIds: [], competitorRoomLabel: "", competitorRoomCode: "",
    mappingType: MAPPING_TYPES[0], status: "Needs Review", confidence: 0, notes: "",
  };
}

function validate(form) {
  const errors = {};
  if (form.internalRoomIds.length === 0) errors.internalRoomIds = "Select at least one internal room.";
  if (!form.competitorRoomLabel || !form.competitorRoomLabel.trim()) errors.competitorRoomLabel = "Competitor room label is required.";
  return errors;
}

// Maps internal Phase 1 rooms (read-only reference, `rooms` prop) to this
// competitor's room label — the competitor is fixed by the profile page this
// form is opened from, so there's no competitor picker here. `internalRoomIds`
// is always an array so One-to-One (1 room), One-to-Many, and Many-to-One
// mappings share one storage shape — `mappingType` is just a descriptive tag,
// not a structural constraint. `confidence` is an explicit mock placeholder
// for the future automated matching Phase 3 may introduce; nothing computes
// it today. `competitorRoomCode` is a second, optional identifier alongside
// the display label: the label is what a human reads and edits, but it can
// legitimately change if a competitor renames a room type. A stable
// site-specific code/slug (once the Python scraper starts reading one) lets
// matching survive that without an operator having to re-map anything.
export function RoomMappingForm({ open, onClose, onSubmit, initial, rooms = [], competitorName }) {
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
  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value === "" ? 0 : Number(e.target.value) }));
  const setField = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  // FeatureChipGrid options are plain strings used as both value and label —
  // room names, converted to/from ids at the form boundary since
  // `internalRoomIds` is what the mapping record actually stores.
  const selectedRoomNames = form.internalRoomIds.map((id) => rooms.find((r) => r.id === id)?.name).filter(Boolean);
  const setRoomSelection = (names) => {
    const ids = names.map((name) => rooms.find((r) => r.name === name)?.id).filter(Boolean);
    setForm((f) => ({ ...f, internalRoomIds: ids }));
  };

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
      title={initial ? "Edit Room Mapping" : "Add Room Mapping"}
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="room-mapping-form">
            {initial ? "Save Changes" : "Add Mapping"}
          </Button>
        </>
      }
    >
      <form id="room-mapping-form" onSubmit={handleSubmit}>
        <FeatureChipGrid
          label="Internal Room(s)"
          options={rooms.map((r) => r.name)}
          value={selectedRoomNames}
          onChange={setRoomSelection}
          hint="Select one room for One-to-One, several for One-to-Many/Many-to-One."
        />
        {errors.internalRoomIds && <p className="field__error" style={{ marginTop: 4 }}>{errors.internalRoomIds}</p>}

        <div className="form-grid" style={{ marginTop: "var(--space-6)" }}>
          {competitorName && (
            <Field label="Competitor" id="rm-competitor">
              <Input value={competitorName} disabled />
            </Field>
          )}
          <Field label="Competitor Room Label" required id="rm-label" error={errors.competitorRoomLabel}>
            <Input id="rm-label" value={form.competitorRoomLabel} onChange={set("competitorRoomLabel")} placeholder="e.g. Ocean View King Room" />
          </Field>
          <Field label="Source Room Code (optional)" id="rm-code" hint="A stable ID/slug from the competitor's site, if known — survives the label being renamed later.">
            <Input id="rm-code" value={form.competitorRoomCode} onChange={set("competitorRoomCode")} placeholder="e.g. RM-OVK-01" />
          </Field>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="Mapping Type" options={MAPPING_TYPES} value={form.mappingType} onChange={setField("mappingType")} multiple={false} />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="Mapping Status" options={MAPPING_STATUSES} value={form.status} onChange={setField("status")} multiple={false} />
        </div>

        <div className="form-grid" style={{ marginTop: "var(--space-6)" }}>
          <Field label="Mapping Confidence (mock)" id="rm-confidence" hint="Placeholder for future automated matching — not computed today.">
            <Input id="rm-confidence" type="number" min="0" max="100" tabular value={form.confidence} onChange={setNum("confidence")} />
          </Field>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Field label="Mapping Notes" id="rm-notes">
            <Textarea id="rm-notes" rows={3} value={form.notes} onChange={set("notes")} />
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
