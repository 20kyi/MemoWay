import { Map, List, Users, Heart, User } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface BottomNavProps {
  activeTab: "map" | "memos" | "groups" | "profile";
  onTabChange: (tab: "map" | "memos" | "groups" | "profile") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useLanguage();
  
  const tabs = [
    { id: "map" as const, label: t.nav.map, icon: Map },
    { id: "memos" as const, label: t.nav.memos, icon: List },
    { id: "groups" as const, label: t.nav.groups, icon: Users },
    { id: "profile" as const, label: t.nav.profile, icon: User },
  ];

  return (
    <nav className="fixed left-0 right-0 bottom-0 flex items-center justify-around z-50 bg-card/95 dark:bg-card dark:backdrop-blur-md backdrop-blur-md border-t-2 border-primary/20 dark:border-primary/30 min-h-[64px] sm:min-h-16 gap-2 px-4 shadow-lg bottom-nav-romantic pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pt-0">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center justify-center transition-all touch-manipulation min-h-12 min-w-14 gap-1 py-1 ${
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground hover-elevate"
            }`}
            data-testid={`nav-${tab.id}`}
          >
            <div className="transition-all rounded-full p-2">
              <Icon className="h-6 w-6" />
            </div>
            <span className={`text-[10px] sm:text-xs font-medium leading-tight ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
