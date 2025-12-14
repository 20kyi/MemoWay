/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, Filter, Users, User, Lock, Unlock, Edit, Trash2, Plus, MapPin, Save, Star } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";

interface GoogleMapViewProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
  memos: MemoWithDetails[];
  onMarkerClick: (memoId: string) => void;
  onClusterClick?: (memoIds: string[]) => void;
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (map: any) => void;
  onMyLocationClick?: (location: { lat: number; lng: number }) => void;
  pendingLocation?: { lat: number; lng: number } | null;
  groups?: GroupWithMembers[];
  selectedMarkerIcons?: string[];
  selectedGroupIds?: string[];
  onMarkerIconsChange?: (icons: string[]) => void;
  onGroupIdsChange?: (groupIds: string[]) => void;
  selectedMemo?: MemoWithDetails | null;
  memoDetailOpen?: boolean;
  onEditMemo?: (memoId: string) => void;
  onDeleteMemo?: (memoId: string) => void;
  onAddNewMemo?: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
  selectedMemoIdsForMap?: Set<string> | null;
  onSaveMap?: () => void;
  isActive?: boolean; // 지도 탭이 활성화되어 있는지 여부
}

const PERSONAL_MEMO_COLOR = '#9333ea';

interface MarkerData {
  marker: google.maps.Marker;
  memoIds: string[];
  color: string;
  count: number;
}

function GoogleMapViewComponent({ 
  onLocationSelect, 
  memos, 
  onMarkerClick, 
  onClusterClick, 
  userLocation, 
  onMapReady,
  onMyLocationClick,
  pendingLocation,
  groups = [],
  selectedMarkerIcons = ["all"],
  selectedGroupIds = ["all"],
  onMarkerIconsChange,
  onGroupIdsChange,
  selectedMemo = null,
  memoDetailOpen = false,
  onEditMemo,
  onDeleteMemo,
  onAddNewMemo,
  selectedMemoIdsForMap = null,
  onSaveMap,
  isActive = true, // 기본값은 true (항상 활성화된 것으로 간주)
}: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerData>>(new Map());
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLocked, setIsLocationLocked] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [isMarkerFilterOpen, setIsMarkerFilterOpen] = useState(false);
  const [isGroupFilterOpen, setIsGroupFilterOpen] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const errorToastShownRef = useRef(false); // 토스트 중복 표시 방지
  const isDraggingRef = useRef(false); // 드래그 상태 추적
  const lastDragEndTimeRef = useRef<number>(0); // 드래그 종료 시간 추적
  const isZoomingRef = useRef(false); // 줌 상태 추적
  const lastZoomEndTimeRef = useRef<number>(0); // 줌 종료 시간 추적
  const isMapInteractingRef = useRef(false); // 지도 조작 중 여부 (터치, 드래그, 핀치 줌 등)
  const touchHandlersRef = useRef<{ start: (() => void) | null; move: (() => void) | null; end: (() => void) | null }>({ start: null, move: null, end: null });
  const { toast } = useToast();
  const { t } = useLanguage();
  const { layoutTheme } = useLayoutTheme();
  const isCoupleTheme = layoutTheme === "couple-clay";
  const watchIdRef = useRef<number | null>(null);
  const lastActiveStateRef = useRef<boolean | null>(null); // 이전 활성화 상태 추적

  // 지도 탭이 활성화될 때 내 위치로 이동 (최적화: 빠른 응답)
  useEffect(() => {
    // 지도 탭이 비활성화에서 활성화로 변경되었을 때만 실행
    if (isActive && lastActiveStateRef.current === false && map && !pendingLocation) {
      let targetLocation: { lat: number; lng: number } | null = null;
      
      // 1순위: currentUserLocation (가장 빠름 - 이미 있음)
      if (currentUserLocation) {
        targetLocation = currentUserLocation;
      }
      // 2순위: userLocation prop (빠름 - 부모에서 전달)
      else if (userLocation) {
        targetLocation = userLocation;
      }
      
      // 위치가 있으면 즉시 이동
      if (targetLocation) {
        try {
          map.setCenter({ lat: targetLocation.lat, lng: targetLocation.lng });
          map.setZoom(15);
          // 위치 고정 모드 활성화
          setIsLocationLocked(true);
          // currentUserLocation이 없었으면 업데이트
          if (!currentUserLocation && userLocation) {
            setCurrentUserLocation(targetLocation);
          }
        } catch (error) {
          console.warn('지도 탭 활성화 시 내 위치 이동 실패:', error);
        }
      }
      // 위치가 없으면 GPS로 가져오기 (최적화: 빠른 응답을 위해 설정 조정)
      else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            try {
              map.setCenter({ lat, lng });
              map.setZoom(15);
              setCurrentUserLocation({ lat, lng });
              setIsLocationLocked(true);
              if (onMyLocationClick) {
                onMyLocationClick({ lat, lng });
              }
            } catch (error) {
              console.warn('지도 탭 활성화 시 내 위치 이동 실패:', error);
            }
          },
          (error) => {
            console.warn('지도 탭 활성화 시 위치 가져오기 실패:', error);
          },
          {
            enableHighAccuracy: false, // 빠른 응답을 위해 false (정확도보다 속도 우선)
            timeout: 3000, // 3초로 단축 (10초 -> 3초)
            maximumAge: 5000, // 5초 이내 캐시된 위치 사용 (즉시 응답)
          }
        );
      }
    }
    // 활성화 상태 업데이트
    lastActiveStateRef.current = isActive;
  }, [isActive, map, currentUserLocation, userLocation, pendingLocation, onMyLocationClick]);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current) return;
    
    // 에러 상태 초기화
    setMapError(null);

    loadGoogleMaps()
      .then((google) => {
        // 성공 시 에러 상태 제거
        setMapError(null);
        errorToastShownRef.current = false;
        
        const mapInstance = new google.maps.Map(mapRef.current!, {
          center: { lat: 37.5665, lng: 126.9780 }, // Seoul
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        });

        // 줌 시작/종료 이벤트 감지 (핀치 줌 감지용)
        mapInstance.addListener('zoom_changed', () => {
          isZoomingRef.current = true;
          isMapInteractingRef.current = true; // 지도 조작 중 플래그 설정
          lastZoomEndTimeRef.current = Date.now();
          // 줌 변경 후 짧은 시간 후에 줌 상태 해제
          setTimeout(() => {
            isZoomingRef.current = false;
            isMapInteractingRef.current = false;
          }, 200);
        });
        
        // 드래그 시작/종료 이벤트 감지
        mapInstance.addListener('dragstart', () => {
          isDraggingRef.current = true;
          isMapInteractingRef.current = true; // 지도 조작 중 플래그 설정
        });
        
        mapInstance.addListener('dragend', () => {
          lastDragEndTimeRef.current = Date.now();
          setTimeout(() => {
            isDraggingRef.current = false;
            isMapInteractingRef.current = false;
          }, 150);
        });
        
        setMap(mapInstance);

        if (onMapReady) {
          onMapReady(mapInstance);
        }
        
        // 터치 이벤트 감지 (모바일 핀치 줌용)
        const mapContainer = mapRef.current;
        
        if (mapContainer) {
          const touchStartHandler = () => {
            isMapInteractingRef.current = true;
          };
          
          const touchMoveHandler = () => {
            isMapInteractingRef.current = true;
          };
          
          const touchEndHandler = () => {
            setTimeout(() => {
              isMapInteractingRef.current = false;
            }, 200);
          };
          
          // 핸들러를 ref에 저장 (cleanup용)
          touchHandlersRef.current = {
            start: touchStartHandler,
            move: touchMoveHandler,
            end: touchEndHandler
          };
          
          mapContainer.addEventListener('touchstart', touchStartHandler, { passive: true });
          mapContainer.addEventListener('touchmove', touchMoveHandler, { passive: true });
          mapContainer.addEventListener('touchend', touchEndHandler, { passive: true });
        }

      // Map click handler
      mapInstance.addListener("click", async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;

        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        // Geocode to get address
        const geocoder = new google.maps.Geocoder();
        try {
          const result = await geocoder.geocode({ location: { lat, lng } });
          if (result.results[0]) {
            const address = result.results[0].formatted_address;
            const buildingName = result.results[0].address_components[0]?.long_name || '';
            onLocationSelect({ lat, lng, address, buildingName });
          } else {
            onLocationSelect({
              lat,
              lng,
              address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              buildingName: t.common.addressSearchPlaceholder,
            });
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          onLocationSelect({
            lat,
            lng,
            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            buildingName: t.common.addressSearchPlaceholder,
          });
        }
      });

      // Disable location lock on drag and track drag state
      mapInstance.addListener("dragstart", () => {
        isDraggingRef.current = true;
        if (isLocationLocked) {
          setIsLocationLocked(false);
        }
      });

      mapInstance.addListener("dragend", () => {
        // 드래그 종료 시간 기록
        lastDragEndTimeRef.current = Date.now();
        // 드래그 종료 후 약간의 지연을 두어 클릭 이벤트와 구분
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      });

      // Disable location lock on zoom
      mapInstance.addListener("zoom_changed", () => {
        if (isLocationLocked) {
          setIsLocationLocked(false);
        }
      });

      // Try to get high-precision GPS location (only if no pendingLocation)
      if (navigator.geolocation && !pendingLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            mapInstance.setCenter({ lat, lng });
            mapInstance.setZoom(15);
          },
          (error) => {
            console.log("GPS error:", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    }).catch((error) => {
      const errorMessage = error?.message || "Failed to load Google Maps. Please check your API key and billing settings.";
      
      // 에러 상태 저장
      setMapError(errorMessage);
      
      // 콘솔 에러는 한 번만 출력 (중복 방지)
      if (!errorToastShownRef.current) {
        console.error("Failed to load Google Maps:", errorMessage);
        
        // 사용자에게 토스트는 한 번만 표시
        errorToastShownRef.current = true;
        toast({
          title: t.toast.googleMapsLoadFailed,
          description: t.toast.googleMapsLoadFailedDesc,
          variant: "destructive",
          duration: 3000, // 3초간 표시
        });
      }
    });
    
    // Cleanup function for touch event listeners
    return () => {
      const mapContainer = mapRef.current;
      if (mapContainer && touchHandlersRef.current.start && touchHandlersRef.current.move && touchHandlersRef.current.end) {
        mapContainer.removeEventListener('touchstart', touchHandlersRef.current.start);
        mapContainer.removeEventListener('touchmove', touchHandlersRef.current.move);
        mapContainer.removeEventListener('touchend', touchHandlersRef.current.end);
        touchHandlersRef.current = { start: null, move: null, end: null };
      }
    };
  }, [toast]);

  // Watch user location
  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentUserLocation({ lat, lng });
        
        // pendingLocation이 있으면 자동 위치 이동을 막음
        // 드래그 중이거나 드래그 종료 후 2초 이내일 때는 자동 위치 이동을 막음 (사용자가 지도를 이동 중일 때 방해하지 않음)
        const timeSinceDragEnd = Date.now() - lastDragEndTimeRef.current;
        const isRecentlyDragged = timeSinceDragEnd < 2000; // 2초 이내
        
        if (isLocationLocked && !pendingLocation && !isDraggingRef.current && !isRecentlyDragged) {
          map.panTo({ lat, lng });
        }
        
        if (onMyLocationClick) {
          onMyLocationClick({ lat, lng });
        }
      },
      (error) => {
        console.log("Location tracking error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [map, isLocationLocked, onMyLocationClick, pendingLocation]);

  // pendingLocation 처리: 메모 위치로 정확히 이동
  useEffect(() => {
    if (pendingLocation && map) {
      // 위치 고정 모드 해제
      if (isLocationLocked) {
        setIsLocationLocked(false);
      }
      
      // 지도가 완전히 준비될 때까지 약간의 딜레이 후 정확한 위치로 이동
      const moveToPendingLocation = () => {
        try {
          // setCenter를 사용하여 정확히 중심으로 이동 (panTo 대신)
          map.setCenter({ lat: pendingLocation.lat, lng: pendingLocation.lng });
          map.setZoom(16); // 적절한 줌 레벨 설정
          
          console.log('✅ 메모 위치로 이동 완료:', { lat: pendingLocation.lat, lng: pendingLocation.lng });
        } catch (error) {
          console.error('❌ 지도 이동 실패:', error);
        }
      };
      
      // 지도 렌더링 완료를 보장하기 위한 딜레이
      const timeoutId = setTimeout(moveToPendingLocation, 100);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [pendingLocation, map, isLocationLocked]);

  // Update user marker (only when location is NOT locked)
  useEffect(() => {
    if (!map || !currentUserLocation || isLocationLocked) {
      if (userMarker) {
        userMarker.setMap(null);
        setUserMarker(null);
      }
      return;
    }

    loadGoogleMaps().then((google) => {
      // Remove old marker if exists
      if (userMarker) {
        userMarker.setMap(null);
      }

      // Create user location marker with User icon (same as Kakao Map)
      const marker = new google.maps.Marker({
        map,
        position: { lat: currentUserLocation.lat, lng: currentUserLocation.lng },
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#3b82f6"/>
              <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
              <g transform="translate(7, 7)">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="7" r="4" fill="none" stroke="#ffffff" stroke-width="2.5"/>
              </g>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
        zIndex: 1000,
      });

      setUserMarker(marker);
    });

    return () => {
      if (userMarker) {
        userMarker.setMap(null);
      }
    };
  }, [map, currentUserLocation, isLocationLocked]);

  // 필터링된 메모 목록을 useMemo로 최적화
  const filteredMemos = useMemo(() => {
    return memos.filter(memo => {
      const iconMatch = selectedMarkerIcons.includes("all") || selectedMarkerIcons.includes(memo.markerIcon);
      const groupMatch = selectedGroupIds.includes("all") || 
                        (memo.groupId ? selectedGroupIds.includes(memo.groupId) : selectedGroupIds.includes("personal"));
      const ratingMatch = (memo.rating || 0) >= minRating;
      return iconMatch && groupMatch && ratingMatch;
    });
  }, [memos, selectedMarkerIcons, selectedGroupIds, minRating]);

  // 위치별로 그룹화된 메모를 useMemo로 최적화
  const groupedMemos = useMemo(() => {
    const grouped = new Map<string, MemoWithDetails[]>();
    filteredMemos.forEach(memo => {
      const key = `${memo.latitude.toFixed(6)},${memo.longitude.toFixed(6)}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(memo);
    });
    return grouped;
  }, [filteredMemos]);

  // Update markers based on memos
  useEffect(() => {
    if (!map) return;

    const grouped = groupedMemos;

    loadGoogleMaps().then((google) => {
      const currentMarkers = markersRef.current;
      const newMarkerKeys = new Set<string>();

      grouped.forEach((clusterMemos, key) => {
        newMarkerKeys.add(key);
        
        const firstMemo = clusterMemos[0];
        const count = clusterMemos.length;

        // Determine marker color
        let markerColor = PERSONAL_MEMO_COLOR;
        if (firstMemo.groupId) {
          const group = groups.find(g => g.id === firstMemo.groupId);
          markerColor = group?.color || PERSONAL_MEMO_COLOR;
        }

        const existingMarkerData = currentMarkers.get(key);
        
        if (existingMarkerData) {
          const existingMarker = existingMarkerData.marker;
          const colorChanged = existingMarkerData.color !== markerColor;
          const countChanged = existingMarkerData.count !== count;
          
          // Only update icon if color or count changed (to prevent flickering)
          if (colorChanged || countChanged) {
            existingMarker.setIcon(count > 1 ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: markerColor,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            } : {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                        fill="${markerColor}" 
                        stroke="#ffffff" 
                        stroke-width="2"/>
                  <circle cx="15" cy="15" r="8" fill="#ffffff"/>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(30, 40),
              anchor: new google.maps.Point(15, 40),
            });
          }
          
          // Only update label if count changed
          if (countChanged) {
            existingMarker.setLabel(count > 1 ? {
              text: count.toString(),
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
            } : null);
          }
          
          // Update stored data
          existingMarkerData.color = markerColor;
          existingMarkerData.count = count;
          existingMarkerData.memoIds = clusterMemos.map(m => m.id);
          
          // Re-add click listener (always update this to ensure correct callback)
          google.maps.event.clearInstanceListeners(existingMarker);
          existingMarker.addListener('click', () => {
            // 드래그 중이거나 줌 중이면 클릭 이벤트 무시
            const timeSinceZoomEnd = Date.now() - lastZoomEndTimeRef.current;
            if (isDraggingRef.current || isZoomingRef.current || timeSinceZoomEnd < 300) {
              return;
            }
            if (count > 1 && onClusterClick) {
              onClusterClick(clusterMemos.map(m => m.id));
            } else {
              onMarkerClick(firstMemo.id);
            }
          });
        } else {
          // Create new marker
          const marker = new google.maps.Marker({
            map,
            position: { lat: firstMemo.latitude, lng: firstMemo.longitude },
            icon: count > 1 ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 20,
              fillColor: markerColor,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            } : {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                        fill="${markerColor}" 
                        stroke="#ffffff" 
                        stroke-width="2"/>
                  <circle cx="15" cy="15" r="8" fill="#ffffff"/>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(30, 40),
              anchor: new google.maps.Point(15, 40),
            },
            label: count > 1 ? {
              text: count.toString(),
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 'bold',
            } : undefined,
          });

          marker.addListener('click', () => {
            console.log('[GoogleMapView] 🎯 마커 클릭 이벤트 발생:', {
              memoId: firstMemo.id,
              count,
              isMapInteracting: isMapInteractingRef.current,
              isDragging: isDraggingRef.current,
              isZooming: isZoomingRef.current,
              timeSinceZoomEnd: Date.now() - lastZoomEndTimeRef.current,
              hasOnMarkerClick: !!onMarkerClick,
              hasOnClusterClick: !!onClusterClick,
            });
            
            // 지도 조작 중이면 마커 클릭 무시
            if (isMapInteractingRef.current) {
              console.log("[GoogleMapView] ⚠️ 지도 조작 중이므로 마커 클릭 무시");
              return;
            }
            
            // 드래그 중이거나 줌 중이면 클릭 이벤트 무시
            const timeSinceZoomEnd = Date.now() - lastZoomEndTimeRef.current;
            if (isDraggingRef.current || isZoomingRef.current || timeSinceZoomEnd < 300) {
              console.log("[GoogleMapView] ⚠️ 드래그/줌 중이므로 마커 클릭 무시:", {
                isDragging: isDraggingRef.current,
                isZooming: isZoomingRef.current,
                timeSinceZoomEnd,
              });
              return;
            }
            
            if (count > 1 && onClusterClick) {
              console.log('[GoogleMapView] ✅ onClusterClick 호출:', clusterMemos.map(m => m.id));
              onClusterClick(clusterMemos.map(m => m.id));
            } else {
              console.log('[GoogleMapView] ✅ onMarkerClick 호출:', firstMemo.id);
              if (onMarkerClick) {
                onMarkerClick(firstMemo.id);
              } else {
                console.warn('[GoogleMapView] ⚠️ onMarkerClick이 없습니다');
              }
            }
          });

          currentMarkers.set(key, {
            marker,
            memoIds: clusterMemos.map(m => m.id),
            color: markerColor,
            count,
          });
        }
      });

      // Remove markers that are no longer needed
      currentMarkers.forEach((markerData, key) => {
        if (!newMarkerKeys.has(key)) {
          markerData.marker.setMap(null);
          currentMarkers.delete(key);
        }
      });

      // 선택된 메모들만 표시할 때 bounds 조정 (메모 개수가 적을 때만)
      if (filteredMemos.length > 0 && filteredMemos.length <= 100) {
        try {
          const bounds = new google.maps.LatLngBounds();
          let hasValidBounds = false;
          
          filteredMemos.forEach(memo => {
            if (typeof memo.latitude === 'number' && typeof memo.longitude === 'number' &&
                !isNaN(memo.latitude) && !isNaN(memo.longitude) &&
                isFinite(memo.latitude) && isFinite(memo.longitude)) {
              bounds.extend({ lat: memo.latitude, lng: memo.longitude });
              hasValidBounds = true;
            }
          });
          
          if (hasValidBounds) {
            // 약간의 여백을 추가하기 위해 padding 설정
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
          }
        } catch (error) {
          console.warn('Bounds 조정 실패:', error);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      markersRef.current.forEach((markerData) => {
        markerData.marker.setMap(null);
      });
      markersRef.current.clear();
    };
  }, [map, groupedMemos, groups, onMarkerClick, onClusterClick, filteredMemos]);

  // Address search
  const handleSearch = async () => {
    if (!map || !searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const google = await loadGoogleMaps();
      
      // 방법 2: Geocoder API 폴백 함수 정의
      const fallbackToGeocoder = () => {
        try {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: searchQuery }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
              const location = results[0].geometry.location;
              map.setCenter(location);
              map.setZoom(16);
              
              toast({
                title: t.toast.searchComplete,
                description: t.toast.locationMoveComplete.replace('{query}', searchQuery),
              });
              
              setSearchQuery("");
            } else {
              // Geocoder도 실패한 경우
              let errorMessage = "주소를 찾을 수 없습니다";
              if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
                errorMessage = "검색 결과가 없습니다. 다른 키워드로 시도해주세요.";
              } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                errorMessage = "검색 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
              } else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
                errorMessage = "검색 요청이 거부되었습니다. Google Cloud Console에서 Geocoding API와 Places API를 활성화해주세요.";
              } else if (status === google.maps.GeocoderStatus.INVALID_REQUEST) {
                errorMessage = "검색어가 올바르지 않습니다.";
              }
              
              toast({
                title: t.toast.searchFailed,
                description: errorMessage || t.toast.searchFailedDesc,
                variant: "destructive",
              });
            }
            setIsSearching(false);
          });
        } catch (geocoderError) {
          console.error("Geocoding error:", geocoderError);
          toast({
            title: t.toast.searchError,
            description: t.toast.searchErrorPlaces,
            variant: "destructive",
          });
          setIsSearching(false);
        }
      };
      
      // 방법 1: Places API 사용 (더 정확하고 권장되는 방법)
      try {
        if (google.maps.places && google.maps.places.PlacesService) {
          const placesService = new google.maps.places.PlacesService(map);
          const request = {
            query: searchQuery,
            fields: ['geometry', 'formatted_address', 'name'],
          };

          // Places API의 findPlaceFromQuery 사용
          placesService.findPlaceFromQuery(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
              const place = results[0];
              if (place.geometry && place.geometry.location) {
                const location = place.geometry.location;
                map.setCenter(location);
                map.setZoom(16);
                
                toast({
                  title: t.toast.searchComplete,
                  description: t.toast.locationMoveComplete.replace('{query}', place.name || searchQuery),
                });
                
                setSearchQuery("");
                setIsSearching(false);
                return;
              }
            }
            
            // Places API 실패 시 Geocoder로 폴백
            fallbackToGeocoder();
          });
        } else {
          // Places API가 사용 불가능한 경우 바로 Geocoder 사용
          console.warn("Places API not available, using Geocoder");
          fallbackToGeocoder();
        }
      } catch (placesError) {
        console.warn("Places API error, falling back to Geocoder:", placesError);
        // Places API 실패 시 Geocoder로 폴백
        fallbackToGeocoder();
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: t.toast.searchError,
        description: t.toast.searchErrorDesc,
        variant: "destructive",
      });
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const toggleMapLock = () => {
    const newLockState = !isMapLocked;
    setIsMapLocked(newLockState);
    
    if (map) {
      map.setOptions({
        gestureHandling: newLockState ? 'none' : 'greedy',
        zoomControl: false,
      });
    }
    
    toast({
      title: newLockState ? t.toast.zoomLockEnabled : t.toast.zoomLockDisabled,
      description: newLockState 
        ? t.toast.zoomLockEnabledDesc
        : t.toast.zoomLockDisabledDesc,
    });
  };

  const handleMyLocation = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          // 적당한 줌 레벨로 설정 (줌 14: 시/군/구 단위, 줌 15: 동/면 단위)
          map.setZoom(14);
          map.setCenter({ lat, lng });
          
          if (onMyLocationClick) {
            onMyLocationClick({ lat, lng });
          }
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: t.toast.locationError,
            description: t.toast.currentLocationError,
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  };

  return (
    <div className="relative w-full h-full">
      {mapError ? (
        <div className="w-full h-full flex items-center justify-center bg-muted p-8 text-center">
          <div className="max-w-md">
            <h3 className="text-lg font-semibold mb-2 text-destructive">Google Maps를 불러올 수 없습니다</h3>
            <p className="text-muted-foreground mb-4">{mapError}</p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>해결 방법:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>프로젝트 루트에 <code className="bg-muted px-1 rounded">.env</code> 파일 생성</li>
                <li><code className="bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_api_key</code> 추가</li>
                <li>서버 재시작</li>
                <li>또는 카카오맵 사용 (설정에서 변경 가능)</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div 
          ref={mapRef} 
          className={`w-full h-full ${isCoupleTheme ? 'map-container-couple-theme' : ''}`} 
          data-testid="map-container" 
        />
      )}
      
      {/* 위치 고정 모드 상태 배너 */}
      {isLocationLocked && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+6.9rem)] left-1/2 -translate-x-1/2 z-50 pointer-events-none px-2">
          <div 
            className="relative text-white rounded-2xl flex items-center whitespace-nowrap overflow-hidden px-4 py-2.5 sm:px-5 sm:py-3 gap-2.5 sm:gap-3"
            style={{
              background: '#8fa0d8',
              boxShadow: `
                0 6px 12px -3px rgba(120, 139, 200, 0.35),
                0 3px 6px -2px rgba(120, 139, 200, 0.25),
                inset 0 1px 2px rgba(255, 255, 255, 0.4),
                inset 0 -1px 3px rgba(90, 110, 180, 0.35)
              `,
              transform: 'translateY(-1px)',
            }}
          >
            {/* 볼록한 느낌을 위한 방사형 그라데이션 - 상단 중앙이 약간 밝음 (너무 밝지 않게) */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 110% 70% at 50% 25%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 25%, transparent 55%)',
              }}
            />
            {/* 가장자리 어둡게 - 특히 하단 */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 130% 90% at 50% 50%, transparent 45%, rgba(90, 110, 180, 0.25) 75%, rgba(70, 90, 160, 0.4) 100%)',
              }}
            />
            {/* 하단 가장자리 더 어둡게 */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(70, 90, 160, 0.3) 0%, transparent 35%)',
              }}
            />
            <Lock 
              className="flex-shrink-0 relative z-10 h-4 w-4 sm:h-5 sm:w-5"
              style={{ 
                filter: 'drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.25))',
              }} 
            />
            <span 
              className="font-medium leading-tight relative z-10 text-[12px] sm:text-[13px] md:text-[14px]"
              style={{ 
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                letterSpacing: '0.01em',
              }}
            >
              {t.common.locationLockModeActive}
            </span>
          </div>
        </div>
      )}
      
      {/* 지도 저장하기 버튼 (선택된 메모가 있을 때만 표시) */}
      {selectedMemoIdsForMap && selectedMemoIdsForMap.size > 0 && onSaveMap && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+6rem)] left-1/2 -translate-x-1/2 z-50 px-2">
          <button
            onClick={onSaveMap}
            className="relative text-white rounded-2xl flex items-center whitespace-nowrap overflow-hidden px-4 py-2.5 sm:px-5 sm:py-3 gap-2.5 sm:gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{
              background: '#a78bfa',
              boxShadow: `
                0 6px 12px -3px rgba(139, 92, 246, 0.35),
                0 3px 6px -2px rgba(139, 92, 246, 0.25),
                inset 0 1px 2px rgba(255, 255, 255, 0.4),
                inset 0 -1px 3px rgba(109, 40, 217, 0.35)
              `,
              transform: 'translateY(-1px)',
            }}
          >
            {/* 볼록한 느낌을 위한 방사형 그라데이션 - 상단 중앙이 약간 밝음 (너무 밝지 않게) */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 110% 70% at 50% 25%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 25%, transparent 55%)',
              }}
            />
            {/* 가장자리 어둡게 - 특히 하단 */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 130% 90% at 50% 50%, transparent 45%, rgba(109, 40, 217, 0.25) 75%, rgba(88, 28, 135, 0.4) 100%)',
              }}
            />
            {/* 하단 가장자리 더 어둡게 */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(88, 28, 135, 0.3) 0%, transparent 35%)',
              }}
            />
            <Save 
              className="flex-shrink-0 relative z-10 h-4 w-4 sm:h-5 sm:w-5"
              style={{ 
                filter: 'drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.25))',
              }} 
            />
            <span 
              className="font-medium leading-tight relative z-10 text-[12px] sm:text-[13px] md:text-[14px]"
              style={{ 
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                letterSpacing: '0.01em',
              }}
            >
              지도 저장하기
            </span>
          </button>
        </div>
      )}
      
      {/* Fixed center marker (location lock mode) */}
      {isLocationLocked && currentUserLocation && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
          style={{ marginTop: '-16px' }}
        >
          <div style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#3b82f6',
            borderRadius: '50%',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}>
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}

      {/* MemoWay 로고 - 커플 테마에서만 표시 */}
      {isCoupleTheme && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+2rem)] sm:top-[calc(env(safe-area-inset-top)+2.5rem)] left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 sm:gap-4 whitespace-nowrap">
          <div className="relative flex-shrink-0">
            <MapPin className="h-8 w-8 sm:h-14 sm:w-14 text-[#A28DB3] drop-shadow-md" fill="currentColor" />
          </div>
          <span className="text-3xl sm:text-5xl font-bold text-[#A28DB3] tracking-tight drop-shadow-md">
            Memo Way
          </span>
        </div>
      )}

      {/* 주소 검색 바 */}
      <div className={`absolute ${isCoupleTheme ? 'top-[calc(env(safe-area-inset-top)+1.9rem)] sm:top-[calc(env(safe-area-inset-top)+1.9rem)]' : 'top-[calc(env(safe-area-inset-top)+1.9rem)]'} ${isCoupleTheme ? 'left-3 right-3' : 'left-4 right-4'} z-10`}>
        <div className={isCoupleTheme
          ? "search-bar-couple-theme flex gap-2 p-2"
          : "flex gap-2 p-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-border"
        }>
          <div className="relative flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder={t.common.addressSearchPlaceholder}
              className="pr-10 border-0 focus-visible:ring-0 bg-transparent"
              disabled={isSearching}
              data-testid="input-address-search"
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleClearSearch}
                data-testid="button-clear-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            size="icon"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="h-10 w-10 flex-shrink-0"
            data-testid="button-search-address"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Marker Filter Dialog */}
      <Dialog open={isMarkerFilterOpen} onOpenChange={setIsMarkerFilterOpen}>
        <DialogContent className="rounded-3xl max-h-[85vh] flex flex-col" data-testid="dialog-marker-filter">
          <DialogHeader>
            <DialogTitle>{t.common.markerFilter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto p-1">
            {/* Rating Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t.common.minRating}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => setMinRating(0)}
                  disabled={minRating === 0}
                >
                  {t.common.resetFilter}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setMinRating(star === minRating ? 0 : star)}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= minRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {minRating > 0 
                  ? t.common.ratingAbove.replace("{rating}", minRating.toString())
                  : t.common.showAllResults}
              </p>
            </div>

            {/* Marker Icon Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t.common.markerFilter}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => onMarkerIconsChange?.(["all"])}
                  disabled={selectedMarkerIcons.includes("all") && selectedMarkerIcons.length === 1}
                >
                  {t.common.resetFilter}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
            {["all", "default", "travel", "love", "food", "cafe", "shopping", "sport", "work"].map((icon) => (
              <div key={icon} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`marker-${icon}`}
                  checked={selectedMarkerIcons.includes(icon)}
                  onCheckedChange={(checked) => {
                    if (onMarkerIconsChange) {
                      if (icon === "all") {
                        onMarkerIconsChange(checked ? ["all"] : []);
                      } else {
                        const newIcons = checked
                          ? [...selectedMarkerIcons.filter(i => i !== "all"), icon]
                          : selectedMarkerIcons.filter(i => i !== icon);
                        onMarkerIconsChange(newIcons.length === 0 ? ["all"] : newIcons);
                      }
                    }
                  }}
                  data-testid={`checkbox-marker-${icon}`}
                />
                <label htmlFor={`marker-${icon}`} className="cursor-pointer text-sm flex-1">
                  {t.categories[icon as keyof typeof t.categories]}
                </label>
              </div>
            ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Filter Dialog */}
      <Dialog open={isGroupFilterOpen} onOpenChange={setIsGroupFilterOpen}>
        <DialogContent className="rounded-3xl max-h-[85vh] flex flex-col" data-testid="dialog-group-filter">
          <DialogHeader>
            <DialogTitle>{t.common.groupFilter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto p-1">
            {/* Rating Filter (Shared) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t.common.minRating}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => setMinRating(0)}
                  disabled={minRating === 0}
                >
                  {t.common.resetFilter}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setMinRating(star === minRating ? 0 : star)}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= minRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {minRating > 0 
                  ? t.common.ratingAbove.replace("{rating}", minRating.toString())
                  : t.common.showAllResults}
              </p>
            </div>

            {/* Group List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t.common.groupFilter}</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => onGroupIdsChange?.(["all"])}
                  disabled={selectedGroupIds.includes("all") && selectedGroupIds.length === 1}
                >
                  {t.common.resetFilter}
                </Button>
              </div>
              <div className="space-y-2">
            <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                id="group-all"
                checked={selectedGroupIds.includes("all")}
                onCheckedChange={(checked) => {
                  if (onGroupIdsChange) {
                    onGroupIdsChange(checked ? ["all"] : []);
                  }
                }}
                data-testid="checkbox-group-all"
              />
              <label htmlFor="group-all" className="cursor-pointer text-sm flex-1">
                {t.categories.all}
              </label>
            </div>
            <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                id="group-personal"
                checked={selectedGroupIds.includes("personal")}
                onCheckedChange={(checked) => {
                  if (onGroupIdsChange) {
                    const newIds = checked
                      ? [...selectedGroupIds.filter(i => i !== "all"), "personal"]
                      : selectedGroupIds.filter(i => i !== "personal");
                    onGroupIdsChange(newIds.length === 0 ? ["all"] : newIds);
                  }
                }}
                data-testid="checkbox-group-personal"
              />
              <label htmlFor="group-personal" className="cursor-pointer text-sm flex-1">
                {t.common.personal}
              </label>
            </div>
            {groups.map((group) => (
              <div key={group.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`group-${group.id}`}
                  checked={selectedGroupIds.includes(group.id)}
                  onCheckedChange={(checked) => {
                    if (onGroupIdsChange) {
                      const newIds = checked
                        ? [...selectedGroupIds.filter(i => i !== "all"), group.id]
                        : selectedGroupIds.filter(i => i !== group.id);
                      onGroupIdsChange(newIds.length === 0 ? ["all"] : newIds);
                    }
                  }}
                  data-testid={`checkbox-group-${group.id}`}
                />
                <label htmlFor={`group-${group.id}`} className="cursor-pointer flex items-center gap-2 text-sm flex-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                  {group.name}
                </label>
              </div>
            ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* 플로팅 필터 버튼들 (오른쪽 하단) */}
        <div className={`${isCoupleTheme ? 'absolute bottom-[10rem] right-4' : 'fixed bottom-[7rem] right-4'} flex flex-col ${isCoupleTheme ? 'gap-3' : 'gap-2'} z-50`}>
            {/* 지도 확대/축소 잠금 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={toggleMapLock}
                  className={`${isCoupleTheme ? 'h-[60px] w-[60px]' : 'h-10 w-10'} ${isCoupleTheme ? 'rounded-full' : 'rounded-lg'} shadow-lg transition-all hover:shadow-xl ${
                    isMapLocked 
                      ? 'bg-destructive hover:bg-destructive/90 border-2 border-destructive' 
                      : 'bg-primary hover:bg-primary/90 border-2 border-primary'
                  }`}
                  style={isCoupleTheme && !isMapLocked ? {
                    backgroundColor: '#EE88A1',
                    borderColor: '#EE88A1',
                    boxShadow: `
                      inset 0 1px 2px rgba(255, 255, 255, 0.5),
                      0 4px 8px rgba(240, 120, 150, 0.25),
                      0 0 30px rgba(0, 0, 0, 0.10)
                    `,
                  } : undefined}
                  data-testid="button-map-lock"
                >
                  {isMapLocked ? (
                    <Lock className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} text-primary-foreground`} />
                  ) : (
                    <Unlock className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} ${isCoupleTheme ? 'text-white' : 'text-primary-foreground'}`} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isMapLocked ? "확대/축소 잠금 해제" : "확대/축소 잠금"}</p>
              </TooltipContent>
            </Tooltip>

            {/* 위치 고정 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => {
                    const newLockState = !isLocationLocked;
                    setIsLocationLocked(newLockState);
                    
                    if (newLockState && map && currentUserLocation) {
                      // 적당한 줌 레벨로 설정 (줌 14: 시/군/구 단위, 줌 15: 동/면 단위)
                      map.setZoom(14);
                      map.panTo(currentUserLocation);
                    }
                    
                    toast({
                      title: newLockState ? t.toast.locationLockEnabled : t.toast.locationLockDisabled,
                      description: newLockState 
                        ? t.toast.locationLockEnabledDesc
                        : t.toast.locationLockDisabledDesc,
                    });
                  }}
                  className={`${isCoupleTheme ? 'h-[60px] w-[60px]' : 'h-10 w-10'} ${isCoupleTheme ? 'rounded-full' : 'rounded-lg'} shadow-lg transition-all hover:shadow-xl relative ${
                    isLocationLocked 
                      ? 'bg-primary hover:bg-primary/90 border-2 border-primary' 
                      : 'bg-muted hover:bg-muted/80 border-2 border-border'
                  }`}
                  style={isCoupleTheme ? {
                    backgroundColor: isLocationLocked ? '#EE88A1' : '#FFE4E9',
                    borderColor: isLocationLocked ? '#EE88A1' : '#FFE4E9',
                    boxShadow: `
                      inset 0 1px 2px rgba(255, 255, 255, 0.5),
                      0 4px 8px rgba(240, 120, 150, 0.25),
                      0 0 30px rgba(0, 0, 0, 0.10)
                    `,
                  } : undefined}
                  data-testid="button-location-lock"
                >
                  {isLocationLocked ? (
                    <Lock className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} ${isCoupleTheme ? 'text-white' : 'text-primary-foreground'}`} />
                  ) : (
                    <Unlock className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} ${isCoupleTheme ? 'text-[#EE88A1]' : 'text-muted-foreground'}`} />
                  )}
                  {/* 상태 표시 점 */}
                  {isLocationLocked && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 border-2 border-white rounded-full animate-pulse" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="font-medium">{isLocationLocked ? "위치 고정 해제" : "위치 고정"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLocationLocked 
                    ? "내 위치가 화면 중앙에 고정됩니다" 
                    : "내 위치를 화면 중앙에 고정합니다"}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* 그룹 필터 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={`${isCoupleTheme ? 'h-[60px] w-[60px]' : 'h-10 w-10'} ${isCoupleTheme ? 'rounded-full' : 'rounded-lg'} shadow-lg relative overflow-visible transition-all hover:shadow-xl ${
                    selectedGroupIds.includes("all") ? 'bg-primary hover:bg-primary/90 border-2 border-primary' : ''
                  }`}
                  onClick={() => setIsGroupFilterOpen(true)}
                  data-testid="button-group-filter"
                  style={(() => {
                    const baseShadow = isCoupleTheme ? `
                      inset 0 1px 2px rgba(255, 255, 255, 0.5),
                      0 4px 8px rgba(240, 120, 150, 0.25),
                      0 0 30px rgba(0, 0, 0, 0.10)
                    ` : undefined;

                    if (isCoupleTheme && selectedGroupIds.includes("all")) {
                      return {
                        backgroundColor: '#EE88A1',
                        borderColor: '#EE88A1',
                        boxShadow: baseShadow,
                      };
                    }
                    if (selectedGroupIds.includes("all")) return {};
                    
                    const colors: string[] = [];
                    selectedGroupIds.forEach(id => {
                      if (id === "personal") {
                        colors.push(PERSONAL_MEMO_COLOR);
                      } else {
                        const group = groups.find(g => g.id === id);
                        if (group) colors.push(group.color);
                      }
                    });

                    if (colors.length === 0) {
                      return isCoupleTheme ? { boxShadow: baseShadow } : {};
                    }
                    if (colors.length === 1) {
                      return {
                        backgroundColor: colors[0],
                        borderColor: colors[0],
                        ...(isCoupleTheme ? { boxShadow: baseShadow } : {})
                      };
                    }

                    const step = 100 / colors.length;
                    const gradientStops = colors.map((color, index) => {
                      const start = index * step;
                      const end = (index + 1) * step;
                      return `${color} ${start}%, ${color} ${end}%`;
                    }).join(', ');

                    return {
                      background: `linear-gradient(135deg, ${gradientStops})`,
                      borderColor: colors[0],
                      ...(isCoupleTheme ? { boxShadow: baseShadow } : {})
                    };
                  })()}
                >
                  <Users className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} ${
                    selectedGroupIds.includes("all") ? (isCoupleTheme ? 'text-white' : 'text-primary-foreground') : ''
                  }`} style={{
                    color: selectedGroupIds.includes("all") ? undefined : 'white',
                    filter: selectedGroupIds.includes("all") ? undefined : 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                  }} />
                  {!selectedGroupIds.includes("all") && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] bg-white text-black border-2 border-white"
                      data-testid="badge-group-filter-count"
                    >
                      {selectedGroupIds.filter(id => id !== "all").length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{t.common.groupFilter}</p>
              </TooltipContent>
            </Tooltip>

            {/* 마커 필터 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={`${isCoupleTheme ? 'h-[60px] w-[60px]' : 'h-10 w-10'} ${isCoupleTheme ? 'rounded-full' : 'rounded-lg'} shadow-lg relative hover:shadow-xl transition-all bg-primary hover:bg-primary/90 border-2 border-primary`}
                  style={isCoupleTheme ? {
                    backgroundColor: '#EE88A1',
                    borderColor: '#EE88A1',
                    boxShadow: `
                      inset 0 1px 2px rgba(255, 255, 255, 0.5),
                      0 4px 8px rgba(240, 120, 150, 0.25),
                      0 0 30px rgba(0, 0, 0, 0.10)
                    `,
                  } : undefined}
                  onClick={() => setIsMarkerFilterOpen(true)}
                  data-testid="button-marker-filter"
                >
                  <Filter className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} ${isCoupleTheme ? 'text-white' : 'text-primary-foreground'}`} />
                  {!selectedMarkerIcons.includes("all") && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] bg-white text-black border-2 border-white"
                      data-testid="badge-marker-filter-count"
                    >
                      {selectedMarkerIcons.filter(icon => icon !== "all").length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{t.common.markerFilter}</p>
              </TooltipContent>
            </Tooltip>
        </div>
    </div>
  );
}

// React.memo로 메모이제이션하여 불필요한 리렌더링 방지
export const GoogleMapView = memo(GoogleMapViewComponent);
