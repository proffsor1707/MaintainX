import { useEffect, useState } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { useLocation } from "wouter";
import { useDashboardUser } from "@/features/auth/useDashboardUser";
import { useDashboardTheme, type DashboardTheme } from "@/app/ThemeProvider";
import { useDashboardRisk } from "@/features/predictions/useDashboardRisk";
import { useDashboardApiData } from "@/features/monitoring/useDashboardApiData";
import { useRepositorySelection } from "@/features/systems/useRepositorySelection";
import { dashboardMetrics, forecast, recommendedActions, repositories, severityMeta } from "@/mocks/mockData";
import type { Severity } from "@/types/dashboard";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Download,
  FileCode2,
  Filter,
  GitBranch,
  Github,
  LayoutDashboard,
  Loader2,
  Lock,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type MaintenanceDashboardProps = {
  initialSection?: string;
  initialAnchor?: string;
};

export default function MaintenanceDashboard({
  initialSection = "Overview",
  initialAnchor,
}: MaintenanceDashboardProps) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [location, navigate] = useLocation();
  const { repoIndex, setRepoIndex, repository: repo } = useRepositorySelection();
  const {
    modules,
    severityFilter,
    setSeverityFilter,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    selectedPath,
    setSelectedPath,
    selectedModule,
    filteredModules,
    isScanning: isDemoScanning,
    scanComplete,
    runScan,
    clearScanComplete,
  } = useDashboardRisk();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 720);
  const [toast, setToast] = useState("");
  const { theme, setTheme } = useDashboardTheme();
  const { isLoaded, isSignedIn, userName, userEmail } = useDashboardUser();
  const apiData = useDashboardApiData();
  const liveData = apiData.mode === "live";
  const activeSystemName = liveData ? apiData.selectedSystem?.name : repo.name;
  const activeSystemSlug = liveData ? apiData.selectedSystem?.slug : null;
  const displayCpu = liveData ? apiData.metricValues.cpu_usage : Number(dashboardMetrics.systemHealth);
  const displayMemory = liveData ? apiData.metricValues.memory_usage : null;
  const displayResponseTime = liveData ? apiData.metricValues.response_time_ms : null;
  const displayErrorRate = liveData ? apiData.metricValues.error_rate : null;
  const displayRequestVolume = liveData ? apiData.metricValues.request_volume : null;
  const openFindingCount = liveData ? apiData.openIncidents.length : dashboardMetrics.openFindings;
  const findingCounts = liveData ? apiData.incidentCounts : dashboardMetrics.findingCounts;
  const findingTotal = findingCounts.critical + findingCounts.high + findingCounts.medium;
  const findingBarWidth = (count: number) => findingTotal === 0 ? "0%" : `${(count / findingTotal) * 100}%`;
  const isScanning = isDemoScanning || apiData.isPredicting;
  const displayRecommendations = liveData ? apiData.recommendations?.recommendations.map((item) => ({
    severity: apiData.recommendations!.risk_level === "critical" ? "critical" as const
      : apiData.recommendations!.risk_level === "high" ? "high" as const
        : apiData.recommendations!.risk_level === "moderate" ? "medium" as const : "low" as const,
    title: item.code.replaceAll("_", " "),
    detail: item.message,
    action: null,
  })) ?? [] : recommendedActions.map((item) => ({ ...item, action: item.action }));

  useEffect(() => {
    if (initialAnchor) {
      document.getElementById(initialAnchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [initialAnchor, location]);

  const getGreeting = (name?: string) => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return name ? `${timeGreeting}, ${name}.` : `${timeGreeting}.`;
  };

  const handleScan = async () => {
    if (liveData) {
      try {
        const result = await apiData.runPrediction();
        setToast(`Prediction complete · ${(result.failure_probability * 100).toFixed(1)}% failure risk`);
        window.setTimeout(() => setToast(""), 3500);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Prediction request failed.");
        window.setTimeout(() => setToast(""), 4500);
      }
      return;
    }

    runScan(() => {
      setToast("Demo scan complete · sample data only");
      window.setTimeout(() => setToast(""), 3500);
    });
  };

  const handleAction = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const scrollToSection = (section: string, targetId: string | undefined, route: string) => {
    setActiveSection(section);
    navigate(route);
    if (targetId) window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span /></div>
          {sidebarOpen && <div><div className="brand-name">Maintain<span>X</span></div><div className="brand-caption">maintenance intelligence</div></div>}
        </div>

        <div className="workspace-label">{sidebarOpen ? "Workspace" : "WS"}</div>
        <button className={`workspace-switcher ${sidebarOpen ? "" : "compact"}`} onClick={() => handleAction("Workspace switcher is ready for multi-team analysis")}>
          <div className="workspace-avatar">MX</div>
          {sidebarOpen && <><div className="workspace-copy"><strong>MaintainX</strong><span>Operations</span></div><ChevronDown size={14} /></>}
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          <button className={activeSection === "Overview" ? "nav-item active" : "nav-item"} onClick={() => scrollToSection("Overview", "overview", "/dashboard")}>
            <LayoutDashboard size={17} /><span>{sidebarOpen && "Overview"}</span><kbd>{sidebarOpen && "1"}</kbd>
          </button>
          <button className={activeSection === "Risk map" ? "nav-item active" : "nav-item"} onClick={() => scrollToSection("Risk map", "risk-map", "/analytics")}>
            <Target size={17} /><span>{sidebarOpen && "Risk map"}</span>{sidebarOpen && <span className="nav-badge">{modules.length}</span>}
          </button>
          <button className={activeSection === "Activity" ? "nav-item active" : "nav-item"} onClick={() => scrollToSection("Activity", "activity", "/predictions")}>
            <TrendingUp size={17} /><span>{sidebarOpen && "Activity"}</span>
          </button>
          <button className={activeSection === "Login" ? "nav-item active" : "nav-item"} onClick={() => { setActiveSection("Login"); navigate("/login"); handleAction("Authentication tab opened"); }}>
            <Lock size={17} /><span>{sidebarOpen && "Login"}</span>
          </button>
        </nav>

        {sidebarOpen && <div className="sidebar-rule" />}
        <div className="workspace-label">{sidebarOpen ? "Manage" : "••"}</div>
        <nav className="main-nav">
          <button className={activeSection === "Repositories" ? "nav-item active" : "nav-item"} onClick={() => { setActiveSection("Repositories"); navigate("/systems"); handleAction("Repository manager opened"); }}>
            <Github size={17} /><span>{sidebarOpen && "Repositories"}</span>
          </button>
          <button className={activeSection === "Settings" ? "nav-item active" : "nav-item"} onClick={() => { setActiveSection("Settings"); navigate("/settings"); handleAction("Settings panel is ready"); }}>
            <Settings2 size={17} /><span>{sidebarOpen && "Settings"}</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          {sidebarOpen && <div className="model-status"><span className="status-dot" />Model online <span className="model-version">v0.9.4</span></div>}
          <button className="collapse-button" onClick={() => setSidebarOpen((value) => !value)} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            {sidebarOpen && "Collapse"}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{activeSystemName}</strong>{liveData && activeSystemSlug ? <span className="branch-pill">{activeSystemSlug}</span> : <span className="branch-pill"><GitBranch size={12} />{repo.branch}</span>}</div>
          <div className="topbar-actions">
            <label className="theme-picker"><span>Theme</span><select aria-label="Choose dashboard theme" value={theme} onChange={(event) => setTheme(event.target.value as DashboardTheme)}><option value="light">Light</option><option value="dark">Dark</option><option value="custom">Custom</option></select></label>
            <button className="icon-button" aria-label="Notifications" onClick={() => handleAction("No new notifications")}><Bell size={17} /><span className="notification-dot" /></button>
            <div className="topbar-divider" />
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="user-chip" aria-label="Sign in">
                  <span className="user-name">Sign in</span>
                  <ChevronDown size={14} />
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="secondary-button auth-sign-up">Create account</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in"><UserButton /></Show>
            <button className="mobile-menu" onClick={() => setSidebarOpen((value) => !value)}><Menu size={18} /></button>
          </div>
        </header>

        <div className="page-wrap">
          <div className={`api-status-banner api-status-${apiData.mode}`} role="status">
            {apiData.mode === "loading" && "Connecting to live backend…"}
            {apiData.mode === "live" && `Live backend · ${apiData.selectedSystem?.name ?? "system selected"}`}
            {apiData.mode === "demo" && (apiData.error ?? "Demo data · sign in and connect the backend to load live records.")}
            {apiData.mode === "error" && `Live data unavailable · ${apiData.error ?? "showing clearly marked sample data"}`}
          </div>
          {activeSection === "Login" ? (
            <section className="page-heading" id="login">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" />Authentication / secure access</div>
                <h1>{isLoaded && isSignedIn ? `Welcome back, ${userName}.` : "Secure access to MaintainX"}</h1>
                <p>{isLoaded && isSignedIn ? "Your account is connected and ready for operational dashboards." : "Sign in or create an account to access your maintenance dashboard."}</p>
              </div>
            </section>
          ) : (
            <section className="page-heading" id="overview">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" />Predictive maintenance / 24h view</div>
                <h1>{getGreeting(isSignedIn ? userName : undefined)}</h1>
                <p>Here’s what MaintainX found across your operational systems since the last scan.</p>
              </div>
              <div className="heading-actions">
                <button className="secondary-button" onClick={() => handleAction("Report export queued")}><Download size={15} />Export report</button>
                <button className="primary-button" onClick={handleScan} disabled={isScanning}>
                  {isScanning ? <Loader2 size={16} className="spin" /> : <Play size={15} />}
                  {isScanning ? "Scanning…" : "Run new scan"}
                </button>
              </div>
            </section>
          )}

          {activeSection === "Login" ? (
            <section className="panel" style={{ maxWidth: 640, marginTop: 24 }}>
              <div className="panel-heading compact-heading">
                <div>
                  <div className="panel-kicker"><span className="signal-bar violet" />Secure sign in</div>
                  <h2>{!isLoaded ? "Loading account" : isSignedIn ? "Connected account" : "Sign in to MaintainX"}</h2>
                  <p>{isSignedIn ? "Your Clerk account is active for the dashboard." : "Use your work email to securely access your workspace."}</p>
                </div>
                <div className="chart-legend"><span><ShieldCheck size={14} /> {isSignedIn ? "Active" : "Ready"}</span></div>
              </div>
              <div className="recommendation-list" style={{ paddingTop: 18 }}>
                <div className="recommendation-row">
                  <span className="severity-icon low"><Lock size={13} /></span>
                  <div className="recommendation-copy">
                    <strong>Work email</strong>
                    <span>{isSignedIn ? userEmail : "mail@yourcompany.com"}</span>
                  </div>
                </div>
                <div className="recommendation-row">
                  <span className="severity-icon medium"><ShieldAlert size={13} /></span>
                  <div className="recommendation-copy">
                    <strong>Authentication provider</strong>
                    <span>Secure authentication powered by Clerk</span>
                  </div>
                </div>
              </div>
              <div className="heading-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
                <Show when="signed-out">
                  <SignInButton mode="modal"><button className="primary-button">Continue with Clerk</button></SignInButton>
                  <SignUpButton mode="modal"><button className="secondary-button">Create account</button></SignUpButton>
                </Show>
                <button className="secondary-button" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
              </div>
            </section>
          ) : (
            <section className="repo-bar">
              <div className="repo-selector">
                <div className="repo-icon"><Github size={18} /></div>
                <div className="repo-select-copy"><span>{liveData ? "System" : "Sample repository"}</span><select value={liveData ? (apiData.selectedSystemId ?? "") : String(repoIndex)} onChange={(event) => { if (liveData) apiData.setSelectedSystemId(event.target.value); else setRepoIndex(Number(event.target.value)); handleAction("System context updated"); }} aria-label="Select system">{liveData ? apiData.systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : repositories.map((item, index) => <option key={item.name} value={index}>{item.owner}/{item.name}</option>)}</select></div>
                <ChevronDown className="select-chevron" size={15} />
              </div>
              <div className="repo-meta"><span className="live-dot" />{liveData ? apiData.selectedSystem?.status : repo.status === "healthy" ? "Healthy" : "Watch"}<span className="meta-separator" />{liveData ? `Updated ${apiData.selectedSystem?.updated_at ? new Date(apiData.selectedSystem.updated_at).toLocaleString() : "—"}` : `Last scan ${repo.scan} · ${repo.files} files`}</div>
              <button className="repo-settings" onClick={() => handleAction("Repository settings opened")}><MoreHorizontal size={18} /></button>
            </section>
          )}

          {activeSection !== "Login" && (
            <>
              <section className="stats-grid" aria-label="Repository metrics">
                <article className="metric-card health-card">
                  <div className="metric-top"><span>{liveData ? "CPU usage" : "System health · sample"}</span><CircleHelp size={14} /></div>
                  <div className="health-main">
                    <div className="health-ring" style={liveData && displayCpu !== undefined ? { background: `conic-gradient(var(--cyan) 0deg ${displayCpu * 3.6}deg, #293957 ${displayCpu * 3.6}deg 360deg)` } : undefined}><div className="health-ring-inner"><strong>{displayCpu === undefined ? "—" : displayCpu}</strong><span>{liveData ? "%" : "/ 100"}</span></div></div>
                    <div><div className="metric-value compact-value">{liveData ? (displayCpu === undefined ? "No reading" : displayCpu >= 85 ? "Elevated" : "Normal") : "Good"}</div><div className="metric-helper">{liveData ? "Latest persisted metric" : `Sample trend ${dashboardMetrics.healthTrend}`}</div></div>
                  </div>
                  <div className="metric-foot"><span className="health-marker green" />{liveData ? apiData.selectedSystem?.status : "Sample data · not a live system reading"}</div>
                </article>
                <article className="metric-card">
                  <div className="metric-top"><span>{liveData ? "Memory usage" : "Monitored files · sample"}</span><FileCode2 size={14} /></div>
                  <div className="metric-value">{liveData ? (displayMemory === undefined ? "—" : `${displayMemory}%`) : dashboardMetrics.monitoredFiles}</div>
                  <div className="metric-helper">{liveData ? (displayMemory === undefined ? "No metric recorded" : "Latest persisted metric") : dashboardMetrics.newFiles}</div>
                  <div className="metric-sparkline files-spark"><span /><span /><span /><span /><span /><span /><span /><span /></div>
                </article>
                <article className="metric-card alert-card">
                  <div className="metric-top"><span>Open findings</span><ShieldAlert size={14} /></div>
                  <div className="metric-value">{openFindingCount} <span className="value-label">open incidents</span></div>
                  <div className="metric-helper">{liveData ? "Persisted incidents for selected system" : `Sample findings · trend ${dashboardMetrics.findingsTrend}`}</div>
                  <div className="finding-breakdown"><span className="critical-block" style={{ width: liveData ? findingBarWidth(findingCounts.critical) : dashboardMetrics.findingBarWidths.critical }} /><span className="high-block" style={{ width: liveData ? findingBarWidth(findingCounts.high) : dashboardMetrics.findingBarWidths.high }} /><span className="medium-block" style={{ width: liveData ? findingBarWidth(findingCounts.medium) : dashboardMetrics.findingBarWidths.medium }} /></div>
                  <div className="finding-legend"><span><i className="dot critical-dot" />{findingCounts.critical} critical</span><span><i className="dot high-dot" />{findingCounts.high} high</span><span><i className="dot medium-dot" />{findingCounts.medium} medium</span></div>
                </article>
                <article className="metric-card">
                  <div className="metric-top"><span>{liveData ? "Response time" : "Est. maintenance · sample"}</span><TimerReset size={14} /></div>
                  <div className="metric-value">{liveData ? (displayResponseTime === undefined ? "—" : displayResponseTime) : dashboardMetrics.estimatedMaintenanceHours} <span className="value-label">{liveData ? "ms" : "hrs"}</span></div>
                  <div className="metric-helper">{liveData ? `Error rate ${displayErrorRate == null ? "—" : `${(displayErrorRate * 100).toFixed(2)}%`}` : `Next ${dashboardMetrics.nextSprints} sprints · ${dashboardMetrics.maintenanceDelta}`}</div>
                  <div className="metric-progress"><span style={{ width: `${liveData ? Math.min(displayErrorRate ?? 0, 1) * 100 : dashboardMetrics.capacityUsed}%` }} /></div>
                  <div className="metric-progress-label"><span>{liveData ? "Request volume" : "Capacity used"}</span><strong>{liveData ? (displayRequestVolume ?? "—") : `${dashboardMetrics.capacityUsed}%`}</strong></div>
                </article>
              </section>

              <section className="content-grid">
                <article className="panel risk-panel" id="risk-map">
                  <div className="panel-heading">
                    <div><div className="panel-kicker"><span className="signal-bar" />Priority queue</div><h2>{liveData ? "Sample modules at risk" : "Modules at risk"}</h2><p>{liveData ? "Sample module rows; no module risk endpoint is available yet" : "Sample risk ranking"}</p></div>
                    <button className="ghost-button" onClick={() => { setSeverityFilter("all"); setSearchTerm(""); handleAction("Showing all risk modules"); }}>View all <ArrowUpRight size={14} /></button>
                  </div>
                  <div className="risk-toolbar">
                    <div className="filter-tabs">{(["all", "critical", "high", "medium"] as const).map((filter) => <button key={filter} className={severityFilter === filter ? "filter-tab active" : "filter-tab"} onClick={() => setSeverityFilter(filter)}>{filter === "all" ? "All" : severityMeta[filter].label}<span>{filter === "all" ? modules.length : modules.filter((item) => item.severity === filter).length}</span></button>)}</div>
                    <div className="table-actions"><div className="search-field"><Search size={14} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search modules" aria-label="Search modules" />{searchTerm && <button onClick={() => setSearchTerm("")}><X size={13} /></button>}</div><div className="sort-select"><Filter size={13} /><select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} aria-label="Sort risk modules"><option value="riskScore">Risk score</option><option value="complexity">Complexity</option><option value="churn">Code churn</option></select><ChevronDown size={13} /></div></div>
                  </div>
                  <div className="table-wrap">
                    <table className="risk-table"><thead><tr><th>Module</th><th>Risk score</th><th>Complexity</th><th>Churn (30d)</th><th>Last changed</th><th /></tr></thead><tbody>
                      {filteredModules.map((module) => <tr key={module.path} className={selectedPath === module.path ? "selected-row" : ""} onClick={() => setSelectedPath(module.path)}>
                        <td><div className="module-name"><span className={`severity-icon ${severityMeta[module.severity].className}`}><AlertTriangle size={13} /></span><div><strong>{module.path.split("/").pop()}</strong><span>{module.path.split("/").slice(0, -1).join("/")} · {module.service}</span></div></div></td>
                        <td><div className="risk-score-cell"><div className="risk-score"><span style={{ color: severityMeta[module.severity].color }}>{module.riskScore}</span><small>/100</small></div><div className="risk-bar"><span className={`risk-fill ${severityMeta[module.severity].className}`} style={{ width: `${module.riskScore}%` }} /></div></div></td>
                        <td><span className="table-number">{module.complexity}</span><span className="table-muted"> cyclo</span></td>
                        <td><span className="table-number">{module.churn}%</span></td>
                        <td><span className="table-muted">{module.lastChanged}</span></td>
                        <td><button className="row-more" onClick={(event) => { event.stopPropagation(); handleAction(`Actions for ${module.path.split("/").pop()}`); }}><MoreHorizontal size={16} /></button></td>
                      </tr>)}
                    </tbody></table>
                    {filteredModules.length === 0 && <div className="empty-state"><Search size={22} /><strong>No modules found</strong><span>Try clearing your filters or searching by service.</span></div>}
                  </div>
                  <div className="table-footer"><span>Showing {filteredModules.length} of {modules.length} modules</span><button onClick={() => handleAction("Risk report opened")}>Open risk report <ArrowUpRight size={13} /></button></div>
                </article>

                <aside className="panel detail-panel">
                  <div className="detail-topline"><span className={`status-pill ${severityMeta[selectedModule.severity].className}`}><span />{severityMeta[selectedModule.severity].label} risk</span><button className="row-more" onClick={() => handleAction("Module actions opened")}><MoreHorizontal size={16} /></button></div>
                  <div className="detail-file"><div className="file-glyph"><Code2 size={18} /></div><div><h3>{selectedModule.path.split("/").pop()}</h3><span>{selectedModule.path}</span></div></div>
                  <div className="detail-risk"><div><span>Maintenance risk</span><strong style={{ color: severityMeta[selectedModule.severity].color }}>{selectedModule.riskScore}<small>/100</small></strong></div><div className="detail-risk-meter"><span style={{ width: `${selectedModule.riskScore}%`, background: severityMeta[selectedModule.severity].color }} /></div></div>
                  <div className="detail-metrics"><div><span>Complexity</span><strong>{selectedModule.complexity}</strong><small>cyclomatic</small></div><div><span>Code churn</span><strong>{selectedModule.churn}%</strong><small>last 30 days</small></div><div><span>Bug density</span><strong>{selectedModule.bugDensity}</strong><small>per KLOC</small></div></div>
                  <div className="detail-owner"><span className="owner-avatar">{selectedModule.owner.split(" ").map((name) => name[0]).join("")}</span><div><span>Primary owner</span><strong>{selectedModule.owner}</strong></div><span className="changed-time">Changed {selectedModule.lastChanged}</span></div>
                  <div className="recommendation"><div className="recommendation-title"><Sparkles size={14} />Recommended action</div><p>{selectedModule.recommendation}</p><button onClick={() => handleAction(`Refactor plan created for ${selectedModule.path.split("/").pop()}`)}>Create refactor plan <ArrowUpRight size={13} /></button></div>
                </aside>
              </section>

              <section className="lower-grid" id="activity">
                <article className="panel forecast-panel">
                  <div className="panel-heading compact-heading"><div><div className="panel-kicker"><span className="signal-bar violet" />{liveData ? "Sample forecast" : "Predictive outlook · sample"}</div><h2>Maintenance load</h2><p>{liveData ? "Forecast endpoint is not available; showing sample data" : "Sample projected effort based on illustrative code signals"}</p></div><div className="chart-legend"><span><i className="legend-line projected" />Projected</span><span><i className="legend-line baseline" />Baseline</span></div></div>
                  <div className="chart-wrap"><ResponsiveContainer width="100%" height={196}><AreaChart data={forecast} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="projectedFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8c7bff" stopOpacity={0.26} /><stop offset="100%" stopColor="#8c7bff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#263351" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="sprint" axisLine={false} tickLine={false} tick={{ fill: "#7e8ba5", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#7e8ba5", fontSize: 11 }} tickFormatter={(value) => `${value}h`} domain={[30, 80]} /><Tooltip contentStyle={{ background: "#151e35", border: "1px solid #2a3859", borderRadius: 8, color: "#edf2ff", fontSize: 12 }} labelStyle={{ color: "#a9b5cc" }} /><Area type="monotone" dataKey="baseline" stroke="#55627e" strokeWidth={1.5} strokeDasharray="4 4" fill="none" /><Area type="monotone" dataKey="projected" stroke="#9b8cff" strokeWidth={2.5} fill="url(#projectedFill)" /></AreaChart></ResponsiveContainer><div className="chart-callout"><span className="callout-dot" /><div><strong>+{dashboardMetrics.forecastIncreaseHours} hrs</strong><span>expected by S-24 if unaddressed</span></div></div></div>
                  <div className="forecast-footer"><span><TrendingUp size={14} /> Risk trend accelerating in <strong>{dashboardMetrics.riskTrendServices[0]}</strong> and <strong>{dashboardMetrics.riskTrendServices[1]}</strong></span><button onClick={() => handleAction("Forecast details opened")}>View forecast details <ArrowUpRight size={13} /></button></div>
                </article>
                <article className="panel recommendations-panel">
                  <div className="panel-heading compact-heading"><div><div className="panel-kicker"><span className="signal-bar orange" />Needs attention</div><h2>Recommended actions</h2><p>High-impact fixes from the latest scan</p></div><button className="ghost-icon" onClick={() => handleAction("Recommendations refreshed")}><RefreshCw size={15} /></button></div>
                  <div className="recommendation-list">
                    {displayRecommendations.map((item) => <div className="recommendation-row" key={item.title}><span className={`severity-icon ${severityMeta[item.severity].className}`}><Zap size={13} /></span><div className="recommendation-copy"><strong>{item.title}</strong><span>{item.detail}</span></div>{item.action && <button onClick={() => handleAction(`${item.action} opened`)}>{item.action}<ArrowUpRight size={12} /></button>}</div>)}
                    {liveData && displayRecommendations.length === 0 && <div className="empty-state"><strong>No recommendation available</strong><span>Run a prediction after all required metrics are recorded.</span></div>}
                  </div>
                  {!liveData && <button className="all-actions-button" onClick={() => handleAction("Demo action queue · sample data only")}>View all actions <span>sample</span><ArrowUpRight size={13} /></button>}
                </article>
              </section>

              <footer className="page-footer"><span><span className="footer-pulse" />MaintainX is monitoring your operations</span><span>Last model refresh {dashboardMetrics.modelRefresh} <span className="footer-separator">·</span> <button onClick={() => handleAction("Model details opened")}>Model details</button></span></footer>
            </>
          )}
        </div>
      </main>

      {toast && <div className="toast"><span className="toast-check"><Check size={13} /></span>{toast}<button onClick={() => setToast("")}><X size={13} /></button></div>}
      {scanComplete && <div className="scan-complete"><Check size={13} /> Demo scan completed · sample data only<button onClick={clearScanComplete}><X size={12} /></button></div>}
    </div>
  );
}
