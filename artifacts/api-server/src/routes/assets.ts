import { Router } from "express";

const router = Router();

/**
 * Investment & pricing strategy for each fleet tier.
 *
 * Pricing model: the entry amount is the minimum stake toward a funded
 * vehicle unit. Returns are projected annualized yields from transport
 * operations (ride-hailing, shuttle, haulage) after running costs.
 * Longer durations earn higher returns; slots cap how much of a unit is
 * funded by the pool before the vehicle is acquired.
 */
const assetTiers = [
  // ---- Cars / SUVs / Jeeps -------------------------------------------------
  {
    id: "car-suv-fleet",
    label: "SUV & Jeep Executive Fleet",
    category: "car",
    entryAmount: 5000000,
    returnRate: 16,
    durationDays: 180,
    slotsUsed: 2,
    totalSlots: 10,
    tag: "Executive",
    description:
      "Ride-hailing and corporate hire fleet of Highlander, Prado, Lexus RX and Pathfinder units for Lagos & Abuja.",
    color: "#10b981",
    bgColor: "#ecfdf5",
  },
  {
    id: "car-luxury-fleet",
    label: "Executive Luxury SUV Fleet",
    category: "car",
    entryAmount: 10000000,
    returnRate: 19,
    durationDays: 270,
    slotsUsed: 4,
    totalSlots: 8,
    tag: "Premium",
    description:
      "Land Cruiser and Range Rover units for airport transfers and executive chauffeured mobility.",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
  // ---- Buses & vans --------------------------------------------------------
  {
    id: "bus-city-fleet",
    label: "City Route Mini-Bus Fleet",
    category: "bus",
    entryAmount: 1800000,
    returnRate: 20,
    durationDays: 180,
    slotsUsed: 3,
    totalSlots: 12,
    tag: "High Yield",
    description:
      "HiAce, Ford Transit and Hiace White units running busy intra-city routes and last-mile passenger transport.",
    color: "#f59e0b",
    bgColor: "#fffbeb",
  },
  {
    id: "bus-interstate-fleet",
    label: "Interstate Coach Fleet",
    category: "bus",
    entryAmount: 4500000,
    returnRate: 24,
    durationDays: 270,
    slotsUsed: 2,
    totalSlots: 8,
    tag: "Enterprise",
    description:
      "Toyota Coaster, Marcopolo and luxury interstate coaches serving Lagos–Ibadan and Abuja–Kaduna corridors.",
    color: "#3b82f6",
    bgColor: "#eff6ff",
  },
  // ---- Trucks & heavy duty -------------------------------------------------
  {
    id: "truck-pickup-fleet",
    label: "Pickup & Delivery Fleet",
    category: "truck",
    entryAmount: 3500000,
    returnRate: 22,
    durationDays: 210,
    slotsUsed: 2,
    totalSlots: 10,
    tag: "Logistics",
    description:
      "Hilux, Ford Ranger and Mitsubishi Canter units for delivery, distribution and construction-site movement.",
    color: "#ec4899",
    bgColor: "#fdf2f8",
  },
  {
    id: "truck-heavy-fleet",
    label: "Heavy Haulage & Tipper Fleet",
    category: "truck",
    entryAmount: 8000000,
    returnRate: 28,
    durationDays: 365,
    slotsUsed: 3,
    totalSlots: 8,
    tag: "Heavy Duty",
    description:
      "Howo, Mack Granite, Mercedes Actros and DAF tippers and trailers for long-haul and construction haulage.",
    color: "#f43f5e",
    bgColor: "#fff1f2",
  },
];

router.get("/", (_req, res) => {
  return res.json(assetTiers);
});

export default router;