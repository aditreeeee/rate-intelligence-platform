import React, { useState, useCallback } from "react";
import {
  Building2, BedDouble, Tag, Target, Link2, UploadCloud, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const ENTITY_TYPES = [
  { key: "properties", label: "Properties", icon: Building2, requiredFields: ["name", "country", "city"] },
  { key: "rooms", label: "Rooms", icon: BedDouble, requiredFields: ["name", "roomType"] },
  { key: "ratePlans", label: "Rate Plans", icon: Tag, requiredFields: ["name"] },
  { key: "competitors", label: "Competitors", icon: Target, requiredFields: ["hotelName", "country", "city"] },
  { key: "competitorUrls", label: "URLs", icon: Link2, requiredFields: ["label", "url"] },
  { key: "roomMapping", label: "Room Mapping", icon: BedDouble, requiredFields: ["internalRoomId", "competitorRoomLabel"] },
  { key: "ratePlanMapping", label: "Rate Plan Mapping", icon: Tag, requiredFields: ["internalRatePlanId", "competitorRatePlanName"] },
];

const STEP_LABELS = ["Select Type", "Upload File", "Validate", "Preview & Confirm"];

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

// Canned preview used for non-CSV files: no xlsx-parsing library is bundled
// (no-new-dependency constraint), so a real .xlsx upload is simulated with a
// short "parsing" delay and this fixed sample payload.
const CANNED_EXCEL_ROWS = [
  { name: "Sample Row 1", country: "United States", city: "Austin", roomType: "Deluxe", basePrice: "199" },
  { name: "Sample Row 2", country: "United States", city: "Denver", roomType: "Superior", basePrice: "159" },
  { name: "Sample Row 3 (incomplete)", country: "", city: "", roomType: "", basePrice: "" },
];

export function ImportWizard({ open, onClose, defaultEntityType = "properties" }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [entityType, setEntityType] = useState(defaultEntityType);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [parsing, setParsing] = useState(false);

  const entity = ENTITY_TYPES.find((e) => e.key === entityType) || ENTITY_TYPES[0];

  const reset = useCallback(() => {
    setStep(0);
    setFileName("");
    setRows([]);
    setParsing(false);
    setEntityType(defaultEntityType);
  }, [defaultEntityType]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file) => {
    setFileName(file.name);
    if (/\.csv$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = () => {
        setRows(parseCSV(String(reader.result || "")));
        setStep(2);
      };
      reader.readAsText(file);
    } else {
      setParsing(true);
      setTimeout(() => {
        setRows(CANNED_EXCEL_ROWS);
        setParsing(false);
        setStep(2);
      }, 700);
    }
  };

  const validated = rows.map((row, i) => {
    const missing = entity.requiredFields.filter((f) => !row[f]);
    return { row, index: i, valid: missing.length === 0, missing };
  });
  const validCount = validated.filter((v) => v.valid).length;
  const errorCount = validated.length - validCount;

  // Single seam for later backend integration: swap this handler for a call
  // to the real .NET import endpoint (e.g. POST /api/{entityType}/import)
  // with the validated rows, then surface the server's row-level result.
  const handleConfirmImport = () => {
    toast.success(
      `${validCount} ${entity.label.toLowerCase()} ready to import. (Demo only — no backend connected yet.)`
    );
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Wizard"
      size="lg"
      footer={
        <>
          {step > 0 && step < 3 && (
            <button className="btn btn--ghost btn--md" type="button" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={15} strokeWidth={2} /> Back
            </button>
          )}
          <button className="btn btn--ghost btn--md" type="button" onClick={handleClose}>Cancel</button>
          {step === 0 && (
            <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right" onClick={() => setStep(1)}>Next</Button>
          )}
          {step === 2 && (
            <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right" onClick={() => setStep(3)} disabled={!rows.length}>Next</Button>
          )}
          {step === 3 && (
            <Button variant="primary" size="md" icon={CheckCircle2} onClick={handleConfirmImport} disabled={!validCount}>Confirm Import</Button>
          )}
        </>
      }
    >
      <div className="wizard-steps">
        {STEP_LABELS.map((s, i) => (
          <div
            key={s}
            className={`wizard-steps__item ${i === step ? "wizard-steps__item--active" : ""} ${i < step ? "wizard-steps__item--done" : ""}`}
          >
            <span className="wizard-steps__dot">{i < step ? <CheckCircle2 size={13} strokeWidth={2} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="wizard-entity-grid">
          {ENTITY_TYPES.map((e) => (
            <button
              key={e.key}
              type="button"
              className={`wizard-entity-card ${entityType === e.key ? "wizard-entity-card--active" : ""}`}
              onClick={() => setEntityType(e.key)}
            >
              <e.icon size={22} strokeWidth={2} />
              <span>Import {e.label}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="wizard-upload">
          <label className="wizard-upload__zone">
            <UploadCloud size={28} strokeWidth={1.5} />
            <span>{parsing ? "Parsing file..." : "Click to choose a CSV or Excel file"}</span>
            <span className="wizard-upload__hint">.csv, .xlsx, .xls — client-side preview only, nothing is saved</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              disabled={parsing}
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />
          </label>
          {fileName && <div className="wizard-upload__filename">Selected: {fileName}</div>}
        </div>
      )}

      {step === 2 && (
        <div className="wizard-validate">
          <div className="wizard-validate__summary">
            <span className="wizard-validate__ok"><CheckCircle2 size={14} strokeWidth={2} /> {validCount} valid</span>
            <span className="wizard-validate__err"><AlertTriangle size={14} strokeWidth={2} /> {errorCount} with errors</span>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th className="table__th">Row</th>
                  {entity.requiredFields.map((f) => <th className="table__th" key={f}>{f}</th>)}
                  <th className="table__th">Status</th>
                </tr>
              </thead>
              <tbody>
                {validated.map((v) => (
                  <tr key={v.index}>
                    <td className="tabular">{v.index + 1}</td>
                    {entity.requiredFields.map((f) => (
                      <td key={f}>{v.row[f] || <em style={{ color: "var(--color-danger)" }}>missing</em>}</td>
                    ))}
                    <td>
                      {v.valid ? (
                        <span className="wizard-validate__ok">Valid</span>
                      ) : (
                        <span className="wizard-validate__err">Missing {v.missing.join(", ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-confirm">
          <CheckCircle2 size={32} strokeWidth={1.5} className="wizard-confirm__icon" />
          <p>
            <strong>{validCount}</strong> {entity.label.toLowerCase()} are ready to import.
            {errorCount > 0 && ` ${errorCount} row(s) with errors will be skipped.`}
          </p>
          <p className="wizard-confirm__note">
            This is a frontend-only preview — nothing is saved yet. Confirming here is the seam that will call the
            real import API once the .NET backend is available.
          </p>
        </div>
      )}
    </Modal>
  );
}
