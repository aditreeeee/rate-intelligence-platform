import React, { useState, useRef } from "react";
import { Layers } from "lucide-react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LogoUpload } from "../../components/ui/LogoUpload.jsx";
import { TagPicker } from "../../components/ui/TagChips.jsx";
import { Accordion, AccordionSection } from "../../components/ui/Accordion.jsx";
import {
  BRANDS, CURRENCIES, TIME_ZONES, STATUSES, PROPERTY_TYPES, PROPERTY_TAGS,
  PROPERTY_CATEGORIES, SERVICE_MODELS, ACCOMMODATION_STYLES,
} from "../../mocks/properties.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const EMPTY = {
  name: "", brand: BRANDS[0], country: "", state: "", city: "",
  currency: CURRENCIES[0], timeZone: TIME_ZONES[0], starRating: 3,
  propertyType: PROPERTY_TYPES[0], status: "Draft", description: "",
  propertyCategory: PROPERTY_CATEGORIES[0], serviceModel: SERVICE_MODELS[0], accommodationStyle: ACCOMMODATION_STYLES[0],
  tags: [], logoUrl: "",
};

function validate(form) {
  const errors = {};
  if (!form.name || !form.name.trim()) errors.name = "Property name is required.";
  if (!form.country || !form.country.trim()) errors.country = "Country is required.";
  if (!form.city || !form.city.trim()) errors.city = "City is required.";
  return errors;
}

export function PropertyForm({ open, onClose, onSubmit, initial }) {
  const permissions = usePermissions();
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});
  const baselineRef = useRef(EMPTY);

  React.useEffect(() => {
    const baseline = initial ? { ...EMPTY, ...initial } : EMPTY;
    setForm(baseline);
    setErrors({});
    baselineRef.current = baseline;
  }, [initial, open]);

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  const { confirmOpen, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);
  const guardedClose = () => requestAction(onClose);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit({ ...form, starRating: Number(form.starRating) });
  };

  return (
    <>
    <Modal
      open={open}
      onClose={guardedClose}
      title={initial ? "Edit Property" : "Add Property"}
      size="lg"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" onClick={handleSubmit} type="submit" form="property-form">
            {initial ? "Save Changes" : "Create Property"}
          </Button>
        </>
      }
    >
      <form id="property-form" onSubmit={handleSubmit}>
        <div className="form-grid__full">
          <Field label="Property Logo" id="p-logo">
            <LogoUpload value={form.logoUrl} onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))} />
          </Field>
        </div>

        <div className="form-grid">
          {initial && (
            <Field label="Property ID" id="p-id">
              <Input id="p-id" value={initial.id} disabled={!permissions.canEditPropertyId} readOnly title="Property ID is system-generated and cannot be changed." />
            </Field>
          )}
          <Field label="Property Name" required id="p-name" error={errors.name}>
            <Input id="p-name" value={form.name} onChange={set("name")} required placeholder="e.g. Aurora Bay Resort" />
          </Field>
          <Field label="Brand" required id="p-brand">
            <Select id="p-brand" options={BRANDS} value={form.brand} onChange={set("brand")} />
          </Field>
          <Field label="Country" required id="p-country" error={errors.country}>
            <Input id="p-country" value={form.country} onChange={set("country")} required />
          </Field>
          <Field label="State / Region" id="p-state">
            <Input id="p-state" value={form.state} onChange={set("state")} />
          </Field>
          <Field label="City" required id="p-city" error={errors.city}>
            <Input id="p-city" value={form.city} onChange={set("city")} required />
          </Field>
          <Field label="Currency" required id="p-currency">
            <Select id="p-currency" options={CURRENCIES} value={form.currency} onChange={set("currency")} />
          </Field>
          <Field label="Time Zone" required id="p-tz">
            <Select id="p-tz" options={TIME_ZONES} value={form.timeZone} onChange={set("timeZone")} />
          </Field>
          <Field label="Star Rating" required id="p-star">
            <Select id="p-star" options={["1", "2", "3", "4", "5"]} value={String(form.starRating)} onChange={set("starRating")} />
          </Field>
          <Field label="Status" required id="p-status">
            <Select id="p-status" options={STATUSES} value={form.status} onChange={set("status")} />
          </Field>
          <div className="form-grid__full">
            <Field label="Tags" id="p-tags">
              <TagPicker options={PROPERTY_TAGS} value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
            </Field>
          </div>
          <div className="form-grid__full">
            <Field label="Description" id="p-desc">
              <Textarea id="p-desc" value={form.description} onChange={set("description")} placeholder="Brief property description..." />
            </Field>
          </div>
        </div>

        <div className="form-grid__full" style={{ marginTop: "var(--space-5)" }}>
          <Accordion>
            <AccordionSection title="Property Classification" icon={Layers} defaultOpen>
              <div className="form-grid">
                <Field label="Property Type" required id="p-type">
                  <Select id="p-type" options={PROPERTY_TYPES} value={form.propertyType} onChange={set("propertyType")} />
                </Field>
                <Field label="Property Category" required id="p-category">
                  <Select id="p-category" options={PROPERTY_CATEGORIES} value={form.propertyCategory} onChange={set("propertyCategory")} />
                </Field>
                <Field label="Service Model" required id="p-service">
                  <Select id="p-service" options={SERVICE_MODELS} value={form.serviceModel} onChange={set("serviceModel")} />
                </Field>
                <Field label="Accommodation Style" required id="p-accommodation">
                  <Select id="p-accommodation" options={ACCOMMODATION_STYLES} value={form.accommodationStyle} onChange={set("accommodationStyle")} />
                </Field>
              </div>
            </AccordionSection>
          </Accordion>
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
