import { useLanguage } from "../../i18n";
import { EvidenceBadge } from "../EvidenceBadge";

export function PartialGravityAnalysis() {
  const { t } = useLanguage();

  const regimes = [
    {
      gravity: "0g (Microgravity)",
      value: "~10⁻⁶ g",
      status: "Measured & Verified",
      badge: "NASA-reported" as const,
      color: "var(--cyan)",
      description: "24 PSI flight experiments (ISS, Cygnus). Convection is absent; transport is governed purely by molecular diffusion and forced fans.",
    },
    {
      gravity: "0.166g (Moon)",
      value: "1/6th g",
      status: "Research Gap (Unmeasured in PSI)",
      badge: "Unknown" as const,
      color: "var(--amber)",
      description: "No direct combustion measurements exist in the PSI archive. LUCI (Feb 2025) parabolic flight tests and FM2 lunar surface payload represent planned NASA validation.",
    },
    {
      gravity: "0.38g (Mars)",
      value: "3/8th g",
      status: "Research Gap (Unmeasured in PSI)",
      badge: "Unknown" as const,
      color: "var(--amber)",
      description: "No direct Martian atmospheric combustion runs in the PSI dataset. Behavior must be modeled using low-pressure CFD and chemical kinetics.",
    },
    {
      gravity: "1g (Earth)",
      value: "9.81 m/s²",
      status: "Standard Screening",
      badge: "NASA-reported" as const,
      color: "var(--dim)",
      description: "NASA-STD-6001 Test 1 terrestrial upward flammability screening. Buoyancy-driven upward plume dominates flame propagation.",
    },
  ];

  return (
    <section className="section partial-gravity-analysis" aria-labelledby="partial-gravity-heading">
      <div className="section-head">
        <h2 className="section-title" id="partial-gravity-heading">
          {t("Partial Gravity Research Analysis & Gravity Gap")}
          <EvidenceBadge status="NASA-reported" compact />
        </h2>
        <span className="section-hint">{t("Empirical Limits · 0g vs 1/6g vs 3/8g vs 1g")}</span>
      </div>

      <div className="panel panel--flat">
        <div className="panel-body stack">
          <p className="prose">
            {t("Direct lunar (0.166g) and Martian (0.38g) combustion measurements are currently absent from the NASA Physical Sciences Informatics combustion dataset. The existing archive captures pure microgravity (~0g) in orbit and normal gravity (1g) on Earth.")}
          </p>

          {/* Visual Gravity Continuum Bar */}
          <div style={{ marginTop: 8 }}>
            <div className="tiny dim" style={{ textTransform: "uppercase", marginBottom: 8 }}>
              {t("Planetary Gravity Continuum & Verification Ledger")}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 12,
              }}
            >
              {regimes.map((regime) => (
                <div
                  key={regime.gravity}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <div className="row row--between" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: regime.color }}>{t(regime.gravity)}</span>
                    <EvidenceBadge status={regime.badge} compact />
                  </div>
                  <div className="mono-sm dim" style={{ marginBottom: 8 }}>
                    {regime.value} · <span style={{ color: regime.color }}>{t(regime.status)}</span>
                  </div>
                  <p className="tiny dim">{t(regime.description)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="divider" />

          {/* Sourced Surrogates and Forward Research */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {/* E-FIELD Flames Surrogate Research */}
            <div className="callout callout--flat">
              <div className="row row--between" style={{ marginBottom: 4 }}>
                <strong>{t("ACME E-FIELD Flames: Empirical Convection Surrogate")}</strong>
                <EvidenceBadge status="NASA-reported" compact />
              </div>
              <p className="tiny dim">
                {t("In ACME E-FIELD Flames (PSI-22), an electric field applied across a laminar diffusion flame induced chemi-ion drift and 'ionic winds'. While conducted primarily for terrestrial soot and emissions control, this serves as an empirical analog for manipulating gas velocities and flame shape without relying on buoyant density differences.")}
              </p>
            </div>

            {/* LUCI and FM2 Forward Missions */}
            <div className="callout callout--flat">
              <div className="row row--between" style={{ marginBottom: 4 }}>
                <strong>{t("LUCI & FM2: NASA Lunar Combustion Roadmap")}</strong>
                <EvidenceBadge status="NASA-reported" compact />
              </div>
              <p className="tiny dim">
                {t("The Lunar Combustion Investigation (LUCI, Feb 2025) utilized aircraft parabolic flights to achieve simulated lunar gravity (0.166g). NASA's Fire Safety on the Moon (FM2) payload is scheduled to perform physical surface material flammability tests directly on the lunar surface outside the PSI database.")}
              </p>
            </div>
          </div>

          {/* Scientific Non-Linearity Callout */}
          <div className="callout callout--amber" style={{ marginTop: 8 }}>
            <strong>{t("Critical Physics Limitation")}:</strong>{" "}
            {t("Combustion does NOT scale linearly between 0g and 1g. In partial gravity (such as 0.166g on the Moon), weak buoyancy generates a low-velocity upward drift (1–5 cm/s). This slight flow can supply fresh oxygen to the flame zone without the strong radiative and aerodynamic heat-quenching present in 1g, which can result in HIGHER material flammability and slower extinction than either 0g or 1g!")}
          </div>
        </div>
      </div>
    </section>
  );
}
