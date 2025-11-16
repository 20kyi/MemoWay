import { Map, List, Users, Settings, Heart } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface BottomNavProps {
  activeTab: "map" | "memos" | "groups" | "settings";
  onTabChange: (tab: "map" | "memos" | "groups" | "settings") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useLanguage();
  
  const tabs = [
    { id: "map" as const, label: t.nav.map, icon: Map },
    { id: "memos" as const, label: t.nav.memos, icon: List },
    { id: "groups" as const, label: t.nav.groups, icon: Users },
    { id: "settings" as const, label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t-2 border-primary/20 flex items-center justify-around px-4 z-50 shadow-lg">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center justify-center min-h-12 min-w-14 gap-1 transition-all ${
              isActive 
                ? "text-primary scale-110" 
                : "text-muted-foreground hover:text-foreground hover:scale-105"
            }`}
            data-testid={`nav-${tab.id}`}
          >
            {isActive && (
              <div className="absolute -top-1 w-12 h-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-full animate-pulse" />
            )}
            <div className={`${isActive ? "bg-primary/10 rounded-full p-2" : "p-2"}`}>
              <Icon className="h-6 w-6" />
            </div>
            <span className={`text-xs font-medium ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
