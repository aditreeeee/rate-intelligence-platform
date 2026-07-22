// Master data for Room Types, Amenities, and Room Templates.
//
// These are modeled as editable records (`{ id, name, ... }`) rather than
// plain string constants specifically so the frontend CRUD here (add/edit/
// delete via DataContext) maps 1:1 onto future ASP.NET MVC master-table
// controllers backed by SQL Server (e.g. `dbo.RoomTypes`, `dbo.Amenities`,
// `dbo.RoomTemplates`) — swapping DataContext's dispatch
// calls for API calls is the only change needed later; no consuming
// component reads these shapes differently than any other master table would.

export const ROOM_TYPES_MASTER = [
  "Standard", "Superior", "Deluxe", "Premium Deluxe", "Executive", "Studio",
  "Junior Suite", "Suite", "Executive Suite", "Master Suite",
  "Presidential Suite", "Penthouse Suite", "Villa Suite", "Apartment Suite", "Duplex Suite",
].map((name, i) => ({ id: `RTY-${1000 + i}`, name }));

export const AMENITIES_MASTER = [
  "Balcony", "Terrace", "Jacuzzi", "Bathtub", "Walk-in Shower", "Kitchenette",
  "Dining Area", "Living Room", "Workspace", "Smart TV", "Coffee Machine",
  "Mini Bar", "Safe", "Microwave", "Refrigerator", "Washing Machine",
  "Private Pool", "Fireplace", "Club Lounge Access",
].map((name, i) => ({ id: `AMN-${1000 + i}`, name }));

export const ROOM_TEMPLATES_MASTER = [
  {
    id: "RTPL-1000",
    name: "Standard King",
    values: {
      name: "Standard King", description: "Comfortable king room with essential amenities.", status: "Active",
      occupancyType: "Double", bedConfiguration: "King Bed", numberOfBeds: 1, extraBedAllowed: false,
      roomType: "Standard", layout: "Open Plan",
      roomOptions: ["Non-Smoking"],
      amenities: ["Smart TV", "Coffee Machine", "Safe"],
      squareFeet: 320,
      maxAdults: 2, maxChildren: 0, maxInfants: 0, maxOccupancy: 2, baseOccupancy: 2,
      extraAdultAllowed: false, extraChildAllowed: false,
      bestSuitedFor: ["Solo Travellers", "Couples"],
      suiteFeatures: [],
    },
  },
  {
    id: "RTPL-1001",
    name: "Deluxe King",
    values: {
      name: "Deluxe King", description: "Upgraded king room with premium furnishings and extra space.", status: "Active",
      occupancyType: "Double", bedConfiguration: "King Bed", numberOfBeds: 1, extraBedAllowed: true,
      roomType: "Deluxe", layout: "One Bedroom",
      roomOptions: ["Non-Smoking"],
      amenities: ["Balcony", "Mini Bar", "Smart TV", "Coffee Machine"],
      squareFeet: 420,
      maxAdults: 2, maxChildren: 1, maxInfants: 0, maxOccupancy: 3, baseOccupancy: 2,
      extraAdultAllowed: true, extraChildAllowed: true,
      bestSuitedFor: ["Couples", "Honeymoon"],
      suiteFeatures: [],
    },
  },
  {
    id: "RTPL-1002",
    name: "Superior Twin",
    values: {
      name: "Superior Twin", description: "Twin-bed room ideal for colleagues or friends travelling together.", status: "Active",
      occupancyType: "Twin", bedConfiguration: "Twin Beds", numberOfBeds: 2, extraBedAllowed: false,
      roomType: "Superior", layout: "Open Plan",
      roomOptions: ["Non-Smoking"],
      amenities: ["Smart TV", "Refrigerator"],
      squareFeet: 300,
      maxAdults: 2, maxChildren: 0, maxInfants: 0, maxOccupancy: 2, baseOccupancy: 2,
      extraAdultAllowed: false, extraChildAllowed: false,
      bestSuitedFor: ["Solo Travellers", "Groups"],
      suiteFeatures: [],
    },
  },
  {
    id: "RTPL-1003",
    name: "Executive Suite",
    values: {
      name: "Executive Suite", description: "Spacious suite with separate living area and executive lounge access.", status: "Active",
      occupancyType: "Family", bedConfiguration: "King Bed", numberOfBeds: 1, extraBedAllowed: true,
      roomType: "Executive Suite", layout: "One Bedroom",
      roomOptions: ["Corner Room", "Non-Smoking"],
      amenities: ["Living Room", "Workspace", "Smart TV", "Mini Bar", "Club Lounge Access"],
      squareFeet: 650,
      maxAdults: 2, maxChildren: 2, maxInfants: 1, maxOccupancy: 4, baseOccupancy: 2,
      extraAdultAllowed: true, extraChildAllowed: true,
      bestSuitedFor: ["Business Travellers", "VIP Guests", "Luxury Guests"],
      suiteFeatures: ["Separate Living Room"],
    },
  },
  {
    id: "RTPL-1004",
    name: "Family Room",
    values: {
      name: "Family Room", description: "Generously sized room designed for families, with flexible bedding.", status: "Active",
      occupancyType: "Family", bedConfiguration: "Double Bed", numberOfBeds: 2, extraBedAllowed: true,
      roomType: "Standard", layout: "Two Bedroom",
      roomOptions: ["Connecting Room", "Non-Smoking"],
      amenities: ["Smart TV", "Refrigerator", "Microwave"],
      squareFeet: 480,
      maxAdults: 2, maxChildren: 2, maxInfants: 1, maxOccupancy: 4, baseOccupancy: 2,
      extraAdultAllowed: true, extraChildAllowed: true,
      bestSuitedFor: ["Families", "Groups"],
      suiteFeatures: [],
    },
  },
];

// Source Types (Phase 2 — Competitor Configuration's Source Configuration
// module). Deliberately a plain `{id,name}` master table like Room Types/
// Amenities rather than a hardcoded enum, so new source types (beyond the
// defaults below) can be added through the same generic MasterDataManager
// without touching any component.
export const SOURCE_TYPES_MASTER = [
  "Direct Website", "Booking.com", "Expedia", "Agoda", "Hotels.com", "Google Hotels",
].map((name, i) => ({ id: `SRCT-${1000 + i}`, name }));
