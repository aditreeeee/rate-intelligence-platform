import React, { useState, useEffect, useRef } from "react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { URL_TYPES, URL_STATUSES } from "../../mocks/competitors.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

function buildEmpty() {
  return { urlType: "Custom", label: "", url: "", status: "Active", notes: "" };
}

function validate(form) {
  const errors = {};
  if (!form.label || !form.label.trim()) errors.label = "Label is required.";
  if (!form.url || !form.url.trim()) errors.url = "URL is required.";
  else if (!/^https?:\/\/.+/i.test(form.url)) errors.url = "Must start with http:// or https://";
  return errors;
}

// URL Manager records are for centralizing custom URLs beyond a competitor's
// Website/OTA URLs (which live directly on the Competitor record) — e.g.
// TripAdvisor listings, meta-search pages. The competitor is fixed by the
// profile page this form is opened from, so there's no competitor picker
// here. Duplicate/invalid/missing detection across every URL (including
// Website/OTA) happens in UrlManagerTab, not here — this form only
// validates its own single record.
export function UrlRecordForm({ open, onClose, onSubmit, initial, competitorName }) {
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
      title={initial ? "Edit URL Record" : "Add URL Record"}
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="url-record-form">
            {initial ? "Save Changes" : "Add URL"}
          </Button>
        </>
      }
    >
      <form id="url-record-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {competitorName && (
            <Field label="Competitor" id="url-competitor">
              <Input value={competitorName} disabled />
            </Field>
          )}
          <Field label="Label" required id="url-label" error={errors.label}>
            <Input id="url-label" value={form.label} onChange={set("label")} placeholder="e.g. TripAdvisor Listing" />
          </Field>
          <div className="form-grid__full">
            <Field label="URL" required id="url-value" error={errors.url}>
              <Input id="url-value" value={form.url} onChange={set("url")} placeholder="https://..." />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="URL Type" options={URL_TYPES} value={form.urlType} onChange={setField("urlType")} multiple={false} />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="Status" options={URL_STATUSES} value={form.status} onChange={setField("status")} multiple={false} />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Field label="Notes" id="url-notes">
            <Textarea id="url-notes" rows={3} value={form.notes} onChange={set("notes")} />
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
