import { useId, useState } from "react";
import type { PSIInvestigation } from "../types";
import { useLanguage } from "../i18n";

type SceneKind = "solid" | "smoke" | "aerosol" | "droplet" | "burner" | "coflow" | "soot" | "liftoff" | "sphere" | "cool-sphere" | "electric" | "counterflow" | "design";

interface SceneCopy {
  kind: SceneKind;
  title: string;
  principle: string;
  note: string;
}

function getScene(record: PSIInvestigation): SceneCopy {
  const simulations = new Set(["PSI-115", "PSI-117", "PSI-62", "PSI-60"]);
  const modelNote = simulations.has(record.id)
    ? "This PSI record is a modeling or analysis study. The moving graphic is an explanatory schematic—not the study’s computed output."
    : "Conceptual view based on the investigation topic and available PSI metadata; it is not experiment footage or a reconstruction of the test."
  ;

  const scenes: Record<string, Omit<SceneCopy, "note">> = {
    "PSI-26": { kind: "solid", title: "Solid-fuel burning and suppression", principle: "A solid sample heats, releases combustible gases, and can sustain a flame. Flow and suppressant conditions affect how burning changes.", },
    "PSI-25": { kind: "solid", title: "How shape and airflow affect solid burning", principle: "BASS-II examined burning across multiple solid-sample geometries and airflow conditions. The drawing represents those variables, not one particular sample test.", },
    "PSI-98": { kind: "solid", title: "Material burning in a spacecraft enclosure", principle: "SAFFIRE investigated fire behavior in a spacecraft cargo vehicle after it was separated from the ISS. This schematic shows the study theme, not the exact test article or flight sequence.", },
    "PSI-99": { kind: "solid", title: "Fire growth and material response", principle: "This SAFFIRE investigation studied spacecraft fire behavior. The animated front is illustrative; it does not encode a measured spread rate.", },
    "PSI-100": { kind: "solid", title: "Fire behavior and smoke in spacecraft", principle: "SAFFIRE-III studied fire behavior and smoke in a spacecraft environment. This schematic separates the flame and smoke paths for teaching; it is not a test result.", },
    "PSI-102": { kind: "smoke", title: "Smoke transport and measurement", principle: "SAME studied smoke and aerosol behavior in microgravity. The particles move through a measurement region to show the research question, not the exact instrument response.", },
    "PSI-101": { kind: "smoke", title: "Smoke measurement reflight", principle: "SAME-R revisited smoke and aerosol measurement. Particle paths here are conceptual and do not represent measured concentrations.", },
    "PSI-47": { kind: "aerosol", title: "Can an instrument measure small aerosols?", principle: "DAFT evaluated the feasibility of measuring dust and aerosol with candidate instruments. Particle size and brightness in this drawing are not to scale.", },
    "PSI-69": { kind: "droplet", title: "Droplet burning and extinction", principle: "FLEX examined isolated fuel droplets and how their flames respond to conditions that can lead to extinction. Shrinking is an animation cue, not a measured rate.", },
    "PSI-68": { kind: "droplet", title: "Droplet arrays and flame interactions", principle: "FLEX-2 studied droplet combustion, including controlled droplet arrangements. Spacing in this schematic is illustrative and does not reproduce a test case.", },
    "PSI-39": { kind: "droplet", title: "Cool-flame behavior around a droplet", principle: "CFI investigated cool-flame behavior in droplet combustion. A cool flame can involve chemical reactions with little or no visible luminosity; the glowing ring here is a visual aid, not a temperature map.", },
    "PSI-20": { kind: "burner", title: "Emulating solid-fuel burning with a porous burner", principle: "ACME BRE used gaseous fuels and porous burners to emulate aspects of condensed-fuel burning. The burner in this schematic is not a solid sample.", },
    "PSI-21": { kind: "coflow", title: "Fuel and air meet in a coflow flame", principle: "In a coflow diffusion flame, fuel and surrounding oxidizer approach the reaction zone from different sides. NASA uses this configuration to study flame structure and model accuracy.", },
    "PSI-23": { kind: "sphere", title: "A spherical diffusion flame", principle: "s-Flame studied the structure and response of spherical diffusion flames produced around a porous spherical burner. Fuel and oxidizer diffuse toward a thin reaction region.", },
    "PSI-10": { kind: "design", title: "Comparing flame and burner configurations", principle: "Flame Design used spherical and coflow burner configurations to study flame behavior. The paired drawings highlight geometry, not comparative results.", },
    "PSI-22": { kind: "electric", title: "Electric fields and a diffusion flame", principle: "E-FIELD Flames studied electric-field effects on laminar diffusion flames. Field lines and flame movement are symbolic; polarity, voltage, and response depend on each test.", },
    "PSI-159": { kind: "cool-sphere", title: "Cool flames from gaseous fuels", principle: "CFI-G investigated cool flames from gases, including spherical configurations. A cool reaction zone may be weakly luminous or invisible; this graphic deliberately uses a soft halo to make the concept visible.", },
    "PSI-107": { kind: "soot", title: "Coflow flame and the smoke point", principle: "SPICE examined the smoke point: conditions where a flame begins to emit soot. The dark particles are a symbolic cue, not a measured soot concentration.", },
    "PSI-106": { kind: "liftoff", title: "When does a flame lift from its burner?", principle: "SLICE studied flame structure and liftoff in a coflow arrangement. The animation distinguishes the burner from the lifted flame; its distance is not quantitative.", },
    "PSI-142": { kind: "counterflow", title: "Opposing flows meet at a flame", principle: "This counterflow study examines cool-flame transitions and extinction. Two streams approach a central reaction region; the drawing is schematic, not a computed or measured profile.", },
    "PSI-117": { kind: "droplet", title: "Modeling cool-flame behavior around droplets", principle: "This computational study examined droplet cool-flame dynamics and perturbations. The animation is a conceptual guide, not a visualization of its CFD results.", },
    "PSI-115": { kind: "smoke", title: "Modeling smoke-particle formation", principle: "This study used simulation to investigate smoke generation in microgravity. Moving dots explain particle transport; they are not the simulation output or measured particle data.", },
    "PSI-62": { kind: "solid", title: "Modeling flame spread over solid samples", principle: "This modeling study compared predicted flame spread with BASS imagery. The moving front is a teaching schematic, not a reproduction of the model or image analysis.", },
    "PSI-60": { kind: "soot", title: "Analyzing and modeling SPICE flame data", principle: "This analysis paired SPICE imagery with color-ratio pyrometry and flow/species/soot modeling. The soot dots and flame are explanatory only, not retrieved experimental data.", },
  };

  return { ...(scenes[record.id] ?? {
    kind: record.fuelSpecs?.phase === "Liquid" ? "droplet" : record.fuelSpecs?.phase === "Solid" ? "solid" : "coflow",
    title: `${record.acronym} combustion concept`,
    principle: "This visual summarizes the broad research topic using the investigation metadata available in the explorer.",
  }), note: modelNote };
}

function SceneGraphic({ kind, id }: { kind: SceneKind; id: string }) {
  const gradientId = `${id}-flame`;
  const markerId = `${id}-arrow`;
  const flow = (d: string, key: string, delay = 0) => <path key={key} d={d} markerEnd={`url(#${markerId})`} style={{ animationDelay: `${delay}s` }} />;
  const dust = Array.from({ length: 12 }, (_, i) => ({
    x: 35 + ((i * 47) % 250),
    y: 45 + ((i * 31) % 140),
    r: 2 + (i % 3),
  }));

  return (
    <svg className={`investigation-graphic investigation-graphic--${kind}`} viewBox="0 0 320 210" role="img" aria-label={`Animated conceptual diagram for ${kind.replace("-", " ")} combustion research`}>
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0" stopColor="#fff0ae" />
          <stop offset=".52" stopColor="#ffae55" />
          <stop offset="1" stopColor="#ed6058" stopOpacity=".68" />
        </radialGradient>
        <marker id={markerId} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="none" stroke="currentColor" strokeWidth="1.2" /></marker>
      </defs>
      <rect className="investigation-graphic__chamber" x="8" y="8" width="304" height="194" rx="14" />
      {kind === "solid" && <g className="graphic-motion graphic-flow--amber">
        {flow("M42 164H111", "f1", -0.4)}{flow("M66 139H126", "f2", -1.1)}
      </g>}
      {kind === "solid" && <g className="graphic-sample">
        <rect x="124" y="82" width="75" height="60" rx="5" />
        <path d="M136 91h49M136 101h49M136 111h49M136 121h49M136 131h49" />
      </g>}
      {kind === "solid" && <g className="graphic-flame graphic-flame--spread"><path d="M112 146c-7-20 20-31 16-55 19 12 32 30 28 49a24 24 0 0 1-44 6Z" fill={`url(#${gradientId})`} /></g>}
      {kind === "smoke" && <g className="graphic-motion graphic-flow--cyan">
        {flow("M52 112H233", "s1", -0.4)}{flow("M52 142H233", "s2", -1.2)}
        {dust.map((p, i) => <circle key={i} className="graphic-dust" cx={p.x} cy={p.y} r={p.r} style={{ animationDelay: `${i * -0.21}s` }} />)}
        <rect className="graphic-sensor" x="244" y="72" width="45" height="90" rx="8" /><path className="graphic-sensor__window" d="M254 89h25v30h-25z"/><text className="graphic-svg-label" x="266" y="178" textAnchor="middle">SENSOR</text>
      </g>}
      {kind === "aerosol" && <g className="graphic-motion graphic-flow--cyan">
        {flow("M38 115H260", "a1", -0.3)}{Array.from({ length: 22 }, (_, i) => <circle key={i} className="graphic-dust graphic-dust--tiny" cx={42 + ((i * 37) % 207)} cy={72 + ((i * 23) % 82)} r={1 + (i % 4) * 0.7} style={{ animationDelay: `${i * -0.17}s` }} />)}
        <path className="graphic-instrument" d="M257 73h31v80h-31M268 81v63"/><text className="graphic-svg-label" x="273" y="174" textAnchor="middle">COUNTER</text>
      </g>}
      {kind === "droplet" && <g className="graphic-droplet-scene">
        <circle className="graphic-flame-halo" cx="160" cy="112" r="62" />
        <circle className="graphic-droplet" cx="160" cy="112" r="22" />
        <circle className="graphic-droplet-core" cx="153" cy="105" r="6" />
        {dust.slice(0, 8).map((p, i) => <circle key={i} className="graphic-vapor" cx={p.x} cy={p.y} r="3" style={{ animationDelay: `${i * -0.3}s` }} />)}
        <text className="graphic-svg-label" x="160" y="191" textAnchor="middle">FUEL DROPLET · CONCEPTUAL</text>
      </g>}
      {kind === "burner" && <g className="graphic-burner-scene">
        <ellipse className="graphic-burner-flame" cx="160" cy="93" rx="60" ry="34" style={{ fill: `url(#${gradientId})` }} />
        <rect className="graphic-burner" x="111" y="133" width="98" height="25" rx="7" />
        {Array.from({ length: 8 }, (_, i) => <circle className="graphic-burner__pore" key={i} cx={122 + i * 12} cy="145" r="2" />)}
        <path className="graphic-motion graphic-flow--cyan" d="M132 132V113M160 132V106M188 132V113" />
        <text className="graphic-svg-label" x="160" y="181" textAnchor="middle">POROUS BURNER · GASEOUS FUEL</text>
      </g>}
      {(kind === "coflow" || kind === "soot" || kind === "liftoff") && <g className="graphic-coflow-scene">
        <path className="graphic-coflow-air" d="M115 165V72M205 165V72" />
        <rect className="graphic-nozzle" x="145" y="142" width="30" height="32" rx="4" />
        <path className={`graphic-coflow-flame ${kind === "liftoff" ? "graphic-coflow-flame--lifted" : ""}`} d="M160 144c-19-20-27-43 0-81 27 38 19 61 0 81Z" fill={`url(#${gradientId})`} />
        {kind === "soot" && dust.slice(0, 9).map((_, i) => <circle key={i} className="graphic-soot" cx={160 + (i % 3) * 5 - 5} cy={78 + i * 7} r="2.4" style={{ animationDelay: `${i * -0.24}s` }} />)}
        <text className="graphic-svg-label" x="160" y="190" textAnchor="middle">{kind === "soot" ? "SOOT / SMOKE-POINT CONCEPT" : kind === "liftoff" ? "LIFT-OFF HEIGHT · NOT TO SCALE" : "FUEL JET + SURROUNDING AIR"}</text>
      </g>}
      {kind === "sphere" && <g className="graphic-sphere-scene">
        <circle className="graphic-sphere-flame" cx="160" cy="105" r="53" />
        <circle className="graphic-sphere-core" cx="160" cy="105" r="31" />
        <circle className="graphic-burner" cx="160" cy="105" r="13" />
        <text className="graphic-svg-label" x="160" y="181" textAnchor="middle">RADIAL DIFFUSION · SPHERICAL GEOMETRY</text>
      </g>}
      {kind === "cool-sphere" && <g className="graphic-sphere-scene graphic-sphere-scene--cool">
        <circle className="graphic-cool-halo" cx="160" cy="105" r="50" />
        <circle className="graphic-sphere-core" cx="160" cy="105" r="28" />
        <circle className="graphic-burner" cx="160" cy="105" r="13" />
        <text className="graphic-svg-label" x="160" y="181" textAnchor="middle">COOL-FLAME ZONE · SCHEMATIC</text>
      </g>}
      {kind === "electric" && <g className="graphic-electric-scene">
        <path className="graphic-electrode" d="M87 51H233M87 164H233" />
        <text className="graphic-svg-label" x="160" y="42" textAnchor="middle">ELECTRODE</text><text className="graphic-svg-label" x="160" y="183" textAnchor="middle">ELECTRODE</text>
        <path className="graphic-field" d="M111 58c-20 28-20 69 0 99M138 58c-8 29-8 67 0 99M182 58c8 29 8 67 0 99M209 58c20 28 20 69 0 99" />
        <path className="graphic-field-flame" d="M160 148c-24-20-19-49 0-78 19 29 24 58 0 78Z" fill={`url(#${gradientId})`} />
      </g>}
      {kind === "counterflow" && <g className="graphic-counterflow-scene">
        <g className="graphic-motion graphic-flow--cyan">{flow("M35 98H142", "c1", -0.4)}{flow("M35 124H142", "c2", -1.1)}</g>
        <g className="graphic-motion graphic-flow--amber">{flow("M285 98H178", "c3", -0.6)}{flow("M285 124H178", "c4", -1.3)}</g>
        <path className="graphic-reaction-sheet" d="M160 65V157" />
        <text className="graphic-svg-label" x="160" y="183" textAnchor="middle">OPPOSED STREAMS · REACTION REGION</text>
      </g>}
      {kind === "design" && <g className="graphic-design-view">
        <circle className="graphic-design-orb" cx="102" cy="104" r="35" />
        <circle className="graphic-burner" cx="102" cy="104" r="12" />
        <path className="graphic-coflow-flame" d="M218 139c-18-19-24-40 0-72 24 32 18 53 0 72Z" fill={`url(#${gradientId})`} />
        <rect className="graphic-nozzle" x="204" y="137" width="28" height="22" rx="4" />
        <text className="graphic-svg-label" x="102" y="163" textAnchor="middle">SPHERICAL</text>
        <text className="graphic-svg-label" x="218" y="178" textAnchor="middle">COFLOW</text>
        <path className="graphic-design-divider" d="M160 58V172" />
      </g>}
      <text className="graphic-top-label" x="22" y="27">{kind.replace("-", " ").toUpperCase()} · SCHEMATIC</text>
    </svg>
  );
}

export function InvestigationAnimation({ record }: { record: PSIInvestigation }) {
  const { t } = useLanguage();
  const scene = getScene(record);
  const [playing, setPlaying] = useState(true);
  const id = useId().replace(/:/g, "");
  const materials = record.fuelSpecs?.materials ?? [];
  const flowMin = record.testConditions?.airflowCmPerSecondMin;
  const flowMax = record.testConditions?.airflowCmPerSecondMax;
  const airflow = flowMin !== undefined || flowMax !== undefined
    ? `${flowMin ?? "?"}–${flowMax ?? "?"} cm/s ${t("airflow reported")}`
    : undefined;

  return (
    <section className={`investigation-animation ${playing ? "" : "investigation-animation--paused"}`} aria-labelledby={`animation-title-${id}`}>
      <div className="investigation-animation__visual">
        <SceneGraphic kind={scene.kind} id={id} />
      </div>
      <div className="investigation-animation__body">
        <div className="investigation-animation__topline">
          <span>{t("INVESTIGATION VISUALIZATION")}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPlaying((value) => !value)} aria-pressed={!playing}>
            {playing ? t("Pause motion") : t("Play motion")}
          </button>
        </div>
        <h2 id={`animation-title-${id}`}>{t(scene.title)}</h2>
        <p>{t(scene.principle)}</p>
        <div className="investigation-animation__facts">
          <span className="chip chip--cyan">{t(record.fuelSpecs?.phase ?? "Phase not stated")}</span>
          {airflow && <span className="chip chip--amber">{airflow}</span>}
          {materials.slice(0, 2).map((material) => <span className="chip chip--muted" key={material}>{t(material)}</span>)}
          {record.hardware?.facility && <span className="chip chip--muted">{t(record.hardware.facility)}</span>}
        </div>
        <p className="investigation-animation__caveat">
          {t(scene.note)} {t("The animation is not a fire-risk prediction and does not add experimental results to this record.")}
        </p>
      </div>
    </section>
  );
}
