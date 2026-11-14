import { useId, useState } from "react";
import { useLanguage } from "../i18n";

type GravityView = "compare" | "earth" | "microgravity";
type FlowMode = "still" | "fan";

function FlameDiagram({ microgravity, fan }: { microgravity: boolean; fan?: boolean }) {
  const { t } = useLanguage();
  const diagramId = useId().replace(/:/g, "");
  const flameId = `${diagramId}-${microgravity ? "micro" : "earth"}Flame`;
  const arrowId = `${diagramId}-${microgravity ? "micro" : "earth"}Arrow`;
  const particles = microgravity
    ? [
        [54, 66, "O₂"], [244, 58, "O₂"], [44, 166, "O₂"], [251, 173, "O₂"],
        [90, 35, "O₂"], [205, 204, "O₂"], [34, 112, "O₂"], [265, 118, "O₂"],
      ]
    : [
        [54, 198, "O₂"], [245, 193, "O₂"], [80, 165, "O₂"], [219, 167, "O₂"],
        [48, 128, "O₂"], [252, 113, "O₂"], [73, 82, "O₂"], [232, 70, "O₂"],
      ];

  return (
    <svg className={`science-scene__svg ${microgravity ? "science-scene__svg--micro" : ""} ${fan ? "science-scene__svg--fan" : ""}`} viewBox="0 0 300 250" role="img" aria-label={t(microgravity ? "Schematic spherical flame in microgravity with oxygen moving toward the flame by diffusion" : "Schematic teardrop flame on Earth with cool air entering and hot products rising by buoyancy")}>
      <defs>
        <radialGradient id={flameId}>
          <stop offset="0" stopColor="#fff1b3" />
          <stop offset=".48" stopColor="#ffad53" />
          <stop offset="1" stopColor="#ee604e" stopOpacity=".78" />
        </radialGradient>
        <marker id={arrowId} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0 0 7 3.5 0 7" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </marker>
      </defs>
      <rect x="9" y="9" width="282" height="232" rx="16" className="science-scene__chamber" />
      {fan ? (
        <g className="science-flow science-flow--fan" aria-hidden="true">
          <path d="M26 83H110" markerEnd={`url(#${arrowId})`} /><path d="M25 124H102" markerEnd={`url(#${arrowId})`} /><path d="M26 165H110" markerEnd={`url(#${arrowId})`} />
          <path d="M273 95H212" markerEnd={`url(#${arrowId})`} /><path d="M273 151H212" markerEnd={`url(#${arrowId})`} />
        </g>
      ) : microgravity ? (
        <g className="science-flow science-flow--radial" aria-hidden="true">
          <path d="M54 76 102 101" markerEnd={`url(#${arrowId})`} /><path d="M246 76 198 101" markerEnd={`url(#${arrowId})`} />
          <path d="M50 166 101 146" markerEnd={`url(#${arrowId})`} /><path d="M250 166 199 146" markerEnd={`url(#${arrowId})`} />
          <path d="M105 40 121 83" markerEnd={`url(#${arrowId})`} /><path d="M196 205 181 166" markerEnd={`url(#${arrowId})`} />
        </g>
      ) : (
        <g className="science-flow science-flow--buoyant" aria-hidden="true">
          <path d="M70 199V138" markerEnd={`url(#${arrowId})`} /><path d="M230 199V132" markerEnd={`url(#${arrowId})`} />
          <path d="M104 145V66" markerEnd={`url(#${arrowId})`} /><path d="M196 145V66" markerEnd={`url(#${arrowId})`} />
        </g>
      )}
      {particles.map(([x, y, label], index) => (
        <g key={`${label}-${index}`} className={`science-particle science-particle--${index % 4}`}>
          <circle cx={x} cy={y} r="11" />
          <text x={x} y={Number(y) + 3.5}>{label}</text>
        </g>
      ))}
      {microgravity ? (
        <g className="science-flame science-flame--sphere">
          <circle cx="150" cy="125" r="37" className="science-flame__outer" />
          <circle cx="150" cy="125" r="27" fill={`url(#${flameId})`} className="science-flame__inner" />
          <circle cx="150" cy="125" r="12" fill="#ffe7a1" opacity=".72" />
        </g>
      ) : (
        <g className="science-flame science-flame--teardrop">
          <path d="M150 62C145 96 111 119 112 158a38 38 0 0 0 76 0c1-39-33-62-38-96Z" fill={`url(#${flameId})`} className="science-flame__outer" />
          <path d="M150 104c-6 22-21 34-20 55a20 20 0 0 0 40 0c1-21-14-33-20-55Z" fill="#ffe3a0" opacity=".72" className="science-flame__inner" />
        </g>
      )}
      <text x="150" y="229" className="science-scene__caption">{t(fan ? "FORCED AIRFLOW CHANGES THE SHAPE" : microgravity ? "DIFFUSION DOMINATES AT LOW MOMENTUM" : "BUOYANCY DRIVES UPWARD CONVECTION")}</text>
    </svg>
  );
}

function Molecule({ formula, label, tone }: { formula: string; label: string; tone: string }) {
  const { t } = useLanguage();
  return <span className={`molecule ${tone}`}><strong>{formula}</strong><small>{t(label)}</small></span>;
}

export function ScienceInMotionPage() {
  const { t } = useLanguage();
  const [gravityView, setGravityView] = useState<GravityView>("compare");
  const [flowMode, setFlowMode] = useState<FlowMode>("still");
  const [reactionPlaying, setReactionPlaying] = useState(false);

  return (
    <div className="page science-page">
      <header className="page-header science-page__header">
        <div>
          <div className="eyebrow">{t("Interactive science · NASA combustion research")}</div>
          <h1 className="page-title">{t("Science in Motion")}</h1>
          <p className="page-lede">{t("Watch the same basic chemistry behave differently when gravity-driven flow changes. These diagrams teach the mechanisms; they are explanatory animations, not experimental footage or numerical simulations.")}</p>
        </div>
      </header>

      <section className="science-module" aria-labelledby="gravity-title">
        <div className="science-module__head">
          <div><span className="science-kicker">01 / {t("TRANSPORT PHYSICS")}</span><h2 id="gravity-title">{t("Why does a flame change shape?")}</h2></div>
          <div className="science-toggle" role="group" aria-label={t("Choose gravity comparison view")}>
            {(["compare", "earth", "microgravity"] as const).map((view) => <button key={view} className="btn btn--sm" aria-pressed={gravityView === view} onClick={() => setGravityView(view)}>{t(view === "compare" ? "Compare both" : view === "earth" ? "Earth · 1 g" : "ISS · microgravity")}</button>)}
          </div>
        </div>
        <div className={`science-scenes science-scenes--${gravityView}`}>
          {(gravityView !== "microgravity") && <article className="science-scene">
            <div className="science-scene__head"><div><span className="science-scene__tag">{t("EARTH LAB")}</span><h3>{t("Buoyancy shapes the flow")}</h3></div><span className="science-scene__gravity">≈ 1 g</span></div>
            <FlameDiagram microgravity={false} />
            <p>{t("Hot combustion products are less dense than cooler surrounding gas. Under Earth gravity, they rise and draw cooler, oxygen-containing gas toward the flame. This buoyancy-driven convection gives a low-speed flame its familiar upward shape.")}</p>
            <div className="science-cause"><span>{t("Heat")}</span><b>→</b><span>{t("density difference")}</span><b>→</b><span>{t("buoyant flow")}</span></div>
          </article>}
          {(gravityView !== "earth") && <article className="science-scene">
            <div className="science-scene__head"><div><span className="science-scene__tag science-scene__tag--violet">{t("ISS LAB")}</span><h3>{t("Diffusion shapes the flow")}</h3></div><span className="science-scene__gravity">{t("microgravity")}</span></div>
            <FlameDiagram microgravity />
            <p>{t("On the ISS, the station and everything inside it are in continuous free fall together. Buoyancy-driven flow is greatly reduced, so low-momentum flames can become rounded. Fuel and oxygen reach the reaction zone mainly by molecular diffusion—while fans and other air movement can still affect the flame.")}</p>
            <div className="science-cause science-cause--violet"><span>{t("Fuel + oxygen")}</span><b>→</b><span>{t("diffusion")}</span><b>→</b><span>{t("reaction zone")}</span></div>
          </article>}
        </div>
        <div className="science-takeaway"><strong>{t("What changes?")}</strong><span>{t("How heat, fuel, and oxygen move around—not the fact that combustion is a chemical reaction.")}</span><span className="science-note">{t("Schematic only · Flame shape depends on fuel, chamber, flow speed, and test conditions.")}</span></div>
      </section>

      <section className="science-module" aria-labelledby="reaction-title">
        <div className="science-module__head">
          <div><span className="science-kicker">02 / {t("CHEMICAL REACTION")}</span><h2 id="reaction-title">{t("Follow the atoms through combustion")}</h2></div>
          <button className="btn btn--primary btn--sm" onClick={() => { setReactionPlaying(false); requestAnimationFrame(() => setReactionPlaying(true)); }}>{t(reactionPlaying ? "Replay reaction" : "Play reaction")}</button>
        </div>
        <p className="science-module__lede">{t("A balanced example of complete methane combustion. It illustrates the chemistry only; NASA’s investigations include many fuels and configurations, and this is not a claim that every experiment uses methane.")}</p>
        <div className={`reaction-board ${reactionPlaying ? "reaction-board--playing" : ""}`} aria-live="polite">
          <div className="reaction-side"><span className="reaction-label">{t("REACTANTS")}</span><div className="molecule-row"><Molecule formula="CH₄" label="methane · fuel" tone="molecule--fuel"/><span className="reaction-plus">+</span><Molecule formula="2 O₂" label="oxygen · oxidizer" tone="molecule--oxygen"/></div></div>
          <div className="reaction-arrow" aria-label={t("react to produce")}><span>{t(reactionPlaying ? "reaction in progress" : "chemical change")}</span><b>⟶</b></div>
          <div className="reaction-side"><span className="reaction-label">{t("PRODUCTS")}</span><div className="molecule-row"><Molecule formula="CO₂" label="carbon dioxide" tone="molecule--product"/><span className="reaction-plus">+</span><Molecule formula="2 H₂O" label="water" tone="molecule--water"/><span className="reaction-plus">+</span><Molecule formula="heat" label="energy released" tone="molecule--energy"/></div></div>
        </div>
        <div className="equation-line"><span>CH₄ + 2 O₂</span><b>→</b><span>CO₂ + 2 H₂O + energy</span></div>
        <div className="atom-balance" aria-label={t("Atom counts match on both sides of the balanced equation")}>
          <span className="atom-balance__title">{t("Atom check · conserved on both sides")}</span>
          <div><span><i className="atom-dot atom-dot--carbon"/>{t("Carbon")} <b>1 → 1</b></span><span><i className="atom-dot atom-dot--hydrogen"/>{t("Hydrogen")} <b>4 → 4</b></span><span><i className="atom-dot atom-dot--oxygen"/>{t("Oxygen")} <b>4 → 4</b></span></div>
        </div>
        <p className="science-explain"><strong>{t("How to read this:")}</strong> {t("The coefficients (2 before O₂ and H₂O) balance the number of each atom. Atoms are rearranged into new molecules; they are not created or destroyed. The released energy heats the products and nearby gas. A real flame also involves many intermediate chemical steps, so this single equation is a useful summary—not the full reaction mechanism.")}</p>
      </section>

      <section className="science-module" aria-labelledby="airflow-title">
        <div className="science-module__head">
          <div><span className="science-kicker">03 / {t("INTERACTIVE COMPARISON")}</span><h2 id="airflow-title">{t("Microgravity does not mean “no airflow”")}</h2></div>
          <div className="science-toggle" role="group" aria-label={t("Set the microgravity airflow illustration")}>
            <button className="btn btn--sm" aria-pressed={flowMode === "still"} onClick={() => setFlowMode("still")}>{t("Low imposed flow")}</button>
            <button className="btn btn--sm" aria-pressed={flowMode === "fan"} onClick={() => setFlowMode("fan")}>{t("Fan-driven flow")}</button>
          </div>
        </div>
        <div className="airflow-demo">
          <div className="airflow-demo__visual"><FlameDiagram microgravity fan={flowMode === "fan"}/><div className="airflow-demo__readout"><span className="live-dot"/> {t(flowMode === "fan" ? "AIRFLOW ON · flame responds to directed flow" : "LOW FLOW · diffusion is easier to observe")}</div></div>
          <div className="airflow-demo__copy"><h3>{t(flowMode === "fan" ? "A fan can reshape the flame" : "Low flow isolates diffusion effects")}</h3><p>{t(flowMode === "fan" ? "Spacecraft fans create forced convection. In microgravity, that directed flow can stretch, tilt, or otherwise change a flame; the exact response depends on the experiment and fuel." : "With very little imposed airflow, buoyancy is minimized and molecular diffusion has a larger role in carrying fuel and oxygen to the reaction zone. The rounded flame shown above is a teaching schematic, not a universal shape.")}</p><div className="airflow-fact"><span>{t("NASA research question")}</span><strong>{t("Where is the flame stable—and under what conditions does it go out?")}</strong></div></div>
        </div>
      </section>

      <section className="science-module science-module--sources" aria-labelledby="research-title">
        <div className="science-module__head"><div><span className="science-kicker">04 / {t("NASA RESEARCH CONNECTION")}</span><h2 id="research-title">{t("What scientists measure")}</h2></div></div>
        <div className="science-research-grid">
          <article><span>01</span><h3>{t("Flame stability & extinction")}</h3><p>{t("How fuel dilution, oxygen, and flow conditions determine whether a flame continues or extinguishes.")}</p></article>
          <article><span>02</span><h3>{t("Soot formation")}</h3><p>{t("How fuel and oxygen transport affect soot, a concern for combustion science and spacecraft environments.")}</p></article>
          <article><span>03</span><h3>{t("Model validation")}</h3><p>{t("Use cleaner, low-buoyancy measurements to test chemical-kinetic and soot models against observed flames.")}</p></article>
        </div>
        <div className="science-source-list">
          <a href="https://www.nasa.gov/missions/station/iss-research/studying-combustion-and-fire-safety/" target="_blank" rel="noopener noreferrer">NASA · Studying Combustion and Fire Safety <span>↗</span></a>
          <a href="https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/" target="_blank" rel="noopener noreferrer">NASA Glenn · Combustion Science <span>↗</span></a>
          <a href="https://science.nasa.gov/biological-physical/investigations/cld-flame/" target="_blank" rel="noopener noreferrer">NASA Science · Coflow Laminar Diffusion Flame <span>↗</span></a>
          <a href="https://www.nasa.gov/centers-and-facilities/glenn/what-is-microgravity/" target="_blank" rel="noopener noreferrer">NASA Glenn · What Is Microgravity? <span>↗</span></a>
        </div>
        <p className="science-citation-note">{t("The visualizations on this page are original explanatory schematics informed by the NASA sources above. They are not NASA imagery, measured data, or validated CFD / chemical-kinetics simulations.")}</p>
      </section>
    </div>
  );
}
