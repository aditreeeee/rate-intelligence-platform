import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { CURRENCIES } from "../../mocks/properties.js";
import { PRIORITY_LEVELS } from "../../mocks/competitors.js";
import { useToast } from "../../context/ToastContext.jsx";

export function CompetitorGeneralSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ defaultCurrency: CURRENCIES[0], defaultPriority: "Medium" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Competitor configuration defaults saved.");
  };

  return (
    <Card>
      <p className="settings-section__desc">Defaults applied when creating new Competitive Sets and Competitors.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Default Currency" id="cgs-currency" hint="Used to prefill Rate Plan Mapping's currency field.">
          <Select id="cgs-currency" options={CURRENCIES} value={form.defaultCurrency} onChange={set("defaultCurrency")} />
        </Field>
        <Field label="Default Priority" id="cgs-priority" hint="Applied to new competitors and mappings.">
          <Select id="cgs-priority" options={PRIORITY_LEVELS} value={form.defaultPriority} onChange={set("defaultPriority")} />
        </Field>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
