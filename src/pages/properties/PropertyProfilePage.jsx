import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building, MapPin, Star, Pencil, Copy, Archive, RotateCcw, Trash2,
  LayoutGrid, Phone, MapPinned, Settings as SettingsIcon, BedDouble, Tag, StickyNote, Plus,
} from "lucide-react";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge, StatusBadge } from "../../components/ui/Badge.jsx";
import { TagChips } from "../../components/ui/TagChips.jsx";
import { Textarea } from "../../components/ui/Input.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { ExportMenu } from "../../components/ui/ExportMenu.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { formatDate } from "../../lib/format.js";
import { useData } from "../../context/DataContext.jsx";
import { usePropertyContext } from "../../context/PropertyContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { PropertyForm } from "./PropertyForm.jsx";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "contact", label: "Contact Information", icon: Phone },
  { key: "address", label: "Address", icon: MapPinned },
  { key: "operational", label: "Operational Information", icon: SettingsIcon },
  { key: "rooms", label: "Rooms", icon: BedDouble },
  { key: "ratePlans", label: "Rate Plans", icon: Tag },
  { key: "notes", label: "Notes", icon: StickyNote },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export function PropertyProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const toast = useToast();
  const { setSelectedPropertyIds } = usePropertyContext();
  const [active, setActive] = useState("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState("");

  const property = data.properties.find((p) => p.id === id);
  const goToScoped = (path) => {
    if (property) setSelectedPropertyIds([property.id]);
    navigate(path);
  };
  const rooms = useMemo(() => (property ? data.rooms.filter((r) => r.propertyId === property.id) : []), [data.rooms, property]);
  const roomIds = useMemo(() => new Set(rooms.map((r) => r.id)), [rooms]);
  // A Rate Plan shows up here if it has at least one entry in `ratePlanRooms`
  // pointing at a room in this property — de-duplicated so a Rate Plan with
  // multiple rooms in this property only appears once. Rate Plans no longer
  // carry a direct `roomId`.
  const ratePlanRoomCountByRatePlanId = useMemo(() => {
    const counts = {};
    data.ratePlanRooms.filter((rp) => roomIds.has(rp.roomId)).forEach((rp) => {
      counts[rp.ratePlanId] = (counts[rp.ratePlanId] || 0) + 1;
    });
    return counts;
  }, [data.ratePlanRooms, roomIds]);
  const ratePlans = useMemo(
    () => data.ratePlans.filter((rp) => ratePlanRoomCountByRatePlanId[rp.id] > 0),
    [data.ratePlans, ratePlanRoomCountByRatePlanId]
  );

  if (!property) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Properties", to: "/portal/properties" }, { label: "Not found" }]} />
        <EmptyState icon={Building} title="Property not found" message="It may have been deleted." action={<Button variant="secondary" onClick={() => navigate("/portal/properties")}>Back to Properties</Button>} />
      </div>
    );
  }

  const handleSubmit = (form, opts) => {
    data.updateProperty({ ...property, ...form });
    toast.success(`${form.name} updated.`);
    if (!opts?.keepOpen) setFormOpen(false);
  };

  const handleDuplicate = () => {
    const copy = data.duplicateProperty(property);
    toast.info(`Duplicated as ${copy.id}.`);
    navigate(`/portal/properties/${copy.id}`);
  };

  const handleArchive = () => { data.archiveProperty(property); toast.info(`${property.name} archived.`); };
  const handleRestore = () => { data.restoreProperty(property); toast.success(`${property.name} restored.`); };
  const handleDeletePermanently = () => {
    data.deletePropertyPermanently(property.id);
    toast.success(`${property.name} permanently deleted.`);
    navigate("/portal/properties");
  };

  const exportColumns = [
    { label: "Property ID", value: (p) => p.id },
    { label: "Name", value: (p) => p.name },
    { label: "City", value: (p) => p.city },
    { label: "Country", value: (p) => p.country },
    { label: "Status", value: (p) => p.status },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Properties", to: "/portal/properties" }, { label: property.name }]} />

      <Card>
        <div className="profile-header">
          <div className="property-thumb property-thumb--lg">
            {property.logoUrl ? <img src={property.logoUrl} alt="" /> : <Building size={22} strokeWidth={2} />}
          </div>
          <div className="profile-header__info">
            <div className="profile-header__title">{property.name}</div>
            <div className="profile-header__subtitle">
              <MapPin size={13} strokeWidth={2} /> {property.city}, {property.country}
              <span style={{ marginLeft: 8 }}><StatusBadge status={property.status} /></span>
            </div>
          </div>
          <div className="profile-header__actions">
            <ExportMenu rows={[property]} columns={exportColumns} filenameBase={`property-${property.id}`} />
            <Button variant="ghost" size="md" icon={Copy} onClick={handleDuplicate}>Duplicate</Button>
            {property.status !== "Archived" ? (
              <Button variant="ghost" size="md" icon={Archive} onClick={handleArchive}>Archive</Button>
            ) : (
              <Button variant="ghost" size="md" icon={RotateCcw} onClick={handleRestore}>Restore</Button>
            )}
            <Button variant="primary" size="md" icon={Pencil} onClick={() => setFormOpen(true)}>Edit</Button>
          </div>
        </div>
      </Card>

      <div className="page-section">
        <Tabs tabs={TABS} active={active} onChange={setActive} />
      </div>

      {active === "overview" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Property ID</span><strong className="tabular">{property.id}</strong></div>
            <div className="detail-field"><span>Property Type</span><strong>{property.propertyType}</strong></div>
            <div className="detail-field"><span>Star Rating</span><strong><Star size={12} strokeWidth={2} fill="currentColor" style={{ marginRight: 4, color: "var(--color-warning)" }} />{property.starRating}</strong></div>
            <div className="detail-field"><span>Rooms</span><strong className="tabular">{rooms.length}</strong></div>
            <div className="detail-field"><span>Rate Plans</span><strong className="tabular">{ratePlans.length}</strong></div>
            <div className="detail-field"><span>Last Modified</span><strong className="tabular">{formatDate(property.lastModifiedAt)} &middot; {property.lastModifiedBy}</strong></div>
          </div>
          <div className="detail-field detail-field--full" style={{ marginTop: 16 }}>
            <span>Classification</span>
            <div className="tag-chips">
              <Badge variant="info">{property.propertyType}</Badge>
              {property.propertyCategory && <Badge variant="info">{property.propertyCategory}</Badge>}
              {property.serviceModel && <Badge variant="success">{property.serviceModel}</Badge>}
              {property.accommodationStyle && <Badge variant="warning">{property.accommodationStyle}</Badge>}
            </div>
          </div>
          <div className="detail-field detail-field--full" style={{ marginTop: 16 }}>
            <span>Tags</span>
            <TagChips tags={property.tags} max={20} />
          </div>
          {property.description && (
            <div className="detail-field detail-field--full" style={{ marginTop: 16 }}>
              <span>Description</span>
              <p className="detail-view__description">{property.description}</p>
            </div>
          )}
        </Card>
      )}

      {active === "contact" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Contact Person</span><strong>{property.contactName || "Not set"}</strong></div>
            <div className="detail-field"><span>Phone</span><strong>{property.contactPhone || "Not set"}</strong></div>
            <div className="detail-field"><span>Mobile</span><strong>{property.contactMobile || "Not set"}</strong></div>
            <div className="detail-field"><span>Email</span><strong>{property.contactEmail || "Not set"}</strong></div>
            <div className="detail-field"><span>Website</span><strong>{property.contactWebsite || "Not set"}</strong></div>
          </div>
        </Card>
      )}

      {active === "address" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Country</span><strong>{property.country}</strong></div>
            <div className="detail-field"><span>State / Region</span><strong>{property.state || "Not set"}</strong></div>
            <div className="detail-field"><span>City</span><strong>{property.city}</strong></div>
            <div className="detail-field"><span>Address Line</span><strong>{property.addressLine || "Not set"}</strong></div>
          </div>
        </Card>
      )}

      {active === "operational" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Currency</span><strong>{property.currency}</strong></div>
            <div className="detail-field"><span>Time Zone</span><strong>{property.timeZone}</strong></div>
            <div className="detail-field"><span>Status</span><strong><StatusBadge status={property.status} /></strong></div>
            <div className="detail-field"><span>Property Type</span><strong>{property.propertyType}</strong></div>
          </div>
        </Card>
      )}

      {active === "rooms" && (
        <Card padded={false}>
          <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Rooms at {property.name}</h3>
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => goToScoped("/portal/rooms")}>Manage Rooms</Button>
          </div>
          <div style={{ padding: 20 }}>
            {rooms.length === 0 ? (
              <EmptyState
                icon={BedDouble}
                title="No rooms yet"
                message="Create your first room for this property, or import one from a template."
                action={<Button variant="secondary" size="sm" icon={Plus} onClick={() => goToScoped("/portal/rooms")}>Create Room</Button>}
              />
            ) : (
              <div className="detail-linked-list">
                {rooms.map((r) => (
                  <div key={r.id} className="detail-linked-item" style={{ cursor: "pointer" }} onClick={() => goToScoped("/portal/rooms")}>
                    <span>{r.name} <span className="table__cell-muted">&middot; {r.roomType}</span></span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {active === "ratePlans" && (
        <Card padded={false}>
          <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Rate Plans at {property.name}</h3>
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => goToScoped("/portal/rate-plans")}>Manage Rate Plans</Button>
          </div>
          <div style={{ padding: 20 }}>
            {ratePlans.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No rate plans yet"
                message="Create your first rate plan for a room in this property, or import one from a template."
                action={<Button variant="secondary" size="sm" icon={Plus} onClick={() => goToScoped("/portal/rate-plans")}>Create Rate Plan</Button>}
              />
            ) : (
              <div className="detail-linked-list">
                {ratePlans.map((rp) => (
                  <div key={rp.id} className="detail-linked-item" style={{ cursor: "pointer" }} onClick={() => navigate(`/portal/rate-plans/${rp.id}`)}>
                    <span>{rp.name} <span className="table__cell-muted">({ratePlanRoomCountByRatePlanId[rp.id]} room{ratePlanRoomCountByRatePlanId[rp.id] === 1 ? "" : "s"})</span></span>
                    <span className="table__cell-muted">
                      {rp.startDate || rp.endDate ? `${rp.startDate || "…"} – ${rp.endDate || "…"}` : "Always applicable"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {active === "notes" && (
        <Card>
          <div className="notes-panel">
            <Textarea
              placeholder="Add internal notes about this property..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
            />
            <div>
              <Button variant="primary" size="sm" onClick={() => toast.success("Notes saved (session only).")}>Save Notes</Button>
            </div>
            <p className="notes-panel__hint">Notes are kept in this session only — a real notes/audit endpoint will replace this once the backend exists.</p>
          </div>
        </Card>
      )}

      {active === "settings" && (
        <Card>
          <div className="detail-field" style={{ marginBottom: 20 }}>
            <span>Current Status</span>
            <strong><StatusBadge status={property.status} /></strong>
          </div>
          <div className="danger-zone">
            <div>
              <div className="danger-zone__title">Danger Zone</div>
              <div className="danger-zone__desc">
                {property.status === "Archived"
                  ? "Permanently delete this property, its rooms, and its rate plans. This cannot be undone."
                  : "Archive this property before it can be permanently deleted."}
              </div>
            </div>
            {property.status === "Archived" ? (
              <Button variant="danger" size="md" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete Permanently</Button>
            ) : (
              <Button variant="ghost" size="md" icon={Archive} onClick={handleArchive}>Archive First</Button>
            )}
          </div>
        </Card>
      )}

      <PropertyForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={property} />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeletePermanently}
        title="Delete Property Permanently"
        message={`"${property.name}" is archived. Permanently deleting it will also remove its rooms and rate plans. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
