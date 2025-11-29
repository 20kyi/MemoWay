import { Map, List, Users, Settings, Heart } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";

interface BottomNavProps {
  activeTab: "map" | "memos" | "groups" | "settings";
  onTabChange: (tab: "map" | "memos" | "groups" | "settings") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useLanguage();
  const { layoutTheme } = useLayoutTheme();
  const isCoupleTheme = layoutTheme === "couple-clay";
  
  const tabs = [
    { id: "map" as const, label: t.nav.map, icon: Map },
    { id: "memos" as const, label: t.nav.memos, icon: List },
    { id: "groups" as const, label: t.nav.groups, icon: Users },
    { id: "settings" as const, label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 min-h-16 flex items-center justify-around gap-2 px-4 z-50 pb-[max(1rem,env(safe-area-inset-bottom))] ${
      isCoupleTheme 
        ? "bottom-nav-couple-theme" 
        : "bg-card/95 backdrop-blur-md border-t-2 border-primary/20 shadow-lg bottom-nav-romantic"
    }`}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center justify-center min-h-12 min-w-14 gap-1 transition-all ${
              isActive 
                ? isCoupleTheme 
                  ? "text-pink-600" 
                  : "text-primary"
                : "text-muted-foreground hover:text-foreground hover-elevate"
            }`}
            data-testid={`nav-${tab.id}`}
          >
            {isActive && !isCoupleTheme && (
              <div className="absolute -top-1 w-12 h-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-full animate-pulse" />
            )}
            <div className={`transition-all ${
              isCoupleTheme
                ? isActive
                  ? "bottom-nav-icon-active-couple"
                  : "bottom-nav-icon-inactive-couple"
                : `rounded-full p-2 ${isActive ? "bg-primary/10 shadow-md" : ""}`
            }`}>
              <Icon className="h-6 w-6" />
            </div>
            <span className={`text-xs font-medium ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
