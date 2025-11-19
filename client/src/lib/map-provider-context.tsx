import { createContext, useContext, useEffect, useState } from "react";

export type MapProvider = "kakao" | "google";

interface MapProviderContextType {
  mapProvider: MapProvider;
  setMapProvider: (provider: MapProvider) => void;
}

const MapProviderContext = createContext<MapProviderContextType | undefined>(undefined);

export function MapProviderProvider({ children }: { children: React.ReactNode }) {
  const [mapProvider, setMapProviderState] = useState<MapProvider>(() => {
    const saved = localStorage.getItem("mapProvider");
    if (saved === "kakao" || saved === "google") {
      return saved;
    }
    return "kakao";
  });

  useEffect(() => {
    localStorage.setItem("mapProvider", mapProvider);
  }, [mapProvider]);

  const setMapProvider = (newProvider: MapProvider) => {
    setMapProviderState(newProvider);
  };

  return (
    <MapProviderContext.Provider value={{ mapProvider, setMapProvider }}>
      {children}
    </MapProviderContext.Provider>
  );
}

export function useMapProvider() {
  const context = useContext(MapProviderContext);
  if (context === undefined) {
    throw new Error("useMapProvider must be used within a MapProviderProvider");
  }
  return context;
}
