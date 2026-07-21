import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { TagPicker } from "../../components/ui/TagChips.jsx";
import { STATUSES, PROPERTY_TAGS } from "../../mocks/properties.js";
import { useToast } from "../../context/ToastContext.jsx";

export function PropertiesSettings({ showTitle = true }) {
  const toast = useToast();
  const [defaultStatus, setDefaultStatus] = useState("Draft");
  const [requireApproval, setRequireApproval] = useState("Yes");
  const [defaultTags, setDefaultTags] = useState(["Business"]);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Property defaults saved.");
  };

  return (
    <Card>
      {showTitle && <h3 className="settings-section__title">Properties</h3>}
      <p className="settings-section__desc">Defaults applied when a new property is created.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Default Status for New Properties" id="ps-status">
          <Select id="ps-status" options={STATUSES} value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)} />
        </Field>
        <Field label="Require Approval Before Activation" id="ps-approval">
          <Select id="ps-approval" options={["Yes", "No"]} value={requireApproval} onChange={(e) => setRequireApproval(e.target.value)} />
        </Field>
        <div className="form-grid__full">
          <Field label="Default Tags" id="ps-tags">
            <TagPicker options={PROPERTY_TAGS} value={defaultTags} onChange={setDefaultTags} />
          </Field>
        </div>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
