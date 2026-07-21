import {
  Sparkles, Home, Coffee, UtensilsCrossed, Utensils, Undo2, Ban, Percent,
  CheckCircle2, PauseCircle, Archive,
} from "lucide-react";

const DEFAULT_ICON = Sparkles;

const RATE_PLAN_ICONS = {
  // Meal Plans
  "EP": Home,
  "CP": Coffee,
  "MAP": UtensilsCrossed,
  "AP": Utensils,

  // Cancellation Policies
  "Free Cancellation (24h)": Undo2,
  "Free Cancellation (72h)": Undo2,
  "Non-Refundable": Ban,
  "Partial Refund": Percent,

  // Statuses
  "Active": CheckCircle2,
  "Inactive": PauseCircle,
  "Archived": Archive,
};

export function ratePlanFeatureIcon(label) {
  return RATE_PLAN_ICONS[label] || DEFAULT_ICON;
}
