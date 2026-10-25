import { Route, Switch } from "wouter";

import Analytics from "@/pages/Analytics";
import Dashboard from "@/pages/Dashboard";
import Incidents from "@/pages/Incidents";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Predictions from "@/pages/Predictions";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Systems from "@/pages/Systems";
import { routes } from "@/routes/routes.config";

export default function AppRouter() {
  return (
    <Switch>
      <Route path={routes.landing} component={Landing} />
      <Route path={routes.login} component={Login} />
      <Route path={routes.dashboard} component={Dashboard} />
      <Route path={routes.analytics} component={Analytics} />
      <Route path={routes.predictions} component={Predictions} />
      <Route path={routes.incidents} component={Incidents} />
      <Route path={routes.systems} component={Systems} />
      <Route path={routes.reports} component={Reports} />
      <Route path={routes.settings} component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}