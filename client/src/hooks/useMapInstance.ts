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

  // mapInstance를 통해 직접 이동하는 경우 (다른 경로에서 사용)
  useEffect(() => {
    if (mapInstance && pendingLocation) {
      // 지도가 완전히 준비될 때까지 약간의 딜레이
      const timeoutId = setTimeout(() => {
        if (mapProvider === "kakao" && window.kakao?.maps) {
          const position = new window.kakao.maps.LatLng(
            pendingLocation.lat,
            pendingLocation.lng
          );
          // setCenter를 사용하여 정확히 중심으로 이동
          mapInstance.setCenter(position);
          mapInstance.setLevel(3);
        } else if (mapProvider === "google") {
          // setCenter를 사용하여 정확히 중심으로 이동
          mapInstance.setCenter({ lat: pendingLocation.lat, lng: pendingLocation.lng });
          mapInstance.setZoom(16);
        }
        // pendingLocation 처리 후 초기화
        setPendingLocation(null);
      }, 150);
      
      return () => {
        clearTimeout(timeoutId);
      };
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

