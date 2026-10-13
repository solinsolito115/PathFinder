import { useState } from "react";
import {
  BillTable,
  RouteMap,
  StatusPill,
  TempChart,
  billAccount,
  escrowAccount,
} from "./bits";
import {
  DEMO_ID,
  READING_SCRIPT,
  RELEASE_MS,
  seedCarriers,
  short,
  solText,
  statusLabel,
  usdText,
  type Carrier,
  type IssueDraft,
  type Shipment,
} from "./data";
import { bookStats, orderedBills, type AppState } from "./logic";

type OpenBill = (id: string) => void;

export function Overview({
  shipments,
  carriers,
  onOpen,
}: {
  shipments: Shipment[];
  carriers: Carrier[];
  onOpen: OpenBill;
}) {
  const stats = bookStats(shipments, carriers);
  const featured = shipments.find((item) => item.id === DEMO_ID) ?? shipments[0];
  const feed = shipments
    .flatMap((bill) => bill.events.map((event) => ({ ...event, billId: bill.id })))
    .sort((a, b) => b.seq - a.seq)
    .slice(0, 6);

  return (
    <div className="stack">
      <section className="stats">
        <article>
          <span>Escrow locked</span>
          <strong>
            {solText(stats.locked)} <small>SOL</small>
          </strong>
          <em>{usdText(stats.locked)} at the simulated mark</em>
        </article>
        <article>
          <span>Open bills</span>
          <strong>{stats.open}</strong>
          <em>{stats.moving} in transit</em>
        </article>
        <article>
          <span>Cover pool</span>
          <strong>
            {solText(stats.cover)} <small>SOL</small>
          </strong>
          <em>Earmarked from sensor clauses</em>
        </article>
        <article>
          <span>Carrier score</span>
          <strong>{stats.score.toFixed(1)}</strong>
          <em>Mean of {carriers.length} reputation accounts</em>
        </article>
      </section>

      <section className="top-grid">
        {featured && (
          <button type="button" className="hero" onClick={() => onOpen(featured.id)}>
            <div className="hero-top">
              <div>
                <p className="eyebrow">Featured bill</p>
                <h2>{featured.id}</h2>
                <p className="lede">
                  {featured.cargo}
                  <span>
                    {featured.origin.city} → {featured.destination.city}
                  </span>
                </p>
              </div>
              <div className="hero-side">
                <StatusPill status={featured.status} />
                <strong className="num">{solText(featured.status === "settled" ? featured.releasedSol : featured.escrowSol)} SOL</strong>
                <em>{featured.status === "settled" ? "Released" : "Locked in escrow"}</em>
                {featured.adjustmentSol > 0 && <em className="warn-text">{solText(featured.adjustmentSol)} SOL to cover</em>}
              </div>
            </div>
            <RouteMap
              origin={featured.origin}
              destination={featured.destination}
              progress={featured.progress}
              readings={featured.readings}
            />
          </button>
        )}
        <aside className="panel">
          <div className="panel-head">
            <h2>Attestations</h2>
          </div>
          <div className="feed">
            {feed.map((event) => (
              <button key={event.id} type="button" className="feed-item" onClick={() => onOpen(event.billId)}>
                <i className={`kind kind-${event.kind}`} />
                <span>
                  <strong>
                    {event.title}
                    <em>{event.billId}</em>
                  </strong>
                  <small>{event.detail}</small>
                </span>
                <time>{event.time.replace(" · ", " ")}</time>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>The book</h2>
          <span>{shipments.length} bills</span>
        </div>
        <BillTable shipments={orderedBills(shipments)} carriers={carriers} onOpen={onOpen} />
      </section>
    </div>
  );
}

export function Bills({
  shipments,
  carriers,
  onOpen,
}: {
  shipments: Shipment[];
  carriers: Carrier[];
  onOpen: OpenBill;
}) {
  const [filter, setFilter] = useState<"all" | "open" | "cold" | "settled">("all");
  const rows = orderedBills(shipments).filter((bill) => {
    if (filter === "open") return bill.status !== "settled";
    if (filter === "cold") return bill.band != null;
    if (filter === "settled") return bill.status === "settled";
    return true;
  });

  return (
    <div className="stack">
      <div className="filters">
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["cold", "Cold chain"],
            ["settled", "Settled"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={filter === id ? "chip on" : "chip"} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <section className="panel">
        {rows.length ? (
          <BillTable shipments={rows} carriers={carriers} onOpen={onOpen} />
        ) : (
          <p className="empty">No bills in this view.</p>
        )}
      </section>
    </div>
  );
}

export function BillView({
  bill,
  carrier,
  playing,
  onPickup,
  onPing,
  onDeliver,
  onCarrier,
  onCopy,
}: {
  bill: Shipment;
  carrier: Carrier;
  playing: boolean;
  onPickup: (id: string) => void;
  onPing: (id: string) => void;
  onDeliver: (id: string) => void;
  onCarrier: (id: string) => void;
  onCopy: (value: string) => void;
}) {
  const last = bill.readings.at(-1);
  const latestTemp = [...bill.readings].reverse().find((reading) => reading.tempC != null);
  const clause = clauseState(bill);
  const carrierPay = bill.escrowSol - bill.adjustmentSol;
  const canPing = bill.mode === "script" && bill.readings.length < READING_SCRIPT.length && bill.status !== "issued";
  const stages = ["Funded", "In custody", "Delivered", "Settled"];
  const active = bill.status === "issued" ? 0 : bill.status === "delivered" ? 2 : bill.status === "settled" ? 3 : 1;

  return (
    <div className="stack">
      <div className="bill-top">
        <div>
          <p className="eyebrow">Smart bill of lading</p>
          <h2 className="bill-id">{bill.id}</h2>
          <p className="lede">
            {bill.cargo}
            <span>
              {bill.detail} · {bill.weight}
            </span>
          </p>
          <p className="account">Bill account {short(billAccount(bill.id))}</p>
        </div>
        <StatusPill status={bill.status} />
      </div>

      <div className="stages" aria-label="Bill progress">
        {stages.map((label, index) => (
          <div
            key={label}
            className={bill.status === "settled" || index < active ? "stage done" : index === active ? "stage now" : "stage"}
          >
            <span>{index + 1}</span>
            {label}
          </div>
        ))}
      </div>

      <div className="parties">
        <div>
          <span>Shipper</span>
          <strong>{bill.shipper.name}</strong>
          <em>{short(bill.shipper.wallet)}</em>
        </div>
        <button type="button" onClick={() => onCarrier(carrier.id)}>
          <span>Carrier</span>
          <strong>{carrier.name}</strong>
          <em>{short(carrier.wallet)}</em>
        </button>
        <div>
          <span>Consignee</span>
          <strong>{bill.consignee.name}</strong>
          <em>{short(bill.consignee.wallet)}</em>
        </div>
      </div>

      <div className="bill-grid">
        <div className="stack">
          <section className="panel route-panel">
            <div className="panel-head">
              <h2>
                {bill.origin.city} → {bill.destination.city}
              </h2>
              <span>
                {bill.origin.code} to {bill.destination.code}
              </span>
            </div>
            <RouteMap origin={bill.origin} destination={bill.destination} progress={bill.progress} readings={bill.readings} />
            <p className="route-foot">
              {last ? (
                <>
                  Last ping · {last.place}
                  {last.tempC != null ? ` · ${last.tempC.toFixed(1)}°C` : ""}
                  <span>{last.coords}</span>
                </>
              ) : bill.status === "issued" ? (
                <>Cargo is still in {bill.origin.city}. Escrow is locked.</>
              ) : (
                <>In custody · leaving {bill.origin.city}</>
              )}
            </p>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Attestations</h2>
              <span>Simulated clock</span>
            </div>
            <ol className="timeline">
              {[...bill.events]
                .sort((a, b) => a.seq - b.seq)
                .map((event) => (
                  <li key={event.id}>
                    <i className={`kind kind-${event.kind}`} />
                    <div>
                      <div className="ev-top">
                        <strong>{event.title}</strong>
                        <span>{event.time}</span>
                      </div>
                      <p>{event.detail}</p>
                      <button type="button" className="tx" onClick={() => onCopy(event.tx)}>
                        {short(event.tx)}
                      </button>
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        </div>

        <div className="stack">
          <section className="panel escrow">
            <div className="panel-head">
              <h2>Escrow</h2>
              <span>{bill.cover}</span>
            </div>
            <p className="escrow-figure">
              <strong>{solText(bill.status === "settled" ? bill.releasedSol : bill.escrowSol)}</strong>
              <small>SOL</small>
            </p>
            <p className="quiet">{bill.status === "settled" ? "Paid to the carrier" : "Locked until the release rule matches"}</p>
            <dl className="split">
              <div>
                <dt>Carrier</dt>
                <dd>{solText(carrierPay)} SOL</dd>
              </div>
              <div>
                <dt>Cover pool</dt>
                <dd className={bill.adjustmentSol > 0 ? "warn-text" : ""}>
                  {bill.adjustmentSol > 0 ? `${solText(bill.adjustmentSol)} SOL` : "—"}
                </dd>
              </div>
            </dl>
            <p className="account">Escrow account {short(escrowAccount(bill.id))}</p>
            <ul className="check">
              <li className="ok">
                <i /> Escrow funded
              </li>
              <li className={bill.status === "issued" ? "wait" : "ok"}>
                <i /> Pickup attested
              </li>
              <li className={bill.status === "delivered" || bill.status === "settled" ? "ok" : "wait"}>
                <i /> Delivery signed
              </li>
              <li className={clause.tone}>
                <i /> Sensor clause · {clause.label}
              </li>
            </ul>
            {bill.band && (
              <p className="rule">
                Release rule: a delivery signature. The {bill.band.min.toFixed(1)}–{bill.band.max.toFixed(1)}°C band reprices the
                split. It does not freeze the bill.
              </p>
            )}
            {bill.status === "delivered" && (
              <div className="releasing">
                <div>
                  <strong>Releasing escrow</strong>
                  <span>Rule matched</span>
                </div>
                <div className="release-bar">
                  <span style={{ animationDuration: `${RELEASE_MS}ms` }} />
                </div>
              </div>
            )}
            {bill.status === "settled" && <p className="settled-note">Settled on the simulated ledger. Reputation has been written.</p>}
            {bill.mode !== "readonly" && !playing && bill.status !== "settled" && bill.status !== "delivered" && (
              <div className="actions">
                {bill.status === "issued" && (
                  <button type="button" className="btn btn-primary" onClick={() => onPickup(bill.id)}>
                    Attest pickup
                  </button>
                )}
                {canPing && (
                  <button type="button" className="btn btn-primary" onClick={() => onPing(bill.id)}>
                    Post oracle reading
                  </button>
                )}
                {bill.status !== "issued" && (
                  <button type="button" className={canPing ? "btn" : "btn btn-primary"} onClick={() => onDeliver(bill.id)}>
                    Confirm delivery
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Sensors</h2>
              <span>{bill.band ? `${bill.band.min.toFixed(1)}–${bill.band.max.toFixed(1)}°C` : "GPS only"}</span>
            </div>
            <p className={latestTemp?.breach ? "temp-now hot" : "temp-now"}>
              {latestTemp?.tempC != null ? `${latestTemp.tempC.toFixed(1)}°C` : bill.band ? "—" : "GPS"}
              <small>{latestTemp ? latestTemp.place : last?.place ?? "No pings yet"}</small>
            </p>
            <TempChart readings={bill.readings} band={bill.band} />
            {bill.band && <p className="rule">A breach sends 4% of escrow to the cover pool at release.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

function clauseState(bill: Shipment) {
  if (!bill.band) return { label: "No clause", tone: "wait" };
  if (bill.adjustmentSol > 0) return { label: `Adjusted ${solText(bill.adjustmentSol)} SOL`, tone: "bad" };
  if (bill.readings.some((reading) => reading.tempC != null)) return { label: "Inside band", tone: "ok" };
  return { label: "Waiting for oracle", tone: "wait" };
}

export function Carriers({
  shipments,
  carriers,
  selectedId,
  onSelect,
  onOpen,
}: {
  shipments: Shipment[];
  carriers: Carrier[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpen: OpenBill;
}) {
  const ranked = [...carriers].sort((a, b) => b.score - a.score);
  const carrier = carriers.find((item) => item.id === selectedId) ?? ranked[0];
  const base = seedCarriers.find((item) => item.id === carrier.id);
  const delta = base ? carrier.score - base.score : 0;
  const bills = orderedBills(shipments.filter((item) => item.carrierId === carrier.id));

  return (
    <div className="carrier-layout">
      <section className="panel">
        {ranked.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === carrier.id ? "carrier-row on" : "carrier-row"}
            onClick={() => onSelect(item.id)}
          >
            <span>
              <strong>{item.name}</strong>
              <small>{item.lane}</small>
            </span>
            <em className="num">{item.score}</em>
          </button>
        ))}
      </section>
      <section className="panel carrier-detail">
        <p className="eyebrow">Reputation account</p>
        <h2>{carrier.name}</h2>
        <p className="quiet">{carrier.lane}</p>
        <p className="account">{short(carrier.wallet, 6, 6)}</p>
        <div className="score-block">
          <p className="score-num">{carrier.score}</p>
          {delta !== 0 && <p className={delta < 0 ? "delta down" : "delta"}>{delta > 0 ? `+${delta}` : delta} this settlement</p>}
          <div className="score-bar" aria-hidden="true">
            <span style={{ width: `${carrier.score / 10}%` }} />
          </div>
        </div>
        <div className="metrics">
          <div>
            <span>Deliveries</span>
            <strong>{carrier.deliveries}</strong>
          </div>
          <div>
            <span>On time</span>
            <strong>{carrier.onTimePct.toFixed(1)}%</strong>
          </div>
          <div>
            <span>Claims</span>
            <strong>{carrier.claims}</strong>
          </div>
          <div>
            <span>Stake</span>
            <strong>{solText(carrier.stakeSol)} SOL</strong>
          </div>
        </div>
        <p className="note">{carrier.lastNote}</p>
        <h3>Bills in this book</h3>
        {bills.length ? (
          <div className="mini-list">
            {bills.map((bill) => (
              <button key={bill.id} type="button" onClick={() => onOpen(bill.id)}>
                <span className="mono">{bill.id}</span>
                <span>{bill.cargo}</span>
                <em>{statusLabel(bill.status)}</em>
              </button>
            ))}
          </div>
        ) : (
          <p className="quiet">No bills for this carrier in the current book.</p>
        )}
      </section>
    </div>
  );
}

export function Oracles({ shipments, carriers, onOpen }: { shipments: Shipment[]; carriers: Carrier[]; onOpen: OpenBill }) {
  const rows = orderedBills(shipments);
  return (
    <div className="stack">
      <section className="callout">
        <p className="eyebrow">Oracle rule</p>
        <h2>Sensor feeds do not veto delivery. They price it.</h2>
        <p>
          Temperature and GPS are attestations on the bill. If a reading leaves the insured band, a share of escrow moves to the
          cover pool when the bill releases. The carrier’s reputation account records the clause.
        </p>
      </section>
      <section className="panel">
        <div className="table oracle-table">
          <div className="thead">
            <span>Bill</span>
            <span>Carrier</span>
            <span>Latest</span>
            <span>Band</span>
            <span>Effect</span>
          </div>
          {rows.map((bill) => {
            const carrier = carriers.find((item) => item.id === bill.carrierId);
            const latest = bill.readings.at(-1);
            const armed = bill.adjustmentSol > 0;
            return (
              <button key={bill.id} type="button" className={armed ? "row armed" : "row"} onClick={() => onOpen(bill.id)}>
                <span className="mono">{bill.id}</span>
                <span>{carrier?.name}</span>
                <span>
                  {latest ? (
                    <>
                      <strong>{latest.tempC != null ? `${latest.tempC.toFixed(1)}°C` : "GPS"}</strong>
                      <small>{latest.place}</small>
                    </>
                  ) : (
                    <strong>No ping</strong>
                  )}
                </span>
                <span>{bill.band ? `${bill.band.min.toFixed(1)}–${bill.band.max.toFixed(1)}°C` : "None"}</span>
                <span className={armed ? "warn-text" : ""}>{oracleEffect(bill)}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function oracleEffect(bill: Shipment) {
  if (bill.adjustmentSol > 0) return `Adjustment armed · ${solText(bill.adjustmentSol)} SOL`;
  if (!bill.band) return bill.readings.length ? "GPS only" : "No sensor clause";
  if (!bill.readings.length) return "Awaiting ping";
  return "Inside band";
}

const emptyDraft: IssueDraft = {
  cargo: "Washed green coffee",
  detail: "320 bags · humidity logged",
  weight: "19.2 t",
  originCity: "Bogotá",
  originCode: "BOG",
  destCity: "Hamburg",
  destCode: "HAM",
  shipper: "Northwind Commodities",
  consignee: "Baltic Receivers",
  carrierId: "kite",
  escrowSol: 6.5,
  cold: false,
  min: 12,
  max: 22,
};

export function IssueModal({
  carriers,
  onClose,
  onSubmit,
}: {
  carriers: Carrier[];
  onClose: () => void;
  onSubmit: (draft: IssueDraft) => void;
}) {
  const [draft, setDraft] = useState<IssueDraft>(emptyDraft);
  const valid =
    draft.cargo.trim() &&
    draft.originCity.trim() &&
    draft.originCode.trim() &&
    draft.destCity.trim() &&
    draft.destCode.trim() &&
    draft.shipper.trim() &&
    draft.consignee.trim() &&
    draft.escrowSol > 0 &&
    (!draft.cold || draft.min < draft.max);

  function set<K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="modal-scrim">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSubmit(draft);
        }}
      >
        <div className="panel-head">
          <div>
            <p className="eyebrow">New smart bill</p>
            <h2>Lock escrow and issue</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="form-grid">
          <label className="field span-2">
            <span>Cargo</span>
            <input value={draft.cargo} onChange={(event) => set("cargo", event.target.value)} />
          </label>
          <label className="field">
            <span>Detail</span>
            <input value={draft.detail} onChange={(event) => set("detail", event.target.value)} />
          </label>
          <label className="field">
            <span>Weight</span>
            <input value={draft.weight} onChange={(event) => set("weight", event.target.value)} />
          </label>
          <label className="field">
            <span>Origin</span>
            <input value={draft.originCity} onChange={(event) => set("originCity", event.target.value)} />
          </label>
          <label className="field">
            <span>Code</span>
            <input value={draft.originCode} onChange={(event) => set("originCode", event.target.value)} />
          </label>
          <label className="field">
            <span>Destination</span>
            <input value={draft.destCity} onChange={(event) => set("destCity", event.target.value)} />
          </label>
          <label className="field">
            <span>Code</span>
            <input value={draft.destCode} onChange={(event) => set("destCode", event.target.value)} />
          </label>
          <label className="field">
            <span>Shipper</span>
            <input value={draft.shipper} onChange={(event) => set("shipper", event.target.value)} />
          </label>
          <label className="field">
            <span>Consignee</span>
            <input value={draft.consignee} onChange={(event) => set("consignee", event.target.value)} />
          </label>
          <label className="field">
            <span>Carrier</span>
            <select value={draft.carrierId} onChange={(event) => set("carrierId", event.target.value)}>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Escrow (SOL)</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={draft.escrowSol}
              onChange={(event) => set("escrowSol", Number(event.target.value))}
            />
          </label>
          <label className="checkline span-2">
            <input type="checkbox" checked={draft.cold} onChange={(event) => set("cold", event.target.checked)} />
            Cold-chain clause
          </label>
          {draft.cold && (
            <>
              <label className="field">
                <span>Min °C</span>
                <input type="number" step="0.1" value={draft.min} onChange={(event) => set("min", Number(event.target.value))} />
              </label>
              <label className="field">
                <span>Max °C</span>
                <input type="number" step="0.1" value={draft.max} onChange={(event) => set("max", Number(event.target.value))} />
              </label>
            </>
          )}
        </div>
        <div className="modal-actions">
          <p>Simulated lock. Nothing is signed or sent to Solana.</p>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            Issue bill
          </button>
        </div>
      </form>
    </div>
  );
}

export function pageTitle(state: AppState) {
  if (state.view === "overview") return "Overview";
  if (state.view === "bills") return "Bills of lading";
  if (state.view === "carriers") return "Carriers";
  if (state.view === "oracles") return "Oracles";
  return state.selectedId;
}
