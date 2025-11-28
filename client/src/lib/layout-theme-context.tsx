import { createContext, useContext, useEffect, useState } from "react";

export type LayoutTheme = "default" | "lavender-night";

interface LayoutThemeContextType {
  layoutTheme: LayoutTheme;
  setLayoutTheme: (theme: LayoutTheme) => void;
}

const LayoutThemeContext = createContext<LayoutThemeContextType | undefined>(undefined);

export function LayoutThemeProvider({ children }: { children: React.ReactNode }) {
  const [layoutTheme, setLayoutThemeState] = useState<LayoutTheme>(() => {
    const saved = localStorage.getItem("layoutTheme");
    // 지원되는 테마만 유지하고, 나머지는 기본값으로 마이그레이션
    if (saved === "default" || saved === "lavender-night") {
      return saved;
    }
    // 지원되지 않는 테마는 기본값으로 변경
    if (saved) {
      localStorage.setItem("layoutTheme", "default");
    }
    return "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // 기존 레이아웃 클래스 제거
    root.classList.remove("layout-lavender-night", "layout-warm-beige", "layout-romantic-love", "layout-dreamy-gradient", "layout-pastel-dream");
    
    // 새 레이아웃 클래스 추가
    if (layoutTheme !== "default") {
      root.classList.add(`layout-${layoutTheme}`);
    }
    
    localStorage.setItem("layoutTheme", layoutTheme);
  }, [layoutTheme]);

  const setLayoutTheme = (newTheme: LayoutTheme) => {
    setLayoutThemeState(newTheme);
  };

  return (
    <LayoutThemeContext.Provider value={{ layoutTheme, setLayoutTheme }}>
      {children}
    </LayoutThemeContext.Provider>
  );
}

export function useLayoutTheme() {
  const context = useContext(LayoutThemeContext);
  if (context === undefined) {
    throw new Error("useLayoutTheme must be used within a LayoutThemeProvider");
  }
  return context;
}

