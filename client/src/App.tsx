import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import PublicHome from "@/pages/PublicHome";
import Shop from "@/pages/Shop";
import Storage from "@/pages/Storage";
import CodingStudio from "@/pages/CodingStudio";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={PublicHome} />
      <Route path="/shop" component={Shop} />

      {/* Backend / Dashboard Routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/storage" component={Storage} />
      <Route path="/studio" component={CodingStudio} />
      
      {/* Redirects for demo purposes */}
      <Route path="/agents" component={Dashboard} />
      <Route path="/integrations" component={Dashboard} />
      
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
