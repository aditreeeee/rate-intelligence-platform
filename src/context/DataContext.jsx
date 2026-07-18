import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react";
import { PROPERTIES } from "../mocks/properties.js";
import { ROOMS } from "../mocks/rooms.js";
import { RATE_PLANS } from "../mocks/ratePlans.js";
import { useAuth } from "./AuthContext.jsx";
import { getPermissions } from "../lib/permissions.js";

const DataContext = createContext(null);

const initialState = {
  properties: PROPERTIES,
  rooms: ROOMS,
  ratePlans: RATE_PLANS,
};

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

  const api = useMemo(
    () => ({
      ...state,
      properties: scopedProperties,
      rooms: scopedRooms,
      ratePlans: scopedRatePlans,
      roomCountFor,
      ratePlanCountFor,

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
    }),
    [state, scopedProperties, scopedRooms, scopedRatePlans, roomCountFor, ratePlanCountFor, stamp, permissions, user]
  );

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
