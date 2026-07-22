import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react";
import { PROPERTIES } from "../mocks/properties.js";
import { ROOMS } from "../mocks/rooms.js";
import { RATE_PLANS } from "../mocks/ratePlans.js";
import { ROOM_TYPES_MASTER, AMENITIES_MASTER, ROOM_TEMPLATES_MASTER, RATE_SEASONS_MASTER, SOURCE_TYPES_MASTER } from "../mocks/masterData.js";
import { COMPARISON_GROUPS, COMPETITORS, GROUP_MEMBERSHIPS, ROOM_MAPPINGS, RATE_PLAN_MAPPINGS, SOURCE_CONFIGS, URL_RECORDS } from "../mocks/competitors.js";
import { useAuth } from "./AuthContext.jsx";
import { getPermissions } from "../lib/permissions.js";

const DataContext = createContext(null);

const initialState = {
  properties: PROPERTIES,
  rooms: ROOMS,
  ratePlans: RATE_PLANS,
  // Phase 2 (Competitor Configuration) collections. Competitors are owned
  // directly by a Property (`propertyId`) — the primary collection. Rate/
  // Room Mapping, Source Configuration, and URL records are owned directly
  // by a Competitor (`competitorId`). Comparison Groups are a pure, optional
  // tagging layer: they never own a competitor, they only *reference* one
  // via `groupMemberships` (a many-to-many bridge table). Phase 1 mock data
  // is never written to from here — Phase 1 is read-only reference data.
  comparisonGroups: COMPARISON_GROUPS,
  competitors: COMPETITORS,
  groupMemberships: GROUP_MEMBERSHIPS,
  roomMappings: ROOM_MAPPINGS,
  ratePlanMappings: RATE_PLAN_MAPPINGS,
  sourceConfigs: SOURCE_CONFIGS,
  urlRecords: URL_RECORDS,
  masters: {
    roomTypes: ROOM_TYPES_MASTER,
    amenities: AMENITIES_MASTER,
    roomTemplates: ROOM_TEMPLATES_MASTER,
    rateSeasons: RATE_SEASONS_MASTER,
    sourceTypes: SOURCE_TYPES_MASTER,
  },
};

// Phase 2 collections (comparisonGroups, competitors, roomMappings,
// ratePlanMappings, sourceConfigs, urlRecords) follow the exact same
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
    case "DELETE_ROOM":
      return {
        ...state,
        rooms: state.rooms.filter((r) => r.id !== action.payload),
        ratePlans: state.ratePlans.filter((rp) => rp.roomId !== action.payload),
      };
    case "BULK_UPDATE_ROOMS":
      return { ...state, rooms: state.rooms.map((r) => (action.ids.includes(r.id) ? action.updater(r) : r)) };
    case "BULK_ADD_ROOMS":
      return { ...state, rooms: [...action.payload, ...state.rooms] };
    case "BULK_DELETE_ROOMS":
      return {
        ...state,
        rooms: state.rooms.filter(notInSet(action.ids)),
        ratePlans: state.ratePlans.filter((rp) => !action.ids.includes(rp.roomId)),
      };

    case "ADD_RATE_PLAN":
      return { ...state, ratePlans: [action.payload, ...state.ratePlans] };
    case "UPDATE_RATE_PLAN":
      return { ...state, ratePlans: state.ratePlans.map((rp) => (rp.id === action.payload.id ? action.payload : rp)) };
    case "DELETE_RATE_PLAN":
      return { ...state, ratePlans: state.ratePlans.filter((rp) => rp.id !== action.payload) };
    case "BULK_UPDATE_RATE_PLANS":
      return { ...state, ratePlans: state.ratePlans.map((rp) => (action.ids.includes(rp.id) ? action.updater(rp) : rp)) };
    case "BULK_ADD_RATE_PLANS":
      return { ...state, ratePlans: [...action.payload, ...state.ratePlans] };
    case "BULK_DELETE_RATE_PLANS":
      return { ...state, ratePlans: state.ratePlans.filter(notInSet(action.ids)) };

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

    // A Comparison Group is a pure tagging layer — deleting it (or bulk-
    // deleting several) only ever removes the group row itself and its
    // membership references. Competitors, and everything owned by a
    // competitor (mappings/sources/URLs), are completely untouched.
    case "DELETE_COMPARISON_GROUP_CASCADE":
      return {
        ...state,
        comparisonGroups: state.comparisonGroups.filter((g) => g.id !== action.payload),
        groupMemberships: state.groupMemberships.filter((m) => m.groupId !== action.payload),
      };
    case "BULK_DELETE_COMPARISON_GROUPS_CASCADE":
      return {
        ...state,
        comparisonGroups: state.comparisonGroups.filter(notInSet(action.ids)),
        groupMemberships: state.groupMemberships.filter((m) => !action.ids.includes(m.groupId)),
      };
    // A Competitor owns its own Mapping/Source/URL records and its own
    // group-membership rows — deleting it permanently cascades to all four,
    // but never touches the Comparison Group rows themselves.
    case "DELETE_COMPETITOR_CASCADE":
      return {
        ...state,
        competitors: state.competitors.filter((c) => c.id !== action.payload),
        groupMemberships: state.groupMemberships.filter((m) => m.competitorId !== action.payload),
        roomMappings: state.roomMappings.filter((m) => m.competitorId !== action.payload),
        ratePlanMappings: state.ratePlanMappings.filter((m) => m.competitorId !== action.payload),
        sourceConfigs: state.sourceConfigs.filter((s) => s.competitorId !== action.payload),
        urlRecords: state.urlRecords.filter((u) => u.competitorId !== action.payload),
      };
    case "BULK_DELETE_COMPETITORS_CASCADE":
      return {
        ...state,
        competitors: state.competitors.filter(notInSet(action.ids)),
        groupMemberships: state.groupMemberships.filter((m) => !action.ids.includes(m.competitorId)),
        roomMappings: state.roomMappings.filter((m) => !action.ids.includes(m.competitorId)),
        ratePlanMappings: state.ratePlanMappings.filter((m) => !action.ids.includes(m.competitorId)),
        sourceConfigs: state.sourceConfigs.filter((s) => !action.ids.includes(s.competitorId)),
        urlRecords: state.urlRecords.filter((u) => !action.ids.includes(u.competitorId)),
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

  const scopedRatePlans = useMemo(
    () => (permissions.canViewAllProperties ? state.ratePlans : state.ratePlans.filter((rp) => scopedRoomIds.has(rp.roomId))),
    [state.ratePlans, permissions.canViewAllProperties, scopedRoomIds]
  );

  const roomCountFor = useCallback((propertyId) => state.rooms.filter((r) => r.propertyId === propertyId).length, [state.rooms]);
  const ratePlanCountFor = useCallback(
    (propertyId) => {
      const roomIds = new Set(state.rooms.filter((r) => r.propertyId === propertyId).map((r) => r.id));
      return state.ratePlans.filter((rp) => roomIds.has(rp.roomId)).length;
    },
    [state.rooms, state.ratePlans]
  );

  // Phase 2 scoping mirrors Phase 1 exactly: Competitors are scoped by
  // propertyId the same way Rooms are (they're the primary collection now,
  // not nested under a group); everything a competitor owns (Mappings/
  // Sources/URLs/group memberships) is then scoped transitively by
  // competitorId, so an out-of-scope property can never leak its competitor
  // configuration to a user who can't see the property itself. Comparison
  // Groups are scoped by their own propertyId — independently of which
  // competitors happen to reference them.
  const scopedComparisonGroups = useMemo(
    () => (permissions.canViewAllProperties ? state.comparisonGroups : state.comparisonGroups.filter((g) => scopedPropertyIds.has(g.propertyId))),
    [state.comparisonGroups, permissions.canViewAllProperties, scopedPropertyIds]
  );
  const scopedGroupIds = useMemo(() => new Set(scopedComparisonGroups.map((g) => g.id)), [scopedComparisonGroups]);
  const scopedCompetitors = useMemo(
    () => (permissions.canViewAllProperties ? state.competitors : state.competitors.filter((c) => scopedPropertyIds.has(c.propertyId))),
    [state.competitors, permissions.canViewAllProperties, scopedPropertyIds]
  );
  const scopedCompetitorIds = useMemo(() => new Set(scopedCompetitors.map((c) => c.id)), [scopedCompetitors]);
  const scopedGroupMemberships = useMemo(
    () =>
      permissions.canViewAllProperties
        ? state.groupMemberships
        : state.groupMemberships.filter((m) => scopedGroupIds.has(m.groupId) && scopedCompetitorIds.has(m.competitorId)),
    [state.groupMemberships, permissions.canViewAllProperties, scopedGroupIds, scopedCompetitorIds]
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
  const scopedUrlRecords = useMemo(
    () => (permissions.canViewAllProperties ? state.urlRecords : state.urlRecords.filter((u) => scopedCompetitorIds.has(u.competitorId))),
    [state.urlRecords, permissions.canViewAllProperties, scopedCompetitorIds]
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

  const comparisonGroupApi = makeCollectionApi("comparisonGroups", "CGRP", 5000, "name");
  const competitorApi = makeCollectionApi("competitors", "CMP", 6000, "hotelName");
  const roomMappingApi = makeCollectionApi("roomMappings", "RMAP", 7000, "competitorRoomLabel");
  const ratePlanMappingApi = makeCollectionApi("ratePlanMappings", "RPMAP", 8000, "competitorRatePlanName");
  const sourceConfigApi = makeCollectionApi("sourceConfigs", "SRC", 9000, "sourceName");
  const urlRecordApi = makeCollectionApi("urlRecords", "URL", 10000, "label");

  const api = useMemo(
    () => ({
      ...state,
      properties: scopedProperties,
      rooms: scopedRooms,
      ratePlans: scopedRatePlans,
      comparisonGroups: scopedComparisonGroups,
      competitors: scopedCompetitors,
      groupMemberships: scopedGroupMemberships,
      roomMappings: scopedRoomMappings,
      ratePlanMappings: scopedRatePlanMappings,
      sourceConfigs: scopedSourceConfigs,
      urlRecords: scopedUrlRecords,
      roomCountFor,
      ratePlanCountFor,

      // Comparison Groups — a pure, optional organizational layer. They
      // never own a Competitor; duplicating or deleting one only ever
      // touches the group row and its `groupMemberships` reference rows.
      addComparisonGroup: comparisonGroupApi.add,
      updateComparisonGroup: comparisonGroupApi.update,
      archiveComparisonGroup: comparisonGroupApi.archive,
      restoreComparisonGroup: comparisonGroupApi.restore,
      duplicateComparisonGroup: (group) => {
        const copy = comparisonGroupApi.duplicate(group);
        // The duplicate keeps the same member competitors (new membership
        // rows pointing at the same competitor ids) — competitors are never
        // cloned, since a group is just a reference collection, not an
        // owner.
        const sourceMemberships = state.groupMemberships.filter((m) => m.groupId === group.id);
        if (sourceMemberships.length) {
          let cursor = state.groupMemberships;
          const cloned = sourceMemberships.map((m) => {
            const clone = { id: nextId(cursor, "CGM", 11000), groupId: copy.id, competitorId: m.competitorId };
            cursor = [clone, ...cursor];
            return clone;
          });
          dispatch({ type: "COLLECTION_BULK_ADD", collection: "groupMemberships", payload: cloned });
        }
        return copy;
      },
      // Deleting a group permanently only cascades to its membership
      // references — competitors and their configuration are untouched.
      deleteComparisonGroupPermanently: (id) => dispatch({ type: "DELETE_COMPARISON_GROUP_CASCADE", payload: id }),
      bulkArchiveComparisonGroups: comparisonGroupApi.bulkArchive,
      bulkRestoreComparisonGroups: comparisonGroupApi.bulkRestore,
      bulkChangeStatusComparisonGroups: comparisonGroupApi.bulkChangeStatus,
      bulkDuplicateComparisonGroups: comparisonGroupApi.bulkDuplicate,
      bulkDeleteComparisonGroups: (ids) => dispatch({ type: "BULK_DELETE_COMPARISON_GROUPS_CASCADE", ids }),

      // Group membership (many-to-many bridge) — the only place a Competitor
      // and a Comparison Group are ever linked. Adding/removing a membership
      // never touches the competitor record or the group record.
      addGroupMembership: (groupId, competitorId) => {
        const exists = state.groupMemberships.some((m) => m.groupId === groupId && m.competitorId === competitorId);
        if (exists) return null;
        const membership = { id: nextId(state.groupMemberships, "CGM", 11000), groupId, competitorId };
        dispatch({ type: "COLLECTION_ADD", collection: "groupMemberships", payload: membership });
        return membership;
      },
      removeGroupMembership: (groupId, competitorId) => {
        const existing = state.groupMemberships.find((m) => m.groupId === groupId && m.competitorId === competitorId);
        if (existing) dispatch({ type: "COLLECTION_DELETE", collection: "groupMemberships", payload: existing.id });
      },
      // Bulk-assign several competitors to several groups in one dispatch —
      // used by the Competitors list's "Assign to Group(s)" bulk action.
      // Skips pairs that are already members instead of creating duplicates.
      bulkAssignCompetitorsToGroups: (competitorIds, groupIds) => {
        const existingPairs = new Set(state.groupMemberships.map((m) => `${m.groupId}::${m.competitorId}`));
        let cursor = state.groupMemberships;
        const created = [];
        for (const groupId of groupIds) {
          for (const competitorId of competitorIds) {
            const key = `${groupId}::${competitorId}`;
            if (existingPairs.has(key)) continue;
            const membership = { id: nextId(cursor, "CGM", 11000), groupId, competitorId };
            cursor = [membership, ...cursor];
            created.push(membership);
            existingPairs.add(key);
          }
        }
        if (created.length) dispatch({ type: "COLLECTION_BULK_ADD", collection: "groupMemberships", payload: created });
        return created;
      },
      bulkRemoveCompetitorsFromGroup: (competitorIds, groupId) => {
        const idsToRemove = state.groupMemberships
          .filter((m) => m.groupId === groupId && competitorIds.includes(m.competitorId))
          .map((m) => m.id);
        if (idsToRemove.length) dispatch({ type: "COLLECTION_BULK_DELETE", collection: "groupMemberships", ids: idsToRemove });
      },

      // Competitors — the primary collection, owned directly by a Property.
      // Fully functional with zero group memberships.
      addCompetitor: competitorApi.add,
      updateCompetitor: competitorApi.update,
      archiveCompetitor: competitorApi.archive,
      restoreCompetitor: competitorApi.restore,
      duplicateCompetitor: competitorApi.duplicate,
      // Deleting a competitor permanently cascades to its own mappings/
      // sources/URLs and its group-membership rows — never to the groups
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

      // URL Manager
      addUrlRecord: urlRecordApi.add,
      updateUrlRecord: urlRecordApi.update,
      archiveUrlRecord: urlRecordApi.archive,
      restoreUrlRecord: urlRecordApi.restore,
      deleteUrlRecordPermanently: urlRecordApi.deletePermanently,
      bulkDeleteUrlRecords: urlRecordApi.bulkDelete,

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
      state, scopedProperties, scopedRooms, scopedRatePlans,
      scopedComparisonGroups, scopedCompetitors, scopedGroupMemberships, scopedRoomMappings, scopedRatePlanMappings, scopedSourceConfigs, scopedUrlRecords,
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
