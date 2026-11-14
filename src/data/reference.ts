import conceptData from "./concepts.json";
import type {
  HistoricalEvent,
  LeadVerification,
  ReferenceAtmosphere,
  SourceReference,
  TechnologyTransfer,
} from "../types";

/**
 * Editorial rubric used for the relevance scores in the investigation records.
 * These are rankings by the application's author, NOT NASA measurements.
 */
export const RELEVANCE_RUBRIC = {
  scale: [
    { score: 5, label: "Direct", description: "Central to the question; explicit hardware, environment or data link." },
    { score: 4, label: "Strong", description: "Clear and substantial link, with some indirect step." },
    { score: 3, label: "Moderate", description: "Relevant evidence, but indirect or partial." },
    { score: 2, label: "Limited", description: "Peripheral relevance or a single shared parameter." },
    { score: 1, label: "Minimal", description: "Only a generic or background connection." },
  ],
  dimensions: [
    { key: "habitableSpacecraft", label: "Habitable spacecraft", weight: 0.3 },
    { key: "explorationHabitat", label: "Exploration habitat", weight: 0.2 },
    { key: "predictiveModeling", label: "Predictive modeling", weight: 0.25 },
    { key: "equipmentDesign", label: "Equipment design", weight: 0.15 },
    { key: "terrestrialApplications", label: "Terrestrial applications", weight: 0.1 },
  ],
  note:
    "Scores are editorial rankings on a 0–5 scale, weighted as shown. They are shown separately from experimental results and are never presented as NASA measurements.",
} as const;

export const DATASET_META = {
  title: "NASA PSI Combustion Science",
  retrievedAt: "2026-11-13",
  psiSearchUrl: "https://psi.nasa.gov/physci/repo/search?q=combustion",
  psiFilterUrl: "https://psi.nasa.gov/geode-py/ws/repo/filter-options",
  researchArea: "Combustion Science",
  method:
    "Retrieved from the NASA PSI repository's public search API for research area 'Combustion Science' and cross-checked against the PSI investigation records. Only metadata is used; the underlying experiment data files were not downloaded.",
  scope:
    "This explorer covers the 24 investigations NASA PSI classifies under Combustion Science, focused on spacecraft fire safety and combustion science. Propulsion system development is outside this application's scope; that is a scoping decision for this explorer, not a statement that NASA excludes propulsion from its combustion program.",
  limitations:
    "PSI metadata summarises objectives, approach and impacts but often omits measured results, exact oxygen or pressure setpoints, and complete sensor lists. Missing values are shown as Unknown and are never converted to zero. A blank field means the source did not provide a value, not that the value is zero or unimportant.",
} as const;

const ACCESSION_DATE = "2026-11-13";

const apollo1: SourceReference = {
  title: "Apollo 1",
  organization: "NASA Safety Center — Accident and Consequence Lessons Learned Program",
  url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1",
  accessedAt: ACCESSION_DATE,
};

const apollo13: SourceReference = {
  title: "Apollo 13",
  organization: "NASA Safety Center — Accident and Consequence Lessons Learned Program",
  url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13",
  accessedAt: ACCESSION_DATE,
};

const mir: SourceReference = {
  title: "25 Years Ago: Fire Aboard Space Station Mir",
  organization: "NASA History",
  url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/",
  publishedAt: "2022-02-23",
  accessedAt: ACCESSION_DATE,
};

const artemisFireAlarm: SourceReference = {
  title: "Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data",
  organization: "NASA Space Apps Challenge",
  url: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/",
  publishedAt: "2026",
  accessedAt: ACCESSION_DATE,
  note: "The challenge brief is the source for the quoted Artemis II alarm anecdote; this entry does not independently characterize it as a fire event or investigation finding.",
};

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  {
    id: "apollo-1",
    date: "1967-01-27",
    title: "Apollo 1 launch-pad fire",
    summary:
      "During a launch-pad test with hatches closed and the cabin pressurised with 100% oxygen, a flash fire swept through the spacecraft. Astronauts Virgil Grissom, Edward White and Roger Chaffee died.",
    lesson:
      "The investigation found evidence of arcing in wiring near the environmental control system but could not identify a specific ignition source. The hatch took about 90 seconds to open under ideal conditions. The accident drove a unified hatch openable within three seconds, restrictions on combustible material, and fire-resistant spacesuits.",
    source: apollo1,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "apollo-13",
    date: "1970-04-13",
    title: "Apollo 13 oxygen-tank explosion",
    summary:
      "On the third mission day, oxygen tank number two exploded and led to the failure of tank one. The crew returned safely, splashing down on 17 April 1970 after a six-day mission.",
    lesson:
      "The review board traced the accident to a combination of mistakes and a deficient design, including raising heater voltage from 28 to 65 V DC without modifying thermostatic switches. The Apollo 1 page notes that its wiring-insulation lesson prevented arcing in this event.",
    source: apollo13,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "mir-fire-1997",
    date: "1997-02-24",
    title: "Fire aboard space station Mir",
    summary:
      "A solid-fuel oxygen generator canister ignited in the Kvant-1 module, producing a flame described as about three feet long that blocked the route to the Soyuz. The crew fought it with foam and it eventually extinguished itself. No crew member suffered lasting harm.",
    lesson:
      "Investigators concluded that hydrocarbons introduced into the canister, most likely latex glove material, increased the risk. NASA describes it as the worst in-orbit fire in spaceflight history and notes its lessons were passed to ISS design and operations.",
    source: mir,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "artemis-ii-alarm",
    date: "2026 · Artemis II",
    title: "Artemis II smoke-alarm context",
    summary:
      "The 2026 NASA Space Apps combustion challenge recounts an Artemis II smoke alarm and quotes the commander describing how quickly a fire alarm gets a crew's attention far from Earth.",
    lesson:
      "This is mission context illustrating why reliable detection and crew response matter. The challenge brief does not present it as a confirmed fire, a PSI investigation, or evidence about combustion behavior.",
    source: artemisFireAlarm,
    evidenceStatus: "NASA-reported",
  },
];

const spinoffAir: SourceReference = {
  title: "Fireman's Air Tanks",
  organization: "NASA Spinoff",
  url: "https://spinoff.nasa.gov/node/9582",
  publishedAt: "1976",
  accessedAt: ACCESSION_DATE,
};

const spinoffDetector: SourceReference = {
  title: "Fire Detector",
  organization: "NASA Spinoff",
  url: "https://spinoff.nasa.gov/node/9407",
  publishedAt: "1978",
  accessedAt: ACCESSION_DATE,
};

const spinoffAttire: SourceReference = {
  title: "New Technology for the Fire Attire",
  organization: "NASA Spinoff",
  url: "https://spinoff.nasa.gov/node/9918",
  publishedAt: "1982",
  accessedAt: ACCESSION_DATE,
};

const fineWaterMistSource: SourceReference = {
  title: "Fueled by Fire — NASA On a Mission",
  organization: "NASA",
  url: "https://www.nasa.gov/podcasts/on-a-mission/season-3-episode-8-fueled-by-fire/",
  publishedAt: "2020-12-08",
  accessedAt: ACCESSION_DATE,
};

const fineWaterMistEarthSource: SourceReference = {
  title: "Fine-Water-Mist Multiple-Orientation-Discharge Fire Extinguisher",
  organization: "NASA Technical Reports Server",
  url: "https://ntrs.nasa.gov/citations/20100001376",
  identifier: "NASA Tech Brief LEW-18190-1",
  publishedAt: "2010-01-01",
  accessedAt: ACCESSION_DATE,
};

export const TECHNOLOGY_TRANSFER: TechnologyTransfer[] = [
  {
    id: "spinoff-air-tanks",
    title: "Firefighter air tanks",
    summary:
      "A lightweight backpack system: about 20 lb for a 30-minute air supply, 13 lb less than conventional firefighting tanks, pressurised to 4,500 psi with an aluminium liner wrapped in resin-impregnated glass fibre.",
    nasaOrigin:
      "Developed by Scott Aviation together with NASA's Johnson Space Center, per the 1976 Spinoff article.",
    caveat:
      "The article does not mention the International Space Station, microgravity combustion or PSI. It is presented as a separate technology-transfer example, not as a PSI outcome.",
    source: spinoffAir,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "spinoff-fire-detector",
    title: "Incipient fire detector",
    summary:
      "The Brunswick Incipient Fire Detector, originally used in space shuttle orbiters, is described as able to discriminate between combustion particles and extraneous matter such as dust, signalling a fire condition before flame and smoke appear.",
    nasaOrigin: "The 1978 Spinoff article says it was originally used in space shuttle orbiters.",
    caveat:
      "No NASA research program, ISS experiment or PSI connection is named. Dust discrimination is the article's claim; this explorer does not treat it as validated by PSI smoke data.",
    source: spinoffDetector,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "spinoff-fire-attire",
    title: "Project FIRES firefighter attire",
    summary:
      "Project FIRES (Firefighter's Integrated Response Equipment System) applied advanced materials and design concepts to update firefighter gear, evaluated by fourteen municipal fire departments.",
    nasaOrigin:
      "A program jointly sponsored by NASA and FEMA's U.S. Fire Administration, technically managed by Marshall Space Flight Center, using materials originally developed for astronauts' space suits or spacecraft thermal protection.",
    caveat:
      "The 1982 article traces the materials to the Apollo program, not to the Apollo 1 fire and not to any PSI investigation.",
    source: spinoffAttire,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "iss-fine-water-mist",
    title: "Fine-water-mist fire extinguisher",
    summary:
      "NASA describes an extremely fine water-mist extinguisher among the fire-suppression systems aboard the ISS. NASA technical material describes a multiple-orientation design intended for low-gravity spacecraft and notes possible use in aircraft and other vehicles.",
    nasaOrigin:
      "Developed for spacecraft fire response; the NASA technical brief describes water and nitrogen as the working fluids and reports successful tests on open fires and fires in baffled enclosures.",
    caveat:
      "This is a NASA technology-transfer/application example, not one of the 24 PSI investigations and not evidence that the device is certified for every terrestrial setting.",
    source: fineWaterMistSource,
    additionalSources: [fineWaterMistEarthSource],
    evidenceStatus: "NASA-reported",
  },
];

const acmeArticle: SourceReference = {
  title: "Space Station's Quest for the Secrets of Fire",
  organization: "NASA",
  url: "https://www.nasa.gov/humans-in-space/space-stations-quest-for-the-secrets-of-fire/",
  publishedAt: "2022-04-18",
  accessedAt: ACCESSION_DATE,
};

const luciSource: SourceReference = {
  title:
    "Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket",
  organization: "NASA Johnson Space Center / USRA / Case Western Reserve University",
  url: "https://ntrs.nasa.gov/api/citations/20250010653/downloads/ASGSR%202025-LUCI-Ferkul-Presentation-v2-20250010653.pdf",
  identifier: "NTRS 20250010653",
  publishedAt: "2025-12",
  locator: "Objectives, Results (pp. 19–22), and FM2 follow-on slide",
  accessedAt: ACCESSION_DATE,
};

export const LUNAR_FIRE_SAFETY: SourceReference = {
  title: "Fire Safety Challenges and Opportunities for Future Human Lunar Exploration",
  organization:
    "NASA Glenn Research Center — International Workshop on Space Combustion Research",
  url: "https://ntrs.nasa.gov/api/citations/20260008630/downloads/NASA%20IWSCR.pdf",
  identifier: "NTRS 20260008630",
  publishedAt: "2026-09-11",
  locator: "Slide 12 (Fire Growth Prediction) and slide 13 (LUCI)",
  accessedAt: ACCESSION_DATE,
};

export const FM2_SOURCE: SourceReference = {
  title: "Combustion Science — NASA Glenn Research Center (FM2 section)",
  organization: "NASA",
  url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/",
  locator: "Current Combustion Experiments — Flammability of Materials on the Moon (FM2)",
  accessedAt: ACCESSION_DATE,
};

export const LEAD_VERIFICATION: LeadVerification[] = [
  {
    lead: "BASS",
    verdict: "In PSI dataset",
    detail: "PSI-26. Solid-fuel flame spread and suppression in the MSG.",
    investigationId: "PSI-26",
  },
  {
    lead: "BASS-II",
    verdict: "In PSI dataset",
    detail: "PSI-25. Follow-on solid-fuel campaign with a NASA/TM summary report.",
    investigationId: "PSI-25",
  },
  {
    lead: "Saffire",
    verdict: "In PSI dataset",
    detail:
      "PSI-98 (Saffire-I), PSI-99 (Saffire-II) and PSI-100 (Saffire-III). Later Saffire flights are not in this 24-record dataset.",
    investigationId: "PSI-98",
  },
  {
    lead: "SAME / SAME-R",
    verdict: "In PSI dataset",
    detail: "PSI-102 (SAME) and PSI-101 (SAME-R reflight).",
    investigationId: "PSI-102",
  },
  {
    lead: "DAFT / DAFT-2",
    verdict: "In PSI dataset",
    detail: "PSI-47. Instrument risk-reduction test for SAME's P-Trak counter.",
    investigationId: "PSI-47",
  },
  {
    lead: "FLEX / FLEX-2",
    verdict: "In PSI dataset",
    detail: "PSI-69 (FLEX) and PSI-68 (FLEX-2). Droplet extinction and suppressants.",
    investigationId: "PSI-69",
  },
  {
    lead: "ACME experiments",
    verdict: "In PSI dataset",
    detail:
      "Six ACME records: PSI-20 (BRE), PSI-21 (CLD Flame), PSI-159 (CFI-G), PSI-22 (E-FIELD Flames), PSI-10 (Flame Design), PSI-23 (s-Flame).",
    investigationId: "PSI-20",
  },
  {
    lead: "SPICE",
    verdict: "In PSI dataset",
    detail: "PSI-107. Laminar smoke point in coflow, 526 flames.",
    investigationId: "PSI-107",
  },
  {
    lead: "SLICE",
    verdict: "In PSI dataset",
    detail: "PSI-106. Structure and liftoff of laminar diffusion flames.",
    investigationId: "PSI-106",
  },
  {
    lead: "LUCI",
    verdict: "Official NASA work, not in PSI dataset",
    detail:
      "Lunar Combustion Investigation. First extended-duration (>25 s) combustion tests in simulated lunar gravity, flown 4 February 2025 on a spinning Blue Origin New Shepard. Not among PSI's 24 Combustion Science records, so it is excluded from the investigation dataset and shown as context only.",
    source: luciSource,
  },
  {
    lead: "FM2",
    verdict: "Official NASA work, not in PSI dataset",
    detail:
      "Flammability of Materials on the Moon, described by NASA as the first combustion experiment on another planetary body. NASA's Combustion Science page currently lists FM2 under current experiments; a December 2025 NASA presentation described a planned late-2026 launch. Not a PSI record. Launch status is not asserted here and should be re-checked against NASA.",
    source: FM2_SOURCE,
  },
];

const breSource: SourceReference = {
  title: "NASA PSI investigation record: ACME Burning Rate Emulator",
  organization: "NASA Physical Sciences Informatics",
  url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-20",
  identifier: "PSI-20",
  accessedAt: ACCESSION_DATE,
};

const explorationAtmosphereSource: SourceReference = {
  title: "NASA’s focus on exploration goals will dictate the required cabin atmosphere",
  organization: "NASA Technical Reports Server",
  url: "https://ntrs.nasa.gov/api/citations/20260001966/downloads/Ferkul-Lunar%20and%20Planetary%20Science%20Conf%202026%20v2.pdf",
  identifier: "NTRS 20260001966",
  publishedAt: "2026",
  accessedAt: ACCESSION_DATE,
};

const spaceAppsChallengeSource: SourceReference = {
  title: "Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data",
  organization: "NASA Space Apps Challenge",
  url: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/",
  publishedAt: "2026",
  accessedAt: ACCESSION_DATE,
};

/**
 * Atmosphere points stated in the ACME BRE objectives. NASA-considered
 * atmospheres examined by an experiment — NOT a universal habitat requirement.
 */
export const REFERENCE_ATMOSPHERES: ReferenceAtmosphere[] = [
  {
    id: "eva-suit-4-3-100",
    label: "EVA suit · 4.3 psia / 100% O₂",
    oxygenPercent: 100,
    pressurePsi: 4.3,
    note: "NASA describes the U.S. EVA suit atmosphere as about 4.3 psia and 100% oxygen. This is a suit operating reference, not a habitat atmosphere or a PSI test condition.",
    source: explorationAtmosphereSource,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "lunar-habitat-8-2-34",
    label: "Lunar exploration reference · 8.2 psia / 34% O₂",
    oxygenPercent: 34,
    pressurePsi: 8.2,
    note: "NASA's 2026 exploration-atmosphere presentation gives 8.2 psia / 34% O₂ as the nominal lunar habitat and pressurized-rover reference. It is a planning reference, not a universal requirement or PSI experiment result.",
    source: explorationAtmosphereSource,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "atm-14-7-21",
    label: "14.7 psia / 21% O2",
    oxygenPercent: 21,
    pressurePsi: 14.7,
    note: "Listed in the BRE objectives as a NASA-considered atmosphere for human space missions.",
    source: breSource,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "atm-10-2-26-5",
    label: "10.2 psia / 26.5% O2",
    oxygenPercent: 26.5,
    pressurePsi: 10.2,
    note: "Listed in the BRE objectives as a NASA-considered atmosphere for human space missions.",
    source: breSource,
    evidenceStatus: "NASA-reported",
  },
  {
    id: "atm-8-2-34",
    label: "8.2 psia / 34% O2",
    oxygenPercent: 34,
    pressurePsi: 8.2,
    note: "Listed in the BRE objectives as a NASA-considered atmosphere for human space missions.",
    source: breSource,
    evidenceStatus: "NASA-reported",
  },
];

const moonFact: SourceReference = {
  title: "Moon Fact Sheet",
  organization: "NASA NSSDC",
  url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
  accessedAt: ACCESSION_DATE,
};

export const EXPLORATION_ATMOSPHERES = {
  challengeContext: {
    label: "Challenge planning envelope",
    summary:
      "The challenge brief describes a broad intermediate lunar habitat/pressurized-rover atmosphere as about 30% or more oxygen at 10.2 psia or less. This is challenge context, not a single fixed design point.",
    source: spaceAppsChallengeSource,
  },
  references: [REFERENCE_ATMOSPHERES[0], REFERENCE_ATMOSPHERES[1]],
  source: explorationAtmosphereSource,
} as const;

export const E_FIELD_GRAVITY_NOTE = {
  title: "E-FIELD is an analogy, not partial-gravity data",
  body:
    "The challenge brief describes ACME E-FIELD as mimicking partial-gravity effects through its influence on ions naturally present in flames. More precisely, E-FIELD changes ion-driven transport and flame behavior in microgravity; it does not impose lunar or Martian gravitational acceleration. Treat its results as a mechanism-level analogy only. LUCI is separate, non-PSI simulated-lunar-gravity evidence, and this PSI collection contains no direct partial-gravity measurements.",
  source: {
    title: "NASA PSI investigation record: ACME E-FIELD Flames",
    organization: "NASA Physical Sciences Informatics",
    url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-22",
    identifier: "PSI-22",
    accessedAt: ACCESSION_DATE,
  } satisfies SourceReference,
} as const;

const marsFact: SourceReference = {
  title: "Mars Fact Sheet",
  organization: "NASA NSSDC",
  url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
  accessedAt: ACCESSION_DATE,
};

export const GRAVITY_REFERENCE = {
  standardGravity: 9.80665,
  moon: {
    surfaceGravity: 1.62,
    ratio: 0.165,
    source: moonFact,
    note: "NASA NSSDC lists lunar surface gravity as 1.62 m/s². The ratio to standard gravity is derived here (1.62 / 9.80665 = 0.165).",
  },
  mars: {
    surfaceGravity: 3.73,
    ratio: 0.38,
    source: marsFact,
    note: "NASA NSSDC lists mean Martian surface gravity as 3.73 m/s². The ratio to standard gravity is derived here (3.73 / 9.80665 = 0.380).",
  },
} as const;

export const LUCI_FACTS = {
  title: "Lunar Combustion Investigation (LUCI)",
  status: "Completed — first flight 4 February 2025",
  summary:
    "NASA's LUCI used a spinning Blue Origin New Shepard vehicle to generate lunar-like gravity by centrifugal acceleration. NASA reports it as the first extended-duration (greater than 25 seconds) combustion tests in simulated lunar gravity.",
  platform:
    "Steady 11 RPM rotation; effective radius 1.22 m at the experiment location; two orthogonal cameras; chamber oxygen, pressure, temperature and acceleration sensors.",
  samples: "SIBAL cotton–fibreglass fabric, 5 cm × 30 cm, and a 4 mm diameter PMMA rod, burned in air at normal pressure.",
  measurements: [
    "Burn lasted over two and a half minutes.",
    "Chamber oxygen fell from 20% to 14.3%, then rose to 15.8% (NASA links the rise to the decreasing gravity level).",
    "SIBAL fabric: flame-base spread rate 0.92 mm/s and flame-tip spread rate 1.1 mm/s, both approximately linear.",
    "PMMA rod: flame-tip spread approximately linear at 1.5 mm/s; total base spread about 6 cm before extinction.",
    "The Coriolis force pulled the PMMA flame away from the fuel axis.",
  ],
  limitations:
    "Lunar gravity is simulated by rotation, not by being on the Moon, and Coriolis effects are present. These are NASA-reported experimental results, not PSI records, and they are not Martian-gravity data.",
  source: luciSource,
  contextSource: LUNAR_FIRE_SAFETY,
} as const;

export const GRAVITY_LEVELS = [
  {
    id: "microgravity",
    label: "Microgravity (~0g)",
    ratio: 0,
    dataStatus: "Measured",
    detail:
      "ISS investigations in this dataset (CIR, MSG and Cygnus-based Saffire) operated in a microgravity environment. Individual g-levels are not reported in the PSI summaries.",
    investigationIds: ["PSI-25", "PSI-26", "PSI-69", "PSI-68", "PSI-98", "PSI-99", "PSI-100"],
  },
  {
    id: "lunar",
    label: "Lunar gravity (≈0.165g)",
    ratio: 0.165,
    dataStatus: "Measured (LUCI, non-PSI)",
    detail:
      "LUCI burned SIBAL fabric and PMMA in simulated lunar gravity in February 2025. NASA's September 2026 lunar fire-safety briefing states that 'essentially no data exists for lunar gravity' for fire growth and lists LUCI as recently completed. LUCI is not one of the 24 PSI records.",
    investigationIds: [],
  },
  {
    id: "mars",
    label: "Martian gravity (≈0.38g)",
    ratio: 0.38,
    dataStatus: "No sourced combustion dataset",
    detail:
      "No direct Martian-gravity combustion measurements were found in the sources reviewed, including NASA's September 2026 lunar fire-safety briefing. No interpolation to Mars gravity is offered, because a 0g–1g interpolation would not represent combustion behaviour at 0.38g without a validated model.",
    investigationIds: [],
  },
  {
    id: "earth",
    label: "Earth gravity (1g)",
    ratio: 1,
    dataStatus: "Referenced, not in PSI dataset",
    detail:
      "The PSI records and NASA/TM-20210011385 refer to normal-gravity comparison tests and NASA-STD-6001 screening, but the PSI dataset does not contain the 1g measurement files.",
    investigationIds: [],
  },
] as const;

export interface ConceptDefinition {
  term: string;
  plain: string;
  source: string;
  url: string;
}

export const CONCEPTS: ReadonlyArray<ConceptDefinition> = conceptData;

export const ACME_PROGRAM_FACTS = {
  flamesIgnited: 1500,
  note:
    "NASA reports that over 1,500 flames were ignited across the six ACME investigations, more than three times the number originally planned, and that several firsts were achieved, notably in cool and spherical flames.",
  source: acmeArticle,
} as const;
