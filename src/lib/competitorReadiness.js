// Configuration Readiness + configuration-summary derivations for Phase 2
// (Competitor Configuration). Everything here is a pure function over
// already-scoped mock records — nothing is stored, nothing is fetched.
//
// The benchmark is always the Phase 1 Property a competitor is scoped
// under — never a competitor itself — so readiness never includes a
// "benchmark selected" check; the benchmark is a given, not something to
// configure. What IS configured, per competitor, is whether its rooms and
// rate plans have been mapped to the benchmark property's own rooms and
// rate plans (Room Mapping, Rate Plan Mapping, Source Configuration,
// Validation, Notes, and Audit History all belong directly to a competitor,
// never to a Comparison Group — groups are purely optional tags).
// `computePropertyReadiness` aggregates across every competitor under a
// property for the Competitors list page's summary. None of this is
// live/historical pricing, and none of it implies a property-to-property
// price comparison — it's a readout of mapping completeness ahead of
// Phase 3's rate collection.

function pct(numerator, denominator) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function computeCompetitorReadiness({ competitor, roomMappings, ratePlanMappings, sourceConfigs }) {
  const infoComplete = !!(competitor.hotelName && competitor.country && competitor.city && (competitor.website || (competitor.otaUrls || []).length > 0));
  const hasRoomMapping = roomMappings.length > 0;
  const hasRatePlanMapping = ratePlanMappings.length > 0;
  const hasSourceConfigured = sourceConfigs.some((s) => !!s.sourceUrl);

  const checks = [
    { key: "info", label: "Competitor Information Complete", passed: infoComplete },
    { key: "roomMapping", label: "Room Mapping Complete", passed: hasRoomMapping },
    { key: "ratePlanMapping", label: "Rate Plan Mapping Complete", passed: hasRatePlanMapping },
    { key: "sourceUrls", label: "Collection Source Configured", passed: hasSourceConfigured },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  const missingItems = [
    !infoComplete && { key: "info", severity: "danger", label: "Missing location or a URL", tab: "overview", hint: "Fill in country, city, and a website or OTA URL." },
    !hasRoomMapping && { key: "roomMapping", severity: "warning", label: "No room mapping yet", tab: "roomMapping", hint: "Map at least one internal room to this competitor." },
    !hasRatePlanMapping && { key: "ratePlanMapping", severity: "warning", label: "No rate plan mapping yet", tab: "ratePlanMapping", hint: "Map at least one internal rate plan to this competitor." },
    !hasSourceConfigured && { key: "sourceUrls", severity: "warning", label: "No collection source configured", tab: "sources", hint: "Configure a source with a URL for this competitor." },
  ].filter(Boolean);

  const allTimestamps = [
    competitor.lastModifiedAt,
    ...roomMappings.map((m) => m.lastModifiedAt),
    ...ratePlanMappings.map((m) => m.lastModifiedAt),
    ...sourceConfigs.map((s) => s.lastModifiedAt),
  ].filter(Boolean);
  const lastModifiedAt = allTimestamps.length ? allTimestamps.sort().at(-1) : competitor.lastModifiedAt;

  return { score, checks, missingItems, lastModifiedAt, competitor };
}

// Aggregates every active competitor's readiness under a property — used by
// the Competitors list page's summary KPIs. The benchmark itself (the
// property, read from Phase 1) is never part of this score: it's always
// present by definition, since a competitor can't exist without being
// scoped to one of our own managed properties.
export function computePropertyReadiness({ property, competitors, roomMappings, ratePlanMappings, sourceConfigs }) {
  const activeCompetitors = competitors.filter((c) => c.status !== "Archived");
  const perCompetitor = activeCompetitors.map((c) =>
    computeCompetitorReadiness({
      competitor: c,
      roomMappings: roomMappings.filter((m) => m.competitorId === c.id),
      ratePlanMappings: ratePlanMappings.filter((m) => m.competitorId === c.id),
      sourceConfigs: sourceConfigs.filter((s) => s.competitorId === c.id),
    })
  );
  const score = perCompetitor.length ? Math.round(perCompetitor.reduce((sum, r) => sum + r.score, 0) / perCompetitor.length) : 0;

  return {
    property, score,
    competitorCount: activeCompetitors.length,
    configuredCount: perCompetitor.filter((r) => r.score === 100).length,
    perCompetitor,
  };
}

function readinessBucket(score) {
  if (score === 100) return "Ready";
  if (score >= 50) return "Needs Attention";
  return "Not Ready";
}

export { readinessBucket };

const ACTIVITY_LABELS = {
  competitor: (r) => ({ label: r.hotelName, meta: "Competitor" }),
  roomMapping: (r) => ({ label: r.competitorRoomLabel, meta: "Room Mapping" }),
  ratePlanMapping: (r) => ({ label: r.competitorRatePlanName, meta: "Rate Plan Mapping" }),
  sourceConfig: (r) => ({ label: r.sourceName, meta: "Source Configuration" }),
  urlRecord: (r) => ({ label: r.label, meta: "URL Record" }),
};

// Recent Activity is derived, not logged — every record already carries
// `lastModifiedBy`/`lastModifiedAt` (DataContext's `stamp()`), so a feed is
// just those records merged, sorted, and capped, with no separate event
// store to keep in sync. Scoped to one competitor.
export function computeRecentActivity({ competitor, roomMappings, ratePlanMappings, sourceConfigs, urlRecords }, limit = 6) {
  const entries = [
    { type: "competitor", record: competitor },
    ...roomMappings.map((r) => ({ type: "roomMapping", record: r })),
    ...ratePlanMappings.map((r) => ({ type: "ratePlanMapping", record: r })),
    ...sourceConfigs.map((r) => ({ type: "sourceConfig", record: r })),
    ...urlRecords.map((r) => ({ type: "urlRecord", record: r })),
  ].filter((e) => e.record?.lastModifiedAt);

  return entries
    .sort((a, b) => (a.record.lastModifiedAt < b.record.lastModifiedAt ? 1 : -1))
    .slice(0, limit)
    .map((e) => ({
      key: `${e.type}-${e.record.id}`,
      type: e.type,
      ...ACTIVITY_LABELS[e.type](e.record),
      by: e.record.lastModifiedBy || "System",
      at: e.record.lastModifiedAt,
    }));
}
