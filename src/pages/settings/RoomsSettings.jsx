import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Select, Input } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { ROOM_STATUSES } from "../../mocks/rooms.js";
import { BED_CONFIGURATIONS } from "../../mocks/roomClassification.js";
import { useToast } from "../../context/ToastContext.jsx";

export function RoomsSettings({ showTitle = true }) {
  const toast = useToast();
  const [defaultBedType, setDefaultBedType] = useState(BED_CONFIGURATIONS[0]);
  const [defaultStatus, setDefaultStatus] = useState(ROOM_STATUSES[0]);
  const [maxOccupancy, setMaxOccupancy] = useState(6);

  const handleSave = (e) => {
    e.preventDefault();
    toast.success("Room defaults saved.");
  };

  return (
    <Card>
      {showTitle && <h3 className="settings-section__title">Rooms</h3>}
      <p className="settings-section__desc">Defaults applied when a new room is created.</p>
      <form onSubmit={handleSave} className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Default Bed Configuration" id="rs-bed">
          <Select id="rs-bed" options={BED_CONFIGURATIONS} value={defaultBedType} onChange={(e) => setDefaultBedType(e.target.value)} />
        </Field>
        <Field label="Default Status" id="rs-status">
          <Select id="rs-status" options={ROOM_STATUSES} value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)} />
        </Field>
        <Field label="Platform Max Occupancy" id="rs-max">
          <Input id="rs-max" type="number" min="1" tabular value={maxOccupancy} onChange={(e) => setMaxOccupancy(Number(e.target.value))} />
        </Field>
        <div className="form-grid__full" style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="md" icon={Save} type="submit">Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}
