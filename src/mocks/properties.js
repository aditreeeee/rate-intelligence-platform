export const PROPERTY_TYPES = ["Hotel", "Resort", "Boutique", "Apartment", "Villa"];
export const BRANDS = ["Aurora Collection", "Meridian Hotels", "Coastal Escapes", "Urban Nest", "Independent"];
export const CURRENCIES = ["USD", "EUR", "GBP", "AED", "INR", "SGD"];
export const TIME_ZONES = [
  "America/New_York", "America/Los_Angeles", "Europe/London",
  "Europe/Paris", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
];
export const STATUSES = ["Active", "Draft", "Archived"];
export const PROPERTY_TAGS = ["Luxury", "Resort", "Business", "Airport", "Boutique"];

export let PROPERTIES = [
  {
    id: "PROP-1001", name: "Aurora Bay Resort", brand: "Aurora Collection",
    country: "United States", state: "Florida", city: "Miami",
    currency: "USD", timeZone: "America/New_York", starRating: 5,
    propertyType: "Resort", status: "Active",
    description: "Beachfront luxury resort with panoramic ocean views and full-service spa.",
    tags: ["Luxury", "Resort"], logoUrl: "",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-06-18T10:24:00Z",
    ownerId: "OWNER-1",
  },
  {
    id: "PROP-1002", name: "Meridian Grand Downtown", brand: "Meridian Hotels",
    country: "United Kingdom", state: "England", city: "London",
    currency: "GBP", timeZone: "Europe/London", starRating: 4,
    propertyType: "Hotel", status: "Active",
    description: "Iconic city-centre hotel steps from major business districts.",
    tags: ["Business"], logoUrl: "",
    lastModifiedBy: "R. Okafor", lastModifiedAt: "2026-07-02T14:05:00Z",
    ownerId: "OWNER-2",
  },
  {
    id: "PROP-1003", name: "Coastal Escapes Villa Retreat", brand: "Coastal Escapes",
    country: "United Arab Emirates", state: "Dubai", city: "Dubai",
    currency: "AED", timeZone: "Asia/Dubai", starRating: 5,
    propertyType: "Villa", status: "Active",
    description: "Private villa cluster with dedicated concierge and infinity pools.",
    tags: ["Luxury"], logoUrl: "",
    lastModifiedBy: "S. Malhotra", lastModifiedAt: "2026-06-29T09:41:00Z",
    ownerId: "OWNER-1",
  },
  {
    id: "PROP-1004", name: "Urban Nest Loft Suites", brand: "Urban Nest",
    country: "India", state: "Karnataka", city: "Bengaluru",
    currency: "INR", timeZone: "Asia/Kolkata", starRating: 3,
    propertyType: "Apartment", status: "Draft",
    description: "Compact serviced apartments tailored for extended business stays.",
    tags: ["Business", "Airport"], logoUrl: "",
    lastModifiedBy: "S. Malhotra", lastModifiedAt: "2026-07-10T08:12:00Z",
    ownerId: "OWNER-2",
  },
  {
    id: "PROP-1005", name: "The Cinnamon Boutique", brand: "Independent",
    country: "Singapore", state: "Singapore", city: "Singapore",
    currency: "SGD", timeZone: "Asia/Singapore", starRating: 4,
    propertyType: "Boutique", status: "Active",
    description: "Design-forward boutique property in the heart of the arts district.",
    tags: ["Boutique"], logoUrl: "",
    lastModifiedBy: "A. Whitfield", lastModifiedAt: "2026-05-30T16:50:00Z",
    ownerId: "OWNER-2",
  },
  {
    id: "PROP-1006", name: "Meridian Riviera Hotel", brand: "Meridian Hotels",
    country: "France", state: "Provence-Alpes-Cote d'Azur", city: "Nice",
    currency: "EUR", timeZone: "Europe/Paris", starRating: 4,
    propertyType: "Hotel", status: "Archived",
    description: "Mediterranean coastal hotel with rooftop dining and marina access.",
    tags: ["Resort"], logoUrl: "",
    lastModifiedBy: "R. Okafor", lastModifiedAt: "2026-04-11T11:30:00Z",
    ownerId: "OWNER-1",
  },
];
