import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { Modal } from "./Modal.jsx";

// Page-level property filter for Rooms / Rate Plans. Sits between the global
// Sidebar nav and the page content, replacing the Topbar's global property
// selector for these two property-scoped pages. Reads/writes the same
// PropertyContext, so navigating to any page that still uses the Topbar
// selector sees the same selection.
//
// `getCount(propertyId)` lets each page show a contextually relevant badge
// (room count on Rooms, rate-plan count on Rate Plans) without this
// component knowing about rooms/rate plans directly.
function PanelBody({ getCount }) {
  const data = useData();
  const { selectedPropertyIds, setSelectedPropertyIds } = usePropertyContext();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.properties;
    return data.properties.filter((p) => [p.name, p.city].some((f) => String(f || "").toLowerCase().includes(q)));
  }, [query, data.properties]);

  const toggle = (id) => {
    setSelectedPropertyIds(
      selectedPropertyIds.includes(id)
        ? selectedPropertyIds.filter((pid) => pid !== id)
        : [...selectedPropertyIds, id]
    );
  };

  const selectAll = () => setSelectedPropertyIds(data.properties.map((p) => p.id));
  const clearAll = () => setSelectedPropertyIds([]);
  const allSelected = data.properties.length > 0 && selectedPropertyIds.length === data.properties.length;

  return (
    <>
      <div className="property-panel__header">
        <span className="property-panel__count">{selectedPropertyIds.length} selected</span>
        <div className="property-panel__quick-actions">
          <button type="button" className="property-panel__quick-btn" onClick={selectAll} disabled={allSelected}>
            Select All
          </button>
          <span className="property-panel__quick-sep">·</span>
          <button type="button" className="property-panel__quick-btn" onClick={clearAll} disabled={selectedPropertyIds.length === 0}>
            Clear All
          </button>
        </div>
      </div>

      <div className="property-panel__search">
        <Search size={14} strokeWidth={2} className="property-panel__search-icon" />
        <input
          className="property-panel__search-input"
          placeholder="Search properties..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="property-panel__search-clear" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="property-panel__list">
        {filtered.length === 0 && <div className="property-panel__empty">No matches for "{query}".</div>}
        {filtered.map((p) => {
          const checked = selectedPropertyIds.includes(p.id);
          const count = getCount ? getCount(p.id) : null;
          return (
            <label key={p.id} className={`property-panel__item ${checked ? "property-panel__item--checked" : ""}`}>
              <input
                type="checkbox"
                className="property-panel__item-checkbox"
                checked={checked}
                onChange={() => toggle(p.id)}
              />
              <span className="property-panel__item-name">{p.name}</span>
              {count !== null && count !== undefined && (
                <span className="property-panel__item-badge tabular">{count}</span>
              )}
            </label>
          );
        })}
      </div>
    </>
  );
}

export function PropertyFilterPanel({ getCount }) {
  const { selectedPropertyIds } = usePropertyContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop / tablet: sticky in-flow panel */}
      <aside className="property-panel">
        <PanelBody getCount={getCount} />
      </aside>

      {/* Narrow viewports: trigger + slide-out drawer, reusing the existing Modal */}
      <button type="button" className="property-panel__drawer-trigger" onClick={() => setDrawerOpen(true)}>
        <SlidersHorizontal size={15} strokeWidth={2} />
        <span>Filter Properties</span>
        {selectedPropertyIds.length > 0 && (
          <span className="property-panel__drawer-badge tabular">{selectedPropertyIds.length}</span>
        )}
      </button>

      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filter Properties" size="sm">
        <div className="property-panel property-panel--drawer">
          <PanelBody getCount={getCount} />
        </div>
      </Modal>
    </>
  );
}
