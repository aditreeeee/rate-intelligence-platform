import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutGrid, MapPin, Layers, SlidersHorizontal, Phone, Tag as TagIcon,
  User, Smartphone, Mail, Globe, Check, AlertCircle, RotateCcw,
} from "lucide-react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LogoUpload } from "../../components/ui/LogoUpload.jsx";
import { TagPicker } from "../../components/ui/TagChips.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { propertyFeatureIcon } from "../../lib/propertyFeatureIcons.js";
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
  contactName: "", contactPhone: "", contactMobile: "", contactEmail: "", contactWebsite: "", addressLine: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;

function validate(form) {
  const errors = {};
  if (!form.name || !form.name.trim()) errors.name = "Property name is required.";
  if (!form.country || !form.country.trim()) errors.country = "Country is required.";
  if (!form.city || !form.city.trim()) errors.city = "City is required.";
  if (form.contactEmail && form.contactEmail.trim() && !EMAIL_RE.test(form.contactEmail.trim())) {
    errors.contactEmail = "Enter a valid email address.";
  }
  if (form.contactWebsite && form.contactWebsite.trim() && !URL_RE.test(form.contactWebsite.trim())) {
    errors.contactWebsite = "Enter a valid URL, e.g. https://hotel.com";
  }
  return errors;
}

const SECTION_FIELDS = {
  overview: ["name", "description", "status"],
  location: ["country", "state", "city"],
  classification: ["brand", "propertyType", "propertyCategory", "serviceModel", "accommodationStyle"],
  operational: ["currency", "timeZone", "starRating"],
  contact: ["contactEmail", "contactWebsite"],
  tags: [],
};

const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "location", label: "Location", icon: MapPin },
  { key: "classification", label: "Classification", icon: Layers },
  { key: "operational", label: "Operational", icon: SlidersHorizontal },
  { key: "contact", label: "Contact Information", icon: Phone },
  { key: "tags", label: "Tags", icon: TagIcon },
];

export function PropertyForm({ open, onClose, onSubmit, initial }) {
  const permissions = usePermissions();
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});
  const [active, setActive] = useState("overview");
  const baselineRef = useRef(EMPTY);

  useEffect(() => {
    const baseline = initial ? { ...EMPTY, ...initial } : EMPTY;
    setForm(baseline);
    setErrors({});
    setActive("overview");
    baselineRef.current = baseline;
  }, [initial, open]);

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  const { confirmOpen, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);
  const guardedClose = () => requestAction(onClose);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setField = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const dirtyFields = useMemo(() => {
    const s = new Set();
    for (const key of Object.keys(form)) {
      if (JSON.stringify(form[key]) !== JSON.stringify(baselineRef.current[key])) s.add(key);
    }
    return s;
  }, [form]);

  const sectionHasError = (key) => (SECTION_FIELDS[key] || []).some((f) => errors[f]);
  const isSectionComplete = (key) => {
    if (sectionHasError(key)) return false;
    if (key === "overview") return !!form.name.trim();
    if (key === "location") return !!form.country.trim() && !!form.city.trim();
    return true;
  };

  const runValidation = () => {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorSection = SECTIONS.find((s) => (SECTION_FIELDS[s.key] || []).some((f) => validationErrors[f]));
      if (firstErrorSection) setActive(firstErrorSection.key);
      return null;
    }
    return { ...form, starRating: Number(form.starRating) };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const valid = runValidation();
    if (!valid) return;
    onSubmit(valid);
  };

  const handleSaveAndContinue = (e) => {
    e.preventDefault();
    const valid = runValidation();
    if (!valid) return;
    onSubmit(valid, { keepOpen: true });
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
      title={initial ? "Edit Property" : "Add Property"}
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
          <Button variant="primary" size="md" type="submit" form="property-form">
            {initial ? "Save Changes" : "Create Property"}
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
          <form id="property-form" onSubmit={handleSubmit}>
            {active === "overview" && (
              <div className="form-grid">
                <div className="form-grid__full">
                  <Field label="Property Logo" id="p-logo">
                    <LogoUpload value={form.logoUrl} onChange={setField("logoUrl")} />
                  </Field>
                </div>
                {initial && (
                  <Field label="Property ID" id="p-id">
                    <Input id="p-id" value={initial.id} disabled={!permissions.canEditPropertyId} readOnly title="Property ID is system-generated and cannot be changed." />
                  </Field>
                )}
                <Field label="Property Name" required id="p-name" error={errors.name} modified={dirtyFields.has("name")}>
                  <Input id="p-name" value={form.name} onChange={set("name")} required placeholder="e.g. Aurora Bay Resort" />
                </Field>
                <div className="form-grid__full">
                  <Field label="Description" id="p-desc" modified={dirtyFields.has("description")}>
                    <Textarea id="p-desc" value={form.description} onChange={set("description")} placeholder="Brief property description..." />
                  </Field>
                </div>
                <FeatureChipGrid
                  label="Status"
                  options={STATUSES}
                  value={form.status}
                  onChange={setField("status")}
                  multiple={false}
                  getIcon={propertyFeatureIcon}
                  resetValue={baselineRef.current.status}
                />
              </div>
            )}

            {active === "location" && (
              <div className="form-grid">
                <Field label="Country" required id="p-country" error={errors.country} modified={dirtyFields.has("country")}>
                  <Input id="p-country" value={form.country} onChange={set("country")} required />
                </Field>
                <Field label="State / Region" id="p-state" modified={dirtyFields.has("state")}>
                  <Input id="p-state" value={form.state} onChange={set("state")} />
                </Field>
                <Field label="City" required id="p-city" error={errors.city} modified={dirtyFields.has("city")}>
                  <Input id="p-city" value={form.city} onChange={set("city")} required />
                </Field>
              </div>
            )}

            {active === "classification" && (
              <>
                <FeatureChipGrid label="Brand" options={BRANDS} value={form.brand} onChange={setField("brand")} multiple={false} getIcon={propertyFeatureIcon} resetValue={baselineRef.current.brand} />
                <div style={{ marginTop: "var(--space-6)" }}>
                  <FeatureChipGrid label="Property Type" options={PROPERTY_TYPES} value={form.propertyType} onChange={setField("propertyType")} multiple={false} getIcon={propertyFeatureIcon} resetValue={baselineRef.current.propertyType} />
                </div>
                <div style={{ marginTop: "var(--space-6)" }}>
                  <FeatureChipGrid label="Property Category" options={PROPERTY_CATEGORIES} value={form.propertyCategory} onChange={setField("propertyCategory")} multiple={false} getIcon={propertyFeatureIcon} resetValue={baselineRef.current.propertyCategory} />
                </div>
                <div style={{ marginTop: "var(--space-6)" }}>
                  <FeatureChipGrid label="Service Model" options={SERVICE_MODELS} value={form.serviceModel} onChange={setField("serviceModel")} multiple={false} getIcon={propertyFeatureIcon} resetValue={baselineRef.current.serviceModel} />
                </div>
                <div style={{ marginTop: "var(--space-6)" }}>
                  <FeatureChipGrid label="Accommodation Style" options={ACCOMMODATION_STYLES} value={form.accommodationStyle} onChange={setField("accommodationStyle")} multiple={false} getIcon={propertyFeatureIcon} resetValue={baselineRef.current.accommodationStyle} />
                </div>
              </>
            )}

            {active === "operational" && (
              <>
                <FeatureChipGrid label="Currency" options={CURRENCIES} value={form.currency} onChange={setField("currency")} multiple={false} getIcon={propertyFeatureIcon} resetValue={baselineRef.current.currency} />
                <div style={{ marginTop: "var(--space-6)" }}>
                  <FeatureChipGrid label="Time Zone" options={TIME_ZONES} value={form.timeZone} onChange={setField("timeZone")} multiple={false} getIcon={propertyFeatureIcon} resetValue={baselineRef.current.timeZone} />
                </div>
                <div style={{ marginTop: "var(--space-6)" }}>
                  <FeatureChipGrid label="Star Rating" options={["1", "2", "3", "4", "5"]} value={String(form.starRating)} onChange={setField("starRating")} multiple={false} getIcon={propertyFeatureIcon} resetValue={String(baselineRef.current.starRating)} />
                </div>
              </>
            )}

            {active === "contact" && (
              <div className="form-grid">
                <Field label="Contact Person" id="p-contact-name" modified={dirtyFields.has("contactName")}>
                  <Input id="p-contact-name" icon={User} value={form.contactName} onChange={set("contactName")} placeholder="e.g. Front Desk Manager" />
                </Field>
                <Field label="Phone" id="p-contact-phone" modified={dirtyFields.has("contactPhone")}>
                  <Input id="p-contact-phone" icon={Phone} value={form.contactPhone} onChange={set("contactPhone")} placeholder="+1 555 010 2020" />
                </Field>
                <Field label="Mobile" id="p-contact-mobile" modified={dirtyFields.has("contactMobile")}>
                  <Input id="p-contact-mobile" icon={Smartphone} value={form.contactMobile} onChange={set("contactMobile")} placeholder="+1 555 010 4040" />
                </Field>
                <Field label="Email" id="p-contact-email" error={errors.contactEmail} modified={dirtyFields.has("contactEmail")}>
                  <Input id="p-contact-email" icon={Mail} type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="reservations@hotel.com" />
                </Field>
                <Field label="Website" id="p-contact-website" error={errors.contactWebsite} modified={dirtyFields.has("contactWebsite")}>
                  <Input id="p-contact-website" icon={Globe} value={form.contactWebsite} onChange={set("contactWebsite")} placeholder="https://hotel.com" />
                </Field>
                <Field label="Address" id="p-contact-address" modified={dirtyFields.has("addressLine")}>
                  <Input id="p-contact-address" icon={MapPin} value={form.addressLine} onChange={set("addressLine")} placeholder="Street address" />
                </Field>
              </div>
            )}

            {active === "tags" && (
              <Field label="Tags" id="p-tags" modified={dirtyFields.has("tags")}>
                <TagPicker options={PROPERTY_TAGS} value={form.tags} onChange={setField("tags")} />
              </Field>
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
