import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance } from "@/utils/geolocation";
import type { MemoWithDetails } from "@shared/schema";
import type { UserLocation } from "@/types/home";
import { Capacitor } from "@capacitor/core";

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
  
  // 에러 메시지 중복 표시 방지
  const lastErrorTimeRef = useRef<number>(0);
  const lastErrorCodeRef = useRef<number | null>(null);
  const ERROR_THROTTLE_MS = 30000; // 30초 동안 같은 에러는 한 번만 표시

  // 통합된 위치 추적 (알림 및 위치 업데이트 모두 처리)
  useEffect(() => {
    if (!locationEnabled) return;

    const DESIRED_ACCURACY = 100; // 정밀도 요구사항 완화 (30m -> 100m)
    let watchId: number | null = null;
    let watcherId: string | null = null;

    const handleLocationUpdate = (latitude: number, longitude: number, accuracy: number) => {
      // 정밀도가 100m 이하인 경우 위치 업데이트 (더 유연하게 처리)
      // 정밀도가 낮아도 위치는 업데이트하되, 알림은 정밀도가 좋을 때만 표시
      if (accuracy <= DESIRED_ACCURACY || accuracy > 0) {
        setUserLocation({ lat: latitude, lng: longitude });

        // 메모 알림이 켜져있고 정밀도가 좋을 때만 근처 메모 체크
        if (notificationsEnabled && accuracy <= DESIRED_ACCURACY) {
          memos.forEach((memo) => {
            // Skip if already notified
            if (notifiedMemoIds.has(memo.id)) return;

            const distance = calculateDistance(
              latitude,
              longitude,
              memo.latitude,
              memo.longitude
            );

            if (distance <= proximityRadius) {
              // Notify user (자신이 작성한 메모도 포함)
              toast({
                title: memo.buildingName || "근처 메모",
                description: `${Math.round(distance)}m 내에 메모가 있습니다`,
              });

              // Mark as notified
              setNotifiedMemoIds((prev) => new Set(prev).add(memo.id));
            }
          });
        }
      }
    };

    const handleLocationError = (error: any) => {
      const now = Date.now();
      const errorCode = error?.code || error?.PERMISSION_DENIED || 1;
      
      // 같은 에러가 30초 이내에 발생했으면 표시하지 않음
      if (
        errorCode === lastErrorCodeRef.current &&
        now - lastErrorTimeRef.current < ERROR_THROTTLE_MS
      ) {
        console.warn("위치 추적 오류 (알림 제한):", error);
        return;
      }

      lastErrorTimeRef.current = now;
      lastErrorCodeRef.current = errorCode;

      // 에러 타입별 적절한 메시지 표시
      let errorMessage = "위치 정보를 가져올 수 없습니다.";
      
      if (error?.code === "NOT_AUTHORIZED" || errorCode === 1) {
        errorMessage = "위치 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.";
      } else if (error?.code === "POSITION_UNAVAILABLE" || errorCode === 2) {
        errorMessage = "위치 정보를 사용할 수 없습니다. GPS 신호를 확인해주세요.";
      } else if (error?.code === "TIMEOUT" || errorCode === 3) {
        errorMessage = "위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.";
      }

      console.error("위치 추적 오류:", error);
      
      // 에러 메시지는 한 번만 표시
      toast({
        title: "위치 추적 오류",
        description: errorMessage,
        variant: "destructive",
        duration: 5000, // 5초간 표시
      });
    };

    const startTracking = async () => {
      // 네이티브 플랫폼에서는 background-geolocation 사용
      if (Capacitor.isNativePlatform()) {
        try {
          const { BackgroundGeolocation } = await import("@capacitor-community/background-geolocation");
          
          watcherId = await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "위치 기반 알림을 위해 앱이 실행 중입니다.",
              backgroundTitle: "지도 리마인더",
              requestPermissions: true,
              stale: false,
              distanceFilter: 10, // 10미터 이동 시마다 갱신 (배터리 소모 조절)
            },
            (location, error) => {
              if (error) {
                handleLocationError(error);
                return;
              }
              
              if (location) {
                const accuracy = location.accuracy || 100;
                handleLocationUpdate(
                  location.latitude,
                  location.longitude,
                  accuracy
                );
              }
            }
          );
          
          console.log("Background geolocation watcher started:", watcherId);
        } catch (err) {
          console.error("Failed to start background geolocation, falling back to standard geolocation:", err);
          // Fallback to standard geolocation
          if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
              (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                handleLocationUpdate(latitude, longitude, accuracy);
              },
              handleLocationError,
              {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 15000,
              }
            );
          }
        }
      } else {
        // 웹에서는 기존 navigator.geolocation 사용
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              handleLocationUpdate(latitude, longitude, accuracy);
            },
            handleLocationError,
            {
              enableHighAccuracy: true,
              maximumAge: 10000,
              timeout: 15000,
            }
          );
        }
      }
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (watcherId !== null && Capacitor.isNativePlatform()) {
        // Background geolocation watcher 제거
        import("@capacitor-community/background-geolocation").then(({ BackgroundGeolocation }) => {
          BackgroundGeolocation.removeWatcher({ id: watcherId! }).catch(console.error);
        }).catch(console.error);
      }
    };
  }, [locationEnabled, notificationsEnabled, memos, proximityRadius, notifiedMemoIds, toast]);

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

      // Only notify for new memos that haven't been notified yet (자신이 작성한 메모도 포함)
      nearbyMemos.forEach((memo) => {
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
    [memos, notifiedMemoIds]
  );

  return {
    userLocation,
    setUserLocation,
    notifiedMemoIds,
  };
}

