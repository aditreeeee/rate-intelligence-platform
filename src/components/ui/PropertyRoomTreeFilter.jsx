import React, { useMemo, useState, useEffect } from "react";
import { Search, SlidersHorizontal, X, ChevronRight, ChevronDown } from "lucide-react";
import { useData } from "../../context/DataContext.jsx";
import { Modal } from "./Modal.jsx";
import { Checkbox } from "./Checkbox.jsx";

// Rate-Plans-specific hierarchical filter: Property -> Rooms. This is
// deliberately a *separate* component from PropertyFilterPanel (used by
// Rooms page) rather than a modification of it, so Rooms' flat single-level
// panel behavior is completely unaffected.
//
// Selection model: property-level selection reuses the shared
// PropertyContext `selectedPropertyIds` (so the rest of the app — Topbar
// breadcrumbs, etc. — stays in sync), while room-level selection is new and
// Rate-Plans-only, so it's kept as state owned by the caller (RatePlansPage)
// and passed down here as controlled props. This avoids polluting
// PropertyContext (which Rooms and other consumers don't need) while still
// sharing the one piece of state that legitimately overlaps.
//
// Invariant maintained by the toggle handlers below: `selectedRoomIds` only
// ever contains rooms whose *parent property* is NOT in `selectedPropertyIds`
// (a fully-selected property is represented purely by its id being in
// selectedPropertyIds, not by enumerating its rooms). This keeps "effective
// selected rooms" a simple, unambiguous union with no double bookkeeping.

export function useSelectedRooms({ properties, rooms, selectedPropertyIds, selectedRoomIds }) {
  return useMemo(() => {
    const selectedPropSet = new Set(selectedPropertyIds);
    const fromProperties = rooms.filter((r) => selectedPropSet.has(r.propertyId)).map((r) => r.id);
    const roomSet = new Set([...fromProperties, ...selectedRoomIds]);
    return Array.from(roomSet);
  }, [properties, rooms, selectedPropertyIds, selectedRoomIds]);
}

function PanelBody({
  properties,
  rooms,
  selectedPropertyIds,
  setSelectedPropertyIds,
  selectedRoomIds,
  setSelectedRoomIds,
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  const roomsByProperty = useMemo(() => {
    const map = new Map();
    for (const p of properties) map.set(p.id, []);
    for (const r of rooms) {
      if (map.has(r.propertyId)) map.get(r.propertyId).push(r);
    }
    return map;
  }, [properties, rooms]);

  const q = query.trim().toLowerCase();
  const filteredProperties = useMemo(() => {
    if (!q) return properties;
    return properties.filter((p) => {
      if (String(p.name || "").toLowerCase().includes(q)) return true;
      return (roomsByProperty.get(p.id) || []).some((r) => String(r.name || "").toLowerCase().includes(q));
    });
  }, [q, properties, roomsByProperty]);

  // Auto-expand properties whose room matched (but not the property name
  // itself) so the matching room is visible without a manual click.
  useEffect(() => {
    if (!q) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const p of filteredProperties) {
        const propMatches = String(p.name || "").toLowerCase().includes(q);
        const roomMatches = (roomsByProperty.get(p.id) || []).some((r) => String(r.name || "").toLowerCase().includes(q));
        if (roomMatches && !propMatches) next.add(p.id);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => setExpanded(new Set(properties.map((p) => p.id)));
  const collapseAll = () => setExpanded(new Set());

  const isPropertySelected = (id) => selectedPropertyIds.includes(id);
  const propertyRoomIds = (id) => (roomsByProperty.get(id) || []).map((r) => r.id);

  const propertyState = (id) => {
    if (isPropertySelected(id)) return "checked";
    const roomIds = propertyRoomIds(id);
    if (roomIds.length === 0) return "unchecked";
    const selectedCount = roomIds.filter((rid) => selectedRoomIds.includes(rid)).length;
    if (selectedCount === 0) return "unchecked";
    if (selectedCount === roomIds.length) return "checked"; // all rooms individually selected — treat as fully checked visually
    return "indeterminate";
  };

  const toggleProperty = (id) => {
    const roomIds = propertyRoomIds(id);
    if (isPropertySelected(id)) {
      // Fully checked -> uncheck everything under it.
      setSelectedPropertyIds(selectedPropertyIds.filter((pid) => pid !== id));
      setSelectedRoomIds(selectedRoomIds.filter((rid) => !roomIds.includes(rid)));
    } else {
      // Unchecked or indeterminate -> select the whole property.
      setSelectedPropertyIds([...selectedPropertyIds, id]);
      setSelectedRoomIds(selectedRoomIds.filter((rid) => !roomIds.includes(rid)));
    }
  };

  const toggleRoom = (room) => {
    const { propertyId, id } = room;
    if (isPropertySelected(propertyId)) {
      // Property is fully selected; unchecking one room demotes the property
      // to a partial (room-list) selection containing all its other rooms.
      const siblings = propertyRoomIds(propertyId).filter((rid) => rid !== id);
      setSelectedPropertyIds(selectedPropertyIds.filter((pid) => pid !== propertyId));
      setSelectedRoomIds([...selectedRoomIds, ...siblings]);
      return;
    }
    const nowSelected = selectedRoomIds.includes(id)
      ? selectedRoomIds.filter((rid) => rid !== id)
      : [...selectedRoomIds, id];

    // Promote to a full property selection if every room is now selected —
    // keeps the invariant that a fully-selected property lives only in
    // selectedPropertyIds, never enumerated in selectedRoomIds.
    const allRoomIds = propertyRoomIds(propertyId);
    const allSelected = allRoomIds.length > 0 && allRoomIds.every((rid) => nowSelected.includes(rid));
    if (allSelected) {
      setSelectedPropertyIds([...selectedPropertyIds, propertyId]);
      setSelectedRoomIds(nowSelected.filter((rid) => !allRoomIds.includes(rid)));
    } else {
      setSelectedRoomIds(nowSelected);
    }
  };

  const selectAll = () => {
    setSelectedPropertyIds(properties.map((p) => p.id));
    setSelectedRoomIds([]);
  };
  const clearAll = () => {
    setSelectedPropertyIds([]);
    setSelectedRoomIds([]);
  };

  const totalSelectedRooms = useSelectedRooms({
    properties,
    rooms,
    selectedPropertyIds,
    selectedRoomIds,
  }).length;

  const allSelected = properties.length > 0 && selectedPropertyIds.length === properties.length && selectedRoomIds.length === 0;
  const nothingSelected = selectedPropertyIds.length === 0 && selectedRoomIds.length === 0;

  return (
    <>
      <div className="property-panel__header">
        <span className="property-panel__count">
          {selectedPropertyIds.length} propert{selectedPropertyIds.length === 1 ? "y" : "ies"}, {totalSelectedRooms} room{totalSelectedRooms === 1 ? "" : "s"} selected
        </span>
        <div className="property-panel__quick-actions">
          <button type="button" className="property-panel__quick-btn" onClick={expandAll}>Expand All</button>
          <span className="property-panel__quick-sep">·</span>
          <button type="button" className="property-panel__quick-btn" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>
      <div className="property-panel__header property-panel__header--secondary">
        <div className="property-panel__quick-actions">
          <button type="button" className="property-panel__quick-btn" onClick={selectAll} disabled={allSelected}>
            Select All
          </button>
          <span className="property-panel__quick-sep">·</span>
          <button type="button" className="property-panel__quick-btn" onClick={clearAll} disabled={nothingSelected}>
            Clear All
          </button>
        </div>
      </div>

      <div className="property-panel__search">
        <Search size={14} strokeWidth={2} className="property-panel__search-icon" />
        <input
          className="property-panel__search-input"
          placeholder="Search properties or rooms..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="property-panel__search-clear" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="property-panel__list tree-panel__list">
        {filteredProperties.length === 0 && <div className="property-panel__empty">No matches for "{query}".</div>}
        {filteredProperties.map((p) => {
          const state = propertyState(p.id);
          const roomList = roomsByProperty.get(p.id) || [];
          const isOpen = expanded.has(p.id);
          const visibleRooms = q
            ? roomList.filter((r) => String(r.name || "").toLowerCase().includes(q) || String(p.name || "").toLowerCase().includes(q))
            : roomList;

          return (
            <div key={p.id} className="tree-panel__node">
              <div className={`tree-panel__row tree-panel__row--property ${state === "checked" ? "tree-panel__row--checked" : ""}`}>
                <button
                  type="button"
                  className="tree-panel__chevron"
                  onClick={() => toggleExpand(p.id)}
                  aria-label={isOpen ? `Collapse ${p.name}` : `Expand ${p.name}`}
                  disabled={roomList.length === 0}
                >
                  {roomList.length > 0 ? (isOpen ? <ChevronDown size={15} strokeWidth={2} /> : <ChevronRight size={15} strokeWidth={2} />) : <span className="tree-panel__chevron-spacer" />}
                </button>
                <Checkbox
                  checked={state === "checked"}
                  indeterminate={state === "indeterminate"}
                  onChange={() => toggleProperty(p.id)}
                  label={`Select ${p.name}`}
                />
                <span className="tree-panel__label" onClick={() => toggleExpand(p.id)}>
                  {p.name} <span className="tree-panel__sub">({roomList.length} Room{roomList.length === 1 ? "" : "s"})</span>
                </span>
              </div>

              {isOpen && (
                <div className="tree-panel__children">
                  {visibleRooms.length === 0 && <div className="property-panel__empty">No rooms.</div>}
                  {visibleRooms.map((r) => {
                    const checked = state === "checked" || selectedRoomIds.includes(r.id);
                    return (
                      <div key={r.id} className={`tree-panel__row tree-panel__row--room ${checked ? "tree-panel__row--checked" : ""}`}>
                        <Checkbox checked={checked} onChange={() => toggleRoom(r)} label={`Select ${r.name}`} />
                        <span className="tree-panel__label">{r.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function PropertyRoomTreeFilter({
  selectedPropertyIds,
  setSelectedPropertyIds,
  selectedRoomIds,
  setSelectedRoomIds,
}) {
  const data = useData();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalSelectedRooms = useSelectedRooms({
    properties: data.properties,
    rooms: data.rooms,
    selectedPropertyIds,
    selectedRoomIds,
  }).length;

  const bodyProps = {
    properties: data.properties,
    rooms: data.rooms,
    selectedPropertyIds,
    setSelectedPropertyIds,
    selectedRoomIds,
    setSelectedRoomIds,
  };

  return (
    <>
      <aside className="property-panel tree-panel">
        <PanelBody {...bodyProps} />
      </aside>

      <button type="button" className="property-panel__drawer-trigger" onClick={() => setDrawerOpen(true)}>
        <SlidersHorizontal size={15} strokeWidth={2} />
        <span>Filter Properties / Rooms</span>
        {(selectedPropertyIds.length > 0 || totalSelectedRooms > 0) && (
          <span className="property-panel__drawer-badge tabular">{selectedPropertyIds.length + selectedRoomIds.length}</span>
        )}
      </button>

      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filter Properties / Rooms" size="sm">
        <div className="property-panel property-panel--drawer tree-panel">
          <PanelBody {...bodyProps} />
        </div>
      </Modal>
    </>
  );
}
