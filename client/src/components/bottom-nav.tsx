import { Map, List, Users, Settings, Heart } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";
import { CustomMapPin } from "./icons/custom-map-pin";
import { CustomMemoIcon } from "./icons/custom-memo-icon";
import { CustomGroupIcon } from "./icons/custom-group-icon";
import { CustomSettingsIcon } from "./icons/custom-settings-icon";

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
    <nav className={`fixed left-0 right-0 flex items-center justify-around z-50 ${
      isCoupleTheme 
        ? "bottom-nav-couple-theme px-2" 
        : "bottom-0 bg-card/95 backdrop-blur-md border-t-2 border-primary/20 min-h-16 gap-2 px-4 shadow-lg bottom-nav-romantic pb-[max(1rem,env(safe-area-inset-bottom))]"
    }`}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center justify-center transition-all ${
              isCoupleTheme
                ? "min-h-14 min-w-14 p-2"
                : "flex-col min-h-12 min-w-14 gap-1"
            } ${
              isActive 
                ? "text-primary" 
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
              {isCoupleTheme && tab.id === "map" ? (
                <CustomMapPin size={26} isActive={isActive} />
              ) : isCoupleTheme && tab.id === "memos" ? (
                <CustomMemoIcon size={28} isActive={isActive} />
              ) : isCoupleTheme && tab.id === "groups" ? (
                <CustomGroupIcon size={28} isActive={isActive} />
              ) : isCoupleTheme && tab.id === "settings" ? (
                <CustomSettingsIcon size={28} isActive={isActive} />
              ) : (
                <Icon className="h-6 w-6" />
              )}
            </div>
            {!isCoupleTheme && (
              <span className={`text-xs font-medium ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
