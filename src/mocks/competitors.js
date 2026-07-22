// Phase 2 — Competitor Configuration Portal mock data.
//
// Hierarchy: Property -> Competitors (primary collection, owned directly by
// the property) -> optional Competitive Sets (pure tagging/collections that
// only *reference* competitors via COMP_SET_MEMBERSHIPS, a many-to-many bridge
// table — exactly the shape a SQL Server join table would take, so no
// redesign is needed when a real backend replaces this). Room/Rate Plan
// Mapping, Source Configuration, and URL records all belong directly to a
// competitor (`competitorId`) — never to a comp set. Deleting or archiving a
// comp set only ever touches COMP_SET_MEMBERSHIPS rows, never a competitor or its
// configuration. Everything here is configuration, never live/historical
// pricing. ID prefixes: CSET- (Competitive Sets), CMP- (Competitors),
// CSM- (Comp Set Memberships), RMAP- (Room Mappings), RPMAP- (Rate Plan
// Mappings), SRC- (Source Configs — also absorbs what used to be separate
// URL records; see note above SOURCE_CONFIGS below).

export const COMP_SET_STATUSES = ["Draft", "Active", "Archived"];
export const COMP_SET_TAGS = ["Luxury", "Business", "Budget", "Resort", "Airport", "City Center", "Boutique"];

export const COMPETITOR_STATUSES = ["Active", "Draft", "Archived"];
export const PRIORITY_LEVELS = ["High", "Medium", "Low"];

export const MAPPING_TYPES = ["One-to-One", "One-to-Many", "Many-to-One"];
export const MAPPING_STATUSES = ["Mapped", "Needs Review", "Unmapped"];

// Optional organizational collections — a comp set never owns a competitor, it
// only groups references to them (see COMP_SET_MEMBERSHIPS below). Still scoped
// to one property, same as before, since "market segment" groupings are a
// property-level concept.
export let COMP_SETS = [
  {
    id: "CSET-5000", propertyId: "PROP-1001", name: "Luxury Hotels – Miami",
    market: "Luxury", status: "Active", tags: ["Luxury", "Resort"],
    notes: "Primary competitive set tracked for Aurora Bay Resort's beachfront segment.",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "CSET-5001", propertyId: "PROP-1002", name: "Business Downtown – Set A",
    market: "Business", status: "Active", tags: ["Business", "City Center"],
    notes: "",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-14T09:00:00Z",
  },
  {
    id: "CSET-5002", propertyId: "PROP-1001", name: "Weekend Getaway Rivals",
    market: "Resort", status: "Draft", tags: ["Resort"],
    notes: "Still gathering the competitor list for this set.",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-05-30T09:00:00Z",
  },
];

// Competitors are the primary collection — owned directly by a Property
// (`propertyId`), creatable and fully functional with zero group
// memberships. The benchmark is never a competitor: it's always the Phase 1
// Property record itself (see lib/competitorReadiness.js and every profile
// page's "Benchmark Property" panel) — a competitor can only ever be
// *compared against* that property's own rooms and rate plans, never be
// promoted to stand in for it.
export let COMPETITORS = [
  {
    id: "CMP-6000", propertyId: "PROP-1001",
    hotelName: "Grand Palace Resort",
    country: "United States", state: "Florida", city: "Miami", address: "123 Ocean Drive, Miami, FL 33139",
    website: "https://grandpalace.example.com",
    otaUrls: [{ label: "Booking.com", url: "https://www.booking.com/hotel/us/grand-palace-example.html" }],
    starRating: 5, distance: 1.2, priority: "High", status: "Active", notes: "",
    pinned: true, futurePropertyId: null,
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "CMP-6001", propertyId: "PROP-1001",
    hotelName: "Ocean Crest Hotel",
    country: "United States", state: "Florida", city: "Miami", address: "48 Collins Ave, Miami, FL 33139",
    website: "https://oceancrest.example.com",
    otaUrls: [
      { label: "Booking.com", url: "https://www.booking.com/hotel/us/ocean-crest-example.html" },
      { label: "Expedia", url: "https://www.expedia.com/Miami-Hotels-Ocean-Crest.h123.Hotel-Information" },
    ],
    starRating: 5, distance: 0.8, priority: "High", status: "Active", notes: "Strong OTA visibility.",
    pinned: false, futurePropertyId: null,
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-18T09:00:00Z",
  },
  {
    id: "CMP-6002", propertyId: "PROP-1001",
    hotelName: "Bayview Suites",
    country: "United States", state: "Florida", city: "Miami", address: "210 Bay Rd, Miami, FL 33139",
    website: "https://bayviewsuites.example.com",
    otaUrls: [],
    starRating: 4, distance: 2.1, priority: "Medium", status: "Active", notes: "",
    pinned: false, futurePropertyId: null,
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-10T09:00:00Z",
  },
  {
    id: "CMP-6003", propertyId: "PROP-1002",
    hotelName: "Meridian Business Tower",
    country: "United States", state: "New York", city: "New York", address: "77 Park Ave, New York, NY 10016",
    website: "https://meridianbiztower.example.com",
    otaUrls: [{ label: "Expedia", url: "https://www.expedia.com/New-York-Hotels-Meridian-Business.h456.Hotel-Information" }],
    starRating: 4, distance: 0.4, priority: "High", status: "Active", notes: "",
    pinned: true, futurePropertyId: null,
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-14T09:00:00Z",
  },
  {
    id: "CMP-6004", propertyId: "PROP-1001",
    hotelName: "Seaside Retreat Villas",
    country: "United States", state: "Florida", city: "Miami", address: "5 Shoreline Ct, Miami, FL 33139",
    website: "", otaUrls: [],
    starRating: 4, distance: 3.4, priority: "Low", status: "Active", notes: "Not yet configured — no group, no mappings.",
    pinned: false, futurePropertyId: null,
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-05T09:00:00Z",
  },
];

// Many-to-many bridge between Competitors and Competitive Sets — the only
// place comp set membership is recorded. A competitor with zero rows here
// simply belongs to no comp set, which is a fully valid, fully functional
// state. Deleting a comp set deletes only its rows here; deleting a competitor
// deletes only its rows here — never each other's owning record.
export let COMP_SET_MEMBERSHIPS = [
  { id: "CSM-11000", compSetId: "CSET-5000", competitorId: "CMP-6000" },
  { id: "CSM-11001", compSetId: "CSET-5000", competitorId: "CMP-6001" },
  { id: "CSM-11002", compSetId: "CSET-5000", competitorId: "CMP-6002" },
  { id: "CSM-11003", compSetId: "CSET-5002", competitorId: "CMP-6000" },
  { id: "CSM-11004", compSetId: "CSET-5001", competitorId: "CMP-6003" },
];

// Room/Rate Plan Mapping, Source Configuration, and URL records all key off
// `competitorId` only — never a compSetId. A competitor's configuration is
// identical whether or not it belongs to any Competitive Set.
// `competitorRoomCode` is an optional, stable site-specific identifier
// alongside the human-readable `competitorRoomLabel` — blank until a Python
// scraper discovers and fills it in; matching by label alone is workable but
// fragile if a competitor renames a room type.
export let ROOM_MAPPINGS = [
  {
    id: "RMAP-7000", competitorId: "CMP-6000",
    internalRoomIds: ["RM-2001"], competitorRoomLabel: "Ocean View King Room", competitorRoomCode: "",
    mappingType: "One-to-One", status: "Mapped", confidence: 92, notes: "",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "RMAP-7001", competitorId: "CMP-6001",
    internalRoomIds: ["RM-2003"], competitorRoomLabel: "Presidential Suite", competitorRoomCode: "",
    mappingType: "One-to-One", status: "Needs Review", confidence: 68, notes: "Confirm square footage before finalizing.",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-18T09:00:00Z",
  },
];

// `roomMappingId` (optional) links a rate plan mapping to the specific Room
// Mapping it's nested under on the competitor's own site — every real
// hotel/OTA rate is scoped to one room type, so Phase 3's scraper needs to
// know which competitor room block a rate belongs to, not just that a rate
// exists. `competitorRatePlanCode` mirrors Room Mapping's stable-code field.
export let RATE_PLAN_MAPPINGS = [
  {
    id: "RPMAP-8000", competitorId: "CMP-6000",
    internalRatePlanId: "RP-3001", competitorRatePlanName: "Best Available Rate", competitorRatePlanCode: "",
    roomMappingId: "RMAP-7000",
    mealPlan: "CP", cancellationPolicy: "Free Cancellation (24h)", currency: "USD", priority: "High", status: "Mapped",
    notes: "", lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z",
  },
];

export let SOURCE_CONFIGS = [
  {
    id: "SRC-9000", competitorId: "CMP-6000",
    sourceType: "Direct Website", sourceName: "Grand Palace — Direct", sourceUrl: "https://grandpalace.example.com/rooms",
    priority: "High", status: "Active", notes: "",
    xpath: "", cssSelector: "", apiEndpoint: "", authRequired: false, parserVersion: "",
    lastCheckedAt: null, lastCheckStatus: "", lastCheckError: "",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-20T09:00:00Z",
  },
  {
    id: "SRC-9001", competitorId: "CMP-6000",
    sourceType: "Booking.com", sourceName: "Grand Palace — Booking.com", sourceUrl: "https://www.booking.com/hotel/us/grand-palace-example.html",
    priority: "Medium", status: "Draft", notes: "Awaiting selector confirmation.",
    xpath: "", cssSelector: "", apiEndpoint: "", authRequired: false, parserVersion: "",
    lastCheckedAt: null, lastCheckStatus: "", lastCheckError: "",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-12T09:00:00Z",
  },
];

// The Sources tab was previously split across SOURCE_CONFIGS and a
// separate URL_RECORDS table — the URL Manager module. Both represented the
// same underlying concept ("how do we reach this competitor's rates") with
// no cross-validation between them, so URL_RECORDS has been folded into
// SOURCE_CONFIGS (sourceType "Custom") and removed entirely. The row below
// is the migrated former URL-10000 record.
SOURCE_CONFIGS.push({
  id: "SRC-9002", competitorId: "CMP-6002",
  sourceType: "Custom", sourceName: "TripAdvisor Listing", sourceUrl: "https://www.tripadvisor.com/Hotel_Review-example-Bayview_Suites.html",
  priority: "Medium", status: "Active", notes: "",
  lastCheckedAt: null, lastCheckStatus: "", lastCheckError: "",
  xpath: "", cssSelector: "", apiEndpoint: "", authRequired: false, parserVersion: "",
  lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-10T09:00:00Z",
});
