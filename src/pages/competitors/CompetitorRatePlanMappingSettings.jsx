import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { MEAL_PLANS, mealPlanLabel } from "../../mocks/ratePlans.js";
import { CURRENCIES } from "../../mocks/properties.js";
import { useToast } from "../../context/ToastContext.jsx";

export function CompetitorRatePlanMappingSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ defaultMealPlan: MEAL_PLANS[0], defaultCurrency: CURRENCIES[0] });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Rate plan mapping settings saved.");
  };

  return (
    <Card>
      <p className="settings-section__desc">Defaults for the Rate Plan Mapping module.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Default Meal Plan" id="rpms-meal" hint={mealPlanLabel(form.defaultMealPlan)}>
          <Select id="rpms-meal" options={MEAL_PLANS} value={form.defaultMealPlan} onChange={set("defaultMealPlan")} />
        </Field>
        <Field label="Default Currency" id="rpms-currency">
          <Select id="rpms-currency" options={CURRENCIES} value={form.defaultCurrency} onChange={set("defaultCurrency")} />
        </Field>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
