import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { CANCELLATION_POLICIES, RATE_PLAN_STATUSES } from "../../mocks/ratePlans.js";
import { useToast } from "../../context/ToastContext.jsx";

export function RatePlansSettings({ showTitle = true }) {
  const toast = useToast();
  const [defaultPolicy, setDefaultPolicy] = useState(CANCELLATION_POLICIES[0]);
  const [defaultStatus, setDefaultStatus] = useState(RATE_PLAN_STATUSES[0]);
  const [rounding, setRounding] = useState("Nearest Whole Number");

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Rate plan defaults saved.");
  };

  return (
    <Card>
      {showTitle && <h3 className="settings-section__title">Rate Plans</h3>}
      <p className="settings-section__desc">Defaults applied when a new rate plan is created.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Default Cancellation Policy" id="rps-policy">
          <Select id="rps-policy" options={CANCELLATION_POLICIES} value={defaultPolicy} onChange={(e) => setDefaultPolicy(e.target.value)} />
        </Field>
        <Field label="Default Status" id="rps-status">
          <Select id="rps-status" options={RATE_PLAN_STATUSES} value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)} />
        </Field>
        <Field label="Price Rounding" id="rps-round">
          <Select id="rps-round" options={["Nearest Whole Number", "Nearest 0.50", "No Rounding"]} value={rounding} onChange={(e) => setRounding(e.target.value)} />
        </Field>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
