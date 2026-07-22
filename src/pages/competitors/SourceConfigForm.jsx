import React, { useState, useEffect, useRef } from "react";
import { Settings2 } from "lucide-react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { MasterDataManager } from "../../components/ui/MasterDataManager.jsx";
import { useData } from "../../context/DataContext.jsx";
import { PRIORITY_LEVELS } from "../../mocks/competitors.js";
import { STATUSES } from "../../mocks/properties.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

function buildEmpty(sourceTypes) {
  return {
    sourceType: sourceTypes[0]?.name || "",
    sourceName: "", sourceUrl: "", priority: "Medium", status: "Draft", notes: "",
    xpath: "", cssSelector: "", apiEndpoint: "", authRequired: false, parserVersion: "",
    lastCheckedAt: null, lastCheckStatus: "", lastCheckError: "",
  };
}

function validate(form) {
  const errors = {};
  if (!form.sourceName || !form.sourceName.trim()) errors.sourceName = "Source name is required.";
  if (!form.sourceUrl || !form.sourceUrl.trim()) errors.sourceUrl = "Source URL is required.";
  else if (!/^https?:\/\/.+/i.test(form.sourceUrl)) errors.sourceUrl = "Must start with http:// or https://";
  return errors;
}

// Configures a *future* collection source for this competitor — no scraping
// happens from this form or anywhere else in Phase 2. The competitor is
// fixed by the profile page this form is opened from, so there's no
// competitor picker here. Source types are a master table
// (`data.masters.sourceTypes`, defaults: Direct Website, Booking.com,
// Expedia, Agoda, Hotels.com, Google Hotels) so new types can be added later
// without a code change — same pattern as Room Types/Amenities. XPath / CSS
// Selector / API Endpoint / Authentication / Parser Version are deliberately
// inert placeholder fields for the eventual Python collection service;
// nothing here validates or executes them. `lastCheckedAt`/`lastCheckStatus`/
// `lastCheckError` are a second set of inert placeholders, reserved for the
// same future scraper to report back scrape-health results (last run time,
// OK/Error/Unknown, and any error detail) — nothing computes or displays
// them as live data today; they're just fields with a home already waiting.
export function SourceConfigForm({ open, onClose, onSubmit, initial, competitorName }) {
  const data = useData();
  const sourceTypes = data.masters.sourceTypes || [];
  const [form, setForm] = useState(initial || buildEmpty(sourceTypes));
  const [errors, setErrors] = useState({});
  const [manageOpen, setManageOpen] = useState(false);
  const baselineRef = useRef(form);

  useEffect(() => {
    const baseline = initial ? { ...buildEmpty(sourceTypes), ...initial } : buildEmpty(sourceTypes);
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
      title={initial ? "Edit Source Configuration" : "Add Source Configuration"}
      size="md"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="source-config-form">
            {initial ? "Save Changes" : "Add Source"}
          </Button>
        </>
      }
    >
      <form id="source-config-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {competitorName && (
            <Field label="Competitor" id="src-competitor">
              <Input value={competitorName} disabled />
            </Field>
          )}
          <div className="form-grid__full">
            <Field label="Source Name" required id="src-name" error={errors.sourceName}>
              <Input id="src-name" value={form.sourceName} onChange={set("sourceName")} placeholder="e.g. Grand Palace — Direct" />
            </Field>
          </div>
          <div className="form-grid__full">
            <Field label="Source URL" required id="src-url" error={errors.sourceUrl}>
              <Input id="src-url" value={form.sourceUrl} onChange={set("sourceUrl")} placeholder="https://..." />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid
            label="Source Type"
            options={sourceTypes.map((t) => t.name)}
            value={form.sourceType}
            onChange={setField("sourceType")}
            multiple={false}
            onManage={() => setManageOpen(true)}
            manageLabel="Manage Source Types"
            hint="Source types are extensible master data — add custom ones via Manage Source Types."
          />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="Priority" options={PRIORITY_LEVELS} value={form.priority} onChange={setField("priority")} multiple={false} />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <FeatureChipGrid label="Status" options={STATUSES} value={form.status} onChange={setField("status")} multiple={false} />
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <div className="field__label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Settings2 size={13} strokeWidth={2} /> Future Collection Placeholders
          </div>
          <p className="master-manager__hint" style={{ marginBottom: 12 }}>
            Inert today — these fields exist so the Python collection service can be wired in later without a schema change.
          </p>
          <div className="form-grid">
            <Field label="XPath" id="src-xpath"><Input id="src-xpath" value={form.xpath} onChange={set("xpath")} placeholder="//div[@class='rate']" /></Field>
            <Field label="CSS Selector" id="src-css"><Input id="src-css" value={form.cssSelector} onChange={set("cssSelector")} placeholder=".rate-price" /></Field>
            <Field label="API Endpoint" id="src-api"><Input id="src-api" value={form.apiEndpoint} onChange={set("apiEndpoint")} placeholder="https://api..." /></Field>
            <Field label="Parser Version" id="src-parser"><Input id="src-parser" value={form.parserVersion} onChange={set("parserVersion")} placeholder="v1" /></Field>
          </div>
          <div style={{ marginTop: "var(--space-4)" }}>
            <FeatureChipGrid
              label="Authentication Required"
              options={["No", "Yes"]}
              value={form.authRequired ? "Yes" : "No"}
              onChange={(v) => setForm((f) => ({ ...f, authRequired: v === "Yes" }))}
              multiple={false}
            />
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <div className="field__label" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Settings2 size={13} strokeWidth={2} /> Future Health Monitoring (Placeholder)
          </div>
          <p className="master-manager__hint" style={{ marginBottom: 12 }}>
            Inert today — reserved for the future Python collection service to report scrape health back onto this
            source (last checked time, OK/Error/Unknown, and any error detail). Nothing populates these yet.
          </p>
          <div className="form-grid">
            <Field label="Last Checked At" id="src-last-checked"><Input id="src-last-checked" value={form.lastCheckedAt || ""} disabled placeholder="Not yet checked" /></Field>
            <Field label="Last Check Status" id="src-last-check-status"><Input id="src-last-check-status" value={form.lastCheckStatus || ""} disabled placeholder="Unknown" /></Field>
            <div className="form-grid__full">
              <Field label="Last Check Error" id="src-last-check-error"><Input id="src-last-check-error" value={form.lastCheckError || ""} disabled placeholder="—" /></Field>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <Field label="Notes" id="src-notes">
            <Textarea id="src-notes" rows={3} value={form.notes} onChange={set("notes")} />
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
    <MasterDataManager open={manageOpen} onClose={() => setManageOpen(false)} kind="sourceTypes" label="Source Types" />
    </>
  );
}
