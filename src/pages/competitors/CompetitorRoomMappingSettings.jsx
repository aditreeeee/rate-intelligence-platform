import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input } from "../../components/ui/Input.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { MAPPING_TYPES } from "../../mocks/competitors.js";
import { useToast } from "../../context/ToastContext.jsx";

export function CompetitorRoomMappingSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ defaultMappingType: MAPPING_TYPES[0], confidenceThreshold: 70 });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Room mapping settings saved.");
  };

  return (
    <Card>
      <p className="settings-section__desc">Defaults for the Room Mapping module.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <div className="form-grid__full">
          <FeatureChipGrid
            label="Default Mapping Type"
            options={MAPPING_TYPES}
            value={form.defaultMappingType}
            onChange={(v) => setForm((f) => ({ ...f, defaultMappingType: v }))}
            multiple={false}
          />
        </div>
        <Field label="Confidence Threshold (mock)" id="rms-threshold" hint="Placeholder — mappings below this score would be flagged 'Needs Review' once automated matching exists.">
          <Input id="rms-threshold" type="number" min="0" max="100" tabular value={form.confidenceThreshold} onChange={(e) => setForm((f) => ({ ...f, confidenceThreshold: Number(e.target.value) }))} />
        </Field>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
