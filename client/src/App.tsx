import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PublicHome from "@/pages/PublicHome";
import Shop from "@/pages/Shop";
import Storage from "@/pages/Storage";
import CodingStudio from "@/pages/CodingStudio";
import Settings from "@/pages/Settings";
import Integrations from "@/pages/Integrations";
import Agents from "@/pages/Agents";
import Usage from "@/pages/Usage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={PublicHome} />
      <Route path="/shop" component={Shop} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />

      {/* Backend / Dashboard Routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/storage" component={Storage} />
      <Route path="/studio" component={CodingStudio} />
      <Route path="/settings" component={Settings} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/agents" component={Agents} />
      <Route path="/usage" component={Usage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <AssistantPanel />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
