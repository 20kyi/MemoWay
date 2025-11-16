import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type FontFamily = "default" | "noto-sans" | "nanum-gothic" | "gamja-flower" | "dokdo" | "nanum-pen";
export type FontSize = "small" | "medium" | "large";

interface FontContextType {
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

const fontFamilyMap: Record<FontFamily, string> = {
  default: "'Roboto', sans-serif",
  "noto-sans": "'Noto Sans KR', sans-serif",
  "nanum-gothic": "'Nanum Gothic', sans-serif",
  "gamja-flower": "'Gamja Flower', cursive",
  "dokdo": "'Dokdo', cursive",
  "nanum-pen": "'Nanum Pen Script', cursive",
};

const fontSizeMap: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem("fontFamily");
    return (saved as FontFamily) || "default";
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem("fontSize");
    return (saved as FontSize) || "medium";
  });

  useEffect(() => {
    localStorage.setItem("fontFamily", fontFamily);
    document.documentElement.style.setProperty("--font-family", fontFamilyMap[fontFamily]);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem("fontSize", fontSize);
    document.documentElement.style.setProperty("--font-size-base", fontSizeMap[fontSize]);
  }, [fontSize]);

  const setFontFamily = (newFont: FontFamily) => {
    setFontFamilyState(newFont);
  };

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
  };

  return (
    <FontContext.Provider value={{ fontFamily, setFontFamily, fontSize, setFontSize }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error("useFont must be used within FontProvider");
  }
  return context;
}
