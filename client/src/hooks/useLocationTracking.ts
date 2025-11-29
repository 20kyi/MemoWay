import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance } from "@/utils/geolocation";
import type { MemoWithDetails } from "@shared/schema";
import type { UserLocation } from "@/types/home";

interface UseLocationTrackingProps {
  locationEnabled: boolean;
  notificationsEnabled: boolean;
  proximityRadius: number;
  memos: MemoWithDetails[];
  myMemberIds: string[];
}

export function useLocationTracking({
  locationEnabled,
  notificationsEnabled,
  proximityRadius,
  memos,
  myMemberIds,
}: UseLocationTrackingProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [notifiedMemoIds, setNotifiedMemoIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Track user location and check for nearby memos
  useEffect(() => {
    if (!locationEnabled || !notificationsEnabled) return;

    let watchId: number | null = null;
    const DESIRED_ACCURACY = 30; // meters

    const startTracking = () => {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            // 정밀도가 30m 이하인 경우에만 위치 업데이트
            if (accuracy <= DESIRED_ACCURACY) {
              setUserLocation({ lat: latitude, lng: longitude });

              // Check for nearby memos
              memos.forEach((memo) => {
                // Skip if already notified
                if (notifiedMemoIds.has(memo.id)) return;
                
                // Skip if this memo was created by the current user
                if (myMemberIds.includes(memo.memberId)) return;

                const distance = calculateDistance(
                  latitude,
                  longitude,
                  memo.latitude,
                  memo.longitude
                );

                if (distance <= proximityRadius) {
                  // Notify user
                  toast({
                    title: memo.buildingName || "근처 메모",
                    description: `${Math.round(distance)}m 내에 메모가 있습니다`,
                  });

                  // Mark as notified
                  setNotifiedMemoIds((prev) => new Set(prev).add(memo.id));
                }
              });
            } else {
              console.log(
                `위치 정밀도 부족: ${Math.round(accuracy)}m > 30m, 업데이트 건너뜀`
              );
            }
          },
          (error) => {
            console.error("위치 추적 오류:", error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0, // 캐시 사용 안 함
            timeout: 10000, // 10초로 증가
          }
        );
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locationEnabled, notificationsEnabled, memos, proximityRadius, notifiedMemoIds, myMemberIds, toast]);

  // Additional location tracking for settings
  useEffect(() => {
    if (!locationEnabled || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
      },
      (error) => {
        console.error("위치 추적 오류:", error);
        toast({
          title: "위치 추적 오류",
          description: "위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인하세요.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationEnabled, toast]);

  const checkNearbyMemos = useCallback(
    (location: UserLocation) => {
      const nearbyMemos = memos.filter((memo) => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          memo.latitude,
          memo.longitude
        );
        return distance <= 100;
      });

      // Only notify for new memos that haven't been notified yet and are not created by the current user
      nearbyMemos.forEach((memo) => {
        // Skip if this memo was created by the current user
        if (myMemberIds.includes(memo.memberId)) return;
        
        if (Notification.permission === "granted" && !notifiedMemoIds.has(memo.id)) {
          new Notification("근처 메모 있음", {
            body: `${memo.buildingName}에 메모가 있습니다`,
            icon: "/favicon.png",
          });

          // Mark this memo as notified
          setNotifiedMemoIds((prev) => new Set(prev).add(memo.id));
        }
      });

      // Clean up notified memos that are no longer nearby
      const nearbyMemoIds = new Set(nearbyMemos.map((m) => m.id));
      setNotifiedMemoIds((prev) => {
        const updated = new Set<string>();
        prev.forEach((id) => {
          if (nearbyMemoIds.has(id)) {
            updated.add(id);
          }
        });
        return updated;
      });
    },
    [memos, notifiedMemoIds, myMemberIds]
  );

  return {
    userLocation,
    setUserLocation,
    notifiedMemoIds,
  };
}

