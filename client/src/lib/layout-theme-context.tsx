import { createContext, useContext, useEffect, useState } from "react";

export type LayoutTheme = "default" | "lavender-night" | "warm-beige" | "pastel-dream";

interface LayoutThemeContextType {
  layoutTheme: LayoutTheme;
  setLayoutTheme: (theme: LayoutTheme) => void;
}

const LayoutThemeContext = createContext<LayoutThemeContextType | undefined>(undefined);

export function LayoutThemeProvider({ children }: { children: React.ReactNode }) {
  const [layoutTheme, setLayoutThemeState] = useState<LayoutTheme>(() => {
    const saved = localStorage.getItem("layoutTheme");
    // 이전 dreamy-gradient를 pastel-dream으로 마이그레이션
    if (saved === "dreamy-gradient") {
      localStorage.setItem("layoutTheme", "pastel-dream");
      return "pastel-dream";
    }
    if (saved === "default" || saved === "lavender-night" || saved === "warm-beige" || saved === "pastel-dream") {
      return saved;
    }
    return "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // 기존 레이아웃 클래스 제거
    root.classList.remove("layout-lavender-night", "layout-warm-beige", "layout-dreamy-gradient", "layout-pastel-dream");
    
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

