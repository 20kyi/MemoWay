import { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export type LayoutTheme = "default" | "lavender-night" | "couple-clay";

interface LayoutThemeContextType {
  layoutTheme: LayoutTheme;
  setLayoutTheme: (theme: LayoutTheme) => void;
}

const LayoutThemeContext = createContext<LayoutThemeContextType | undefined>(undefined);

export function LayoutThemeProvider({ children }: { children: React.ReactNode }) {
  const [layoutTheme, setLayoutThemeState] = useState<LayoutTheme>(() => {
    const saved = localStorage.getItem("layoutTheme");
    // 지원되는 테마만 유지하고, 나머지는 기본값으로 마이그레이션
    if (saved === "default" || saved === "lavender-night" || saved === "couple-clay") {
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
    root.classList.remove("layout-lavender-night", "layout-warm-beige", "layout-romantic-love", "layout-dreamy-gradient", "layout-pastel-dream", "layout-couple-clay");
    
    // 새 레이아웃 클래스 추가
    if (layoutTheme !== "default") {
      root.classList.add(`layout-${layoutTheme}`);
    }
    
    localStorage.setItem("layoutTheme", layoutTheme);

    // 모바일 앱에서 상태바 색상 설정
    const setStatusBarColor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          
          if (layoutTheme === "default") {
            // 기본 테마: 밝은 배경이므로 Light style (어두운 아이콘) + 흰색 배경
            await StatusBar.setStyle({ style: Style.Light });
            await StatusBar.setBackgroundColor({ color: "#ffffff" });
            // 상태바 오버레이 모드 활성화 (콘텐츠가 상태바 뒤로 올라갈 수 있도록)
            await StatusBar.setOverlaysWebView({ overlay: false });
          } else if (layoutTheme === "lavender-night") {
            // 라벤더 나이트 테마: 어두운 배경이므로 Dark style (밝은 아이콘) + 어두운 배경
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
            await StatusBar.setOverlaysWebView({ overlay: false });
          } else if (layoutTheme === "couple-clay") {
            // 커플 클레이 테마: 밝은 배경이므로 Light style (어두운 아이콘) + 밝은 핑크 배경
            await StatusBar.setStyle({ style: Style.Light });
            await StatusBar.setBackgroundColor({ color: "#ffc0e8" });
            await StatusBar.setOverlaysWebView({ overlay: false });
          }
        } catch (error) {
          console.warn("StatusBar plugin not available:", error);
        }
      }
    };

    setStatusBarColor();
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

