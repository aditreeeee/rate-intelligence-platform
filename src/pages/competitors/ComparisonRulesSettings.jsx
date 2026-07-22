import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input } from "../../components/ui/Input.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useToast } from "../../context/ToastContext.jsx";

// Configuration Readiness's "Minimum Competitors" check is driven by a fixed
// constant in lib/competitorReadiness.js today; this settings screen is the
// intended future home for that threshold once it needs to be tenant-
// configurable rather than a shared constant.
export function ComparisonRulesSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ minCompetitors: 2, requireBenchmarkLock: false });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Comparison rules saved.");
  };

  return (
    <Card>
      <p className="settings-section__desc">Rules the Validation Center's readiness checklist is measured against.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Minimum Competitors" id="crs-min" hint="Comparison groups below this count fail the readiness check.">
          <Input id="crs-min" type="number" min="1" tabular value={form.minCompetitors} onChange={(e) => setForm((f) => ({ ...f, minCompetitors: Number(e.target.value) }))} />
        </Field>
        <div className="form-grid__full">
          <FeatureChipGrid
            label="Require Benchmark Lock Before Ready"
            options={["No", "Yes"]}
            value={form.requireBenchmarkLock ? "Yes" : "No"}
            onChange={(v) => setForm((f) => ({ ...f, requireBenchmarkLock: v === "Yes" }))}
            multiple={false}
            hint="When enabled, a group can't reach 100% readiness until its benchmark is locked."
          />
        </div>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
