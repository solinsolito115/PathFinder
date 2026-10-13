import { useEffect, useReducer, type ReactNode } from "react";
import { IconBadge, IconBook, IconDoc, IconSignal, Mark } from "./bits";
import { RELEASE_MS, VIEWER, short, type View } from "./data";
import { DELIVER_STEP, STEPS, initialState, reduce } from "./logic";
import { BillView, Bills, Carriers, IssueModal, Oracles, Overview, pageTitle } from "./views";

export function App() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const caption = state.step >= 0 ? STEPS[state.step]?.caption : "";
  const bill = state.shipments.find((item) => item.id === state.selectedId) ?? state.shipments[0];
  const carrier = state.carriers.find((item) => item.id === bill?.carrierId) ?? state.carriers[0];

  useEffect(() => {
    if (!state.playing) return;
    if (state.step >= STEPS.length - 1) return;
    const delay = state.step === DELIVER_STEP ? RELEASE_MS : 4600;
    const timer = window.setTimeout(() => dispatch({ type: "next" }), delay);
    return () => window.clearTimeout(timer);
  }, [state.playing, state.step]);

  const deliveredIds = state.shipments
    .filter((item) => item.status === "delivered")
    .map((item) => item.id)
    .join("|");

  useEffect(() => {
    if (state.playing || !deliveredIds) return;
    const ids = deliveredIds.split("|");
    const timer = window.setTimeout(() => {
      for (const id of ids) dispatch({ type: "settle", id });
    }, RELEASE_MS);
    return () => window.clearTimeout(timer);
  }, [state.playing, deliveredIds]);

  useEffect(() => {
    if (state.playing || !state.toasts.length) return;
    const timer = window.setTimeout(() => dispatch({ type: "dismiss-toasts" }), 3800);
    return () => window.clearTimeout(timer);
  }, [state.playing, state.toasts]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
      if (event.code === "Space") {
        event.preventDefault();
        dispatch({ type: "toggle-play" });
      } else if (event.key === "ArrowRight") {
        dispatch({ type: "next" });
      } else if (event.key === "Escape") {
        dispatch({ type: "issue-open", open: false });
        dispatch({ type: "wallet-open", open: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const playLabel = state.playing ? "Pause" : state.step < 0 ? "Play scenario" : state.step >= STEPS.length - 1 ? "Replay" : "Resume";

  return (
    <div className="shell">
      {state.step >= 0 && (
        <div className="rail" aria-hidden="true">
          <span style={{ width: `${((state.step + 1) / STEPS.length) * 100}%` }} />
        </div>
      )}
      <aside className="side">
        <div className="brand">
          <Mark />
          <div>
            <strong>
              Pathfinder<span>2</span>
            </strong>
            <small>Smart bills of lading</small>
          </div>
        </div>
        <nav aria-label="Primary">
          <NavButton view="overview" current={state.view} icon={<IconBook />} label="Overview" onClick={() => dispatch({ type: "nav", view: "overview" })} />
          <NavButton view="bills" current={state.view} icon={<IconDoc />} label="Bills" onClick={() => dispatch({ type: "nav", view: "bills" })} />
          <NavButton view="carriers" current={state.view} icon={<IconBadge />} label="Carriers" onClick={() => dispatch({ type: "nav", view: "carriers" })} />
          <NavButton view="oracles" current={state.view} icon={<IconSignal />} label="Oracles" onClick={() => dispatch({ type: "nav", view: "oracles" })} />
        </nav>
        <div className="side-foot">
          <p>Simulated ledger</p>
          <p>Program {short("PFndr2Sim111111111111111111111111111111")}</p>
          <p>Space plays the scenario. Nothing is signed.</p>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <div className="top-row">
            <h1>{pageTitle(state)}</h1>
            <div className="controls">
              <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "toggle-play" })}>
                {state.playing ? <PauseIcon /> : <PlayIcon />}
                {playLabel}
              </button>
              <button type="button" className="btn" onClick={() => dispatch({ type: "next" })} disabled={state.step >= STEPS.length - 1}>
                Next
              </button>
              {state.step >= 0 && (
                <button type="button" className="btn" onClick={() => dispatch({ type: "reset" })}>
                  Reset
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={state.playing}
                onClick={() => dispatch({ type: "issue-open", open: true })}
              >
                Issue bill
              </button>
              <div className="wallet">
                <button type="button" className="wallet-btn" onClick={() => dispatch({ type: "wallet-open", open: !state.walletOpen })}>
                  <i />
                  <span>{VIEWER.name}</span>
                  <em>{short(VIEWER.wallet)}</em>
                </button>
                {state.walletOpen && (
                  <div className="wallet-pop">
                    <strong>Simulated session</strong>
                    <p>Pathfinder2 is not connected to a wallet. No account is debited and nothing is written to Solana.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {state.step >= 0 && caption && (
            <div className="scenario-line">
              <span>
                Step {state.step + 1} / {STEPS.length}
              </span>
              <p>{caption}</p>
              <div className="dots">
                {STEPS.map((step, index) => (
                  <button
                    key={step.caption}
                    type="button"
                    className={index === state.step ? "dot on" : index < state.step ? "dot done" : "dot"}
                    aria-label={`Go to step ${index + 1}`}
                    onClick={() => dispatch({ type: "jump", step: index })}
                  />
                ))}
              </div>
            </div>
          )}
        </header>
        <div className="scroll">
          {state.view === "overview" && (
            <Overview shipments={state.shipments} carriers={state.carriers} onOpen={(id) => dispatch({ type: "open-bill", id })} />
          )}
          {state.view === "bills" && (
            <Bills shipments={state.shipments} carriers={state.carriers} onOpen={(id) => dispatch({ type: "open-bill", id })} />
          )}
          {state.view === "bill" && bill && carrier && (
            <BillView
              bill={bill}
              carrier={carrier}
              playing={state.playing}
              onPickup={(id) => dispatch({ type: "pickup", id })}
              onPing={(id) => dispatch({ type: "ping", id })}
              onDeliver={(id) => dispatch({ type: "deliver", id })}
              onCarrier={(id) => dispatch({ type: "open-carrier", id })}
              onCopy={(value) => {
                void navigator.clipboard?.writeText(value);
                dispatch({ type: "toast", title: "Copied", body: "Signature copied to the clipboard." });
              }}
            />
          )}
          {state.view === "carriers" && (
            <Carriers
              shipments={state.shipments}
              carriers={state.carriers}
              selectedId={state.carrierId}
              onSelect={(id) => dispatch({ type: "open-carrier", id })}
              onOpen={(id) => dispatch({ type: "open-bill", id })}
            />
          )}
          {state.view === "oracles" && (
            <Oracles shipments={state.shipments} carriers={state.carriers} onOpen={(id) => dispatch({ type: "open-bill", id })} />
          )}
        </div>
      </div>
      {state.walletOpen && (
        <button type="button" className="scrim" aria-label="Close session details" onClick={() => dispatch({ type: "wallet-open", open: false })} />
      )}
      {state.issueOpen && (
        <IssueModal
          carriers={state.carriers}
          onClose={() => dispatch({ type: "issue-open", open: false })}
          onSubmit={(draft) => dispatch({ type: "issue", draft })}
        />
      )}
      <div className="toasts" aria-live="polite">
        {state.toasts.map((item) => (
          <article key={item.id} className="toast">
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function NavButton({
  view,
  current,
  icon,
  label,
  onClick,
}: {
  view: View;
  current: View;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={current === view ? "active" : ""} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d="M4 2.5v11l10-5.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor" />
    </svg>
  );
}
