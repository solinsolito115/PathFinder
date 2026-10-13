export const SOL_USD = 152.18;
export const DEMO_ID = "PF2-1847";
export const RELEASE_MS = 2200;

export const VIEWER = {
  name: "Operator",
  wallet: "8fK2pL9mQ4nR7vB1cD6eH3jW8aY5uT2",
};

export type Status = "issued" | "in_transit" | "exception" | "delivered" | "settled";
export type Mode = "script" | "simple" | "readonly";
export type EventKind = "issue" | "escrow" | "custody" | "oracle" | "clause" | "delivery" | "settle";
export type View = "overview" | "bills" | "bill" | "carriers" | "oracles";

export type Party = { name: string; wallet: string };

export type Reading = {
  id: string;
  time: string;
  place: string;
  tempC: number | null;
  coords: string;
  progress: number;
  breach: boolean;
};

export type ChainEvent = {
  id: string;
  seq: number;
  time: string;
  title: string;
  detail: string;
  tx: string;
  kind: EventKind;
};

export type Shipment = {
  id: string;
  cargo: string;
  detail: string;
  weight: string;
  origin: { city: string; code: string };
  destination: { city: string; code: string };
  shipper: Party;
  consignee: Party;
  carrierId: string;
  status: Status;
  escrowSol: number;
  releasedSol: number;
  adjustmentSol: number;
  band: { min: number; max: number } | null;
  readings: Reading[];
  events: ChainEvent[];
  progress: number;
  cover: string;
  mode: Mode;
};

export type Carrier = {
  id: string;
  name: string;
  wallet: string;
  score: number;
  deliveries: number;
  onTimePct: number;
  claims: number;
  stakeSol: number;
  lane: string;
  lastNote: string;
};

export type IssueDraft = {
  cargo: string;
  detail: string;
  weight: string;
  originCity: string;
  originCode: string;
  destCity: string;
  destCode: string;
  shipper: string;
  consignee: string;
  carrierId: string;
  escrowSol: number;
  cold: boolean;
  min: number;
  max: number;
};

export const READING_SCRIPT: Reading[] = [
  {
    id: "demo-r1",
    time: "Day 0 · 14:22 UTC",
    place: "Straits of Florida",
    tempC: 3.2,
    coords: "24.6° N, 80.2° W",
    progress: 0.2,
    breach: false,
  },
  {
    id: "demo-r2",
    time: "Day 2 · 06:40 UTC",
    place: "Mid-Atlantic",
    tempC: 4.4,
    coords: "36.8° N, 48.1° W",
    progress: 0.52,
    breach: false,
  },
  {
    id: "demo-r3",
    time: "Day 5 · 04:48 UTC",
    place: "English Channel",
    tempC: 9.6,
    coords: "49.8° N, 1.6° W",
    progress: 0.84,
    breach: true,
  },
];

export const seedCarriers: Carrier[] = [
  {
    id: "vesper",
    name: "Vesper Cold Chain",
    wallet: "Vesp4kR8mN2pQ7wL5cH9dF3jB6aY1uT8e",
    score: 942,
    deliveries: 214,
    onTimePct: 98.6,
    claims: 0,
    stakeSol: 40,
    lane: "Reefer · pharma",
    lastNote: "No sensor claims on record",
  },
  {
    id: "helios",
    name: "Helios Maritime",
    wallet: "Heli7mK2nP9qR4wL8cD5eF1jB3aY6uT0k",
    score: 901,
    deliveries: 301,
    onTimePct: 96.2,
    claims: 4,
    stakeSol: 75,
    lane: "Ocean",
    lastNote: "Two ocean bills in transit",
  },
  {
    id: "northline",
    name: "Northline Freight",
    wallet: "Nort6pQ2mK8nR5wL1cH4dF7jB9aY3uT1",
    score: 888,
    deliveries: 158,
    onTimePct: 97.1,
    claims: 2,
    stakeSol: 22,
    lane: "Inland",
    lastNote: "No open bills in this book",
  },
  {
    id: "kite",
    name: "Kite & Keel",
    wallet: "Kite5mN8pQ2rL7wC4dH1eF6jB3aY9uT2",
    score: 874,
    deliveries: 129,
    onTimePct: 95.4,
    claims: 3,
    stakeSol: 18,
    lane: "Short sea",
    lastNote: "PF2-1808 settled clean",
  },
  {
    id: "ardent",
    name: "Ardent Haul",
    wallet: "Ardt8kM3nP6qR1wL5cD9eH2jB7aY4uT3",
    score: 851,
    deliveries: 97,
    onTimePct: 94.8,
    claims: 5,
    stakeSol: 28,
    lane: "Project cargo",
    lastNote: "PF2-1791 in transit",
  },
];

export const seedShipments: Shipment[] = [
  {
    id: DEMO_ID,
    cargo: "Pharmaceutical reagents",
    detail: "18 sealed pallets",
    weight: "2.4 t",
    origin: { city: "Miami", code: "MIA" },
    destination: { city: "Rotterdam", code: "RTM" },
    shipper: { name: "Meridian Labs", wallet: "Merid9nK2pL5qR8wC1dH4eF7jB3aY6u" },
    consignee: { name: "Erasmus Medical Supply", wallet: "Eras7mK4nP2qL9wC5dH1eF8jB6aY2p" },
    carrierId: "vesper",
    status: "issued",
    escrowSol: 12.4,
    releasedSol: 0,
    adjustmentSol: 0,
    band: { min: 2, max: 8 },
    readings: [],
    progress: 0,
    cover: "Harbor Mutual Cover",
    mode: "script",
    events: [
      {
        id: "demo-issue",
        seq: 40,
        time: "Day 0 · 06:12 UTC",
        title: "Bill issued",
        detail: "Meridian Labs issued PF2-1847 for pharmaceutical reagents.",
        tx: "7mQ2kL9nP4wR8cD1eH5jB3aY6uT2sK",
        kind: "issue",
      },
      {
        id: "demo-escrow",
        seq: 41,
        time: "Day 0 · 06:14 UTC",
        title: "Escrow locked",
        detail: "12.40 SOL is locked until the consignee signs delivery.",
        tx: "3eScR8kM2nP6wL4cD9eH1jB5aY7uT0q",
        kind: "escrow",
      },
    ],
  },
  {
    id: "PF2-1833",
    cargo: "Hass avocados",
    detail: "1,120 cartons",
    weight: "16.8 t",
    origin: { city: "Veracruz", code: "VER" },
    destination: { city: "Rotterdam", code: "RTM" },
    shipper: { name: "Valle Verde Export", wallet: "Valle3mK8nP1qR6wL2cD5eH9jB4aY1u" },
    consignee: { name: "Noord Market", wallet: "Noord6kM2nP9qR3wL7cD1eH4jB8aY5" },
    carrierId: "helios",
    status: "in_transit",
    escrowSol: 4.8,
    releasedSol: 0,
    adjustmentSol: 0,
    band: { min: 5, max: 8 },
    progress: 0.47,
    cover: "Harbor Mutual Cover",
    mode: "readonly",
    readings: [
      {
        id: "av1",
        time: "Day 1 · 11:05 UTC",
        place: "Gulf of Mexico",
        tempC: 6.1,
        coords: "25.2° N, 90.4° W",
        progress: 0.24,
        breach: false,
      },
      {
        id: "av2",
        time: "Day 3 · 18:40 UTC",
        place: "North Atlantic",
        tempC: 6.4,
        coords: "38.1° N, 55.0° W",
        progress: 0.47,
        breach: false,
      },
    ],
    events: [
      {
        id: "av-issue",
        seq: 22,
        time: "Day 0 · 09:00 UTC",
        title: "Bill issued",
        detail: "Valle Verde Export issued PF2-1833 for Hass avocados.",
        tx: "5aVoC2kM8nP1qR6wL4cD9eH3jB7aY",
        kind: "issue",
      },
      {
        id: "av-ping",
        seq: 80,
        time: "Day 3 · 18:40 UTC",
        title: "Oracle ping",
        detail: "6.4°C at North Atlantic. Inside the 5.0–8.0°C band.",
        tx: "8nAtl9kM3nP7qR2wL5cD1eH6jB4aY",
        kind: "oracle",
      },
    ],
  },
  {
    id: "PF2-1820",
    cargo: "CNC spindle assemblies",
    detail: "6 crates",
    weight: "3.1 t",
    origin: { city: "Busan", code: "PUS" },
    destination: { city: "Long Beach", code: "LGB" },
    shipper: { name: "Han Seong Precision", wallet: "HanS4kM9nP2qR7wL1cD5eH8jB3aY6u" },
    consignee: { name: "Pacific Tooling", wallet: "PacT7mK1nP5qR3wL8cD2eH6jB9aY4" },
    carrierId: "helios",
    status: "in_transit",
    escrowSol: 22,
    releasedSol: 0,
    adjustmentSol: 0,
    band: null,
    progress: 0.41,
    cover: "Harbor Mutual Cover",
    mode: "readonly",
    readings: [
      {
        id: "cnc1",
        time: "Day 4 · 12:02 UTC",
        place: "North Pacific",
        tempC: null,
        coords: "38.5° N, 164.0° W",
        progress: 0.41,
        breach: false,
      },
    ],
    events: [
      {
        id: "cnc-ping",
        seq: 66,
        time: "Day 4 · 12:02 UTC",
        title: "Oracle ping",
        detail: "GPS fix at North Pacific. 38.5° N, 164.0° W.",
        tx: "2pCnc8kM4nP9qR1wL6cD3eH7jB5aY",
        kind: "oracle",
      },
    ],
  },
  {
    id: "PF2-1791",
    cargo: "Solar inverters",
    detail: "40 units",
    weight: "11.0 t",
    origin: { city: "Shenzhen", code: "SZX" },
    destination: { city: "Savannah", code: "SAV" },
    shipper: { name: "Lumen Grid", wallet: "Lumen5kM2nP8qR4wL1cD7eH3jB6aY9" },
    consignee: { name: "Savannah Electric", wallet: "SavE8mK3nP1qR6wL9cD2eH5jB4aY7" },
    carrierId: "ardent",
    status: "in_transit",
    escrowSol: 15.75,
    releasedSol: 0,
    adjustmentSol: 0,
    band: null,
    progress: 0.33,
    cover: "Harbor Mutual Cover",
    mode: "readonly",
    readings: [
      {
        id: "sol1",
        time: "Day 2 · 09:12 UTC",
        place: "Philippine Sea",
        tempC: null,
        coords: "18.4° N, 128.2° E",
        progress: 0.33,
        breach: false,
      },
    ],
    events: [
      {
        id: "sol-ping",
        seq: 72,
        time: "Day 2 · 09:12 UTC",
        title: "Oracle ping",
        detail: "GPS fix at Philippine Sea. 18.4° N, 128.2° E.",
        tx: "9sInv3kM7nP2qR5wL8cD1eH4jB6aY",
        kind: "oracle",
      },
    ],
  },
  {
    id: "PF2-1808",
    cargo: "Washed green coffee",
    detail: "320 bags",
    weight: "19.2 t",
    origin: { city: "Bogotá", code: "BOG" },
    destination: { city: "Hamburg", code: "HAM" },
    shipper: { name: "Finca Alto Niebla", wallet: "Finca2kM6nP9qR3wL5cD8eH1jB4aY" },
    consignee: { name: "Elbe Roasters", wallet: "Elbe6mK1nP4qR8wL2cD7eH5jB9aY3" },
    carrierId: "kite",
    status: "settled",
    escrowSol: 6.5,
    releasedSol: 6.5,
    adjustmentSol: 0,
    band: null,
    progress: 1,
    cover: "Harbor Mutual Cover",
    mode: "readonly",
    readings: [],
    events: [
      {
        id: "cof-settle",
        seq: 18,
        time: "Day 9 · 15:02 UTC",
        title: "Escrow released",
        detail: "6.50 SOL sent to Kite & Keel. No sensor adjustment.",
        tx: "4cOff8kM1nP5qR2wL9cD3eH6jB7aY",
        kind: "settle",
      },
    ],
  },
];

export function short(value: string, head = 4, tail = 4) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function solText(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function usdText(value: number) {
  return (value * SOL_USD).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function accountFor(id: string, prefix: string) {
  const n = id.replace(/\D/g, "");
  return `${prefix}${n}kM3nP8qR2wL6cD9eH1jB4aY`;
}

export function statusLabel(status: Status) {
  switch (status) {
    case "issued":
      return "Issued";
    case "in_transit":
      return "In transit";
    case "exception":
      return "Clause armed";
    case "delivered":
      return "Delivered";
    case "settled":
      return "Settled";
  }
}
