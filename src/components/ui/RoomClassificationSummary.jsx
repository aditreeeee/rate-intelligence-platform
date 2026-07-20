import React from "react";
import { BedDouble, Users, Eye, Accessibility, Sofa, Heart } from "lucide-react";
import { Badge } from "./Badge.jsx";
import { TagChips } from "./TagChips.jsx";

export function RoomClassificationSummary({ room }) {
  if (!room) return null;
  return (
    <div className="room-classification-summary">
      <div className="room-classification-summary__row">
        <Badge variant="info">{room.roomType}</Badge>
        <Badge variant="success">{room.bedConfiguration}</Badge>
        <span className="room-classification-summary__stat">
          <Users size={12} strokeWidth={2} /> {room.maxAdults}A / {room.maxChildren}C{room.maxInfants ? ` / ${room.maxInfants}I` : ""}
        </span>
        <span className="room-classification-summary__stat">
          <Eye size={12} strokeWidth={2} /> {room.view} View
        </span>
      </div>
      {room.accessibilityFeatures?.length > 0 && (
        <div className="room-classification-summary__group">
          <span><Accessibility size={12} strokeWidth={2} /> Accessibility</span>
          <TagChips tags={room.accessibilityFeatures} max={6} />
        </div>
      )}
      {room.amenities?.length > 0 && (
        <div className="room-classification-summary__group">
          <span><Sofa size={12} strokeWidth={2} /> Amenities</span>
          <TagChips tags={room.amenities} max={6} />
        </div>
      )}
      {room.bestSuitedFor?.length > 0 && (
        <div className="room-classification-summary__group">
          <span><Heart size={12} strokeWidth={2} /> Best Suited For</span>
          <TagChips tags={room.bestSuitedFor} max={6} />
        </div>
      )}
    </div>
  );
}
