import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Users2, LayoutGrid, Sliders, MapPin, Sofa, UsersRound, Heart, Crown } from "lucide-react";
import { Modal, ConfirmModal } from "../../components/ui/Modal.jsx";
import { Field, Input, Select, Textarea } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Accordion, AccordionSection } from "../../components/ui/Accordion.jsx";
import { MultiSelectChips } from "../../components/ui/MultiSelectChips.jsx";
import { ROOM_STATUSES } from "../../mocks/rooms.js";
import { ROOM_TEMPLATES } from "../../mocks/roomTemplates.js";
import {
  OCCUPANCY_TYPES, BED_CONFIGURATIONS, ROOM_TYPES, ROOM_LAYOUTS,
  ROOM_OPTIONS, ACCESSIBILITY_FEATURES, ROOM_VIEWS, ROOM_POSITIONS,
  ROOM_AMENITIES, BEST_SUITED_FOR, SUITE_FEATURES, isSuiteRoomType,
} from "../../mocks/roomClassification.js";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges.js";

const EMPTY = {
  name: "", description: "", propertyId: "", status: "Active",
  occupancyType: OCCUPANCY_TYPES[0], bedConfiguration: BED_CONFIGURATIONS[0], numberOfBeds: 1, extraBedAllowed: false,
  roomType: ROOM_TYPES[0], layout: ROOM_LAYOUTS[0],
  roomOptions: [], accessibilityFeatures: [],
  view: ROOM_VIEWS[0], roomPosition: ROOM_POSITIONS[0],
  amenities: [],
  maxAdults: 2, maxChildren: 0, maxInfants: 0, maxOccupancy: 2, baseOccupancy: 2,
  extraAdultAllowed: false, extraChildAllowed: false,
  bestSuitedFor: [],
  suiteFeatures: [],
};

function validate(form) {
  const errors = {};
  if (!form.propertyId) errors.propertyId = "Property is required.";
  if (!form.name || !form.name.trim()) errors.name = "Room name is required.";
  for (const [key, label] of [
    ["maxAdults", "Max adults"],
    ["maxChildren", "Max children"],
    ["maxOccupancy", "Max occupancy"],
    ["baseOccupancy", "Base occupancy"],
    ["numberOfBeds", "Number of beds"],
  ]) {
    const val = form[key];
    if (val === "" || val === null || Number.isNaN(Number(val))) errors[key] = `${label} must be a number.`;
    else if (Number(val) < (key === "numberOfBeds" || key === "maxOccupancy" || key === "baseOccupancy" ? 1 : 0)) {
      errors[key] = `${label} must be at least ${key === "numberOfBeds" || key === "maxOccupancy" || key === "baseOccupancy" ? 1 : 0}.`;
    }
  }
  if (!errors.maxOccupancy && !errors.maxAdults && !errors.maxChildren) {
    if (Number(form.maxAdults) + Number(form.maxChildren) > Number(form.maxOccupancy)) {
      errors.maxOccupancy = "Max occupancy cannot be less than max adults + max children.";
    }
  }
  return errors;
}

export function RoomForm({ open, onClose, onSubmit, initial, properties = [], scopePropertyId }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});
  const baselineRef = useRef(EMPTY);

  useEffect(() => {
    const baseline = initial
      ? { ...EMPTY, ...initial }
      : { ...EMPTY, propertyId: scopePropertyId || "" };
    setForm(baseline);
    setErrors({});
    baselineRef.current = baseline;
  }, [initial, open, scopePropertyId]);

  const scopedProperty = properties.find((p) => p.id === form.propertyId);
  const showSuiteSection = isSuiteRoomType(form.roomType);

  const isDirty = open && JSON.stringify(form) !== JSON.stringify(baselineRef.current);
  const { confirmOpen, requestAction, confirmDiscard, cancelDiscard } = useUnsavedChanges(isDirty);
  const guardedClose = () => requestAction(onClose);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setNum = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value === "" ? "" : Number(e.target.value) }));
  const setBool = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value === "Yes" }));
  const setList = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

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
      title={initial ? "Edit Room" : "Add Room"}
      size="lg"
      footer={
        <>
          <button className="btn btn--ghost btn--md" onClick={guardedClose} type="button">Cancel</button>
          <Button variant="primary" size="md" type="submit" form="room-form">
            {initial ? "Save Changes" : "Create Room"}
          </Button>
        </>
      }
    >
      {!initial && (
        <div className="template-picker">
          <div className="template-picker__label"><Sparkles size={13} strokeWidth={2} /> Quick-fill from a template</div>
          <div className="template-picker__list">
            {ROOM_TEMPLATES.map((t) => (
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
      <form id="room-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-grid__full">
            <Field label="Property" required id="r-property" error={errors.propertyId}>
              {scopePropertyId ? (
                <Input value={scopedProperty?.name || scopePropertyId} disabled />
              ) : (
                <Select
                  id="r-property"
                  placeholder="Select a property"
                  options={properties.map((p) => p.name)}
                  value={scopedProperty?.name || ""}
                  onChange={(e) => {
                    const p = properties.find((pp) => pp.name === e.target.value);
                    setForm((f) => ({ ...f, propertyId: p?.id || "" }));
                  }}
                  disabled={!!initial}
                />
              )}
            </Field>
          </div>
          <div className="form-grid__full">
            <Field label="Room Name" required id="r-name" error={errors.name}>
              <Input id="r-name" value={form.name} onChange={set("name")} required placeholder="e.g. Deluxe Ocean King" />
            </Field>
          </div>
          <div className="form-grid__full">
            <Field label="Description" id="r-desc">
              <Textarea id="r-desc" value={form.description} onChange={set("description")} />
            </Field>
          </div>
          <Field label="Status" required id="r-status">
            <Select id="r-status" options={ROOM_STATUSES} value={form.status} onChange={set("status")} />
          </Field>
        </div>

        <div style={{ marginTop: "var(--space-5)" }}>
          <Accordion>
            <AccordionSection title="Room Category" icon={Users2} defaultOpen>
              <div className="form-grid">
                <Field label="Occupancy Based" required id="r-occtype">
                  <Select id="r-occtype" options={OCCUPANCY_TYPES} value={form.occupancyType} onChange={set("occupancyType")} />
                </Field>
                <Field label="Bed Configuration" required id="r-bedconfig">
                  <Select id="r-bedconfig" options={BED_CONFIGURATIONS} value={form.bedConfiguration} onChange={set("bedConfiguration")} />
                </Field>
                <Field label="Number of Beds" required id="r-numbeds" error={errors.numberOfBeds}>
                  <Input id="r-numbeds" type="number" min="1" tabular value={form.numberOfBeds} onChange={setNum("numberOfBeds")} required />
                </Field>
                <Field label="Extra Bed Allowed" id="r-extrabed">
                  <Select id="r-extrabed" options={["No", "Yes"]} value={form.extraBedAllowed ? "Yes" : "No"} onChange={setBool("extraBedAllowed")} />
                </Field>
              </div>
            </AccordionSection>

            <AccordionSection title="Room Design & Layout" icon={LayoutGrid}>
              <div className="form-grid">
                <Field label="Room Type" required id="r-roomtype">
                  <Select id="r-roomtype" options={ROOM_TYPES} value={form.roomType} onChange={set("roomType")} />
                </Field>
                <Field label="Layout" required id="r-layout">
                  <Select id="r-layout" options={ROOM_LAYOUTS} value={form.layout} onChange={set("layout")} />
                </Field>
              </div>
            </AccordionSection>

            <AccordionSection title="Room Features" icon={Sliders} badge={form.roomOptions.length + form.accessibilityFeatures.length || null}>
              <div className="form-grid">
                <div className="form-grid__full">
                  <Field label="Room Options" id="r-options">
                    <MultiSelectChips options={ROOM_OPTIONS} value={form.roomOptions} onChange={setList("roomOptions")} placeholder="Select room options..." />
                  </Field>
                </div>
                <div className="form-grid__full">
                  <Field label="Accessibility" id="r-accessibility">
                    <MultiSelectChips options={ACCESSIBILITY_FEATURES} value={form.accessibilityFeatures} onChange={setList("accessibilityFeatures")} placeholder="Select accessibility features..." />
                  </Field>
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="View & Location" icon={MapPin}>
              <div className="form-grid">
                <Field label="Room View" required id="r-view">
                  <Select id="r-view" options={ROOM_VIEWS} value={form.view} onChange={set("view")} />
                </Field>
                <Field label="Room Position" required id="r-position">
                  <Select id="r-position" options={ROOM_POSITIONS} value={form.roomPosition} onChange={set("roomPosition")} />
                </Field>
              </div>
            </AccordionSection>

            <AccordionSection title="Amenities" icon={Sofa} badge={form.amenities.length || null}>
              <Field label="Room Amenities" id="r-amenities">
                <MultiSelectChips options={ROOM_AMENITIES} value={form.amenities} onChange={setList("amenities")} placeholder="Select amenities..." />
              </Field>
            </AccordionSection>

            <AccordionSection title="Occupancy" icon={UsersRound}>
              <div className="form-grid">
                <Field label="Maximum Adults" required id="r-adults" error={errors.maxAdults}>
                  <Input id="r-adults" type="number" min="0" tabular value={form.maxAdults} onChange={setNum("maxAdults")} required />
                </Field>
                <Field label="Maximum Children" required id="r-children" error={errors.maxChildren}>
                  <Input id="r-children" type="number" min="0" tabular value={form.maxChildren} onChange={setNum("maxChildren")} required />
                </Field>
                <Field label="Maximum Infants" id="r-infants">
                  <Input id="r-infants" type="number" min="0" tabular value={form.maxInfants} onChange={setNum("maxInfants")} />
                </Field>
                <Field label="Maximum Occupancy" required id="r-maxocc" error={errors.maxOccupancy}>
                  <Input id="r-maxocc" type="number" min="1" tabular value={form.maxOccupancy} onChange={setNum("maxOccupancy")} required />
                </Field>
                <Field label="Base Occupancy" required id="r-baseocc" error={errors.baseOccupancy}>
                  <Input id="r-baseocc" type="number" min="1" tabular value={form.baseOccupancy} onChange={setNum("baseOccupancy")} required />
                </Field>
                <Field label="Extra Adult Allowed" id="r-extraadult">
                  <Select id="r-extraadult" options={["No", "Yes"]} value={form.extraAdultAllowed ? "Yes" : "No"} onChange={setBool("extraAdultAllowed")} />
                </Field>
                <Field label="Extra Child Allowed" id="r-extrachild">
                  <Select id="r-extrachild" options={["No", "Yes"]} value={form.extraChildAllowed ? "Yes" : "No"} onChange={setBool("extraChildAllowed")} />
                </Field>
              </div>
            </AccordionSection>

            <AccordionSection title="Room Purpose" icon={Heart} badge={form.bestSuitedFor.length || null}>
              <Field label="Best Suited For" id="r-suited">
                <MultiSelectChips options={BEST_SUITED_FOR} value={form.bestSuitedFor} onChange={setList("bestSuitedFor")} placeholder="Select best suited for..." />
              </Field>
            </AccordionSection>

            {showSuiteSection && (
              <AccordionSection title="Suite Information" icon={Crown} defaultOpen badge={form.suiteFeatures.length || null}>
                <Field label="Suite Features" id="r-suitefeatures">
                  <MultiSelectChips options={SUITE_FEATURES} value={form.suiteFeatures} onChange={setList("suiteFeatures")} placeholder="Select suite features..." />
                </Field>
              </AccordionSection>
            )}
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
