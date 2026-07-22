import React, { useState, useMemo, useEffect } from "react";
import { Plus, Copy, Trash2, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { Table } from "../../components/ui/Table.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Input, Select } from "../../components/ui/Input.jsx";
import { CANCELLATION_POLICIES } from "../../mocks/ratePlans.js";
import { CURRENCIES } from "../../mocks/properties.js";
import { conflictingRowIds } from "../../lib/pricingValidation.js";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const OCCUPANCY_OPTIONS = ["", "Single", "Double", "Triple", "Quad"];
const STATUS_OPTIONS = ["Draft", "Active", "Archived"];

const COLUMNS = [
  { key: "startDate", label: "Start Date", width: 140 },
  { key: "endDate", label: "End Date", width: 140 },
  { key: "occupancy", label: "Occupancy", width: 120 },
  { key: "price", label: "Price", width: 110 },
  { key: "currency", label: "Currency", width: 90 },
  { key: "taxInclusive", label: "Tax Inclusive", width: 100 },
  { key: "taxPercent", label: "Tax %", width: 90 },
  { key: "cancellationPolicy", label: "Cancellation Policy", width: 190 },
  { key: "status", label: "Status", width: 110 },
  { key: "actions", label: "", width: 110 },
];

const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + (c.width || 160), 0);

export function blankPricingRangeRow() {
  return {
    id: `NEW-${Math.random().toString(36).slice(2, 10)}`,
    isNew: true,
    startDate: "", endDate: "", occupancy: "",
    price: "", currency: CURRENCIES[0], taxInclusive: false, taxPercent: 0,
    cancellationPolicy: CANCELLATION_POLICIES[0], status: "Draft",
  };
}

// Inline-editable Pricing Ranges grid used both inside RatePlanForm (unsaved,
// in-progress rows, scoped to one in-progress Room card) and
// RatePlanProfilePage's Rooms tab (rows are persisted immediately through
// DataContext there, scoped to one persisted Rate Plan Room). `rows`/
// `onChange` hold the working array; `onPersistedDelete` — when provided —
// is called (with a ConfirmModal) instead of a plain splice for rows that
// already exist in DataContext (i.e. not `isNew`).
export function PricingRangesTable({ rows, onChange, onPersistedDelete }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const conflicts = useMemo(() => conflictingRowIds(rows), [rows]);

  const updateRow = (id, patch) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => onChange([...rows, blankPricingRangeRow()]);

  const duplicateRow = (row) => {
    const idx = rows.findIndex((r) => r.id === row.id);
    const copy = { ...row, id: `NEW-${Math.random().toString(36).slice(2, 10)}`, isNew: true };
    const next = [...rows];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const removeRow = (row) => {
    if (!row.isNew && onPersistedDelete) {
      setConfirmDeleteId(row.id);
      return;
    }
    onChange(rows.filter((r) => r.id !== row.id));
  };

  const confirmRemovePersisted = () => {
    const row = rows.find((r) => r.id === confirmDeleteId);
    onChange(rows.filter((r) => r.id !== confirmDeleteId));
    if (row && onPersistedDelete) onPersistedDelete(row);
    setConfirmDeleteId(null);
  };

  const moveRow = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const hasConflicts = conflicts.size > 0;

  return (
    <div className="pricing-ranges-table">
      {hasConflicts && (
        <div className="pricing-ranges-table__error">
          <AlertTriangle size={14} strokeWidth={2} />
          Some Pricing Range rows have overlapping date ranges for the same occupancy. Resolve the highlighted rows before saving.
        </div>
      )}
      <Table
        columns={COLUMNS}
        data={rows}
        rowKey={(row) => row.id}
        minWidth={TABLE_MIN_WIDTH}
        emptyState={<div className="table__cell-muted" style={{ padding: 16 }}>No Pricing Range rows yet. Click "+ Add Row" to create one.</div>}
        renderRow={(row, key) => {
          const conflicted = conflicts.has(row.id);
          return (
            <tr key={key} className={conflicted ? "pricing-ranges-table__row--conflict" : ""} title={conflicted ? "Overlaps another row with the same (or Any) occupancy." : undefined}>
              <td><Input type="date" value={row.startDate || ""} onChange={(e) => updateRow(row.id, { startDate: e.target.value })} /></td>
              <td><Input type="date" value={row.endDate || ""} onChange={(e) => updateRow(row.id, { endDate: e.target.value })} /></td>
              <td>
                <Select
                  options={OCCUPANCY_OPTIONS.filter((o) => o !== "")}
                  placeholder="Any"
                  value={row.occupancy || ""}
                  onChange={(e) => updateRow(row.id, { occupancy: e.target.value })}
                />
              </td>
              <td><Input type="number" min="0" step="0.01" tabular value={row.price} onChange={(e) => updateRow(row.id, { price: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
              <td><Select options={CURRENCIES} value={row.currency} onChange={(e) => updateRow(row.id, { currency: e.target.value })} /></td>
              <td style={{ textAlign: "center" }}>
                <input type="checkbox" checked={!!row.taxInclusive} onChange={(e) => updateRow(row.id, { taxInclusive: e.target.checked })} aria-label="Tax inclusive" />
              </td>
              <td>
                <Input
                  type="number" min="0" step="0.1" tabular
                  disabled={!!row.taxInclusive}
                  value={row.taxPercent}
                  onChange={(e) => updateRow(row.id, { taxPercent: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </td>
              <td><Select options={CANCELLATION_POLICIES} value={row.cancellationPolicy} onChange={(e) => updateRow(row.id, { cancellationPolicy: e.target.value })} /></td>
              <td><Select options={STATUS_OPTIONS} value={row.status} onChange={(e) => updateRow(row.id, { status: e.target.value })} /></td>
              <td>
                <div className="table__actions">
                  <button type="button" className="table__action-btn" title="Move up" onClick={() => moveRow(rows.indexOf(row), -1)}><ChevronUp size={14} strokeWidth={2} /></button>
                  <button type="button" className="table__action-btn" title="Move down" onClick={() => moveRow(rows.indexOf(row), 1)}><ChevronDown size={14} strokeWidth={2} /></button>
                  <button type="button" className="table__action-btn" title="Duplicate row" onClick={() => duplicateRow(row)}><Copy size={14} strokeWidth={2} /></button>
                  <button type="button" className="table__action-btn table__action-btn--danger" title="Delete row" onClick={() => removeRow(row)}><Trash2 size={14} strokeWidth={2} /></button>
                </div>
              </td>
            </tr>
          );
        }}
      />
      <button type="button" className="btn btn--ghost btn--sm" onClick={addRow} style={{ marginTop: "var(--space-3)" }}>
        <Plus size={14} strokeWidth={2} /> Add Row
      </button>

      <ConfirmModal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmRemovePersisted}
        title="Delete Pricing Range Row"
        message="Permanently delete this saved Pricing Range row? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

// "Genuinely editable" wrapper wired directly to DataContext for a single
// Rate Plan Room's Pricing Ranges — the same convention RatePlanMappingTab/
// RoomMappingTab use for a profile-page tab with its own add/edit/delete UI,
// adapted for an inline grid instead of a modal-per-row. Row deletes on
// already-persisted rows go through PricingRangesTable's own ConfirmModal and
// take effect immediately; new rows / field edits / duplicates / reordering
// are staged locally and written to DataContext in one batch via "Save
// Pricing Ranges" (so a conflict can be resolved before anything is
// persisted).
export function RatePlanRoomPricingRangesEditor({ ratePlanRoomId }) {
  const data = useData();
  const toast = useToast();
  const persistedRows = data.pricingRangesForRatePlanRoom(ratePlanRoomId);
  const [rows, setRows] = useState(persistedRows);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRows(persistedRows);
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratePlanRoomId]);

  const conflicts = useMemo(() => conflictingRowIds(rows), [rows]);

  const handleChange = (next) => { setRows(next); setDirty(true); };

  const handlePersistedDelete = (row) => {
    data.deletePricingRange(row.id);
    toast.success("Pricing Range row deleted.");
  };

  const handleSave = () => {
    if (conflicts.size > 0) return;
    rows.forEach((row) => {
      const { id, isNew, ...rest } = row;
      if (isNew) {
        data.addPricingRange({ ...rest, ratePlanRoomId });
      } else {
        data.updatePricingRange({ id, ...rest, ratePlanRoomId });
      }
    });
    setDirty(false);
    toast.success("Pricing Ranges saved.");
  };

  return (
    <div>
      <PricingRangesTable rows={rows} onChange={handleChange} onPersistedDelete={handlePersistedDelete} />
      {dirty && (
        <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "flex-end" }}>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={conflicts.size > 0}>
            Save Pricing Ranges
          </Button>
        </div>
      )}
    </div>
  );
}
