import {
  accountFor,
  short,
  solText,
  statusLabel,
  type Carrier,
  type Reading,
  type Shipment,
} from "./data";

function qPoint(t: number) {
  const p0 = { x: 28, y: 168 };
  const p1 = { x: 320, y: 28 };
  const p2 = { x: 612, y: 156 };
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

const PATH_LEN = (() => {
  let len = 0;
  let prev = qPoint(0);
  for (let i = 1; i <= 48; i += 1) {
    const point = qPoint(i / 48);
    len += Math.hypot(point.x - prev.x, point.y - prev.y);
    prev = point;
  }
  return len;
})();

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" />
      <path d="M7 23 L15 9 L19 16 L25 8" />
      <circle cx="25" cy="8" r="2" />
    </svg>
  );
}

export function StatusPill({ status }: { status: Shipment["status"] }) {
  return <span className={`pill pill-${status}`}>{statusLabel(status)}</span>;
}

export function RouteMap({
  origin,
  destination,
  progress,
  readings,
}: {
  origin: Shipment["origin"];
  destination: Shipment["destination"];
  progress: number;
  readings: Reading[];
}) {
  const d = "M 28 168 Q 320 28 612 156";
  const clamped = Math.min(1, Math.max(0, progress));
  const tip = qPoint(clamped);
  return (
    <svg className="route-svg" viewBox="0 0 640 228" role="img" aria-label={`Route from ${origin.city} to ${destination.city}`}>
      <defs>
        <pattern id="route-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(16,36,58,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="640" height="228" fill="url(#route-grid)" />
      <path d={d} className="route-base" />
      <path d={d} className="route-live" style={{ strokeDasharray: `${PATH_LEN * clamped} ${PATH_LEN}` }} />
      {readings.map((reading) => {
        const point = qPoint(reading.progress);
        return (
          <circle
            key={reading.id}
            cx={point.x}
            cy={point.y}
            r={reading.breach ? 5 : 3.5}
            className={reading.breach ? "ping-hot" : "ping"}
          />
        );
      })}
      <circle cx="28" cy="168" r="4" className="port" />
      <circle cx="612" cy="156" r="4" className="port" />
      <g transform={`translate(${tip.x} ${tip.y})`}>
        <circle r="12" className="vessel-glow" />
        <circle r="4.5" className="vessel" />
      </g>
      <text className="map-city" x="28" y="196">
        {origin.city}
      </text>
      <text className="map-code" x="28" y="214">
        {origin.code}
      </text>
      <text className="map-city" x="612" y="184" textAnchor="end">
        {destination.city}
      </text>
      <text className="map-code" x="612" y="202" textAnchor="end">
        {destination.code}
      </text>
    </svg>
  );
}

export function TempChart({ readings, band }: { readings: Reading[]; band: { min: number; max: number } | null }) {
  const temps = readings.filter((reading): reading is Reading & { tempC: number } => reading.tempC != null);
  if (!band) return <p className="quiet">No temperature clause. GPS can still post along the route.</p>;
  if (!temps.length) return <p className="quiet">Waiting for the first temperature ping.</p>;

  const lo = Math.min(band.min - 3, ...temps.map((reading) => reading.tempC)) - 0.4;
  const hi = Math.max(band.max + 3, ...temps.map((reading) => reading.tempC)) + 0.4;
  const w = 320;
  const h = 128;
  const pad = 18;
  const x = (index: number) => pad + (index * (w - pad * 2)) / Math.max(1, temps.length - 1);
  const y = (temp: number) => pad + ((hi - temp) / (hi - lo)) * (h - pad * 2);
  const line = temps.map((reading, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(reading.tempC)}`).join(" ");

  return (
    <svg className="temp-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Temperature against the insured band">
      <rect x="0" y={y(band.max)} width={w} height={Math.max(0, y(band.min) - y(band.max))} className="band" />
      <path d={line} className="temp-line" />
      {temps.map((reading, index) => (
        <circle key={reading.id} cx={x(index)} cy={y(reading.tempC)} r="4.5" className={reading.breach ? "ping-hot" : "ping-ok"} />
      ))}
    </svg>
  );
}

export function BillTable({
  shipments,
  carriers,
  onOpen,
}: {
  shipments: Shipment[];
  carriers: Carrier[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="table">
      <div className="thead">
        <span>Bill</span>
        <span>Cargo</span>
        <span>Lane</span>
        <span>Carrier</span>
        <span>Status</span>
        <span>Escrow</span>
      </div>
      {shipments.map((bill) => {
        const carrier = carriers.find((item) => item.id === bill.carrierId);
        return (
          <button key={bill.id} type="button" className="row" onClick={() => onOpen(bill.id)}>
            <span className="mono">{bill.id}</span>
            <span>
              <strong>{bill.cargo}</strong>
              <small>{bill.detail}</small>
            </span>
            <span>
              {bill.origin.code} → {bill.destination.code}
            </span>
            <span>{carrier?.name ?? "Carrier"}</span>
            <StatusPill status={bill.status} />
            <span className="num">
              {bill.status === "settled" ? `${solText(bill.releasedSol)} paid` : `${solText(bill.escrowSol)} locked`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function billAccount(id: string) {
  return accountFor(id, "BoL");
}

export function escrowAccount(id: string) {
  return accountFor(id, "Esc");
}

export function IconBook() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 8H20" />
    </svg>
  );
}

export function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

export function IconBadge() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="9" r="4" />
      <path d="M6.5 19.5c1.2-2.2 3.1-3.3 5.5-3.3s4.3 1.1 5.5 3.3" />
    </svg>
  );
}

export function IconSignal() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
    </svg>
  );
}

export { short };
