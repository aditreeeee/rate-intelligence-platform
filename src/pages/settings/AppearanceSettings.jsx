import React from "react";
import { Check, RotateCcw } from "lucide-react";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Select } from "../../components/ui/Input.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useAppearance, ACCENTS, DENSITIES } from "../../context/AppearanceContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export function AppearanceSettings() {
  const { density, accent, setDensity, setAccent, resetAppearance } = useAppearance();
  const toast = useToast();

  return (
    <Card>
      <p className="settings-section__desc">Personalize density and accent color. Applies instantly across the app and is remembered on this device.</p>
      <div className="form-grid" style={{ marginTop: "var(--space-5)" }}>
        <Field label="Table Density" id="as-density" hint="Compact tightens row spacing across all tables.">
          <Select
            id="as-density"
            options={DENSITIES}
            value={density}
            onChange={(e) => { setDensity(e.target.value); toast.success(`Density set to ${e.target.value}.`); }}
          />
        </Field>
        <div className="form-grid__full">
          <Field label="Accent Color" id="as-accent">
            <div className="accent-picker">
              {ACCENTS.map((a) => (
                <button
                  type="button"
                  key={a.value}
                  className="accent-swatch"
                  style={{ background: a.value }}
                  onClick={() => { setAccent(a.value); toast.success(`Accent set to ${a.name}.`); }}
                  aria-label={a.name}
                  aria-pressed={accent === a.value}
                  title={a.name}
                >
                  {accent === a.value && <Check size={16} strokeWidth={3} color="white" />}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="ghost"
          size="md"
          icon={RotateCcw}
          type="button"
          onClick={() => { resetAppearance(); toast.info("Appearance reset to defaults."); }}
        >
          Reset to Defaults
        </Button>
      </div>
    </Card>
  );
}
