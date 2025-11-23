import { useEffect, useState, useCallback } from "react";
import { useMapProvider } from "@/lib/map-provider-context";
import type { MemoWithDetails } from "@shared/schema";
import type { TabType, PendingLocation } from "@/types/home";

interface UseMapInstanceProps {
  handleTabChange: (tab: TabType) => void;
  setSelectedMemo: (memo: MemoWithDetails | null) => void;
  setMemoDetailOpen: (open: boolean) => void;
}

export function useMapInstance({
  handleTabChange,
  setSelectedMemo,
  setMemoDetailOpen,
}: UseMapInstanceProps) {
  const { mapProvider } = useMapProvider();
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [pendingLocation, setPendingLocation] = useState<PendingLocation | null>(null);

  // Function to move map to specific location
  const moveToLocation = useCallback(
    (lat: number, lng: number, memo?: MemoWithDetails) => {
      if (mapInstance) {
        // Handle both Kakao Maps and Google Maps
        if (mapProvider === "kakao" && window.kakao?.maps) {
          const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
          mapInstance.panTo(moveLatLon);
        } else if (mapProvider === "google") {
          // Google Maps panTo
          mapInstance.panTo({ lat, lng });
          mapInstance.setZoom(15);
        }

        // Switch to map tab using the new handler
        handleTabChange("map");

        // If memo is provided, open its detail after a short delay
        if (memo) {
          setTimeout(() => {
            setSelectedMemo(memo);
            setMemoDetailOpen(true);
          }, 300);
        }
      }
    },
    [mapInstance, mapProvider, handleTabChange, setSelectedMemo, setMemoDetailOpen]
  );

  const handleNavigateToLocation = useCallback(
    (lat: number, lng: number) => {
      setPendingLocation({ lat, lng });
      handleTabChange("map");
    },
    [handleTabChange]
  );

  useEffect(() => {
    if (mapInstance && pendingLocation) {
      if (mapProvider === "kakao" && window.kakao?.maps) {
        const position = new window.kakao.maps.LatLng(
          pendingLocation.lat,
          pendingLocation.lng
        );
        mapInstance.panTo(position);
        mapInstance.setLevel(3);
      } else if (mapProvider === "google") {
        mapInstance.panTo({ lat: pendingLocation.lat, lng: pendingLocation.lng });
        mapInstance.setZoom(16);
      }
      // pendingLocation 처리 후 위치 고정 모드 해제 (메모 위치로 이동했으므로)
      // 위치 고정 모드는 MapView/GoogleMapView 내부에서 관리되므로 여기서는 pendingLocation만 초기화
      setPendingLocation(null);
    }
  }, [mapInstance, pendingLocation, mapProvider]);

  return {
    mapInstance,
    setMapInstance,
    pendingLocation,
    moveToLocation,
    handleNavigateToLocation,
  };
}

