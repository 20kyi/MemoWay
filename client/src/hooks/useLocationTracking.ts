import { useEffect, useState, useCallback, useRef } from "react";
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
  
  // 에러 메시지 중복 표시 방지
  const lastErrorTimeRef = useRef<number>(0);
  const lastErrorCodeRef = useRef<number | null>(null);
  const ERROR_THROTTLE_MS = 30000; // 30초 동안 같은 에러는 한 번만 표시

  // 통합된 위치 추적 (알림 및 위치 업데이트 모두 처리)
  useEffect(() => {
    if (!locationEnabled || !navigator.geolocation) return;

    let watchId: number | null = null;
    const DESIRED_ACCURACY = 100; // 정밀도 요구사항 완화 (30m -> 100m)

    const startTracking = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

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
        },
        (error) => {
          const now = Date.now();
          const errorCode = error.code;
          
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
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "위치 정보를 사용할 수 없습니다. GPS 신호를 확인해주세요.";
              break;
            case error.TIMEOUT:
              errorMessage = "위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.";
              break;
            default:
              errorMessage = "위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인하세요.";
          }

          console.error("위치 추적 오류:", error);
          
          // 에러 메시지는 한 번만 표시
          toast({
            title: "위치 추적 오류",
            description: errorMessage,
            variant: "destructive",
            duration: 5000, // 5초간 표시
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000, // 10초 이내 캐시된 위치 사용 가능
          timeout: 15000, // 타임아웃 15초로 증가
        }
      );
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
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

