import React, { useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field } from "../../components/ui/Input.jsx";
import { FeatureChipGrid } from "../../components/ui/FeatureChipGrid.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { MasterDataManager } from "../../components/ui/MasterDataManager.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { PRIORITY_LEVELS } from "../../mocks/competitors.js";

// Source Types themselves are edited through the shared MasterDataManager
// (kind="sourceTypes") — the same generic add/rename/delete UI Room Types
// and Amenities use — so "users should be able to create additional source
// types later" needs no bespoke UI here.
export function CompetitorSourceSettings() {
  const data = useData();
  const toast = useToast();
  const sourceTypes = data.masters.sourceTypes || [];
  const [defaultPriority, setDefaultPriority] = useState("Medium");
  const [manageOpen, setManageOpen] = useState(false);
  const [requireHttps, setRequireHttps] = useState(true);
  const [flagDuplicates, setFlagDuplicates] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Source and URL validation settings saved.");
  };

  return (
    <>
    <Card>
      <p className="settings-section__desc">Manage the list of collection source types and defaults for new sources.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <div className="form-grid__full">
          <Field label="Source Types" id="ss-types" hint={`${sourceTypes.length} configured — Direct Website, Booking.com, Expedia, Agoda, Hotels.com, Google Hotels by default.`}>
            <Button type="button" variant="secondary" size="sm" icon={Settings2} onClick={() => setManageOpen(true)}>Manage Source Types</Button>
          </Field>
        </div>
        <div className="form-grid__full">
          <FeatureChipGrid label="Default Priority" options={PRIORITY_LEVELS} value={defaultPriority} onChange={setDefaultPriority} multiple={false} />
        </div>

        <div className="form-grid__full" style={{ marginTop: "var(--space-2)" }}>
          <div className="config-summary__section-title"><span className="config-summary__section-title-text">URL Validation</span></div>
        </div>
        <div className="form-grid__full">
          <FeatureChipGrid
            label="Require HTTPS"
            options={["No", "Yes"]}
            value={requireHttps ? "Yes" : "No"}
            onChange={(v) => setRequireHttps(v === "Yes")}
            multiple={false}
            hint="Flag any Website, OTA, Source, or Custom URL that doesn't start with https:// as invalid."
          />
        </div>
        <div className="form-grid__full">
          <FeatureChipGrid
            label="Flag Duplicate URLs"
            options={["No", "Yes"]}
            value={flagDuplicates ? "Yes" : "No"}
            onChange={(v) => setFlagDuplicates(v === "Yes")}
            multiple={false}
            hint="Used by the URL Manager tab's duplicate detection on every competitor."
          />
        </div>

        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
    <MasterDataManager open={manageOpen} onClose={() => setManageOpen(false)} kind="sourceTypes" label="Source Types" />
    </>
  );
}
