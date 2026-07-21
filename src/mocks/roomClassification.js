// Room Category
export const OCCUPANCY_TYPES = ["Single", "Double", "Twin", "Triple", "Quad", "Family", "Dormitory"];
export const BED_CONFIGURATIONS = [
  "Single Bed", "Twin Beds", "Double Bed", "Queen Bed", "King Bed",
  "California King", "Bunk Beds", "Sofa Bed", "Murphy Bed",
];

// Room Design & Layout
export const ROOM_TYPES = [
  "Standard", "Superior", "Deluxe", "Premium Deluxe", "Executive", "Studio",
  "Junior Suite", "Suite", "Executive Suite", "Master Suite",
  "Presidential Suite", "Penthouse Suite", "Villa Suite", "Apartment Suite", "Duplex Suite",
];
export const ROOM_LAYOUTS = [
  "Open Plan", "One Bedroom", "Two Bedroom", "Three Bedroom", "Loft", "Duplex", "Connecting Layout",
];

// Room Features
export const ROOM_OPTIONS = [
  "Connecting Room", "Adjoining Room", "Adjacent Room", "Corner Room",
  "Accessible Room", "Pet Friendly Room", "Smoking", "Non-Smoking",
];

// Room Purpose
export const BEST_SUITED_FOR = [
  "Business Travellers", "Couples", "Families", "Solo Travellers", "Long Stay Guests",
  "Honeymoon", "Corporate", "Luxury Guests", "Groups", "VIP Guests", "Accessible Stay", "Pet Owners",
];

// Suite Information
export const SUITE_FEATURES = [
  "Separate Living Room", "Dining Room", "Butler Service", "Kitchen",
  "Pantry", "Private Entrance", "Private Elevator", "Private Pool", "Meeting Area",
];

export const SUITE_ROOM_TYPES = [
  "Junior Suite", "Suite", "Executive Suite", "Master Suite",
  "Presidential Suite", "Penthouse Suite", "Villa Suite", "Apartment Suite", "Duplex Suite",
];

export function isSuiteRoomType(roomType) {
  return SUITE_ROOM_TYPES.includes(roomType);
}
