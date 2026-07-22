export const RATE_PLAN_TEMPLATES = [
  {
    key: "bar",
    label: "BAR",
    values: { name: "Best Available Rate", mealPlan: "EP", cancellationPolicy: "Free Cancellation (24h)", status: "Active" },
  },
  {
    key: "corporate",
    label: "Corporate",
    values: { name: "Corporate Rate", mealPlan: "CP", cancellationPolicy: "Free Cancellation (24h)", status: "Active" },
  },
  {
    key: "long-stay",
    label: "Long Stay",
    values: { name: "Long Stay Rate", mealPlan: "MAP", cancellationPolicy: "Partial Refund", status: "Active" },
  },
  {
    key: "weekend",
    label: "Weekend",
    values: { name: "Weekend Getaway", mealPlan: "CP", cancellationPolicy: "Free Cancellation (72h)", status: "Active" },
  },
  {
    key: "non-refundable",
    label: "Non-Refundable",
    values: { name: "Advance Purchase Non-Refundable", mealPlan: "EP", cancellationPolicy: "Non-Refundable", status: "Active" },
  },
  {
    key: "early-bird",
    label: "Early Bird",
    values: { name: "Early Bird Special", mealPlan: "CP", cancellationPolicy: "Partial Refund", status: "Draft" },
  },
];
