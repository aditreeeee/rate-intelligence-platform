import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { Modal } from "./Modal.jsx";
import { Checkbox } from "./Checkbox.jsx";
import { FilterAccordionSection, CheckboxListFilter, FilterPanelFrame } from "./FilterSection.jsx";
import { usePersistedState } from "../../hooks/usePersistedState.js";
import { COMPARISON_GROUP_TAGS } from "../../mocks/competitors.js";

// Left filter panel for the Comparison Groups (Phase 2 homepage) list page —
// same composition as PropertyFilterPanel (Rooms) and PropertyRoomTreeFilter
// (Rate Plans): a fixed-width in-flow panel on desktop, a drawer+Modal on
// narrow viewports, built entirely from the shared FilterSection primitives.
// Property selection here reuses the same global PropertyContext Rooms/Rate
// Plans already use, so switching properties anywhere in the app instantly
// re-scopes every Phase 2 module without a second, competing selection model.
function PanelBody({ getCount, tagFilter, setTagFilter }) {
  const data = useData();
  const { selectedPropertyIds, setSelectedPropertyIds } = usePropertyContext();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = usePersistedState("competitors.filterPanel.expanded", {
    properties: true,
    tags: false,
  });
  const toggleSection = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.properties;
    return data.properties.filter((p) => [p.name, p.city].some((f) => String(f || "").toLowerCase().includes(q)));
  }, [query, data.properties]);

  const toggleProperty = (id) => {
    setSelectedPropertyIds(
      selectedPropertyIds.includes(id)
        ? selectedPropertyIds.filter((pid) => pid !== id)
        : [...selectedPropertyIds, id]
    );
  };

  const selectAll = () => setSelectedPropertyIds(data.properties.map((p) => p.id));
  const clearAllProperties = () => setSelectedPropertyIds([]);
  const allSelected = data.properties.length > 0 && selectedPropertyIds.length === data.properties.length;

  const propertyName = (id) => data.properties.find((p) => p.id === id)?.name || id;

  const chips = [
    ...selectedPropertyIds.map((id) => ({
      key: `p-${id}`,
      label: propertyName(id),
      onRemove: () => setSelectedPropertyIds(selectedPropertyIds.filter((pid) => pid !== id)),
    })),
    ...tagFilter.map((t) => ({
      key: `tag-${t}`,
      label: t,
      onRemove: () => setTagFilter(tagFilter.filter((v) => v !== t)),
    })),
  ];

  const resetAll = () => {
    setSelectedPropertyIds([]);
    setTagFilter([]);
  };

  return (
    <FilterPanelFrame chips={chips} onResetAll={resetAll}>
      <FilterAccordionSection title="Properties" open={expanded.properties} onToggle={() => toggleSection("properties")}>
        <div className="filter-card__subrow">
          <div className="filter-card__subrow-actions">
            <button type="button" className="filter-card__link" onClick={selectAll} disabled={allSelected}>
              Select All
            </button>
            <span className="filter-card__link-sep">·</span>
            <button type="button" className="filter-card__link" onClick={clearAllProperties} disabled={selectedPropertyIds.length === 0}>
              Clear All
            </button>
          </div>
        </div>

        <div className="filter-checklist">
          <div className="filter-checklist__search">
            <Search size={13} strokeWidth={2} className="filter-checklist__search-icon" />
            <input
              className="filter-checklist__search-input"
              placeholder="Search properties..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="filter-checklist__search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>

          <div className="filter-checklist__options">
            {filtered.length === 0 && <div className="property-panel__empty">No matches for "{query}".</div>}
            {filtered.map((p) => {
              const checked = selectedPropertyIds.includes(p.id);
              const count = getCount ? getCount(p.id) : null;
              return (
                <div key={p.id} className={`filter-checklist__item ${checked ? "filter-checklist__item--checked" : ""}`} onClick={() => toggleProperty(p.id)}>
                  <Checkbox checked={checked} onChange={() => toggleProperty(p.id)} label={`Select ${p.name}`} />
                  <span className="filter-checklist__item-label">{p.name}</span>
                  {count !== null && count !== undefined && (
                    <span className="property-panel__item-badge tabular">{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </FilterAccordionSection>

      <FilterAccordionSection title="Tags" open={expanded.tags} onToggle={() => toggleSection("tags")}>
        <CheckboxListFilter options={COMPARISON_GROUP_TAGS} selected={tagFilter} onChange={setTagFilter} />
      </FilterAccordionSection>
    </FilterPanelFrame>
  );
}

export function ComparisonGroupFilterPanel({ getCount, tagFilter, setTagFilter }) {
  const { selectedPropertyIds } = usePropertyContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const totalActive = selectedPropertyIds.length + tagFilter.length;

  const bodyProps = { getCount, tagFilter, setTagFilter };

  return (
    <>
      <aside className="property-panel">
        <PanelBody {...bodyProps} />
      </aside>

      <button type="button" className="property-panel__drawer-trigger" onClick={() => setDrawerOpen(true)}>
        <SlidersHorizontal size={15} strokeWidth={2} />
        <span>Filters</span>
        {totalActive > 0 && <span className="property-panel__drawer-badge tabular">{totalActive}</span>}
      </button>

      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" size="sm">
        <div className="property-panel property-panel--drawer">
          <PanelBody {...bodyProps} />
        </div>
      </Modal>
    </>
  );
}
