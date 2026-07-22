import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { Modal } from "./Modal.jsx";
import { Checkbox } from "./Checkbox.jsx";
import { FilterAccordionSection, CheckboxListFilter, FilterPanelFrame } from "./FilterSection.jsx";
import { usePersistedState } from "../../hooks/usePersistedState.js";
import { COMPETITOR_STATUSES } from "../../mocks/competitors.js";

const READINESS_BUCKETS = ["Ready", "Needs Attention", "Not Ready"];

// Left filter panel for the Competitors page (the Phase 2 primary
// workflow) — deliberately kept to only the facets used in daily workflow:
// Property, Competitive Sets (optional), Status, and Configuration
// Readiness. Brand/City/Star Rating/Benchmark/Priority/Tags were removed as
// filters (they're still visible as table columns and editable fields —
// just not filterable here) to keep the panel scannable. Same composition
// as PropertyFilterPanel/PropertyRoomTreeFilter: a fixed in-flow panel on
// desktop, a drawer+Modal on narrow viewports, built entirely from the
// shared FilterSection primitives.
function PanelBody({ getCount, groupOptions, groupFilter, setGroupFilter, statusFilter, setStatusFilter, readinessFilter, setReadinessFilter }) {
  const data = useData();
  const { selectedPropertyIds, setSelectedPropertyIds } = usePropertyContext();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = usePersistedState("competitors.filterPanel.expanded", {
    properties: true, groups: false, status: false, readiness: false,
  });
  const toggleSection = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const filteredProperties = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.properties;
    return data.properties.filter((p) => [p.name, p.city].some((f) => String(f || "").toLowerCase().includes(q)));
  }, [query, data.properties]);

  const toggleProperty = (id) => {
    setSelectedPropertyIds(
      selectedPropertyIds.includes(id) ? selectedPropertyIds.filter((pid) => pid !== id) : [...selectedPropertyIds, id]
    );
  };
  const selectAll = () => setSelectedPropertyIds(data.properties.map((p) => p.id));
  const clearAllProperties = () => setSelectedPropertyIds([]);
  const allSelected = data.properties.length > 0 && selectedPropertyIds.length === data.properties.length;
  const propertyName = (id) => data.properties.find((p) => p.id === id)?.name || id;

  const chips = [
    ...selectedPropertyIds.map((id) => ({ key: `p-${id}`, label: propertyName(id), onRemove: () => setSelectedPropertyIds(selectedPropertyIds.filter((pid) => pid !== id)) })),
    ...groupFilter.map((id) => ({ key: `g-${id}`, label: groupOptions.find((g) => g.id === id)?.name || id, onRemove: () => setGroupFilter(groupFilter.filter((v) => v !== id)) })),
    ...statusFilter.map((s) => ({ key: `st-${s}`, label: s, onRemove: () => setStatusFilter(statusFilter.filter((v) => v !== s)) })),
    ...readinessFilter.map((r) => ({ key: `rd-${r}`, label: r, onRemove: () => setReadinessFilter(readinessFilter.filter((v) => v !== r)) })),
  ];

  const resetAll = () => {
    setSelectedPropertyIds([]);
    setGroupFilter([]); setStatusFilter([]); setReadinessFilter([]);
  };

  return (
    <FilterPanelFrame chips={chips} onResetAll={resetAll}>
      <FilterAccordionSection title="Properties" open={expanded.properties} onToggle={() => toggleSection("properties")}>
        <div className="filter-card__subrow">
          <div className="filter-card__subrow-actions">
            <button type="button" className="filter-card__link" onClick={selectAll} disabled={allSelected}>Select All</button>
            <span className="filter-card__link-sep">·</span>
            <button type="button" className="filter-card__link" onClick={clearAllProperties} disabled={selectedPropertyIds.length === 0}>Clear All</button>
          </div>
        </div>
        <div className="filter-checklist">
          <div className="filter-checklist__search">
            <Search size={13} strokeWidth={2} className="filter-checklist__search-icon" />
            <input className="filter-checklist__search-input" placeholder="Search properties..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button type="button" className="filter-checklist__search-clear" onClick={() => setQuery("")} aria-label="Clear search"><X size={12} strokeWidth={2} /></button>}
          </div>
          <div className="filter-checklist__options">
            {filteredProperties.length === 0 && <div className="property-panel__empty">No matches for "{query}".</div>}
            {filteredProperties.map((p) => {
              const checked = selectedPropertyIds.includes(p.id);
              const count = getCount ? getCount(p.id) : null;
              return (
                <div key={p.id} className={`filter-checklist__item ${checked ? "filter-checklist__item--checked" : ""}`} onClick={() => toggleProperty(p.id)}>
                  <Checkbox checked={checked} onChange={() => toggleProperty(p.id)} label={`Select ${p.name}`} />
                  <span className="filter-checklist__item-label">{p.name}</span>
                  {count !== null && count !== undefined && <span className="property-panel__item-badge tabular">{count}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </FilterAccordionSection>

      <FilterAccordionSection title="Competitive Sets" open={expanded.groups} onToggle={() => toggleSection("groups")}>
        {groupOptions.length === 0 ? (
          <div className="property-panel__empty">No competitive sets yet — optional, competitors work fine without one.</div>
        ) : (
          <div className="filter-checklist">
            <div className="filter-checklist__options">
              {groupOptions.map((g) => {
                const checked = groupFilter.includes(g.id);
                const toggle = () => setGroupFilter(checked ? groupFilter.filter((v) => v !== g.id) : [...groupFilter, g.id]);
                return (
                  <div key={g.id} className={`filter-checklist__item ${checked ? "filter-checklist__item--checked" : ""}`} onClick={toggle}>
                    <Checkbox checked={checked} onChange={toggle} label={g.name} />
                    <span className="filter-checklist__item-label">{g.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </FilterAccordionSection>

      <FilterAccordionSection title="Status" open={expanded.status} onToggle={() => toggleSection("status")}>
        <CheckboxListFilter options={COMPETITOR_STATUSES} selected={statusFilter} onChange={setStatusFilter} />
      </FilterAccordionSection>

      <FilterAccordionSection title="Configuration Readiness" open={expanded.readiness} onToggle={() => toggleSection("readiness")}>
        <CheckboxListFilter options={READINESS_BUCKETS} selected={readinessFilter} onChange={setReadinessFilter} />
      </FilterAccordionSection>
    </FilterPanelFrame>
  );
}

export function CompetitorFilterPanel(props) {
  const { selectedPropertyIds } = usePropertyContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const totalActive = selectedPropertyIds.length + props.groupFilter.length + props.statusFilter.length + props.readinessFilter.length;

  return (
    <>
      <aside className="property-panel">
        <PanelBody {...props} />
      </aside>

      <button type="button" className="property-panel__drawer-trigger" onClick={() => setDrawerOpen(true)}>
        <SlidersHorizontal size={15} strokeWidth={2} />
        <span>Filters</span>
        {totalActive > 0 && <span className="property-panel__drawer-badge tabular">{totalActive}</span>}
      </button>

      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" size="sm">
        <div className="property-panel property-panel--drawer">
          <PanelBody {...props} />
        </div>
      </Modal>
    </>
  );
}

export { READINESS_BUCKETS };
