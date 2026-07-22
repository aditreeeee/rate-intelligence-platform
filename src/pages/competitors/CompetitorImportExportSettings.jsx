import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Select } from "../../components/ui/Input.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const EXPORT_FORMATS = ["CSV", "Excel"];

// Defaults for the Import Wizard and Export Menu when used from any
// Competitor Configuration list (Competitors, Comparison Groups). Purely
// frontend preferences today — the seam a real .NET import/export
// endpoint would read the same defaults from later.
export function CompetitorImportExportSettings() {
  const toast = useToast();
  const [defaultFormat, setDefaultFormat] = useState(EXPORT_FORMATS[0]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Import & export preferences saved.");
  };

  return (
    <Card>
      <p className="settings-section__desc">Defaults applied when importing or exporting competitor data.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Default Export Format" id="ies-format">
          <Select id="ies-format" options={EXPORT_FORMATS} value={defaultFormat} onChange={(e) => setDefaultFormat(e.target.value)} />
        </Field>
        <div className="form-grid__full">
          <FeatureChipGrid
            label="Include Archived Records in Export"
            options={["No", "Yes"]}
            value={includeArchived ? "Yes" : "No"}
            onChange={(v) => setIncludeArchived(v === "Yes")}
            multiple={false}
          />
        </div>
        <div className="form-grid__full">
          <FeatureChipGrid
            label="Skip Invalid Rows on Import"
            options={["No", "Yes"]}
            value={skipInvalidRows ? "Yes" : "No"}
            onChange={(v) => setSkipInvalidRows(v === "Yes")}
            multiple={false}
            hint="When off, an import with any invalid row is blocked entirely instead of importing the valid rows only."
          />
        </div>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
