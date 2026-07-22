// Pure helpers for validating a Rate Plan Room's Pricing Ranges table — no
// React/DataContext dependency so they're trivially unit-testable and
// reusable wherever pricing-range rows are edited.

// Two date ranges overlap when each range's start is before the other's end
// (or equal, since date-only ranges are inclusive on both ends). A blank
// start/end means "unbounded" in that direction. Adjacent-but-not-touching
// ranges (one ends the day before the other starts) are NOT an overlap.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = aStart ? new Date(aStart).getTime() : -Infinity;
  const aE = aEnd ? new Date(aEnd).getTime() : Infinity;
  const bS = bStart ? new Date(bStart).getTime() : -Infinity;
  const bE = bEnd ? new Date(bEnd).getTime() : Infinity;
  return aS <= bE && bS <= aE;
}

// Two rows conflict if their date ranges overlap AND their occupancy values
// are equal OR either one is blank ("Any" — applies across every occupancy).
function occupancyConflicts(a, b) {
  const occA = a.occupancy || "";
  const occB = b.occupancy || "";
  return occA === occB || occA === "" || occB === "";
}

// Returns an array of conflicting row-id pairs: [[idA, idB], ...].
export function findPricingPeriodConflicts(periods) {
  const conflicts = [];
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const a = periods[i];
      const b = periods[j];
      if (occupancyConflicts(a, b) && rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
        conflicts.push([a.id, b.id]);
      }
    }
  }
  return conflicts;
}

// Convenience: a Set of every row id that appears in at least one conflict —
// handy for driving per-row error styling without re-scanning pairs.
export function conflictingRowIds(periods) {
  const ids = new Set();
  for (const [a, b] of findPricingPeriodConflicts(periods)) {
    ids.add(a);
    ids.add(b);
  }
  return ids;
}
