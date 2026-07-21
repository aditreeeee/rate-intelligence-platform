import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { CURRENCIES, TIME_ZONES } from "../../mocks/properties.js";
import { useToast } from "../../context/ToastContext.jsx";

const DATE_FORMATS = ["DD MMM YYYY", "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];

export function GeneralSettings() {
  const toast = useToast();
  const [form, setForm] = useState({
    orgName: "eGlobe Solutions",
    defaultCurrency: CURRENCIES[0],
    defaultTimeZone: TIME_ZONES[0],
    dateFormat: DATE_FORMATS[0],
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("General settings saved.");
  };

  return (
    <Card>
      <p className="settings-section__desc">Organization-wide defaults applied across the platform.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Organization Name" id="gs-org">
          <Input id="gs-org" value={form.orgName} onChange={set("orgName")} />
        </Field>
        <Field label="Default Date Format" id="gs-date">
          <Select id="gs-date" options={DATE_FORMATS} value={form.dateFormat} onChange={set("dateFormat")} />
        </Field>
        <Field label="Default Currency" id="gs-currency">
          <Select id="gs-currency" options={CURRENCIES} value={form.defaultCurrency} onChange={set("defaultCurrency")} />
        </Field>
        <Field label="Default Time Zone" id="gs-tz">
          <Select id="gs-tz" options={TIME_ZONES} value={form.defaultTimeZone} onChange={set("defaultTimeZone")} />
        </Field>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
