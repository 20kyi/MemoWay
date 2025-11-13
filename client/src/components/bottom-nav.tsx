import { Map, List, Users, Settings } from "lucide-react";

interface BottomNavProps {
  activeTab: "map" | "memos" | "groups" | "settings";
  onTabChange: (tab: "map" | "memos" | "groups" | "settings") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "map" as const, label: "지도", icon: Map },
    { id: "memos" as const, label: "메모", icon: List },
    { id: "groups" as const, label: "그룹", icon: Users },
    { id: "settings" as const, label: "설정", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around px-4 z-50">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center min-h-12 min-w-12 gap-1 transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
            data-testid={`nav-${tab.id}`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
