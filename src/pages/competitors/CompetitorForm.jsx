import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { COMPETITOR_STATUSES, PRIORITY_LEVELS } from "../../mocks/competitors.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

const EMPTY = {
  hotelName: "", country: "", state: "", city: "", address: "",
  website: "", otaUrls: [],
  starRating: 3, distance: "", priority: "Medium", status: "Active", notes: "",
};

function validate(form) {
  const errors = {};
  if (!form.hotelName || !form.hotelName.trim()) errors.hotelName = "Hotel name is required.";
  if (!form.country || !form.country.trim()) errors.country = "Country is required.";
  if (!form.city || !form.city.trim()) errors.city = "City is required.";
  if (form.website && !/^https?:\/\/.+/i.test(form.website)) errors.website = "Website must start with http:// or https://";
  form.otaUrls.forEach((o, i) => {
    if (o.url && !/^https?:\/\/.+/i.test(o.url)) errors[`otaUrl-${i}`] = "Must start with http:// or https://";
  });
  return errors;
}

// A Competitor Hotel belongs to exactly one Comparison Group. `futurePropertyId`
// is intentionally a disabled placeholder field — Phase 2 never creates or
// links a real Phase 1 Property record for a competitor; that linkage (if it
// ever happens, e.g. onboarding a competitor as a client) is out of scope
// here and would be a Phase 3+ concern.
export function CompetitorForm({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});
  const baselineRef = useRef(form);

  useEffect(() => {
    const baseline = initial ? { ...EMPTY, ...initial } : EMPTY;
    setForm(baseline);
    setErrors({});
    baselineRef.current = baseline;
  }, [initial, open]);

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  const { confirmOpen, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);
  const guardedClose = () => requestAction(onClose);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value === "" ? "" : Number(e.target.value) }));
  const setField = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const addOtaUrl = () => setForm((f) => ({ ...f, otaUrls: [...f.otaUrls, { label: "", url: "" }] }));
  const updateOtaUrl = (i, key, value) =>
    setForm((f) => ({ ...f, otaUrls: f.otaUrls.map((o, idx) => (idx === i ? { ...o, [key]: value } : o)) }));
  const removeOtaUrl = (i) => setForm((f) => ({ ...f, otaUrls: f.otaUrls.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit({ ...form, starRating: Number(form.starRating), distance: form.distance === "" ? "" : Number(form.distance) });
  };

  return (
    <>
    <Modal
      open={open}
      onClose={guardedClose}
      title={initial ? "Edit Competitor" : "Add Competitor"}
      size="lg"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="competitor-form">
            {initial ? "Save Changes" : "Add Competitor"}
          </Button>
        </>
      }
    >
      <form id="competitor-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-grid__full">
            <Field label="Hotel Name" required id="cmp-name" error={errors.hotelName}>
              <Input id="cmp-name" value={form.hotelName} onChange={set("hotelName")} required placeholder="e.g. Grand Palace Resort" />
            </Field>
          </div>
          <Field label="Star Rating" id="cmp-star">
            <Select id="cmp-star" options={["1", "2", "3", "4", "5"]} value={String(form.starRating)} onChange={(e) => setForm((f) => ({ ...f, starRating: Number(e.target.value) }))} />
          </Field>
          <Field label="Country" required id="cmp-country" error={errors.country}>
            <Input id="cmp-country" value={form.country} onChange={set("country")} required />
          </Field>
          <Field label="State" id="cmp-state">
            <Input id="cmp-state" value={form.state} onChange={set("state")} />
          </Field>
          <Field label="City" required id="cmp-city" error={errors.city}>
            <Input id="cmp-city" value={form.city} onChange={set("city")} required />
          </Field>
          <Field label="Distance (from benchmark, km)" id="cmp-distance">
            <Input id="cmp-distance" type="number" min="0" step="0.1" tabular value={form.distance} onChange={setNum("distance")} />
          </Field>
          <div className="form-grid__full">
            <Field label="Address" id="cmp-address">
              <Input id="cmp-address" value={form.address} onChange={set("address")} />
            </Field>
          </div>
          <div className="form-grid__full">
            <Field label="Website" id="cmp-website" error={errors.website} hint="Used by URL Manager and Source Configuration.">
              <Input id="cmp-website" value={form.website} onChange={set("website")} placeholder="https://..." />
            </Field>
          </div>
          <div className="form-grid__full">
            <Field label="Future Property ID" id="cmp-future-prop" hint="Read-only placeholder — competitors are never linked to a real Phase 1 Property record.">
              <Input id="cmp-future-prop" value="Not linked" disabled />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="field__label">OTA URLs</span>
            <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addOtaUrl}>Add OTA URL</Button>
          </div>
          {form.otaUrls.length === 0 && <p className="master-manager__hint">No OTA URLs added yet.</p>}
          {form.otaUrls.map((o, i) => (
            <div key={i} className="form-grid" style={{ marginBottom: 8, alignItems: "flex-end" }}>
              <Field label="Label" id={`ota-label-${i}`}>
                <Input id={`ota-label-${i}`} value={o.label} onChange={(e) => updateOtaUrl(i, "label", e.target.value)} placeholder="e.g. Booking.com" />
              </Field>
              <div className="form-grid__full" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Field label="URL" id={`ota-url-${i}`} error={errors[`otaUrl-${i}`]}>
                    <Input id={`ota-url-${i}`} value={o.url} onChange={(e) => updateOtaUrl(i, "url", e.target.value)} placeholder="https://..." />
                  </Field>
                </div>
                <button type="button" className="table__action-btn table__action-btn--danger" onClick={() => removeOtaUrl(i)} aria-label="Remove OTA URL" style={{ marginBottom: 4 }}>
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid
            label="Priority"
            options={PRIORITY_LEVELS}
            value={form.priority}
            onChange={setField("priority")}
            multiple={false}
          />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid
            label="Status"
            options={COMPETITOR_STATUSES}
            value={form.status}
            onChange={setField("status")}
            multiple={false}
          />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Field label="Notes" id="cmp-notes">
            <Textarea id="cmp-notes" rows={4} value={form.notes} onChange={set("notes")} placeholder="Internal notes about this competitor..." />
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
