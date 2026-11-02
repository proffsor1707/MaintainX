import { useState } from "react";
import { useClerk } from "@clerk/react";
import { Activity, Check, Clock3, Laptop, LoaderCircle, Moon, Palette, RotateCcw, ShieldCheck, Sun, UserRound, Wifi, XCircle } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiHealth } from "@/services/api/healthApi";
import type { DashboardTheme } from "@/app/ThemeProvider";
import { formatUsageDuration, useDigitalWellbeing } from "./DigitalWellbeingProvider";
import { SCAN_EXCLUDED_DIRECTORIES, SCAN_LIMITS } from "../scanning/scanProject.mjs";

type DashboardDataMode = "loading" | "live" | "demo" | "error";
type HealthState = "untested" | "checking" | "connected" | "error";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoaded: boolean;
  isSignedIn: boolean;
  userName: string;
  userEmail: string;
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  resetPreferences: () => void;
  dashboardDataMode: DashboardDataMode;
  dashboardDataError: string | null;
};

const themeOptions: { value: DashboardTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "custom", label: "Custom", icon: Palette },
];

export default function SettingsDialog({
  open,
  onOpenChange,
  isLoaded,
  isSignedIn,
  userName,
  userEmail,
  theme,
  setTheme,
  sidebarExpanded,
  setSidebarExpanded,
  resetPreferences,
  dashboardDataMode,
  dashboardDataError,
}: SettingsDialogProps) {
  const clerk = useClerk();
  const wellbeing = useDigitalWellbeing();
  const [healthState, setHealthState] = useState<HealthState>("untested");
  const [healthMessage, setHealthMessage] = useState("Connection has not been tested yet.");
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const testConnection = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    setHealthState("checking");
    setHealthMessage("Checking the public API health endpoint…");
    try {
      const response = await getApiHealth(controller.signal);
      if (response.status !== "ok") throw new Error(`Unexpected health response: ${response.status}`);
      setHealthState("connected");
      setHealthMessage("API health check succeeded.");
      setHealthCheckedAt(new Date().toLocaleString());
    } catch (error) {
      setHealthState("error");
      setHealthMessage(error instanceof Error ? error.message : "The API health check failed.");
      setHealthCheckedAt(new Date().toLocaleString());
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const manageAccount = () => {
    setAccountError(null);
    try {
      clerk.openUserProfile();
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not open the Clerk account profile.");
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    setAccountError(null);
    try {
      await clerk.signOut();
      onOpenChange(false);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-dialog">
        <DialogHeader className="settings-dialog-header">
          <div className="settings-heading-icon"><Palette size={18} /></div>
          <div>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your MaintainX preferences and account.</DialogDescription>
          </div>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="settings-tabs">
          <TabsList className="settings-tabs-list" aria-label="Settings sections">
            <TabsTrigger className="settings-tab-trigger" value="appearance"><Palette size={15} />Appearance</TabsTrigger>
            <TabsTrigger className="settings-tab-trigger" value="account"><UserRound size={15} />Account</TabsTrigger>
            <TabsTrigger className="settings-tab-trigger" value="connection"><Wifi size={15} />Connection</TabsTrigger>
            <TabsTrigger className="settings-tab-trigger" value="privacy"><ShieldCheck size={15} />Scan &amp; privacy</TabsTrigger>
            <TabsTrigger className="settings-tab-trigger" value="wellbeing"><Activity size={15} />Digital wellbeing</TabsTrigger>
          </TabsList>

          <div className="settings-tab-panel">
            <TabsContent value="appearance" className="settings-panel-content">
              <section className="settings-section">
                <div className="settings-section-title"><div><strong>Color theme</strong><span>Changes take effect immediately and are saved in this browser.</span></div></div>
                <div className="settings-theme-options">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" className={`settings-theme-option ${theme === value ? "selected" : ""}`} aria-pressed={theme === value} onClick={() => setTheme(value)}>
                      <Icon size={17} /><span>{label}</span>{theme === value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </section>

              <section className="settings-section settings-switch-row">
                <div className="settings-section-title"><Laptop size={17} /><div><strong>Keep sidebar expanded</strong><span>Remember this preference on this browser.</span></div></div>
                <Switch checked={sidebarExpanded} onCheckedChange={setSidebarExpanded} aria-label="Keep sidebar expanded" />
              </section>

              <section className="settings-section settings-reset-row">
                <div className="settings-section-title"><RotateCcw size={17} /><div><strong>Reset appearance preferences</strong><span>Restores the dark theme and the screen-size default sidebar.</span></div></div>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" size="sm">Reset</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset appearance settings?</AlertDialogTitle>
                      <AlertDialogDescription>This resets only the theme and sidebar preference stored for this browser.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={resetPreferences}>Reset preferences</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            </TabsContent>

            <TabsContent value="account" className="settings-panel-content">
              <section className="settings-account-card">
                <div className="settings-account-avatar"><UserRound size={20} /></div>
                <div className="settings-account-copy">
                  <strong>{!isLoaded ? "Loading account…" : isSignedIn ? userName : "Signed out"}</strong>
                  <span>{!isLoaded ? "" : isSignedIn ? userEmail : "Sign in to manage your MaintainX account."}</span>
                </div>
              </section>
              {isLoaded && isSignedIn ? (
                <div className="settings-actions-row">
                  <Button variant="outline" onClick={manageAccount}><UserRound size={15} />Manage account</Button>
                  <Button variant="destructive" onClick={() => void signOut()} disabled={isSigningOut}>
                    {isSigningOut ? <LoaderCircle className="spin" size={15} /> : <XCircle size={15} />}
                    {isSigningOut ? "Signing out…" : "Sign out"}
                  </Button>
                </div>
              ) : isLoaded ? (
                <p className="settings-help-text">Use the Login item in the sidebar to sign in with Clerk.</p>
              ) : null}
              {accountError && <p className="settings-error-text" role="alert">{accountError}</p>}
              <p className="settings-help-text">Profile details and authentication are managed by Clerk.</p>
            </TabsContent>

            <TabsContent value="connection" className="settings-panel-content">
              <section className="settings-section">
                <div className="settings-section-title"><Wifi size={17} /><div><strong>API health</strong><span>Checks the public <code>/api/v1/health</code> endpoint.</span></div></div>
                <Button onClick={() => void testConnection()} disabled={healthState === "checking"}>
                  {healthState === "checking" ? <LoaderCircle className="spin" size={15} /> : <Wifi size={15} />}
                  {healthState === "checking" ? "Testing…" : "Test connection"}
                </Button>
              </section>
              <div className={`settings-connection-result ${healthState}`} role="status">
                {healthState === "connected" ? <Check size={16} /> : healthState === "error" ? <XCircle size={16} /> : <Activity size={16} />}
                <div><strong>{healthState === "connected" ? "API reachable" : healthState === "error" ? "API check failed" : healthState === "checking" ? "Testing API" : "Not tested"}</strong><span>{healthMessage}</span>{healthCheckedAt && <small>Checked {healthCheckedAt}</small>}</div>
              </div>
              <div className={`settings-data-status ${dashboardDataMode}`}>
                <strong>Dashboard data: {dashboardDataMode === "live" ? "Live" : dashboardDataMode === "loading" ? "Connecting" : dashboardDataMode === "demo" ? "Sample / not connected" : "Unavailable"}</strong>
                {dashboardDataError && <span>{dashboardDataError}</span>}
                <small>A successful health check confirms the API process is reachable; protected dashboard data also needs Clerk verification and a configured database.</small>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="settings-panel-content">
              <div className="settings-privacy-banner"><ShieldCheck size={18} /><div><strong>Scans stay in this browser</strong><span>Selected source files are analyzed locally. File contents are not uploaded, and the selected folder is never remembered.</span></div></div>
              <section className="settings-section settings-scan-limits">
                <div className="settings-section-title"><div><strong>Scan limits</strong><span>These limits apply to each new scan.</span></div></div>
                <dl>
                  <div><dt>Maximum selected files</dt><dd>{SCAN_LIMITS.maxFiles.toLocaleString()}</dd></div>
                  <div><dt>Maximum size per file</dt><dd>{Math.round(SCAN_LIMITS.maxFileBytes / 1000)} KB</dd></div>
                  <div><dt>Maximum total size</dt><dd>{Math.round(SCAN_LIMITS.maxTotalBytes / 1_000_000)} MB</dd></div>
                  <div><dt>Maximum findings displayed</dt><dd>{SCAN_LIMITS.maxFindings.toLocaleString()}</dd></div>
                </dl>
              </section>
              <section className="settings-section">
                <div className="settings-section-title"><div><strong>Excluded folders</strong><span>Dependency and generated-content directories are skipped.</span></div></div>
                <div className="settings-exclusion-list">{SCAN_EXCLUDED_DIRECTORIES.map((directory) => <code key={directory}>{directory}</code>)}</div>
              </section>
              <p className="settings-help-text">The scanner reports exact matches for a small set of source patterns. Warnings require review; it is not a dependency audit or a guarantee that a project is secure.</p>
            </TabsContent>

            <TabsContent value="wellbeing" className="settings-panel-content">
              <div className="settings-wellbeing-grid">
                <article><span><Clock3 size={15} />Current session</span><strong>{formatUsageDuration(wellbeing.currentSessionMs)}</strong></article>
                <article><span><Activity size={15} />Today</span><strong>{formatUsageDuration(wellbeing.todayMs)}</strong></article>
                <article><span><Clock3 size={15} />Last 7 days</span><strong>{formatUsageDuration(wellbeing.lastSevenDaysMs)}</strong></article>
                <article><span><Laptop size={15} />Total tracked</span><strong>{formatUsageDuration(wellbeing.totalMs)}</strong></article>
              </div>
              <p className="settings-help-text">Usage time counts while this site is visible and the browser tab is focused. Totals are stored only in this browser and are not sent to MaintainX.</p>
              <section className="settings-section settings-reset-row">
                <div className="settings-section-title"><RotateCcw size={17} /><div><strong>Clear usage history</strong><span>Reset today, weekly, and total tracked time on this browser.</span></div></div>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="outline" size="sm">Clear history</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear digital wellbeing history?</AlertDialogTitle>
                      <AlertDialogDescription>This permanently clears locally stored usage totals in this browser. Tracking resumes while the site is active.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={wellbeing.resetUsage}>Clear history</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
