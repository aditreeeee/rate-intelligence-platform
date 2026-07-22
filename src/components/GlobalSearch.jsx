import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, BedDouble, Tag, Target, Award, X } from "lucide-react";
import { useData } from "../context/DataContext.jsx";

const MAX_PER_GROUP = 4;

export function GlobalSearch() {
  const data = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { properties: [], rooms: [], ratePlans: [], comparisonGroups: [], competitors: [] };

    const properties = data.properties
      .filter((p) => [p.id, p.name, p.city, p.country].some((f) => String(f).toLowerCase().includes(q)))
      .slice(0, MAX_PER_GROUP);

    const rooms = data.rooms
      .filter((r) => [r.id, r.name].some((f) => String(f).toLowerCase().includes(q)))
      .slice(0, MAX_PER_GROUP);

    const ratePlans = data.ratePlans
      .filter((rp) => [rp.id, rp.name].some((f) => String(f).toLowerCase().includes(q)))
      .slice(0, MAX_PER_GROUP);

    const comparisonGroups = data.comparisonGroups
      .filter((g) => [g.id, g.name, g.market].some((f) => String(f || "").toLowerCase().includes(q)))
      .slice(0, MAX_PER_GROUP);

    const competitors = data.competitors
      .filter((c) => {
        const propertyName = data.properties.find((p) => p.id === c.propertyId)?.name;
        return [c.id, c.hotelName, propertyName, c.city, c.country].some((f) => String(f || "").toLowerCase().includes(q));
      })
      .slice(0, MAX_PER_GROUP);

    return { properties, rooms, ratePlans, comparisonGroups, competitors };
  }, [query, data.properties, data.rooms, data.ratePlans, data.comparisonGroups, data.competitors]);

  const hasResults =
    results.properties.length || results.rooms.length || results.ratePlans.length ||
    results.comparisonGroups.length || results.competitors.length;

  const goTo = (path) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="global-search" ref={wrapRef}>
      <div className="global-search__field">
        <Search size={16} strokeWidth={2} className="global-search__icon" />
        <input
          ref={inputRef}
          className="global-search__input"
          placeholder="Search properties, rooms, rate plans, competitors..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {query ? (
          <button className="global-search__clear" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={14} strokeWidth={2} />
          </button>
        ) : (
          <kbd className="global-search__kbd">{isMac ? "⌘" : "Ctrl"}K</kbd>
        )}
      </div>

      {open && query.trim() && (
        <div className="global-search__panel">
          {!hasResults && <div className="global-search__empty">No matches for "{query}".</div>}

          {results.properties.length > 0 && (
            <div className="global-search__group">
              <div className="global-search__group-label"><Building2 size={12} strokeWidth={2} /> Properties</div>
              {results.properties.map((p) => (
                <button key={p.id} className="global-search__item" onClick={() => goTo(`/portal/properties/${p.id}`)}>
                  <span className="global-search__item-name">{p.name}</span>
                  <span className="global-search__item-meta tabular">{p.id} &middot; {p.city}</span>
                </button>
              ))}
            </div>
          )}

          {results.rooms.length > 0 && (
            <div className="global-search__group">
              <div className="global-search__group-label"><BedDouble size={12} strokeWidth={2} /> Rooms</div>
              {results.rooms.map((r) => (
                <button key={r.id} className="global-search__item" onClick={() => goTo("/portal/rooms")}>
                  <span className="global-search__item-name">{r.name}</span>
                  <span className="global-search__item-meta tabular">{r.id}</span>
                </button>
              ))}
            </div>
          )}

          {results.ratePlans.length > 0 && (
            <div className="global-search__group">
              <div className="global-search__group-label"><Tag size={12} strokeWidth={2} /> Rate Plans</div>
              {results.ratePlans.map((rp) => (
                <button key={rp.id} className="global-search__item" onClick={() => goTo("/portal/rate-plans")}>
                  <span className="global-search__item-name">{rp.name}</span>
                  <span className="global-search__item-meta tabular">{rp.id}</span>
                </button>
              ))}
            </div>
          )}

          {results.comparisonGroups.length > 0 && (
            <div className="global-search__group">
              <div className="global-search__group-label"><Target size={12} strokeWidth={2} /> Comparison Groups</div>
              {results.comparisonGroups.map((g) => (
                <button key={g.id} className="global-search__item" onClick={() => goTo(`/portal/comparison-groups/${g.id}`)}>
                  <span className="global-search__item-name">{g.name}</span>
                  <span className="global-search__item-meta tabular">{g.id}</span>
                </button>
              ))}
            </div>
          )}

          {results.competitors.length > 0 && (
            <div className="global-search__group">
              <div className="global-search__group-label"><Award size={12} strokeWidth={2} /> Competitors</div>
              {results.competitors.map((c) => (
                <button key={c.id} className="global-search__item" onClick={() => goTo(`/portal/competitors/${c.id}`)}>
                  <span className="global-search__item-name">{c.hotelName}</span>
                  <span className="global-search__item-meta tabular">{c.city}, {c.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
