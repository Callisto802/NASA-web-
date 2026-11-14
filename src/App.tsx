import { useEffect, useMemo, useRef, useState } from "react";
import { loadInvestigations } from "./data/dataset";
import type { PSIInvestigation } from "./types";
import { useRoute } from "./lib/router";
import { SearchDialog } from "./components/SearchDialog";
import { LegendDialog } from "./components/LegendDialog";
import { OverviewPage } from "./pages/OverviewPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { DetailPage } from "./pages/DetailPage";
import { ComparePage } from "./pages/ComparePage";
import { AtmospherePage } from "./pages/AtmospherePage";
import { LineagePage } from "./pages/LineagePage";
import { AssistantPage } from "./pages/AssistantPage";
import { ScienceInMotionPage } from "./pages/ScienceInMotionPage";
import { LanguageContext, translate, type Language } from "./i18n";

const NAV = [
  { path: "/", label: "Overview" },
  { path: "/explorer", label: "Investigation Explorer" },
  { path: "/compare", label: "Compare" },
  { path: "/atmosphere", label: "Atmosphere & Gravity" },
  { path: "/science", label: "Science in Motion" },
  { path: "/lineage", label: "Hardware Lineage" },
  { path: "/assistant", label: "Co-Pilot" },
];

const COMPARE_KEY = "psi-explorer-compare";
const THEME_KEY = "psi-explorer-theme";
const LANGUAGE_KEY = "psi-explorer-language";
const THEMES = [
  { id: "mission", label: "Mission Control" },
  { id: "nebula", label: "Nebula Violet" },
  { id: "solar", label: "Solar Flare" },
  { id: "ocean", label: "Deep Ocean" },
  { id: "forest", label: "Aurora Green" },
  { id: "lab", label: "Arctic Lab" },
] as const;
type ThemeId = (typeof THEMES)[number]["id"];

function loadTheme(): ThemeId {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return THEMES.find((theme) => theme.id === saved)?.id ?? "mission";
  } catch {
    return "mission";
  }
}

function loadCompareIds(): string[] {
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function loadLanguage(): Language {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

export function App() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>(loadCompareIds);
  const [theme, setTheme] = useState<ThemeId>(loadTheme);
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const navigationStack = useRef<string[]>([]);
  const currentHash = useRef(window.location.hash || "#/");
  const [dataset] = useState<{ records: PSIInvestigation[]; error?: string }>(() => {
    try {
      return { records: loadInvestigations() };
    } catch (error) {
      return { records: [], error: error instanceof Error ? error.message : String(error) };
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
    } catch {
      /* storage can be unavailable; comparison still works in-memory */
    }
  }, [compareIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* The selected theme still applies for this session if storage is unavailable. */
    }
    const colors: Record<ThemeId, string> = {
      mission: "#050b15", nebula: "#0c0818", solar: "#140b0a", ocean: "#041417", forest: "#07140f", lab: "#edf4fa",
    };
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[theme]);
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      /* The chosen language remains active for this session. */
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    let handlingPopState = false;
    const onPopState = () => {
      handlingPopState = true;
      const destination = window.location.hash || "#/";
      if (navigationStack.current[navigationStack.current.length - 1] === destination) {
        navigationStack.current.pop();
      }
      currentHash.current = destination;
    };
    const onHashChange = () => {
      const destination = window.location.hash || "#/";
      if (destination !== currentHash.current) {
        if (!handlingPopState) navigationStack.current.push(currentHash.current);
        currentHash.current = destination;
      }
      handlingPopState = false;
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route.path]);

  const records = dataset.records;
  const activeRoot = route.segments[0] ?? "";
  const goBack = () => {
    if (navigationStack.current.length > 0) {
      window.history.back();
      return;
    }
    const fallback = activeRoot === "explorer" && route.segments.length > 1 ? "#/explorer" : "#/";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${fallback}`);
    navigationStack.current = [];
    currentHash.current = fallback;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  // Shareable comparison links: #/compare?ids=PSI-25,PSI-68
  const idsParam = route.query.get("ids");
  useEffect(() => {
    if (activeRoot !== "compare" || !idsParam) return;
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => records.some((record) => record.id === id))
      .slice(0, 4);
    if (ids.length > 0) setCompareIds(ids);
  }, [activeRoot, idsParam, records]);

  const toggleCompare = (id: string) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return [...current.slice(1), id];
      return [...current, id];
    });
  };

  const page = useMemo(() => {
    if (dataset.error) {
      return (
        <div className="page">
          <div className="error-panel">
            <h1 className="page-title" style={{ fontSize: 24 }}>
              The investigation dataset could not be loaded
            </h1>
            <p className="muted" style={{ margin: "10px 0" }}>
              The app validates the dataset at startup and stopped rather than showing incomplete records.
            </p>
            <code>{dataset.error}</code>
          </div>
        </div>
      );
    }
    switch (activeRoot) {
      case "":
        return <OverviewPage records={records} compareIds={compareIds} onToggleCompare={toggleCompare} />;
      case "explorer":
        if (route.segments[1]) {
          const record = records.find((item) => item.id === route.segments[1]);
          return (
            <DetailPage
              record={record}
              records={records}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              notFound={!record}
            />
          );
        }
        return (
          <ExplorerPage records={records} compareIds={compareIds} onToggleCompare={toggleCompare} />
        );
      case "compare":
        return (
          <ComparePage
            records={records}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
            onClear={() => setCompareIds([])}
          />
        );
      case "atmosphere":
        return <AtmospherePage records={records} />;
      case "science":
        return <ScienceInMotionPage />;
      case "lineage":
        return <LineagePage records={records} />;
      case "assistant":
        return <AssistantPage records={records} />;
      default:
        return (
          <div className="page">
            <div className="empty">
              <h3>Page not found</h3>
              <p>That route does not exist in this explorer.</p>
              <a className="btn" href="#/">
                Return to Overview
              </a>
            </div>
          </div>
        );
    }
  }, [activeRoot, route.segments, records, dataset.error, compareIds, toggleCompare]);

  return (
    <LanguageContext.Provider value={language}>
    <div className="app-shell" data-theme={theme} dir={language === "ar" ? "rtl" : "ltr"}>
      <a className="skip-link" href="#main">
        {translate(language, "Skip to main content")}
      </a>
      <header className="site-header">
        <a className="brand" href="#/" aria-label={`${translate(language, "PSI Fire Safety Explorer")} — ${translate(language, "Overview")}`}>
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21c3.8-2.6 5.7-6 5.7-10A5.7 5.7 0 0 0 12 5.3 5.7 5.7 0 0 0 6.3 11c0 4 1.9 7.4 5.7 10Z"
                stroke="#4ad6e8"
                strokeWidth="1.3"
              />
              <path
                d="M12 17.5c1.7-1.7 2.3-3.6 2.3-6.1A2.3 2.3 0 0 0 12 9.1a2.3 2.3 0 0 0-2.3 2.3c0 2.5.6 4.4 2.3 6.1Z"
                fill="#4ad6e8"
                fillOpacity=".22"
                stroke="#4ad6e8"
                strokeWidth=".8"
              />
            </svg>
          </span>
          <span className="brand-text">
            <span className="brand-title">{translate(language, "PSI Fire Safety Explorer")}</span>
            <span className="brand-sub">{translate(language, "NASA Combustion Science · Microgravity")}</span>
          </span>
        </a>

        <nav className="main-nav" aria-label={language === "ar" ? "التنقل الرئيسي" : "Primary"}>
          {NAV.map((item) => {
            const isActive =
              item.path === "/"
                ? activeRoot === ""
                : activeRoot === item.path.replace("/", "");
            return (
              <a
                key={item.path}
                className="nav-link"
                href={`#${item.path}`}
                aria-current={isActive ? "page" : undefined}
              >
                {translate(language, item.label)}
                {item.path === "/compare" && compareIds.length > 0 && (
                  <span className="badge-count" style={{ marginLeft: 6 }} aria-label={`${compareIds.length} selected`}>
                    {compareIds.length}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="header-actions">
          {activeRoot !== "" && <button className="header-back" type="button" onClick={goBack} aria-label={translate(language, "Go back")} title={translate(language, "Go back to the previous page")}>
            <svg aria-hidden="true" viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="M12.75 4.5 7.25 10l5.5 5.5M7.5 10h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{translate(language, "Back")}</span>
          </button>}
          <label className="language-picker">
            <span aria-hidden="true">文</span>
            <select aria-label={language === "ar" ? "اختر لغة الموقع" : "Choose site language"} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <label className="theme-picker">
            <span aria-hidden="true" className="theme-picker__icon">◐</span>
            <select aria-label={translate(language, "Choose color theme")} value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)}>
              {THEMES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <button
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label={translate(language, "Search investigations (Ctrl+K)")}
          >
            <span aria-hidden="true">⌕</span>
            <span className="search-label">{translate(language, "Search")}</span>
            <span className="kbd">Ctrl K</span>
          </button>
          <button
            className="search-trigger"
            onClick={() => setLegendOpen(true)}
            aria-label={translate(language, "Open source and evidence legend")}
            title={translate(language, "Source & evidence legend")}
          >
            <span aria-hidden="true" style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
              i
            </span>
            <span className="search-label">{translate(language, "Evidence")}</span>
          </button>
        </div>
      </header>

      <main id="main">
        {language === "ar" && (
          <div className="language-note" role="note">
            {translate(language, "The application is partially translated: controls, navigation, and selected explanations are in Arabic; NASA project names, source titles, and some detailed research text remain in English.")}
          </div>
        )}
        {page}
      </main>

      <footer className="site-footer">
        <p>
          {translate(language, "Educational research explorer built on NASA PSI investigation metadata retrieved 13 Nov 2026.")} {translate(language, "Not a fire-safety calculator, certification tool, or substitute for engineering review. AI assistant answers may be wrong; verify their citations. NASA does not endorse this application.")}
        </p>
        <p className="mono-sm" style={{ whiteSpace: "nowrap" }}>
          PSI · Combustion Science · 24 records
        </p>
      </footer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} records={records} />
      <LegendDialog open={legendOpen} onClose={() => setLegendOpen(false)} />
    </div>
    </LanguageContext.Provider>
  );
}
