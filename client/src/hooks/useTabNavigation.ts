import { useState, useEffect, useCallback } from "react";
import type { TabType } from "@/types/home";

export function useTabNavigation() {
  // Get initial tab from URL hash or default to "map"
  const getInitialTab = (): TabType => {
    const hash = window.location.hash.slice(1); // Remove '#'
    if (hash === "map" || hash === "memos" || hash === "groups" || hash === "settings") {
      return hash;
    }
    return "map";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Custom tab change handler that updates URL hash
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    // Push to history for back button support
    window.history.pushState(null, "", `#${tab}`);
  }, []);

  // Handle browser back/forward button for tab navigation
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1);

      // If we're on the map tab and trying to go back, show exit confirmation
      if (activeTab === "map" && !hash) {
        // Push the current state back to prevent actual navigation
        window.history.pushState(null, "", "#map");
        setShowExitDialog(true);
        return;
      }

      if (hash === "map" || hash === "memos" || hash === "groups" || hash === "settings") {
        setActiveTab(hash);
      } else if (!hash) {
        // If no hash, we're trying to navigate away from the app
        window.history.pushState(null, "", "#map");
        setShowExitDialog(true);
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Set initial hash if not present
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#map");
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeTab]);

  return {
    activeTab,
    handleTabChange,
    showExitDialog,
    setShowExitDialog,
  };
}

