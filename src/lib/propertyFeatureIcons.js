import {
  Sparkles, Building2, Home, Building, Waves, Gem, Briefcase, Plane, Landmark,
  Trees, Umbrella, Mountain, Presentation, Users, Crown, Link2, Zap, Check,
  ShieldCheck, UtensilsCrossed, Users2, Star, Clock, Coins, CheckCircle2, Archive,
} from "lucide-react";

const DEFAULT_ICON = Sparkles;

const PROPERTY_ICONS = {
  // Brands
  "Aurora Collection": Sparkles,
  "Meridian Hotels": Building2,
  "Coastal Escapes": Waves,
  "Urban Nest": Building,
  "Independent": Home,

  // Property Types
  "Hotel": Building2,
  "Resort": Waves,
  "Motel": Home,
  "Inn": Home,
  "Boutique Hotel": Gem,
  "Business Hotel": Briefcase,
  "Airport Hotel": Plane,
  "Extended Stay Hotel": Clock,
  "Apartment Hotel (Aparthotel)": Building,
  "Serviced Apartment": Building,
  "Homestay": Home,
  "Heritage Hotel": Landmark,
  "Eco Resort": Trees,
  "Luxury Resort": Crown,
  "Beach Resort": Umbrella,
  "Hill Resort": Mountain,
  "Spa & Wellness Resort": Sparkles,
  "Convention Hotel": Presentation,
  "Hostel": Users,
  "Lodge": Home,
  "Villa Property": Home,
  "Other": Sparkles,

  // Property Categories
  "Independent Property": Home,
  "Chain Hotel": Link2,
  "Franchise": Briefcase,
  "Branded Property": Star,

  // Service Models
  "Limited Service": Zap,
  "Select Service": Check,
  "Full Service": ShieldCheck,
  "Luxury Service": Crown,

  // Accommodation Styles
  "Standard Property": Home,
  "All Suites": Crown,
  "All Inclusive": UtensilsCrossed,
  "Adults Only": Users,
  "Family Friendly": Users2,

  // Star Rating
  "1": Star, "2": Star, "3": Star, "4": Star, "5": Star,

  // Currencies
  "USD": Coins, "EUR": Coins, "GBP": Coins, "AED": Coins, "INR": Coins, "SGD": Coins,

  // Time Zones
  "America/New_York": Clock, "America/Los_Angeles": Clock, "Europe/London": Clock,
  "Europe/Paris": Clock, "Asia/Dubai": Clock, "Asia/Kolkata": Clock, "Asia/Singapore": Clock,

  // Status
  "Active": CheckCircle2,
  "Draft": Clock,
  "Archived": Archive,
};

export function propertyFeatureIcon(label) {
  return PROPERTY_ICONS[label] || DEFAULT_ICON;
}
