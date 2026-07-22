// Central RBAC permission model.
//
// This is the ONE deliberate seam where "role" is translated into a flat set
// of capability flags. Every other component/page must consume the flags
// below (via usePermissions()) and must never compare user.role directly.
//
// When a real backend exists, ASP.NET Identity would issue a JWT with claims
// (e.g. "permissions": ["properties:view-all", "integrations:manage", ...]).
// At that point `getPermissions(role)` can be replaced by a function that
// derives this same flat object from the decoded token's claims/policies —
// no consuming component needs to change.

export const ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  PROPERTY_OWNER: "PropertyOwner",
};

// Settings tabs each role is allowed to see. Keys must match the `key`
// used in SettingsPage's tab definitions. "competitorConfig" is Phase 2's
// Configuration Settings category — a top-level tab inside this same
// Settings module (General/Comparison Rules/Room Mapping/Rate Plan
// Mapping/Sources & URL Validation/Import & Export live inside it via its
// own nested tab bar), not a separate settings page/route.
const SETTINGS_SECTIONS_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: ["general", "defaults", "competitorConfig", "integrations", "appearance"],
  [ROLES.PROPERTY_OWNER]: ["general", "defaults", "competitorConfig", "appearance"],
};

const BASE_PERMISSIONS = {
  // Scope of data visible across Properties / Rooms / Rate Plans / Search / KPIs.
  canViewAllProperties: false,

  // Property lifecycle
  canCreateProperty: false,
  canEditPropertyId: false, // Property ID is system-generated; no role edits it today.
  canDeletePropertyPermanently: false,

  // Room lifecycle
  canCreateRoom: false,
  canDeleteRoomPermanently: false,

  // Rate plan lifecycle
  canCreateRatePlan: false,
  canDeleteRatePlanPermanently: false,

  // Integrations surface (Settings tab, KPI card, anywhere else)
  canManageIntegrations: false,
  canViewIntegrations: false,

  // Phase 2 — Competitor Configuration lifecycle. One flag covers the whole
  // module (Competitive Sets, Competitors, Mappings, Sources, URLs) since
  // Phase 2 has no finer-grained sub-roles yet, mirroring how Rooms/Rate
  // Plans only split "create" from "delete permanently."
  canManageCompetitors: false,
  canDeleteCompSetPermanently: false,
};

const PERMISSIONS_BY_ROLE = {
  [ROLES.SUPER_ADMIN]: {
    ...BASE_PERMISSIONS,
    canViewAllProperties: true,
    canCreateProperty: true,
    canDeletePropertyPermanently: true,
    canCreateRoom: true,
    canDeleteRoomPermanently: true,
    canCreateRatePlan: true,
    canDeleteRatePlanPermanently: true,
    canManageIntegrations: true,
    canViewIntegrations: true,
    canManageCompetitors: true,
    canDeleteCompSetPermanently: true,
  },
  [ROLES.PROPERTY_OWNER]: {
    ...BASE_PERMISSIONS,
    canViewAllProperties: false,
    canCreateProperty: true,
    canDeletePropertyPermanently: true, // scoped to their own properties by the data layer
    canCreateRoom: true,
    canDeleteRoomPermanently: false,
    canCreateRatePlan: true,
    canDeleteRatePlanPermanently: false,
    canManageIntegrations: false,
    canViewIntegrations: false,
    canManageCompetitors: true,
    canDeleteCompSetPermanently: false,
  },
};

/**
 * Returns a flat permissions object for the given role.
 * Unknown/missing roles get the most restrictive (PropertyOwner-shaped) set
 * of flags, minus creation rights, as a safe default.
 */
export function getPermissions(role) {
  const flags = PERMISSIONS_BY_ROLE[role] || { ...BASE_PERMISSIONS };
  return {
    ...flags,
    role: role || null,
    canAccessSettingsSection: (section) => (SETTINGS_SECTIONS_BY_ROLE[role] || []).includes(section),
  };
}
