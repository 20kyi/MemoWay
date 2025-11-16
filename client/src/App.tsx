import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider, useLanguage, type Language } from "./lib/language-context";
import { FontProvider } from "./lib/font-context";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { setLanguage } = useLanguage();

  // Check for language parameter in URL and set language
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam && ['ko', 'en', 'zh', 'ja'].includes(langParam)) {
      setLanguage(langParam as Language);
      // Clean up URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setLanguage]);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <FontProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </FontProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
