import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BedDouble, MapPin, Pencil, Copy, Archive, RotateCcw, Trash2,
  LayoutGrid, Layers, Users, Sofa, Eye, Accessibility, Heart, Tag, StickyNote, Plus,
} from "lucide-react";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs.jsx";
import { Tabs } from "../../components/ui/Tabs.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Badge, StatusBadge } from "../../components/ui/Badge.jsx";
import { TagChips } from "../../components/ui/TagChips.jsx";
import { Textarea } from "../../components/ui/Input.jsx";
import { ConfirmModal } from "../../components/ui/Modal.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { formatDate, formatCurrency } from "../../lib/format.js";
import { getCurrentActivePeriod } from "../../lib/pricingPeriods.js";
import { useData } from "../../context/DataContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { isSuiteRoomType } from "../../mocks/roomClassification.js";
import { RoomForm } from "./RoomForm.jsx";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "classification", label: "Classification", icon: Layers },
  { key: "occupancy", label: "Occupancy", icon: Users },
  { key: "amenities", label: "Amenities", icon: Sofa },
  { key: "views", label: "Views", icon: Eye },
  { key: "accessibility", label: "Accessibility", icon: Accessibility },
  { key: "suited", label: "Best Suited For", icon: Heart },
  { key: "ratePlans", label: "Rate Plans", icon: Tag },
  { key: "notes", label: "Notes", icon: StickyNote },
];

export function RoomProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = useData();
  const toast = useToast();
  const [active, setActive] = useState("overview");
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState("");

  const room = data.rooms.find((r) => r.id === id);
  const property = room ? data.properties.find((p) => p.id === room.propertyId) : null;
  const ratePlans = useMemo(() => (room ? data.ratePlans.filter((rp) => rp.roomId === room.id) : []), [data.ratePlans, room]);

  if (!room) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Rooms", to: "/portal/rooms" }, { label: "Not found" }]} />
        <EmptyState icon={BedDouble} title="Room not found" message="It may have been deleted." action={<Button variant="secondary" onClick={() => navigate("/portal/rooms")}>Back to Rooms</Button>} />
      </div>
    );
  }

  const properties = property ? [property] : [];

  const handleSubmit = (form, opts) => {
    data.updateRoom({ ...room, ...form });
    toast.success(`${form.name} updated.`);
    if (!opts?.keepOpen) setFormOpen(false);
  };

  const handleDuplicate = () => {
    const copy = data.duplicateRoom(room);
    toast.info(`Duplicated as ${copy.id}.`);
    navigate(`/portal/rooms/${copy.id}`);
  };

  const handleArchive = () => { data.archiveRoom(room); toast.info(`${room.name} archived.`); };
  const handleRestore = () => { data.restoreRoom(room); toast.success(`${room.name} restored.`); };
  const handleDeletePermanently = () => {
    data.deleteRoomPermanently(room.id);
    toast.success(`${room.name} permanently deleted.`);
    navigate("/portal/rooms");
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Properties", to: "/portal/properties" },
          ...(property ? [{ label: property.name, to: `/portal/properties/${property.id}` }] : []),
          { label: "Rooms", to: "/portal/rooms" },
          { label: room.name },
        ]}
      />

      <Card>
        <div className="profile-header">
          <div className="property-thumb property-thumb--lg"><BedDouble size={22} strokeWidth={2} /></div>
          <div className="profile-header__info">
            <div className="profile-header__title">{room.name}</div>
            <div className="profile-header__subtitle">
              <MapPin size={13} strokeWidth={2} /> {property?.name || "Unassigned property"}
              <span style={{ marginLeft: 8 }}><StatusBadge status={room.status} /></span>
            </div>
          </div>
          <div className="profile-header__actions">
            <Button variant="ghost" size="md" icon={Copy} onClick={handleDuplicate}>Duplicate</Button>
            {room.status !== "Archived" ? (
              <Button variant="ghost" size="md" icon={Archive} onClick={handleArchive}>Archive</Button>
            ) : (
              <>
                <Button variant="ghost" size="md" icon={RotateCcw} onClick={handleRestore}>Restore</Button>
                <Button variant="danger" size="md" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete Permanently</Button>
              </>
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
            <div className="detail-field"><span>Room ID</span><strong className="tabular">{room.id}</strong></div>
            <div className="detail-field"><span>Room Type</span><strong>{room.roomType}</strong></div>
            <div className="detail-field"><span>Layout</span><strong>{room.layout}</strong></div>
            <div className="detail-field"><span>Bed Configuration</span><strong>{room.bedConfiguration}</strong></div>
            <div className="detail-field"><span>Occupancy</span><strong><Users size={12} strokeWidth={2} style={{ marginRight: 4 }} />{room.maxAdults} Adults / {room.maxChildren} Children</strong></div>
            <div className="detail-field"><span>Rate Plans</span><strong className="tabular">{ratePlans.length}</strong></div>
          </div>
          <div className="detail-field detail-field--full" style={{ marginTop: 16 }}>
            <span>Classification</span>
            <div className="tag-chips">
              <Badge variant="info">{room.occupancyType}</Badge>
              <Badge variant="success">{room.roomType}</Badge>
              <Badge variant="warning">{room.layout}</Badge>
              {isSuiteRoomType(room.roomType) && <Badge variant="danger">Suite</Badge>}
            </div>
          </div>
          {room.description && (
            <div className="detail-field detail-field--full" style={{ marginTop: 16 }}>
              <span>Description</span>
              <p className="detail-view__description">{room.description}</p>
            </div>
          )}
        </Card>
      )}

      {active === "classification" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Occupancy Based</span><strong>{room.occupancyType}</strong></div>
            <div className="detail-field"><span>Bed Configuration</span><strong>{room.bedConfiguration}</strong></div>
            <div className="detail-field"><span>Number of Beds</span><strong className="tabular">{room.numberOfBeds}</strong></div>
            <div className="detail-field"><span>Extra Bed Allowed</span><strong>{room.extraBedAllowed ? "Yes" : "No"}</strong></div>
            <div className="detail-field"><span>Room Type</span><strong>{room.roomType}</strong></div>
            <div className="detail-field"><span>Layout</span><strong>{room.layout}</strong></div>
          </div>
          <div className="detail-field detail-field--full" style={{ marginTop: 16 }}>
            <span>Room Options</span>
            <TagChips tags={room.roomOptions} max={20} />
          </div>
          {isSuiteRoomType(room.roomType) && room.suiteFeatures?.length > 0 && (
            <div className="detail-field detail-field--full" style={{ marginTop: 16 }}>
              <span>Suite Features</span>
              <TagChips tags={room.suiteFeatures} max={20} />
            </div>
          )}
        </Card>
      )}

      {active === "occupancy" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Maximum Adults</span><strong className="tabular">{room.maxAdults}</strong></div>
            <div className="detail-field"><span>Maximum Children</span><strong className="tabular">{room.maxChildren}</strong></div>
            <div className="detail-field"><span>Maximum Infants</span><strong className="tabular">{room.maxInfants}</strong></div>
            <div className="detail-field"><span>Maximum Occupancy</span><strong className="tabular">{room.maxOccupancy}</strong></div>
            <div className="detail-field"><span>Base Occupancy</span><strong className="tabular">{room.baseOccupancy}</strong></div>
            <div className="detail-field"><span>Extra Adult Allowed</span><strong>{room.extraAdultAllowed ? "Yes" : "No"}</strong></div>
            <div className="detail-field"><span>Extra Child Allowed</span><strong>{room.extraChildAllowed ? "Yes" : "No"}</strong></div>
          </div>
        </Card>
      )}

      {active === "amenities" && (
        <Card>
          <div className="detail-field detail-field--full">
            <span>Room Amenities</span>
            <TagChips tags={room.amenities} max={40} />
          </div>
        </Card>
      )}

      {active === "views" && (
        <Card>
          <div className="detail-grid">
            <div className="detail-field"><span>Room View</span><strong>{room.view}</strong></div>
            <div className="detail-field"><span>Room Position</span><strong>{room.roomPosition}</strong></div>
          </div>
        </Card>
      )}

      {active === "accessibility" && (
        <Card>
          <div className="detail-field detail-field--full">
            <span>Accessibility Features</span>
            <TagChips tags={room.accessibilityFeatures} max={40} />
          </div>
        </Card>
      )}

      {active === "suited" && (
        <Card>
          <div className="detail-field detail-field--full">
            <span>Best Suited For</span>
            <TagChips tags={room.bestSuitedFor} max={40} />
          </div>
        </Card>
      )}

      {active === "ratePlans" && (
        <Card padded={false}>
          <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Rate Plans for {room.name}</h3>
            <Button variant="secondary" size="sm" icon={Tag} onClick={() => navigate("/portal/rate-plans")}>Manage Rate Plans</Button>
          </div>
          <div style={{ padding: 20 }}>
            {ratePlans.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No rate plans yet"
                message="Create your first rate plan for this room, or import one from a template."
                action={<Button variant="secondary" size="sm" icon={Plus} onClick={() => navigate("/portal/rate-plans")}>Create Rate Plan</Button>}
              />
            ) : (
              <div className="detail-linked-list">
                {ratePlans.map((rp) => {
                  const currentPeriod = getCurrentActivePeriod(rp.pricingPeriods);
                  return (
                    <div key={rp.id} className="detail-linked-item" style={{ cursor: "pointer" }} onClick={() => navigate(`/portal/rate-plans/${rp.id}`)}>
                      <span>{rp.name}</span>
                      <span className="tabular">{currentPeriod ? formatCurrency(currentPeriod.baseRate, currentPeriod.currency) : "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {active === "notes" && (
        <Card>
          <div className="notes-panel">
            <Textarea
              placeholder="Add internal notes about this room..."
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

      <RoomForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} initial={room} properties={properties} scopePropertyId={property?.id || ""} />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeletePermanently}
        title="Delete Room Permanently"
        message={`"${room.name}" is archived. Permanently deleting it will also remove its rate plans. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
      />
    </div>
  );
}
