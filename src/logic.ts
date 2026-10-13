import {
  DEMO_ID,
  READING_SCRIPT,
  seedCarriers,
  seedShipments,
  type Carrier,
  type ChainEvent,
  type IssueDraft,
  type Reading,
  type Shipment,
  type View,
} from "./data";

export type Toast = { id: string; title: string; body: string };

export type AppState = {
  view: View;
  selectedId: string;
  carrierId: string;
  shipments: Shipment[];
  carriers: Carrier[];
  toasts: Toast[];
  playing: boolean;
  step: number;
  issueOpen: boolean;
  walletOpen: boolean;
};

export type Step = {
  view: View;
  caption: string;
  toast?: { title: string; body: string };
};

export const STEPS: Step[] = [
  {
    view: "overview",
    caption: "Five bills are on the book. Escrow stays locked until delivery is signed.",
  },
  {
    view: "bill",
    caption: "This is a smart bill of lading. The shipper has already locked 12.40 SOL.",
  },
  {
    view: "bill",
    caption: "The carrier attests pickup in Miami. Custody and the bill now move together.",
    toast: { title: "Pickup attested", body: "Vesper Cold Chain took custody in Miami." },
  },
  {
    view: "bill",
    caption: "An oracle posts temperature and GPS from the Straits of Florida. The reading sits inside the band.",
  },
  {
    view: "bill",
    caption: "Day 2, mid-Atlantic. The cold chain still holds, so the payment split is unchanged.",
  },
  {
    view: "bill",
    caption: "Day 5, the English Channel reads 9.6°C. The clause arms a 4% payment adjustment.",
    toast: { title: "Sensor clause armed", body: "9.6°C · 0.50 SOL earmarked for the cover pool." },
  },
  {
    view: "bill",
    caption: "The consignee signs in Rotterdam. The program is matching the release rule.",
  },
  {
    view: "bill",
    caption: "Escrow releases on its own. 11.90 SOL to the carrier. 0.50 SOL to the cover pool.",
    toast: { title: "Escrow released", body: "11.90 SOL to Vesper · 0.50 SOL to the cover pool." },
  },
  {
    view: "carriers",
    caption: "That settlement is now part of the carrier's public reputation. The clause costs 11 points.",
    toast: { title: "Reputation updated", body: "Vesper Cold Chain is now 931." },
  },
  {
    view: "overview",
    caption: "The book is current. Locked escrow dropped, the cover pool is funded, and the mean score moved.",
  },
];

export const DELIVER_STEP = 6;

type Action =
  | { type: "toggle-play" }
  | { type: "pause" }
  | { type: "next" }
  | { type: "jump"; step: number }
  | { type: "reset" }
  | { type: "nav"; view: View }
  | { type: "open-bill"; id: string }
  | { type: "open-carrier"; id: string }
  | { type: "pickup"; id: string }
  | { type: "ping"; id: string }
  | { type: "deliver"; id: string }
  | { type: "settle"; id: string }
  | { type: "issue"; draft: IssueDraft }
  | { type: "issue-open"; open: boolean }
  | { type: "wallet-open"; open: boolean }
  | { type: "toast"; title: string; body: string }
  | { type: "dismiss-toasts" };

let seq = 1000;
function nextSeq() {
  seq += 1;
  return seq;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function pushEvent(s: Shipment, event: Omit<ChainEvent, "seq"> & { seq?: number }) {
  s.events.push({ ...event, seq: event.seq ?? nextSeq() });
}

export function doPickup(s: Shipment, carrierName: string, time = "Just now") {
  if (s.status !== "issued") return;
  s.status = "in_transit";
  s.progress = 0.08;
  pushEvent(s, {
    id: `${s.id}-pickup`,
    time,
    title: "Pickup attested",
    detail: `${carrierName} took custody in ${s.origin.city}. The bill now travels with the cargo.`,
    tx: s.id === DEMO_ID ? "4sQeR8kM2nP7wL5cD9eH1jB6aY3uT" : `Pk${s.id.slice(-4)}kM3nP8qR2wL6cD1e`,
    kind: "custody",
  });
}

export function addReading(s: Shipment, reading: Reading) {
  if (s.readings.some((item) => item.id === reading.id)) return;
  if (s.status !== "in_transit" && s.status !== "exception") return;
  const next = clone(reading);
  s.readings.push(next);
  s.progress = next.progress;
  if (next.breach) {
    s.adjustmentSol = round2(s.escrowSol * 0.04);
    s.status = "exception";
    const band = s.band ? `${s.band.min.toFixed(1)}–${s.band.max.toFixed(1)}°C` : "the agreed band";
    pushEvent(s, {
      id: `${s.id}-${next.id}`,
      time: next.time,
      title: "Sensor clause armed",
      detail: `${next.tempC?.toFixed(1)}°C at ${next.place}. Band is ${band}. ${s.adjustmentSol.toFixed(2)} SOL is earmarked for the cover pool.`,
      tx: "9cH4kM8nP1qR6wL3dF5eH2jB7aY1uT",
      kind: "clause",
    });
    return;
  }
  const band = s.band ? `${s.band.min.toFixed(1)}–${s.band.max.toFixed(1)}°C` : null;
  pushEvent(s, {
    id: `${s.id}-${next.id}`,
    time: next.time,
    title: "Oracle ping",
    detail:
      next.tempC == null
        ? `GPS fix at ${next.place}. ${next.coords}.`
        : `${next.tempC.toFixed(1)}°C at ${next.place}. Inside the ${band} band.`,
    tx: next.id === "demo-r1" ? "8kLmQ2nP5rT9wC4dH7eF1jB3aY6uT" : "3nP9kM6qR2wL8cD5eH1jB4aY7uT9e",
    kind: "oracle",
  });
}

export function doDeliver(s: Shipment, time = "Just now") {
  if (s.status !== "in_transit" && s.status !== "exception") return;
  s.status = "delivered";
  s.progress = 1;
  pushEvent(s, {
    id: `${s.id}-deliver`,
    time,
    title: "Delivery signed",
    detail: `${s.consignee.name} confirmed receipt in ${s.destination.city}.`,
    tx: s.id === DEMO_ID ? "6dL2kM9nP4qR7wC1eH5jB8aY3uT6pQ" : `Dv${s.id.slice(-4)}kM3nP8qR2wL6cD1e`,
    kind: "delivery",
  });
}

export function doSettle(s: Shipment, carrierName: string, time = "Just now") {
  if (s.status !== "delivered") return;
  const carrierPay = round2(s.escrowSol - s.adjustmentSol);
  const cover = s.adjustmentSol;
  s.status = "settled";
  s.releasedSol = carrierPay;
  s.progress = 1;
  pushEvent(s, {
    id: `${s.id}-settle`,
    time,
    title: "Escrow released",
    detail:
      cover > 0
        ? `${carrierPay.toFixed(2)} SOL sent to ${carrierName}. ${cover.toFixed(2)} SOL sent to the cover pool.`
        : `${carrierPay.toFixed(2)} SOL sent to ${carrierName}.`,
    tx: s.id === DEMO_ID ? "2sReL9kQ8nP4wL7cD1eH5jB3aY6uT" : `St${s.id.slice(-4)}kM3nP8qR2wL6cD1e`,
    kind: "settle",
  });
}

export function applyScore(carriers: Carrier[], id: string, adjusted: boolean) {
  return carriers.map((carrier) => {
    if (carrier.id !== id) return carrier;
    const next = clone(carrier);
    next.deliveries += 1;
    if (adjusted) {
      next.claims += 1;
      next.score = Math.max(0, next.score - 11);
      next.onTimePct = round1(next.onTimePct - 0.2);
      next.lastNote = "Delivered · sensor clause −11";
    } else {
      next.score = Math.min(1000, next.score + 2);
      next.onTimePct = round1(Math.min(100, next.onTimePct + 0.1));
      next.lastNote = "Clean release · +2";
    }
    return next;
  });
}

function carrierName(carriers: Carrier[], id: string) {
  return carriers.find((carrier) => carrier.id === id)?.name ?? "Carrier";
}

export function project(step: number): AppState {
  const safe = Math.max(0, Math.min(STEPS.length - 1, step));
  const shipments = clone(seedShipments);
  let carriers = clone(seedCarriers);
  const demo = shipments.find((item) => item.id === DEMO_ID)!;
  const name = carrierName(carriers, demo.carrierId);

  if (safe >= 2) doPickup(demo, name, "Day 0 · 08:05 UTC");
  if (safe >= 3) addReading(demo, READING_SCRIPT[0]);
  if (safe >= 4) addReading(demo, READING_SCRIPT[1]);
  if (safe >= 5) addReading(demo, READING_SCRIPT[2]);
  if (safe >= 6) doDeliver(demo, "Day 6 · 07:16 UTC");
  if (safe >= 7) {
    doSettle(demo, name, "Day 6 · 07:16 UTC");
    carriers = applyScore(carriers, demo.carrierId, demo.adjustmentSol > 0);
  }

  const spec = STEPS[safe];
  return {
    view: spec.view,
    selectedId: DEMO_ID,
    carrierId: "vesper",
    shipments,
    carriers,
    toasts: spec.toast ? [{ id: `step-${safe}`, title: spec.toast.title, body: spec.toast.body }] : [],
    playing: false,
    step: safe,
    issueOpen: false,
    walletOpen: false,
  };
}

export function initialState(): AppState {
  return {
    view: "overview",
    selectedId: DEMO_ID,
    carrierId: "vesper",
    shipments: clone(seedShipments),
    carriers: clone(seedCarriers),
    toasts: [],
    playing: false,
    step: -1,
    issueOpen: false,
    walletOpen: false,
  };
}

export function bookStats(shipments: Shipment[], carriers: Carrier[]) {
  const locked = shipments
    .filter((item) => item.status !== "settled")
    .reduce((sum, item) => sum + (item.escrowSol - item.releasedSol), 0);
  const open = shipments.filter((item) => item.status !== "settled").length;
  const moving = shipments.filter((item) => item.status === "in_transit" || item.status === "exception").length;
  const cover = shipments.reduce((sum, item) => sum + item.adjustmentSol, 0);
  const score = carriers.reduce((sum, carrier) => sum + carrier.score, 0) / carriers.length;
  return { locked, open, moving, cover, score };
}

export function orderedBills(shipments: Shipment[]) {
  return [...shipments].sort((a, b) => {
    const settledA = a.status === "settled" ? 1 : 0;
    const settledB = b.status === "settled" ? 1 : 0;
    if (settledA !== settledB) return settledA - settledB;
    return b.id.localeCompare(a.id);
  });
}

export function createShipment(draft: IssueDraft, count: number): Shipment {
  const id = `PF2-${1900 + count}`;
  const shipment: Shipment = {
    id,
    cargo: draft.cargo.trim(),
    detail: draft.detail.trim(),
    weight: draft.weight.trim(),
    origin: { city: draft.originCity.trim(), code: draft.originCode.trim().toUpperCase() },
    destination: { city: draft.destCity.trim(), code: draft.destCode.trim().toUpperCase() },
    shipper: { name: draft.shipper.trim(), wallet: `Shpr${id.slice(-4)}kM3nP8qR2wL6cD9eH` },
    consignee: { name: draft.consignee.trim(), wallet: `Cnee${id.slice(-4)}kM3nP8qR2wL6cD9eH` },
    carrierId: draft.carrierId,
    status: "issued",
    escrowSol: round2(draft.escrowSol),
    releasedSol: 0,
    adjustmentSol: 0,
    band: draft.cold ? { min: draft.min, max: draft.max } : null,
    readings: [],
    events: [],
    progress: 0,
    cover: "Harbor Mutual Cover",
    mode: "simple",
  };
  pushEvent(shipment, {
    id: `${id}-issue`,
    time: "Just now",
    title: "Bill issued",
    detail: `${shipment.shipper.name} issued ${id} for ${shipment.cargo}.`,
    tx: `Is${id.slice(-4)}kM3nP8qR2wL6cD1eH5j`,
    kind: "issue",
  });
  pushEvent(shipment, {
    id: `${id}-escrow`,
    time: "Just now",
    title: "Escrow locked",
    detail: `${shipment.escrowSol.toFixed(2)} SOL is locked until delivery is signed.`,
    tx: `Es${id.slice(-4)}kM3nP8qR2wL6cD1eH5j`,
    kind: "escrow",
  });
  return shipment;
}

function withShipment(list: Shipment[], id: string, mutate: (shipment: Shipment) => void) {
  return list.map((item) => {
    if (item.id !== id) return item;
    const copy = clone(item);
    mutate(copy);
    return copy;
  });
}

function toast(title: string, body: string): Toast[] {
  return [{ id: `${Date.now()}-${title}`, title, body }];
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "toggle-play": {
      if (state.issueOpen) return state;
      if (state.playing) return { ...state, playing: false };
      if (state.step >= 0 && state.step < STEPS.length - 1) return { ...state, playing: true };
      return { ...project(0), playing: true, step: 0 };
    }
    case "pause":
      return { ...state, playing: false };
    case "next": {
      if (state.step >= STEPS.length - 1) return { ...state, playing: false };
      const step = state.step + 1;
      return { ...project(step), playing: state.playing && step < STEPS.length - 1, step };
    }
    case "jump":
      return { ...project(action.step), playing: false, step: action.step };
    case "reset":
      return initialState();
    case "nav":
      return { ...state, view: action.view, playing: false, issueOpen: false, walletOpen: false };
    case "open-bill":
      return { ...state, view: "bill", selectedId: action.id, playing: false, walletOpen: false };
    case "open-carrier":
      return {
        ...state,
        view: "carriers",
        carrierId: action.id,
        playing: false,
        walletOpen: false,
      };
    case "pickup": {
      const bill = state.shipments.find((item) => item.id === action.id);
      if (!bill || bill.status !== "issued") return state;
      const name = carrierName(state.carriers, bill.carrierId);
      return {
        ...state,
        shipments: withShipment(state.shipments, action.id, (shipment) => doPickup(shipment, name)),
        toasts: toast("Pickup attested", "Custody transferred to the carrier."),
      };
    }
    case "ping": {
      const current = state.shipments.find((item) => item.id === action.id);
      const reading = current ? READING_SCRIPT[current.readings.length] : undefined;
      if (!current || current.mode !== "script" || !reading) return state;
      return {
        ...state,
        shipments: withShipment(state.shipments, action.id, (shipment) => addReading(shipment, reading)),
        toasts: reading.breach
          ? toast("Sensor clause armed", `${reading.tempC?.toFixed(1)}°C at ${reading.place}.`)
          : toast("Oracle ping", `${reading.tempC?.toFixed(1)}°C at ${reading.place}.`),
      };
    }
    case "deliver": {
      const bill = state.shipments.find((item) => item.id === action.id);
      if (!bill || (bill.status !== "in_transit" && bill.status !== "exception")) return state;
      return {
        ...state,
        shipments: withShipment(state.shipments, action.id, (shipment) => doDeliver(shipment)),
        toasts: toast("Delivery signed", "Release rule is being matched."),
      };
    }
    case "settle": {
      const bill = state.shipments.find((item) => item.id === action.id);
      if (!bill || bill.status !== "delivered") return state;
      const name = carrierName(state.carriers, bill.carrierId);
      const adjusted = bill.adjustmentSol > 0;
      const pay = round2(bill.escrowSol - bill.adjustmentSol);
      const bump = action.id === DEMO_ID && state.step >= 0 && state.step <= DELIVER_STEP;
      return {
        ...state,
        step: bump ? DELIVER_STEP + 1 : state.step,
        shipments: withShipment(state.shipments, action.id, (shipment) => doSettle(shipment, name)),
        carriers: applyScore(state.carriers, bill.carrierId, adjusted),
        toasts: toast(
          "Escrow released",
          adjusted
            ? `${pay.toFixed(2)} SOL to the carrier · ${bill.adjustmentSol.toFixed(2)} SOL to the cover pool.`
            : `${pay.toFixed(2)} SOL sent to ${name}.`,
        ),
      };
    }
    case "issue": {
      const shipment = createShipment(action.draft, state.shipments.length);
      return {
        ...state,
        playing: false,
        issueOpen: false,
        view: "bill",
        selectedId: shipment.id,
        shipments: [shipment, ...state.shipments],
        toasts: toast("Bill issued", `${shipment.id} · ${shipment.escrowSol.toFixed(2)} SOL locked.`),
      };
    }
    case "issue-open":
      return { ...state, issueOpen: action.open, playing: action.open ? false : state.playing };
    case "wallet-open":
      return { ...state, walletOpen: action.open };
    case "toast":
      return { ...state, toasts: toast(action.title, action.body) };
    case "dismiss-toasts":
      return { ...state, toasts: [] };
    default:
      return state;
  }
}
