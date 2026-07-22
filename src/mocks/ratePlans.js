// Meal plan codes follow standard hospitality terminology. Old free-text mock
// values ("Room Only", "Breakfast Included", "Half Board", "Full Board",
// "All Inclusive") are remapped below:
//   Room Only          -> EP  (European Plan)
//   Breakfast Included  -> CP  (Continental Plan)
//   Half Board          -> MAP (Modified American Plan)
//   Full Board          -> AP  (American Plan)
//   All Inclusive       -> AP  (American Plan; closest standard code — this
//                                codebase does not model an "all-inclusive"
//                                tier beyond full board)
export const MEAL_PLANS = ["EP", "CP", "MAP", "AP"];

export const MEAL_PLAN_DETAILS = {
  EP: { name: "European Plan", description: "Room Only" },
  CP: { name: "Continental Plan", description: "Room + Breakfast" },
  MAP: { name: "Modified American Plan", description: "Room + Breakfast + Lunch or Dinner" },
  AP: { name: "American Plan", description: "Room + Breakfast + Lunch + Dinner" },
};

export function mealPlanLabel(code) {
  const details = MEAL_PLAN_DETAILS[code];
  return details ? `${details.name} — ${details.description}` : code;
}

export const CANCELLATION_POLICIES = ["Free Cancellation (24h)", "Free Cancellation (72h)", "Non-Refundable", "Partial Refund"];

// A Rate Plan is a long-lived pricing *strategy* — it never expires on its
// own; its lifecycle is driven purely by this status. Its own `startDate`/
// `endDate` (the "Pricing Range") are optional — an empty range means the
// plan is always applicable — and are distinct from the per-row date ranges
// on the Rooms it applies to (`PRICING_RANGES`, below), which can each carry
// their own narrower window and terms.
export const RATE_PLAN_STATUSES = ["Draft", "Active", "Archived", "Inactive"];

export let RATE_PLANS = [
  {
    id: "RP-3001", name: "Best Flexible Rate", mealPlan: "CP", cancellationPolicy: "Free Cancellation (24h)",
    status: "Active", taxInclusive: false, taxPercent: 12,
    startDate: "", endDate: "", basePrice: 220,
  },
  {
    id: "RP-3002", name: "Advance Purchase Saver", mealPlan: "EP", cancellationPolicy: "Non-Refundable",
    status: "Active", taxInclusive: true, taxPercent: 12,
    startDate: "", endDate: "", basePrice: 195,
  },
  {
    id: "RP-3003", name: "Suite All Inclusive", mealPlan: "AP", cancellationPolicy: "Free Cancellation (72h)",
    status: "Active", taxInclusive: false, taxPercent: 8,
    startDate: "2026-12-15", endDate: "2027-01-10", basePrice: 340,
  },
  {
    id: "RP-3004", name: "Corporate Rate", mealPlan: "CP", cancellationPolicy: "Free Cancellation (24h)",
    status: "Active", taxInclusive: true, taxPercent: 20,
    startDate: "", endDate: "", basePrice: null,
  },
  {
    id: "RP-3005", name: "Villa Half Board", mealPlan: "MAP", cancellationPolicy: "Partial Refund",
    status: "Inactive", taxInclusive: false, taxPercent: 5,
    startDate: "2026-12-20", endDate: "2027-01-02", basePrice: 300,
  },
];

// Rate Plan Rooms are the room-specific layer beneath a Rate Plan: a Rate
// Plan is a pricing *strategy* (name, meal plan, cancellation policy, tax
// defaults) that can apply to MULTIPLE Phase-1 Rooms, and each
// `RATE_PLAN_ROOMS` row is the record that actually links one specific Room
// to that strategy (own `id`, FK `ratePlanId` + `roomId`) — exactly how
// `RATE_PLAN_MAPPINGS` in mocks/competitors.js references
// `internalRatePlanId` rather than an inline array nested on a parent
// record. This is the layer Phase 3/4 (the Python scraper / competitor rate
// comparison) will need once it has to compare a competitor's rate against a
// specific internal room's specific rate plan, not just "a rate plan" in the
// abstract.
export let RATE_PLAN_ROOMS = [
  { id: "RPR-13001", ratePlanId: "RP-3001", roomId: "RM-2001", lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z" },
  { id: "RPR-13002", ratePlanId: "RP-3002", roomId: "RM-2001", lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z" },
  { id: "RPR-13003", ratePlanId: "RP-3003", roomId: "RM-2003", lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-18T09:00:00Z" },
  { id: "RPR-13004", ratePlanId: "RP-3004", roomId: "RM-2004", lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-18T09:00:00Z" },
  { id: "RPR-13005", ratePlanId: "RP-3005", roomId: "RM-2006", lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-18T09:00:00Z" },
];

// Pricing Ranges are the canonical structure Phase 3 (the Python scraper) and
// Phase 4 (competitor rate comparison / revenue intelligence) will use to
// compare specific date-ranged rates against competitor rates. Each row is
// its own record with its own `id` and a `ratePlanRoomId` foreign key —
// exactly how `RATE_PLAN_MAPPINGS` in mocks/competitors.js references
// `internalRatePlanId` — rather than an inline JSON array nested on the
// RATE_PLAN_ROOMS row itself, matching how a SQL Server child table
// (`dbo.RatePlanRoomPricingRanges`) would be modeled.
export let PRICING_RANGES = [
  {
    id: "PR-4000", ratePlanRoomId: "RPR-13001",
    startDate: "2026-08-01", endDate: "2026-08-31", occupancy: "Double",
    price: 235, currency: "USD", taxInclusive: false, taxPercent: 12,
    cancellationPolicy: "Free Cancellation (24h)", status: "Active",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "PR-4001", ratePlanRoomId: "RPR-13001",
    startDate: "2026-09-01", endDate: "2026-09-30", occupancy: "",
    price: 210, currency: "USD", taxInclusive: false, taxPercent: 12,
    cancellationPolicy: "Free Cancellation (24h)", status: "Active",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "PR-4002", ratePlanRoomId: "RPR-13003",
    startDate: "2026-12-15", endDate: "2027-01-10", occupancy: "Triple",
    price: 380, currency: "USD", taxInclusive: false, taxPercent: 8,
    cancellationPolicy: "Free Cancellation (72h)", status: "Draft",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-18T09:00:00Z",
  },
];
