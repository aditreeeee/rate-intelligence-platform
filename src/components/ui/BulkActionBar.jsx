import React from "react";
import { Archive, Copy, Trash2, X, RefreshCcw, RotateCcw } from "lucide-react";
import { Select } from "./Input.jsx";

export function BulkActionBar({
  count, onClear, onArchive, onRestore, onDuplicate, onDelete, statusOptions, onChangeStatus, archived = false, canDelete = true,
}) {
  if (!count) return null;
  return (
    <div className="bulk-bar" role="toolbar" aria-label="Bulk actions">
      <div className="bulk-bar__count">
        <span className="tabular">{count}</span> selected
      </div>
      <div className="bulk-bar__divider" />
      <div className="bulk-bar__actions">
        {statusOptions && !archived && (
          <div className="bulk-bar__select">
            <RefreshCcw size={14} strokeWidth={2} />
            <Select
              options={statusOptions}
              placeholder="Change Status"
              onChange={(e) => e.target.value && onChangeStatus(e.target.value)}
              value=""
            />
          </div>
        )}
        <button className="bulk-bar__btn" onClick={onDuplicate}>
          <Copy size={14} strokeWidth={2} /> Duplicate
        </button>
        {archived ? (
          <button className="bulk-bar__btn" onClick={onRestore}>
            <RotateCcw size={14} strokeWidth={2} /> Restore
          </button>
        ) : (
          <button className="bulk-bar__btn" onClick={onArchive}>
            <Archive size={14} strokeWidth={2} /> Archive
          </button>
        )}
        {canDelete && (
          <button className="bulk-bar__btn bulk-bar__btn--danger" onClick={onDelete}>
            <Trash2 size={14} strokeWidth={2} /> {archived ? "Delete Permanently" : "Delete"}
          </button>
        )}
      </div>
      <button className="bulk-bar__clear" onClick={onClear} aria-label="Clear selection">
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
