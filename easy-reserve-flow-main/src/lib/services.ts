export type ServiceCategory = {
  id: string;
  name: string;
  basePrice: number;
  emoji: string;
  description: string;
};

export const SERVICES: ServiceCategory[] = [
  {
    id: "plumbing",
    name: "Plumbing",
    basePrice: 300,
    emoji: "🔧",
    description: "Leaks, taps, pipes, drainage",
  },
  {
    id: "electrical",
    name: "Electrical",
    basePrice: 400,
    emoji: "⚡",
    description: "Wiring, switches, fans, lights",
  },
  {
    id: "cleaning",
    name: "Cleaning",
    basePrice: 250,
    emoji: "🧽",
    description: "Home, kitchen, bathroom deep clean",
  },
  {
    id: "ac_repair",
    name: "AC Repair",
    basePrice: 500,
    emoji: "❄️",
    description: "Servicing, gas refill, installation",
  },
];

export const EMERGENCY_SURCHARGE = 0.25;

export function getService(id: string): ServiceCategory | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function calculatePricing(
  service: ServiceCategory,
  type: "normal" | "emergency",
) {
  const basePrice = service.basePrice;
  const surcharge = type === "emergency" ? Math.round(basePrice * EMERGENCY_SURCHARGE) : 0;
  const subtotal = basePrice + surcharge;
  return {
    basePrice,
    surcharge,
    subtotal,
    total: subtotal,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
