import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react";
import { PROPERTIES } from "../mocks/properties.js";
import { ROOMS } from "../mocks/rooms.js";
import { RATE_PLANS, RATE_PLAN_ROOMS, PRICING_RANGES } from "../mocks/ratePlans.js";
import { ROOM_TYPES_MASTER, AMENITIES_MASTER, ROOM_TEMPLATES_MASTER, SOURCE_TYPES_MASTER } from "../mocks/masterData.js";
import { COMP_SETS, COMPETITORS, COMP_SET_MEMBERSHIPS, ROOM_MAPPINGS, RATE_PLAN_MAPPINGS, SOURCE_CONFIGS } from "../mocks/competitors.js";
import { useAuth } from "./AuthContext.jsx";
import { getPermissions } from "../lib/permissions.js";

const DataContext = createContext(null);

const initialState = {
  properties: PROPERTIES,
  rooms: ROOMS,
  ratePlans: RATE_PLANS,
  // Rate Plan Rooms — the room-specific layer beneath a Rate Plan (own `id`,
  // FK `ratePlanId` + `roomId`). A Rate Plan can apply to multiple Rooms,
  // each its own record here. See mocks/ratePlans.js for the full rationale.
  ratePlanRooms: RATE_PLAN_ROOMS,
  // Pricing Ranges — a proper child collection of Rate Plan Rooms (own
  // `id`, FK `ratePlanRoomId`), the same shape RATE_PLAN_MAPPINGS uses to
  // reference `internalRatePlanId`. See mocks/ratePlans.js for why this is
  // modeled as a table rather than an inline array.
  pricingRanges: PRICING_RANGES,
  // Phase 2 (Competitor Configuration) collections. Competitors are owned
  // directly by a Property (`propertyId`) — the primary collection. Rate/
  // Room Mapping and Source Configuration (which also absorbs what used to
  // be a separate URL Manager/`urlRecords` collection — see mocks/
  // competitors.js) are owned directly by a Competitor (`competitorId`).
  // Competitive Sets are a pure, optional
  // tagging layer: they never own a competitor, they only *reference* one
  // via `compSetMemberships` (a many-to-many bridge table). Phase 1 mock data
  // is never written to from here — Phase 1 is read-only reference data.
  compSets: COMP_SETS,
  competitors: COMPETITORS,
  compSetMemberships: COMP_SET_MEMBERSHIPS,
  roomMappings: ROOM_MAPPINGS,
  ratePlanMappings: RATE_PLAN_MAPPINGS,
  sourceConfigs: SOURCE_CONFIGS,
  masters: {
    roomTypes: ROOM_TYPES_MASTER,
    amenities: AMENITIES_MASTER,
    roomTemplates: ROOM_TEMPLATES_MASTER,
    sourceTypes: SOURCE_TYPES_MASTER,
  },
};

// Phase 2 collections (compSets, competitors, roomMappings,
// ratePlanMappings, sourceConfigs) follow the exact same
// lifecycle shape as Rooms/Rate Plans (add/update/archive/restore/delete/
// duplicate/bulk-*), just generalized by `collection` key instead of one
// reducer case per verb per entity — the same "parameterize by table name"
// idea the master-data reducer already established below, extended to full
// entity records. This is the shape a generic `/api/{collection}` MVC
// controller would expose, so no reducer changes are needed when Phase 3
// adds more collections.

function nextId(items, prefix, base) {
  const nums = items.map((i) => Number(i.id.split("-")[1]) || base);
  return `${prefix}-${Math.max(...nums, base) + 1}`;
}

const inSet = (ids) => (item) => ids.includes(item.id);
const notInSet = (ids) => (item) => !ids.includes(item.id);

function reducer(state, action) {
  switch (action.type) {
    case "ADD_PROPERTY":
      return { ...state, properties: [action.payload, ...state.properties] };
    case "UPDATE_PROPERTY":
      return {
        ...state,
        properties: state.properties.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    case "DELETE_PROPERTY":
      return {
        ...state,
        properties: state.properties.filter((p) => p.id !== action.payload),
        rooms: state.rooms.filter((r) => r.propertyId !== action.payload),
      };
    case "BULK_UPDATE_PROPERTIES":
      return {
        ...state,
        properties: state.properties.map((p) => (action.ids.includes(p.id) ? action.updater(p) : p)),
      };
    case "BULK_ADD_PROPERTIES":
      return { ...state, properties: [...action.payload, ...state.properties] };
    case "BULK_DELETE_PROPERTIES":
      return {
        ...state,
        properties: state.properties.filter(notInSet(action.ids)),
        rooms: state.rooms.filter((r) => !action.ids.includes(r.propertyId)),
      };

    case "ADD_ROOM":
      return { ...state, rooms: [action.payload, ...state.rooms] };
    case "UPDATE_ROOM":
      return { ...state, rooms: state.rooms.map((r) => (r.id === action.payload.id ? action.payload : r)) };
    // Deleting a Room only cascades to the Rate Plan Rooms that reference it
    // (and their own Pricing Ranges) — NOT to the parent Rate Plan(s), which may
    // still apply to other rooms and remain a valid, if incomplete, record
    // (consistent with this codebase's philosophy of optional/incremental
    // configuration, e.g. Competitors' optional Comp Set groups).
    case "DELETE_ROOM": {
      const orphanedRatePlanRoomIds = state.ratePlanRooms.filter((rp) => rp.roomId === action.payload).map((rp) => rp.id);
      return {
        ...state,
        rooms: state.rooms.filter((r) => r.id !== action.payload),
        ratePlanRooms: state.ratePlanRooms.filter((rp) => rp.roomId !== action.payload),
        pricingRanges: state.pricingRanges.filter((pr) => !orphanedRatePlanRoomIds.includes(pr.ratePlanRoomId)),
      };
    }
    case "BULK_UPDATE_ROOMS":
      return { ...state, rooms: state.rooms.map((r) => (action.ids.includes(r.id) ? action.updater(r) : r)) };
    case "BULK_ADD_ROOMS":
      return { ...state, rooms: [...action.payload, ...state.rooms] };
    case "BULK_DELETE_ROOMS": {
      const orphanedRatePlanRoomIds = state.ratePlanRooms.filter((rp) => action.ids.includes(rp.roomId)).map((rp) => rp.id);
      return {
        ...state,
        rooms: state.rooms.filter(notInSet(action.ids)),
        ratePlanRooms: state.ratePlanRooms.filter((rp) => !action.ids.includes(rp.roomId)),
        pricingRanges: state.pricingRanges.filter((pr) => !orphanedRatePlanRoomIds.includes(pr.ratePlanRoomId)),
      };
    }

    case "ADD_RATE_PLAN":
      return { ...state, ratePlans: [action.payload, ...state.ratePlans] };
    case "UPDATE_RATE_PLAN":
      return { ...state, ratePlans: state.ratePlans.map((rp) => (rp.id === action.payload.id ? action.payload : rp)) };
    // Deleting a Rate Plan permanently cascades two levels deep: all of its
    // Rate Plan Rooms, and all of those Rooms' own Pricing Range rows.
    case "DELETE_RATE_PLAN": {
      const orphanedRatePlanRoomIds = state.ratePlanRooms.filter((rp) => rp.ratePlanId === action.payload).map((rp) => rp.id);
      return {
        ...state,
        ratePlans: state.ratePlans.filter((rp) => rp.id !== action.payload),
        ratePlanRooms: state.ratePlanRooms.filter((rp) => rp.ratePlanId !== action.payload),
        pricingRanges: state.pricingRanges.filter((pr) => !orphanedRatePlanRoomIds.includes(pr.ratePlanRoomId)),
      };
    }
    case "BULK_UPDATE_RATE_PLANS":
      return { ...state, ratePlans: state.ratePlans.map((rp) => (action.ids.includes(rp.id) ? action.updater(rp) : rp)) };
    case "BULK_ADD_RATE_PLANS":
      return { ...state, ratePlans: [...action.payload, ...state.ratePlans] };
    case "BULK_DELETE_RATE_PLANS": {
      const orphanedRatePlanRoomIds = state.ratePlanRooms.filter((rp) => action.ids.includes(rp.ratePlanId)).map((rp) => rp.id);
      return {
        ...state,
        ratePlans: state.ratePlans.filter(notInSet(action.ids)),
        ratePlanRooms: state.ratePlanRooms.filter((rp) => !action.ids.includes(rp.ratePlanId)),
        pricingRanges: state.pricingRanges.filter((pr) => !orphanedRatePlanRoomIds.includes(pr.ratePlanRoomId)),
      };
    }

    // Deleting a Rate Plan Room permanently cascades to its own Pricing Range
    // rows — nothing else references a pricing-range id.
    case "DELETE_RATE_PLAN_ROOM_CASCADE":
      return {
        ...state,
        ratePlanRooms: state.ratePlanRooms.filter((rp) => rp.id !== action.payload),
        pricingRanges: state.pricingRanges.filter((pr) => pr.ratePlanRoomId !== action.payload),
      };
    case "BULK_DELETE_RATE_PLAN_ROOMS_CASCADE":
      return {
        ...state,
        ratePlanRooms: state.ratePlanRooms.filter(notInSet(action.ids)),
        pricingRanges: state.pricingRanges.filter((pr) => !action.ids.includes(pr.ratePlanRoomId)),
      };

    // Phase 2 collections — generic, parameterized by `action.collection`.
    case "COLLECTION_ADD":
      return { ...state, [action.collection]: [action.payload, ...state[action.collection]] };
    case "COLLECTION_BULK_ADD":
      return { ...state, [action.collection]: [...action.payload, ...state[action.collection]] };
    case "COLLECTION_UPDATE":
      return {
        ...state,
        [action.collection]: state[action.collection].map((i) => (i.id === action.payload.id ? action.payload : i)),
      };
    case "COLLECTION_BULK_UPDATE":
      return {
        ...state,
        [action.collection]: state[action.collection].map((i) => (action.ids.includes(i.id) ? action.updater(i) : i)),
      };
    case "COLLECTION_DELETE":
      return { ...state, [action.collection]: state[action.collection].filter((i) => i.id !== action.payload) };
    case "COLLECTION_BULK_DELETE":
      return { ...state, [action.collection]: state[action.collection].filter(notInSet(action.ids)) };

    // A Competitive Set is a pure tagging layer — deleting it (or bulk-
    // deleting several) only ever removes the comp set row itself and its
    // membership references. Competitors, and everything owned by a
    // competitor (mappings/sources/URLs), are completely untouched.
    case "DELETE_COMP_SET_CASCADE":
      return {
        ...state,
        compSets: state.compSets.filter((g) => g.id !== action.payload),
        compSetMemberships: state.compSetMemberships.filter((m) => m.compSetId !== action.payload),
      };
    case "BULK_DELETE_COMP_SETS_CASCADE":
      return {
        ...state,
        compSets: state.compSets.filter(notInSet(action.ids)),
        compSetMemberships: state.compSetMemberships.filter((m) => !action.ids.includes(m.compSetId)),
      };
    // A Competitor owns its own Mapping/Source/URL records and its own
    // comp-set-membership rows — deleting it permanently cascades to all four,
    // but never touches the Competitive Set rows themselves.
    case "DELETE_COMPETITOR_CASCADE":
      return {
        ...state,
        competitors: state.competitors.filter((c) => c.id !== action.payload),
        compSetMemberships: state.compSetMemberships.filter((m) => m.competitorId !== action.payload),
        roomMappings: state.roomMappings.filter((m) => m.competitorId !== action.payload),
        ratePlanMappings: state.ratePlanMappings.filter((m) => m.competitorId !== action.payload),
        sourceConfigs: state.sourceConfigs.filter((s) => s.competitorId !== action.payload),
      };
    case "BULK_DELETE_COMPETITORS_CASCADE":
      return {
        ...state,
        competitors: state.competitors.filter(notInSet(action.ids)),
        compSetMemberships: state.compSetMemberships.filter((m) => !action.ids.includes(m.competitorId)),
        roomMappings: state.roomMappings.filter((m) => !action.ids.includes(m.competitorId)),
        ratePlanMappings: state.ratePlanMappings.filter((m) => !action.ids.includes(m.competitorId)),
        sourceConfigs: state.sourceConfigs.filter((s) => !action.ids.includes(s.competitorId)),
      };

    // A Rate Plan Mapping's optional `roomMappingId` is a soft FK to a Room
    // Mapping owned by the same competitor — deleting that Room Mapping
    // (on its own, not as part of deleting the whole competitor above)
    // clears the reference instead of leaving a dangling id, exactly like a
    // SQL Server `ON DELETE SET NULL` foreign key would.
    case "DELETE_ROOM_MAPPING_CASCADE":
      return {
        ...state,
        roomMappings: state.roomMappings.filter((m) => m.id !== action.payload),
        ratePlanMappings: state.ratePlanMappings.map((m) => (m.roomMappingId === action.payload ? { ...m, roomMappingId: "" } : m)),
      };
    case "BULK_DELETE_ROOM_MAPPINGS_CASCADE":
      return {
        ...state,
        roomMappings: state.roomMappings.filter(notInSet(action.ids)),
        ratePlanMappings: state.ratePlanMappings.map((m) => (action.ids.includes(m.roomMappingId) ? { ...m, roomMappingId: "" } : m)),
      };

    // Master data (Room Types / Amenities / Room Templates). Parameterized by
    // `kind` (the master table name) instead of one reducer case per table —
    // this is the exact shape a generic `/api/masters/{kind}` MVC controller
    // would expose, so no reducer changes are needed when new master tables
    // are added later.
    case "ADD_MASTER_ITEM":
      return {
        ...state,
        masters: { ...state.masters, [action.kind]: [...state.masters[action.kind], action.payload] },
      };
    case "UPDATE_MASTER_ITEM":
      return {
        ...state,
        masters: {
          ...state.masters,
          [action.kind]: state.masters[action.kind].map((item) => (item.id === action.payload.id ? action.payload : item)),
        },
      };
    case "DELETE_MASTER_ITEM":
      return {
        ...state,
        masters: { ...state.masters, [action.kind]: state.masters[action.kind].filter((item) => item.id !== action.id) },
      };

    default:
      return state;
  }
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user } = useAuth();
  const permissions = useMemo(() => getPermissions(user?.role), [user?.role]);

  const stamp = useCallback(
    (obj) => ({ ...obj, lastModifiedBy: user?.username || "System", lastModifiedAt: new Date().toISOString() }),
    [user]
  );

  // Data-layer scoping: this is the single place that filters "all data" down
  // to "data this user is allowed to see." Every consumer (list pages,
  // Property Profile, GlobalSearch, KPI stats) reads these scoped arrays
  // instead of duplicating an ownerId/role check of their own.
  const scopedProperties = useMemo(() => {
    if (permissions.canViewAllProperties) return state.properties;
    return state.properties.filter((p) => p.ownerId === user?.ownerId);
  }, [state.properties, permissions.canViewAllProperties, user?.ownerId]);

  const scopedPropertyIds = useMemo(() => new Set(scopedProperties.map((p) => p.id)), [scopedProperties]);

  const scopedRooms = useMemo(
    () => (permissions.canViewAllProperties ? state.rooms : state.rooms.filter((r) => scopedPropertyIds.has(r.propertyId))),
    [state.rooms, permissions.canViewAllProperties, scopedPropertyIds]
  );

  const scopedRoomIds = useMemo(() => new Set(scopedRooms.map((r) => r.id)), [scopedRooms]);

  // Rate Plan Rooms scope transitively through Rooms (their `roomId`), and
  // Rate Plans in turn scope transitively through Rate Plan Rooms — a Rate
  // Plan is now visible only if it has at least one Room this user can see,
  // exactly the way Phase 2's mappings/sources/URLs scope transitively
  // through Competitors.
  const scopedRatePlanRooms = useMemo(
    () => (permissions.canViewAllProperties ? state.ratePlanRooms : state.ratePlanRooms.filter((rp) => scopedRoomIds.has(rp.roomId))),
    [state.ratePlanRooms, permissions.canViewAllProperties, scopedRoomIds]
  );
  const scopedRatePlanIdsFromRatePlanRooms = useMemo(() => new Set(scopedRatePlanRooms.map((rp) => rp.ratePlanId)), [scopedRatePlanRooms]);
  const scopedRatePlans = useMemo(
    () => (permissions.canViewAllProperties ? state.ratePlans : state.ratePlans.filter((rp) => scopedRatePlanIdsFromRatePlanRooms.has(rp.id))),
    [state.ratePlans, permissions.canViewAllProperties, scopedRatePlanIdsFromRatePlanRooms]
  );

  // Pricing Ranges scope transitively through Rate Plan Rooms.
  const scopedRatePlanRoomIds = useMemo(() => new Set(scopedRatePlanRooms.map((rp) => rp.id)), [scopedRatePlanRooms]);
  const scopedPricingRanges = useMemo(
    () => (permissions.canViewAllProperties ? state.pricingRanges : state.pricingRanges.filter((pr) => scopedRatePlanRoomIds.has(pr.ratePlanRoomId))),
    [state.pricingRanges, permissions.canViewAllProperties, scopedRatePlanRoomIds]
  );

  const roomCountFor = useCallback((propertyId) => state.rooms.filter((r) => r.propertyId === propertyId).length, [state.rooms]);
  const ratePlanCountFor = useCallback(
    (propertyId) => {
      const roomIds = new Set(state.rooms.filter((r) => r.propertyId === propertyId).map((r) => r.id));
      const ratePlanIds = new Set(state.ratePlanRooms.filter((rp) => roomIds.has(rp.roomId)).map((rp) => rp.ratePlanId));
      return ratePlanIds.size;
    },
    [state.rooms, state.ratePlanRooms]
  );

  // Phase 2 scoping mirrors Phase 1 exactly: Competitors are scoped by
  // propertyId the same way Rooms are (they're the primary collection now,
  // not nested under a comp set); everything a competitor owns (Mappings/
  // Sources/URLs/comp set memberships) is then scoped transitively by
  // competitorId, so an out-of-scope property can never leak its competitor
  // configuration to a user who can't see the property itself. Competitive
  // Sets are scoped by their own propertyId — independently of which
  // competitors happen to reference them.
  const scopedCompSets = useMemo(
    () => (permissions.canViewAllProperties ? state.compSets : state.compSets.filter((g) => scopedPropertyIds.has(g.propertyId))),
    [state.compSets, permissions.canViewAllProperties, scopedPropertyIds]
  );
  const scopedCompSetIds = useMemo(() => new Set(scopedCompSets.map((g) => g.id)), [scopedCompSets]);
  const scopedCompetitors = useMemo(
    () => (permissions.canViewAllProperties ? state.competitors : state.competitors.filter((c) => scopedPropertyIds.has(c.propertyId))),
    [state.competitors, permissions.canViewAllProperties, scopedPropertyIds]
  );
  const scopedCompetitorIds = useMemo(() => new Set(scopedCompetitors.map((c) => c.id)), [scopedCompetitors]);
  const scopedCompSetMemberships = useMemo(
    () =>
      permissions.canViewAllProperties
        ? state.compSetMemberships
        : state.compSetMemberships.filter((m) => scopedCompSetIds.has(m.compSetId) && scopedCompetitorIds.has(m.competitorId)),
    [state.compSetMemberships, permissions.canViewAllProperties, scopedCompSetIds, scopedCompetitorIds]
  );
  const scopedRoomMappings = useMemo(
    () => (permissions.canViewAllProperties ? state.roomMappings : state.roomMappings.filter((m) => scopedCompetitorIds.has(m.competitorId))),
    [state.roomMappings, permissions.canViewAllProperties, scopedCompetitorIds]
  );
  const scopedRatePlanMappings = useMemo(
    () => (permissions.canViewAllProperties ? state.ratePlanMappings : state.ratePlanMappings.filter((m) => scopedCompetitorIds.has(m.competitorId))),
    [state.ratePlanMappings, permissions.canViewAllProperties, scopedCompetitorIds]
  );
  const scopedSourceConfigs = useMemo(
    () => (permissions.canViewAllProperties ? state.sourceConfigs : state.sourceConfigs.filter((s) => scopedCompetitorIds.has(s.competitorId))),
    [state.sourceConfigs, permissions.canViewAllProperties, scopedCompetitorIds]
  );
  // Generic full-lifecycle CRUD factory for a Phase 2 collection — the same
  // add/update/archive/restore/delete/duplicate/bulk-* surface Rooms/Rate
  // Plans expose, generated once per collection instead of hand-written per
  // verb. `nameField` is only used to suffix "(Copy)" on duplicate.
  function makeCollectionApi(collection, prefix, base, nameField) {
    return {
      add: (data) => {
        const item = stamp({ ...data, id: nextId(state[collection], prefix, base) });
        dispatch({ type: "COLLECTION_ADD", collection, payload: item });
        return item;
      },
      update: (item) => dispatch({ type: "COLLECTION_UPDATE", collection, payload: stamp(item) }),
      archive: (item) => dispatch({ type: "COLLECTION_UPDATE", collection, payload: stamp({ ...item, status: "Archived" }) }),
      restore: (item) => dispatch({ type: "COLLECTION_UPDATE", collection, payload: stamp({ ...item, status: "Active" }) }),
      deletePermanently: (id) => dispatch({ type: "COLLECTION_DELETE", collection, payload: id }),
      duplicate: (item) => {
        const copy = stamp({ ...item, id: nextId(state[collection], prefix, base), ...(nameField ? { [nameField]: `${item[nameField]} (Copy)` } : {}) });
        dispatch({ type: "COLLECTION_ADD", collection, payload: copy });
        return copy;
      },
      bulkArchive: (ids) => dispatch({ type: "COLLECTION_BULK_UPDATE", collection, ids, updater: (i) => stamp({ ...i, status: "Archived" }) }),
      bulkRestore: (ids) => dispatch({ type: "COLLECTION_BULK_UPDATE", collection, ids, updater: (i) => stamp({ ...i, status: "Active" }) }),
      bulkChangeStatus: (ids, status) => dispatch({ type: "COLLECTION_BULK_UPDATE", collection, ids, updater: (i) => stamp({ ...i, status }) }),
      bulkChangePriority: (ids, priority) => dispatch({ type: "COLLECTION_BULK_UPDATE", collection, ids, updater: (i) => stamp({ ...i, priority }) }),
      bulkDuplicate: (ids) => {
        const source = state[collection].filter(inSet(ids));
        let cursor = state[collection];
        const copies = source.map((item) => {
          const copy = stamp({ ...item, id: nextId(cursor, prefix, base), ...(nameField ? { [nameField]: `${item[nameField]} (Copy)` } : {}) });
          cursor = [copy, ...cursor];
          return copy;
        });
        dispatch({ type: "COLLECTION_BULK_ADD", collection, payload: copies });
        return copies;
      },
      bulkDelete: (ids) => dispatch({ type: "COLLECTION_BULK_DELETE", collection, ids }),
    };
  }

  const compSetApi = makeCollectionApi("compSets", "CSET", 5000, "name");
  const competitorApi = makeCollectionApi("competitors", "CMP", 6000, "hotelName");
  const roomMappingApi = makeCollectionApi("roomMappings", "RMAP", 7000, "competitorRoomLabel");
  const ratePlanMappingApi = makeCollectionApi("ratePlanMappings", "RPMAP", 8000, "competitorRatePlanName");
  const sourceConfigApi = makeCollectionApi("sourceConfigs", "SRC", 9000, "sourceName");

  const api = useMemo(
    () => ({
      ...state,
      properties: scopedProperties,
      rooms: scopedRooms,
      ratePlans: scopedRatePlans,
      ratePlanRooms: scopedRatePlanRooms,
      pricingRanges: scopedPricingRanges,
      compSets: scopedCompSets,
      competitors: scopedCompetitors,
      compSetMemberships: scopedCompSetMemberships,
      roomMappings: scopedRoomMappings,
      ratePlanMappings: scopedRatePlanMappings,
      sourceConfigs: scopedSourceConfigs,
      roomCountFor,
      ratePlanCountFor,

      // Competitive Sets — a pure, optional organizational layer. They
      // never own a Competitor; duplicating or deleting one only ever
      // touches the comp set row and its `compSetMemberships` reference rows.
      addCompSet: compSetApi.add,
      updateCompSet: compSetApi.update,
      archiveCompSet: compSetApi.archive,
      restoreCompSet: compSetApi.restore,
      duplicateCompSet: (compSet) => {
        const copy = compSetApi.duplicate(compSet);
        // The duplicate keeps the same member competitors (new membership
        // rows pointing at the same competitor ids) — competitors are never
        // cloned, since a comp set is just a reference collection, not an
        // owner.
        const sourceMemberships = state.compSetMemberships.filter((m) => m.compSetId === compSet.id);
        if (sourceMemberships.length) {
          let cursor = state.compSetMemberships;
          const cloned = sourceMemberships.map((m) => {
            const clone = { id: nextId(cursor, "CSM", 11000), compSetId: copy.id, competitorId: m.competitorId };
            cursor = [clone, ...cursor];
            return clone;
          });
          dispatch({ type: "COLLECTION_BULK_ADD", collection: "compSetMemberships", payload: cloned });
        }
        return copy;
      },
      // Deleting a comp set permanently only cascades to its membership
      // references — competitors and their configuration are untouched.
      deleteCompSetPermanently: (id) => dispatch({ type: "DELETE_COMP_SET_CASCADE", payload: id }),
      bulkArchiveCompSets: compSetApi.bulkArchive,
      bulkRestoreCompSets: compSetApi.bulkRestore,
      bulkChangeStatusCompSets: compSetApi.bulkChangeStatus,
      bulkDuplicateCompSets: compSetApi.bulkDuplicate,
      bulkDeleteCompSets: (ids) => dispatch({ type: "BULK_DELETE_COMP_SETS_CASCADE", ids }),

      // Comp set membership (many-to-many bridge) — the only place a Competitor
      // and a Competitive Set are ever linked. Adding/removing a membership
      // never touches the competitor record or the comp set record.
      addCompSetMembership: (compSetId, competitorId) => {
        const exists = state.compSetMemberships.some((m) => m.compSetId === compSetId && m.competitorId === competitorId);
        if (exists) return null;
        const membership = { id: nextId(state.compSetMemberships, "CSM", 11000), compSetId, competitorId };
        dispatch({ type: "COLLECTION_ADD", collection: "compSetMemberships", payload: membership });
        return membership;
      },
      removeCompSetMembership: (compSetId, competitorId) => {
        const existing = state.compSetMemberships.find((m) => m.compSetId === compSetId && m.competitorId === competitorId);
        if (existing) dispatch({ type: "COLLECTION_DELETE", collection: "compSetMemberships", payload: existing.id });
      },
      // Bulk-assign several competitors to several comp sets in one dispatch —
      // used by the Competitors list's "Assign to Comp Set(s)" bulk action.
      // Skips pairs that are already members instead of creating duplicates.
      bulkAssignCompetitorsToCompSets: (competitorIds, compSetIds) => {
        const existingPairs = new Set(state.compSetMemberships.map((m) => `${m.compSetId}::${m.competitorId}`));
        let cursor = state.compSetMemberships;
        const created = [];
        for (const compSetId of compSetIds) {
          for (const competitorId of competitorIds) {
            const key = `${compSetId}::${competitorId}`;
            if (existingPairs.has(key)) continue;
            const membership = { id: nextId(cursor, "CSM", 11000), compSetId, competitorId };
            cursor = [membership, ...cursor];
            created.push(membership);
            existingPairs.add(key);
          }
        }
        if (created.length) dispatch({ type: "COLLECTION_BULK_ADD", collection: "compSetMemberships", payload: created });
        return created;
      },
      bulkRemoveCompetitorsFromCompSet: (competitorIds, compSetId) => {
        const idsToRemove = state.compSetMemberships
          .filter((m) => m.compSetId === compSetId && competitorIds.includes(m.competitorId))
          .map((m) => m.id);
        if (idsToRemove.length) dispatch({ type: "COLLECTION_BULK_DELETE", collection: "compSetMemberships", ids: idsToRemove });
      },

      // Competitors — the primary collection, owned directly by a Property.
      // Fully functional with zero comp set memberships.
      addCompetitor: competitorApi.add,
      updateCompetitor: competitorApi.update,
      archiveCompetitor: competitorApi.archive,
      restoreCompetitor: competitorApi.restore,
      duplicateCompetitor: competitorApi.duplicate,
      // Deleting a competitor permanently cascades to its own mappings/
      // sources/URLs and its comp-set-membership rows — never to the comp sets
      // themselves, which may still have other members.
      deleteCompetitorPermanently: (id) => dispatch({ type: "DELETE_COMPETITOR_CASCADE", payload: id }),
      bulkArchiveCompetitors: competitorApi.bulkArchive,
      bulkRestoreCompetitors: competitorApi.bulkRestore,
      bulkChangeStatusCompetitors: competitorApi.bulkChangeStatus,
      bulkChangePriorityCompetitors: competitorApi.bulkChangePriority,
      bulkDuplicateCompetitors: competitorApi.bulkDuplicate,
      bulkDeleteCompetitors: (ids) => dispatch({ type: "BULK_DELETE_COMPETITORS_CASCADE", ids }),
      togglePinCompetitor: (competitor) => dispatch({ type: "COLLECTION_UPDATE", collection: "competitors", payload: stamp({ ...competitor, pinned: !competitor.pinned }) }),
      // There is no `setBenchmark` here on purpose: the benchmark is always
      // the Phase 1 Property record a competitor is scoped under
      // (`competitor.propertyId` -> `data.properties`), never a competitor
      // itself — so there is nothing to assign, lock, or reassign on the
      // competitor record. Switching which property you're viewing (the
      // left filter panel) is the only way the benchmark ever "changes,"
      // and since every mapping/source/URL already keys off `competitorId`
      // (never a benchmark reference), nothing needs to move when it does.

      // Room Mapping
      addRoomMapping: roomMappingApi.add,
      updateRoomMapping: roomMappingApi.update,
      deleteRoomMapping: (id) => dispatch({ type: "DELETE_ROOM_MAPPING_CASCADE", payload: id }),
      bulkDeleteRoomMappings: (ids) => dispatch({ type: "BULK_DELETE_ROOM_MAPPINGS_CASCADE", ids }),

      // Rate Plan Mapping
      addRatePlanMapping: ratePlanMappingApi.add,
      updateRatePlanMapping: ratePlanMappingApi.update,
      deleteRatePlanMapping: (id) => dispatch({ type: "COLLECTION_DELETE", collection: "ratePlanMappings", payload: id }),
      bulkDeleteRatePlanMappings: ratePlanMappingApi.bulkDelete,

      // Source Configuration
      addSourceConfig: sourceConfigApi.add,
      updateSourceConfig: sourceConfigApi.update,
      archiveSourceConfig: sourceConfigApi.archive,
      restoreSourceConfig: sourceConfigApi.restore,
      duplicateSourceConfig: sourceConfigApi.duplicate,
      deleteSourceConfigPermanently: sourceConfigApi.deletePermanently,
      bulkArchiveSourceConfigs: sourceConfigApi.bulkArchive,
      bulkRestoreSourceConfigs: sourceConfigApi.bulkRestore,
      bulkChangeStatusSourceConfigs: sourceConfigApi.bulkChangeStatus,
      bulkDeleteSourceConfigs: sourceConfigApi.bulkDelete,

      // Properties
      addProperty: (data) => {
        const ownerId = permissions.canViewAllProperties ? (data.ownerId ?? null) : user?.ownerId;
        const property = stamp({ ...data, ownerId, id: nextId(state.properties, "PROP", 1000) });
        dispatch({ type: "ADD_PROPERTY", payload: property });
        return property;
      },
      updateProperty: (property) => dispatch({ type: "UPDATE_PROPERTY", payload: stamp(property) }),
      archiveProperty: (property) => dispatch({ type: "UPDATE_PROPERTY", payload: stamp({ ...property, status: "Archived" }) }),
      restoreProperty: (property) => dispatch({ type: "UPDATE_PROPERTY", payload: stamp({ ...property, status: "Active" }) }),
      deletePropertyPermanently: (id) => dispatch({ type: "DELETE_PROPERTY", payload: id }),
      duplicateProperty: (property) => {
        const copy = stamp({ ...property, id: nextId(state.properties, "PROP", 1000), name: `${property.name} (Copy)`, status: "Draft" });
        dispatch({ type: "ADD_PROPERTY", payload: copy });
        return copy;
      },
      bulkArchiveProperties: (ids) => dispatch({ type: "BULK_UPDATE_PROPERTIES", ids, updater: (p) => stamp({ ...p, status: "Archived" }) }),
      bulkChangeStatusProperties: (ids, status) => dispatch({ type: "BULK_UPDATE_PROPERTIES", ids, updater: (p) => stamp({ ...p, status }) }),
      bulkDuplicateProperties: (ids) => {
        const source = state.properties.filter(inSet(ids));
        let cursor = state.properties;
        const copies = source.map((p) => {
          const copy = stamp({ ...p, id: nextId(cursor, "PROP", 1000), name: `${p.name} (Copy)`, status: "Draft" });
          cursor = [copy, ...cursor];
          return copy;
        });
        dispatch({ type: "BULK_ADD_PROPERTIES", payload: copies });
        return copies;
      },
      bulkDeleteProperties: (ids) => dispatch({ type: "BULK_DELETE_PROPERTIES", ids }),
      bulkRestoreProperties: (ids) => dispatch({ type: "BULK_UPDATE_PROPERTIES", ids, updater: (p) => stamp({ ...p, status: "Active" }) }),

      // Rooms
      addRoom: (data) => {
        const room = stamp({ ...data, id: nextId(state.rooms, "RM", 2000) });
        dispatch({ type: "ADD_ROOM", payload: room });
        return room;
      },
      // Adds multiple rooms in one dispatch, assigning each a unique id off
      // a local cursor — calling addRoom() in a loop would compute the same
      // "next" id for every iteration since state.rooms doesn't update until
      // the next render. Used for multi-property room cloning.
      addRooms: (dataArray) => {
        let cursor = state.rooms;
        const created = dataArray.map((d) => {
          const room = stamp({ ...d, id: nextId(cursor, "RM", 2000) });
          cursor = [room, ...cursor];
          return room;
        });
        dispatch({ type: "BULK_ADD_ROOMS", payload: created });
        return created;
      },
      updateRoom: (room) => dispatch({ type: "UPDATE_ROOM", payload: stamp(room) }),
      archiveRoom: (room) => dispatch({ type: "UPDATE_ROOM", payload: stamp({ ...room, status: "Archived" }) }),
      restoreRoom: (room) => dispatch({ type: "UPDATE_ROOM", payload: stamp({ ...room, status: "Active" }) }),
      deleteRoom: (id) => dispatch({ type: "DELETE_ROOM", payload: id }),
      deleteRoomPermanently: (id) => dispatch({ type: "DELETE_ROOM", payload: id }),
      duplicateRoom: (room) => {
        const copy = stamp({ ...room, id: nextId(state.rooms, "RM", 2000), name: `${room.name} (Copy)` });
        dispatch({ type: "ADD_ROOM", payload: copy });
        return copy;
      },
      bulkArchiveRooms: (ids) => dispatch({ type: "BULK_UPDATE_ROOMS", ids, updater: (r) => stamp({ ...r, status: "Archived" }) }),
      bulkRestoreRooms: (ids) => dispatch({ type: "BULK_UPDATE_ROOMS", ids, updater: (r) => stamp({ ...r, status: "Active" }) }),
      bulkChangeStatusRooms: (ids, status) => dispatch({ type: "BULK_UPDATE_ROOMS", ids, updater: (r) => stamp({ ...r, status }) }),
      bulkDuplicateRooms: (ids) => {
        const source = state.rooms.filter(inSet(ids));
        let cursor = state.rooms;
        const copies = source.map((r) => {
          const copy = stamp({ ...r, id: nextId(cursor, "RM", 2000), name: `${r.name} (Copy)` });
          cursor = [copy, ...cursor];
          return copy;
        });
        dispatch({ type: "BULK_ADD_ROOMS", payload: copies });
        return copies;
      },
      bulkDeleteRooms: (ids) => dispatch({ type: "BULK_DELETE_ROOMS", ids }),

      // Rate Plans
      addRatePlan: (data) => {
        const ratePlan = stamp({ ...data, id: nextId(state.ratePlans, "RP", 3000) });
        dispatch({ type: "ADD_RATE_PLAN", payload: ratePlan });
        return ratePlan;
      },
      updateRatePlan: (ratePlan) => dispatch({ type: "UPDATE_RATE_PLAN", payload: stamp(ratePlan) }),
      archiveRatePlan: (ratePlan) => dispatch({ type: "UPDATE_RATE_PLAN", payload: stamp({ ...ratePlan, status: "Archived" }) }),
      restoreRatePlan: (ratePlan) => dispatch({ type: "UPDATE_RATE_PLAN", payload: stamp({ ...ratePlan, status: "Active" }) }),
      deleteRatePlan: (id) => dispatch({ type: "DELETE_RATE_PLAN", payload: id }),
      deleteRatePlanPermanently: (id) => dispatch({ type: "DELETE_RATE_PLAN", payload: id }),
      duplicateRatePlan: (ratePlan) => {
        const copy = stamp({ ...ratePlan, id: nextId(state.ratePlans, "RP", 3000), name: `${ratePlan.name} (Copy)` });
        dispatch({ type: "ADD_RATE_PLAN", payload: copy });
        return copy;
      },
      bulkArchiveRatePlans: (ids) => dispatch({ type: "BULK_UPDATE_RATE_PLANS", ids, updater: (rp) => stamp({ ...rp, status: "Archived" }) }),
      bulkRestoreRatePlans: (ids) => dispatch({ type: "BULK_UPDATE_RATE_PLANS", ids, updater: (rp) => stamp({ ...rp, status: "Active" }) }),
      bulkChangeStatusRatePlans: (ids, status) => dispatch({ type: "BULK_UPDATE_RATE_PLANS", ids, updater: (rp) => stamp({ ...rp, status }) }),
      bulkDuplicateRatePlans: (ids) => {
        const source = state.ratePlans.filter(inSet(ids));
        let cursor = state.ratePlans;
        const copies = source.map((rp) => {
          const copy = stamp({ ...rp, id: nextId(cursor, "RP", 3000), name: `${rp.name} (Copy)` });
          cursor = [copy, ...cursor];
          return copy;
        });
        dispatch({ type: "BULK_ADD_RATE_PLANS", payload: copies });
        return copies;
      },
      bulkDeleteRatePlans: (ids) => dispatch({ type: "BULK_DELETE_RATE_PLANS", ids }),

      // Rate Plan Rooms — the room-specific layer beneath a Rate Plan. A
      // single Rate Plan can own multiple Rate Plan Rooms (one per Room it
      // applies to). `roomsForRatePlan(ratePlanId)` mirrors the scoping
      // convention used elsewhere in this file — the canonical way a
      // profile page/form fetches only the rows that belong to the record
      // it's editing, each enriched with its own `pricingRanges` array.
      roomsForRatePlan: (ratePlanId) =>
        state.ratePlanRooms
          .filter((rp) => rp.ratePlanId === ratePlanId)
          .map((rp) => ({ ...rp, pricingRanges: state.pricingRanges.filter((pr) => pr.ratePlanRoomId === rp.id) })),
      addRatePlanRoom: (data) => {
        const ratePlanRoom = stamp({ ...data, id: nextId(state.ratePlanRooms, "RPR", 13000) });
        dispatch({ type: "COLLECTION_ADD", collection: "ratePlanRooms", payload: ratePlanRoom });
        return ratePlanRoom;
      },
      updateRatePlanRoom: (ratePlanRoom) => dispatch({ type: "COLLECTION_UPDATE", collection: "ratePlanRooms", payload: stamp(ratePlanRoom) }),
      deleteRatePlanRoom: (id) => dispatch({ type: "DELETE_RATE_PLAN_ROOM_CASCADE", payload: id }),
      bulkAddRatePlanRooms: (dataArray) => {
        let cursor = state.ratePlanRooms;
        const created = dataArray.map((d) => {
          const ratePlanRoom = stamp({ ...d, id: nextId(cursor, "RPR", 13000) });
          cursor = [ratePlanRoom, ...cursor];
          return ratePlanRoom;
        });
        dispatch({ type: "COLLECTION_BULK_ADD", collection: "ratePlanRooms", payload: created });
        return created;
      },
      bulkDeleteRatePlanRooms: (ids) => dispatch({ type: "BULK_DELETE_RATE_PLAN_ROOMS_CASCADE", ids }),

      // Pricing Ranges — a child collection of Rate Plan Rooms.
      // `pricingRangesForRatePlanRoom(ratePlanRoomId)` mirrors the scoping convention
      // used elsewhere in this file (e.g. filtering scopedRoomMappings by
      // competitorId) — the canonical way a profile page/form fetches only
      // the rows that belong to the record it's editing.
      pricingRangesForRatePlanRoom: (ratePlanRoomId) => state.pricingRanges.filter((pr) => pr.ratePlanRoomId === ratePlanRoomId),
      addPricingRange: (data) => {
        const range = stamp({ ...data, id: nextId(state.pricingRanges, "PR", 4000) });
        dispatch({ type: "COLLECTION_ADD", collection: "pricingRanges", payload: range });
        return range;
      },
      updatePricingRange: (range) => dispatch({ type: "COLLECTION_UPDATE", collection: "pricingRanges", payload: stamp(range) }),
      deletePricingRange: (id) => dispatch({ type: "COLLECTION_DELETE", collection: "pricingRanges", payload: id }),
      bulkAddPricingRanges: (dataArray) => {
        let cursor = state.pricingRanges;
        const created = dataArray.map((d) => {
          const range = stamp({ ...d, id: nextId(cursor, "PR", 4000) });
          cursor = [range, ...cursor];
          return range;
        });
        dispatch({ type: "COLLECTION_BULK_ADD", collection: "pricingRanges", payload: created });
        return created;
      },
      bulkDeletePricingRanges: (ids) => dispatch({ type: "COLLECTION_BULK_DELETE", collection: "pricingRanges", ids }),

      // Centralized reconciliation for the Rate Plan form's in-memory Rooms
      // draft. `ratePlanRoomsDraft` is shaped
      // `[{ id, isNew, roomId, pricingRanges: [{ id, isNew, ...rangeFields }] }]`
      // — exactly what RatePlanForm's Rooms tab produces. This is the ONLY
      // place this reconciliation logic lives; page components must call
      // this rather than re-implementing add/update/delete branching.
      saveRatePlanRooms: (ratePlanId, ratePlanRoomsDraft) => {
        const persistedRatePlanRooms = state.ratePlanRooms.filter((rp) => rp.ratePlanId === ratePlanId);
        const persistedIds = new Set(persistedRatePlanRooms.map((rp) => rp.id));
        const draftPersistedIds = new Set(ratePlanRoomsDraft.filter((d) => !d.isNew).map((d) => d.id));

        // (c) Any persisted Rate Plan Room no longer present in the draft at
        // all gets deleted, cascading its Pricing Ranges too.
        const removedIds = persistedRatePlanRooms.filter((rp) => !draftPersistedIds.has(rp.id)).map((rp) => rp.id);
        if (removedIds.length === 1) dispatch({ type: "DELETE_RATE_PLAN_ROOM_CASCADE", payload: removedIds[0] });
        else if (removedIds.length > 1) dispatch({ type: "BULK_DELETE_RATE_PLAN_ROOMS_CASCADE", ids: removedIds });

        let ratePlanRoomCursor = state.ratePlanRooms;
        let pricingRangeCursor = state.pricingRanges;

        ratePlanRoomsDraft.forEach((draft) => {
          if (draft.isNew || !persistedIds.has(draft.id)) {
            // (a) Brand-new Rate Plan Room — create it, then create all of
            // its Pricing Range rows (all new, since the parent is new too).
            const ratePlanRoom = stamp({ ratePlanId, roomId: draft.roomId, id: nextId(ratePlanRoomCursor, "RPR", 13000) });
            ratePlanRoomCursor = [ratePlanRoom, ...ratePlanRoomCursor];
            dispatch({ type: "COLLECTION_ADD", collection: "ratePlanRooms", payload: ratePlanRoom });
            (draft.pricingRanges || []).forEach((row) => {
              const { id, isNew, ...rest } = row;
              const range = stamp({ ...rest, ratePlanRoomId: ratePlanRoom.id, id: nextId(pricingRangeCursor, "PR", 4000) });
              pricingRangeCursor = [range, ...pricingRangeCursor];
              dispatch({ type: "COLLECTION_ADD", collection: "pricingRanges", payload: range });
            });
          } else {
            // (b) Existing Rate Plan Room — update its roomId if changed,
            // then reconcile its Pricing Ranges the same add/update/delete
            // way the per-room Pricing Ranges editor's handleSave already did.
            const existing = persistedRatePlanRooms.find((rp) => rp.id === draft.id);
            if (existing && existing.roomId !== draft.roomId) {
              dispatch({ type: "COLLECTION_UPDATE", collection: "ratePlanRooms", payload: stamp({ ...existing, roomId: draft.roomId }) });
            }
            const persistedRanges = state.pricingRanges.filter((pr) => pr.ratePlanRoomId === draft.id);
            const draftRangeIds = new Set((draft.pricingRanges || []).filter((r) => !r.isNew).map((r) => r.id));
            const rangesToDelete = persistedRanges.filter((pr) => !draftRangeIds.has(pr.id)).map((pr) => pr.id);
            if (rangesToDelete.length) dispatch({ type: "COLLECTION_BULK_DELETE", collection: "pricingRanges", ids: rangesToDelete });

            (draft.pricingRanges || []).forEach((row) => {
              const { id, isNew, ...rest } = row;
              if (isNew || !persistedRanges.some((pr) => pr.id === id)) {
                const range = stamp({ ...rest, ratePlanRoomId: draft.id, id: nextId(pricingRangeCursor, "PR", 4000) });
                pricingRangeCursor = [range, ...pricingRangeCursor];
                dispatch({ type: "COLLECTION_ADD", collection: "pricingRanges", payload: range });
              } else {
                dispatch({ type: "COLLECTION_UPDATE", collection: "pricingRanges", payload: stamp({ id, ...rest, ratePlanRoomId: draft.id }) });
              }
            });
          }
        });
      },

      // Master data (Room Types / Amenities / Room Templates). `kind` is the
      // master table key (mirrors the future MVC route/table name).
      addMasterItem: (kind, data) => {
        const item = stamp({ ...data, id: nextId(state.masters[kind], "MST", 1000) });
        dispatch({ type: "ADD_MASTER_ITEM", kind, payload: item });
        return item;
      },
      updateMasterItem: (kind, item) => dispatch({ type: "UPDATE_MASTER_ITEM", kind, payload: stamp(item) }),
      deleteMasterItem: (kind, id) => dispatch({ type: "DELETE_MASTER_ITEM", kind, id }),
    }),
    [
      state, scopedProperties, scopedRooms, scopedRatePlans, scopedRatePlanRooms, scopedPricingRanges,
      scopedCompSets, scopedCompetitors, scopedCompSetMemberships, scopedRoomMappings, scopedRatePlanMappings, scopedSourceConfigs,
      roomCountFor, ratePlanCountFor, stamp, permissions, user,
    ]
  );

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
