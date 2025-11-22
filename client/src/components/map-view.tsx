import { useEffect, useRef, useState, useMemo } from "react";
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
import { Navigation, Search, X, Send, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Dumbbell, Briefcase, Filter, Users, User, Lock, Unlock } from "lucide-react";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";

interface MapViewProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
  memos: MemoWithDetails[];
  onMarkerClick: (memoId: string) => void;
  onClusterClick?: (memoIds: string[]) => void;
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (map: any) => void;
  onMyLocationClick?: (location: { lat: number; lng: number }) => void;
  groups?: GroupWithMembers[];
  selectedMarkerIcons?: string[];
  selectedGroupIds?: string[];
  onMarkerIconsChange?: (icons: string[]) => void;
  onGroupIdsChange?: (groupIds: string[]) => void;
}

const PERSONAL_MEMO_COLOR = '#9333ea';

interface MemoCluster {
  key: string;
  memos: MemoWithDetails[];
  lat: number;
  lng: number;
}

function groupMemosByLocation(memos: MemoWithDetails[]): MemoCluster[] {
  const grouped = new Map<string, MemoWithDetails[]>();
  
  memos.forEach(memo => {
    const lat = memo.latitude.toFixed(6);
    const lng = memo.longitude.toFixed(6);
    const key = `${lat},${lng}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(memo);
  });
  
  return Array.from(grouped.entries()).map(([key, clusterMemos]) => ({
    key,
    memos: clusterMemos,
    lat: clusterMemos[0].latitude,
    lng: clusterMemos[0].longitude,
  }));
}

function getMarkerIconPath(iconType: string): string {
  switch (iconType) {
    case 'travel':
      return 'M12 2L10.5 6H6l4 3.5L8 15l4-2.5L16 15l-2-5.5L18 6h-4.5L12 2z M15 17v6h-3v-6h3z';
    case 'love':
      return 'M15 20c-3.9-3.5-7-6.3-7-9.5C8 8 9.8 6 12 6c1.1 0 2.2.5 3 1.3C15.8 6.5 16.9 6 18 6c2.2 0 4 1.8 4 4.5 0 3.2-3.1 6-7 9.5z';
    case 'food':
      return 'M13 3v8h-2V3h2z M19 3v4c0 2.2-1.8 4-4 4v14h-2V11c-2.2 0-4-1.8-4-4V3h2v4c0 1.1.9 2 2 2s2-.9 2-2V3h2z';
    case 'cafe':
      return 'M20 8h-3V4H7v10c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4v-2h3c1.1 0 2-.9 2-2s-.9-2-2-2zM20 10h-3V10h3z M7 22h12v2H7z';
    case 'shopping':
      return 'M19 6h-2c0-2.8-2.2-5-5-5S7 3.2 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM12 3c1.7 0 3 1.3 3 3H9c0-1.7 1.3-3 3-3z';
    case 'sport':
      return 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z';
    case 'work':
      return 'M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM14 7h-4V5h4v2z';
    default:
      return 'M15 12c0 1.7-1.3 3-3 3s-3-1.3-3-3 1.3-3 3-3 3 1.3 3 3z';
  }
}

function createMarkerContent(color: string, iconType: string = 'default', photoUrl?: string, scale: number = 1): string {
  const iconPath = getMarkerIconPath(iconType);
  const width = 30 * scale;
  const height = 40 * scale;
  
  // If photo is provided, create photo marker
  if (photoUrl) {
    const clipId = `photoClip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return `
      <div 
        style="
          position: relative;
          width: ${width}px;
          height: ${height}px;
          cursor: pointer;
        "
        data-marker-icon="${iconType}"
        aria-label="${iconType} 마커"
      >
        <svg width="${width}" height="${height}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
          <defs>
            <clipPath id="${clipId}">
              <circle cx="15" cy="15" r="8"/>
            </clipPath>
          </defs>
          <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                fill="${color}" 
                stroke="#ffffff" 
                stroke-width="2"/>
          <circle cx="15" cy="15" r="8.5" fill="#ffffff"/>
          <image href="${photoUrl}" x="7" y="7" width="16" height="16" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
        </svg>
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer;" data-click-area="true"></div>
      </div>
    `;
  }
  
  // Icon marker (no photo)
  return `
    <div 
      style="
        position: relative;
        width: ${width}px;
        height: ${height}px;
        cursor: pointer;
      "
      data-marker-icon="${iconType}"
      aria-label="${iconType} 마커"
    >
      <svg width="${width}" height="${height}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
              fill="${color}" 
              stroke="#ffffff" 
              stroke-width="2"/>
        <circle cx="15" cy="15" r="8" fill="#ffffff"/>
        <g transform="translate(6, 6)" fill="${color}">
          <path d="${iconPath}" />
        </g>
      </svg>
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer;" data-click-area="true"></div>
    </div>
  `;
}

function createClusterMarkerContent(color: string, count: number, iconType: string = 'default', photoUrl?: string, scale: number = 1): string {
  const iconPath = getMarkerIconPath(iconType);
  const width = 30 * scale;
  const height = 40 * scale;
  const badgeSize = 20 * scale;
  const fontSize = 10 * scale;
  const badgeTop = -7 * scale;
  const badgeRight = -7 * scale;
  
  // If photo is provided, create photo marker with count badge
  if (photoUrl) {
    const clipId = `photoClipCluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return `
      <div 
        style="
          position: relative;
          width: ${width}px;
          height: ${height}px;
          cursor: pointer;
        "
        data-marker-icon="${iconType}"
        data-marker-count="${count}"
        aria-label="${iconType} 마커 클러스터 (${count}개)"
      >
        <svg width="${width}" height="${height}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
          <defs>
            <clipPath id="${clipId}">
              <circle cx="15" cy="15" r="8"/>
            </clipPath>
          </defs>
          <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                fill="${color}" 
                stroke="#ffffff" 
                stroke-width="2"/>
          <circle cx="15" cy="15" r="8.5" fill="#ffffff"/>
          <image href="${photoUrl}" x="7" y="7" width="16" height="16" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>
        </svg>
        <div style="
          position: absolute;
          top: ${badgeTop}px;
          right: ${badgeRight}px;
          background-color: #ef4444;
          color: white;
          border-radius: 50%;
          width: ${badgeSize}px;
          height: ${badgeSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          font-weight: bold;
          border: ${2 * scale}px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          pointer-events: none;
        ">${count}</div>
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer;" data-click-area="true"></div>
      </div>
    `;
  }
  
  return `
    <div 
      style="
        position: relative;
        width: ${width}px;
        height: ${height}px;
        cursor: pointer;
      "
      data-marker-icon="${iconType}"
      data-marker-count="${count}"
      aria-label="${iconType} 마커 클러스터 (${count}개)"
    >
      <svg width="${width}" height="${height}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
              fill="${color}" 
              stroke="#ffffff" 
              stroke-width="2"/>
        <circle cx="15" cy="15" r="8" fill="#ffffff"/>
        <g transform="translate(6, 6)" fill="${color}">
          <path d="${iconPath}" />
        </g>
      </svg>
      <div style="
        position: absolute;
        top: ${badgeTop}px;
        right: ${badgeRight}px;
        background-color: #ef4444;
        color: white;
        border-radius: 50%;
        width: ${badgeSize}px;
        height: ${badgeSize}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        font-weight: bold;
        border: ${2 * scale}px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        pointer-events: none;
      ">${count}</div>
      <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer;" data-click-area="true"></div>
    </div>
  `;
}

function createSearchMarkerContent(): string {
  return `
    <div style="
      position: relative;
      width: 40px;
      height: 50px;
      animation: bounce 1s ease-in-out 3;
    ">
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
          </filter>
        </defs>
        <path d="M20 0C11.163 0 4 7.163 4 16c0 12 16 34 16 34s16-22 16-34C36 7.163 28.837 0 20 0z" 
              fill="#ef4444" 
              stroke="#ffffff" 
              stroke-width="3"
              filter="url(#shadow)"/>
        <circle cx="20" cy="16" r="7" fill="#ffffff"/>
        <circle cx="20" cy="16" r="4" fill="#ef4444"/>
      </svg>
    </div>
    <style>
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    </style>
  `;
}

const MARKER_ICON_COMPONENTS = {
  default: MapPin,
  travel: Plane,
  love: Heart,
  food: Utensils,
  cafe: Coffee,
  shopping: ShoppingBag,
  sport: Dumbbell,
  work: Briefcase,
};

export function MapView({ 
  onLocationSelect, 
  memos, 
  onMarkerClick, 
  onClusterClick, 
  userLocation, 
  onMapReady,
  onMyLocationClick,
  groups = [],
  selectedMarkerIcons = ["all"],
  selectedGroupIds = ["all"],
  onMarkerIconsChange,
  onGroupIdsChange
}: MapViewProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [searchMarker, setSearchMarker] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [markerScale, setMarkerScale] = useState(1);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLocked, setIsLocationLocked] = useState(true); // 위치 고정 모드 (기본값: true)
  const markerClickedRef = useRef(false);
  const isMapInteractingRef = useRef(false); // 지도 조작 중 플래그 (드래그/줌)
  const [markerFilterOpen, setMarkerFilterOpen] = useState(false);
  const [groupFilterOpen, setGroupFilterOpen] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Filter memos based on selected marker icons and groups
  const filteredMemos = useMemo(() => {
    let filtered = memos;

    // Filter by marker icon
    if (!selectedMarkerIcons.includes("all")) {
      filtered = filtered.filter(memo => selectedMarkerIcons.includes(memo.markerIcon));
    }

    // Filter by group
    if (!selectedGroupIds.includes("all")) {
      filtered = filtered.filter(memo => {
        if (selectedGroupIds.includes("personal") && !memo.groupId) {
          return true;
        }
        if (memo.groupId && selectedGroupIds.includes(memo.groupId)) {
          return true;
        }
        return false;
      });
    }

    return filtered;
  }, [memos, selectedMarkerIcons, selectedGroupIds]);

  // Cleanup search marker when component unmounts
  useEffect(() => {
    return () => {
      if (searchMarker) {
        searchMarker.setMap(null);
      }
    };
  }, [searchMarker]);

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current) return;

    loadKakaoMaps()
      .then(() => {
        if (!mapRef.current || !window.kakao?.maps) return;

        const container = mapRef.current;
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3,
        };

        const kakaoMap = new window.kakao.maps.Map(container, options);
        setMap(kakaoMap);
        
        // Notify parent that map is ready
        if (onMapReady) {
          onMapReady(kakaoMap);
        }
      })
      .catch((error) => {
        console.error("Failed to load Kakao Maps:", error);
        setMapError("지도를 불러올 수 없습니다. API 키를 확인해주세요.");
      });
  }, []);

  // Auto-move to user location when map first loads
  const hasMovedToUserLocationRef = useRef(false);
  const gpsAttemptCountRef = useRef(0);
  const MAX_GPS_ATTEMPTS = 3;
  const DESIRED_ACCURACY = 30; // meters

  useEffect(() => {
    if (!map || hasMovedToUserLocationRef.current) return;

    const tryGetAccuratePosition = () => {
      if (navigator.geolocation && gpsAttemptCountRef.current < MAX_GPS_ATTEMPTS) {
        gpsAttemptCountRef.current += 1;
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const accuracy = position.coords.accuracy;
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            console.log(`GPS 시도 ${gpsAttemptCountRef.current}/${MAX_GPS_ATTEMPTS}: 정밀도 ${Math.round(accuracy)}m`);
            
            // 정밀도가 30m 이하인 경우에만 사용
            if (accuracy <= DESIRED_ACCURACY) {
              const latlng = new window.kakao.maps.LatLng(lat, lng);
              map.setCenter(latlng);
              map.setLevel(3);
              hasMovedToUserLocationRef.current = true;
              
              console.log(`정확한 위치 획득: ${Math.round(accuracy)}m 정밀도`);
              
              // Also notify parent about user location
              if (onMyLocationClick) {
                onMyLocationClick({ lat, lng });
              }
            } else if (gpsAttemptCountRef.current < MAX_GPS_ATTEMPTS) {
              // 정밀도가 충분하지 않으면 다시 시도
              console.log(`정밀도 부족(${Math.round(accuracy)}m > 30m), 재시도...`);
              setTimeout(tryGetAccuratePosition, 1000);
            } else {
              // 최대 시도 횟수 도달, 현재 위치라도 사용
              console.log(`최대 시도 횟수 도달, 현재 위치 사용: ${Math.round(accuracy)}m 정밀도`);
              const latlng = new window.kakao.maps.LatLng(lat, lng);
              map.setCenter(latlng);
              map.setLevel(3);
              hasMovedToUserLocationRef.current = true;
              
              if (onMyLocationClick) {
                onMyLocationClick({ lat, lng });
              }
            }
          },
          (error) => {
            console.log("위치 정보를 가져올 수 없습니다:", error);
            // If geolocation fails and we have userLocation, use it
            if (userLocation && !hasMovedToUserLocationRef.current) {
              const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
              map.setCenter(position);
              map.setLevel(3);
              hasMovedToUserLocationRef.current = true;
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000, // 10초로 증가
            maximumAge: 0,
          }
        );
      } else if (userLocation && !hasMovedToUserLocationRef.current) {
        // Fallback to userLocation prop if geolocation not available
        const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
        map.setCenter(position);
        map.setLevel(3);
        hasMovedToUserLocationRef.current = true;
      }
    };

    tryGetAccuratePosition();
  }, [map, userLocation, onMyLocationClick]);

  // Update marker scale based on zoom level
  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    const updateScale = () => {
      const level = map.getLevel();
      // Scale formula: larger at zoom in (smaller level), smaller at zoom out (larger level)
      // level 3 is baseline (scale = 1.0)
      // Minimum scale of 1.0 ensures markers are never smaller than 30px
      const scale = Math.max(1.0, Math.pow(1.3, (3 - level)));
      setMarkerScale(scale);
    };

    // Set initial scale
    updateScale();

    // Listen to zoom changes
    window.kakao.maps.event.addListener(map, 'zoom_changed', updateScale);

    return () => {
      window.kakao.maps.event.removeListener(map, 'zoom_changed', updateScale);
    };
  }, [map]);

  // Detect user dragging the map and disable location lock
  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    const handleDragStart = () => {
      // User is manually dragging the map, disable location lock
      if (isLocationLocked) {
        setIsLocationLocked(false);
      }
      // Set interaction flag to prevent click events during drag
      isMapInteractingRef.current = true;
    };

    const handleDragEnd = () => {
      // Clear interaction flag after a short delay to prevent click events right after drag
      setTimeout(() => {
        isMapInteractingRef.current = false;
      }, 300);
    };

    const handleZoomStart = () => {
      // User is manually zooming the map, disable location lock
      if (isLocationLocked) {
        setIsLocationLocked(false);
      }
      // Set interaction flag to prevent click events during zoom
      isMapInteractingRef.current = true;
    };

    const handleZoomChanged = () => {
      // Clear interaction flag after zoom completes with a short delay
      setTimeout(() => {
        isMapInteractingRef.current = false;
      }, 300);
    };

    window.kakao.maps.event.addListener(map, 'dragstart', handleDragStart);
    window.kakao.maps.event.addListener(map, 'dragend', handleDragEnd);
    window.kakao.maps.event.addListener(map, 'zoom_start', handleZoomStart);
    window.kakao.maps.event.addListener(map, 'zoom_changed', handleZoomChanged);

    return () => {
      window.kakao.maps.event.removeListener(map, 'dragstart', handleDragStart);
      window.kakao.maps.event.removeListener(map, 'dragend', handleDragEnd);
      window.kakao.maps.event.removeListener(map, 'zoom_start', handleZoomStart);
      window.kakao.maps.event.removeListener(map, 'zoom_changed', handleZoomChanged);
    };
  }, [map, isLocationLocked]);

  // Register map click handler with fresh memos
  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    const handleMapClick = (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      
      // Delay to allow marker click handler to execute first and set the flag
      // Increased delay for mobile touch events which can be delayed significantly
      setTimeout(() => {
        // Ignore clicks if map is being dragged or zoomed
        if (isMapInteractingRef.current) {
          return;
        }
        
        // Check flag again after delay
        if (markerClickedRef.current) {
          return;
        }
        
        // Directly show memo form for any map click (markers have their own handlers)
        const geocoder = new window.kakao.maps.services.Geocoder();
        
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function(result: any, status: any) {
          if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
            const address = result[0]?.address?.address_name || '주소 없음';
            const buildingName = result[0]?.road_address?.building_name || '건물명 없음';
            
            onLocationSelect({
              lat: latlng.getLat(),
              lng: latlng.getLng(),
              address,
              buildingName,
            });
          } else {
            onLocationSelect({
              lat: latlng.getLat(),
              lng: latlng.getLng(),
              address: `위도: ${latlng.getLat().toFixed(6)}, 경도: ${latlng.getLng().toFixed(6)}`,
              buildingName: '위치 선택됨',
            });
          }
        });
      }, 400); // Increased to 400ms for mobile touch event compatibility
    };

    window.kakao.maps.event.addListener(map, 'click', handleMapClick);

    return () => {
      window.kakao.maps.event.removeListener(map, 'click', handleMapClick);
    };
  }, [map, memos, onLocationSelect, onMarkerClick, onClusterClick]);

  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    markers.forEach(marker => {
      if (marker.handler && marker.element) {
        marker.element.removeEventListener('click', marker.handler);
      }
      if (marker.overlay) {
        marker.overlay.setMap(null);
      }
    });

    const clusters = groupMemosByLocation(filteredMemos);
    
    const newMarkers = clusters.map(cluster => {
      const position = new window.kakao.maps.LatLng(cluster.lat, cluster.lng);
      
      const isSingleMemo = cluster.memos.length === 1;
      const memo = cluster.memos[0];
      
      let markerColor: string;
      let markerIcon: string = 'default';
      let mainPhotoUrl: string | undefined;
      
      if (isSingleMemo) {
        markerColor = memo.group?.color || PERSONAL_MEMO_COLOR;
        // 메모의 markerIcon을 우선 사용, 없으면 그룹의 markerIcon 사용
        markerIcon = (memo as any)?.markerIcon || (memo.group as any)?.markerIcon || 'default';
        
        // Get main photo URL if available
        const mainPhotoId = (memo as any).mainPhotoId;
        if (mainPhotoId && memo.photos && memo.photos.length > 0) {
          const mainPhoto = memo.photos.find((p: any) => p.id === mainPhotoId);
          mainPhotoUrl = mainPhoto?.url;
        }
      } else {
        const colors = cluster.memos.map(m => m.group?.color || PERSONAL_MEMO_COLOR);
        const uniqueColors = new Set(colors);
        markerColor = uniqueColors.size === 1 ? colors[0] : '#6b7280';
        
        // 메모의 markerIcon을 우선 사용, 없으면 그룹의 markerIcon 사용
        const icons = cluster.memos.map(m => (m as any)?.markerIcon || (m.group as any)?.markerIcon || 'default');
        const uniqueIcons = new Set(icons);
        markerIcon = uniqueIcons.size === 1 ? icons[0] : 'default';
        
        // Find main memo and get its photo
        const mainMemo = cluster.memos.find((m: any) => m.isMainMemo);
        if (mainMemo) {
          const mainPhotoId = (mainMemo as any).mainPhotoId;
          if (mainPhotoId && mainMemo.photos && mainMemo.photos.length > 0) {
            const mainPhoto = mainMemo.photos.find((p: any) => p.id === mainPhotoId);
            mainPhotoUrl = mainPhoto?.url;
          }
        }
      }
      
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = isSingleMemo 
        ? createMarkerContent(markerColor, markerIcon, mainPhotoUrl, markerScale)
        : createClusterMarkerContent(markerColor, cluster.memos.length, markerIcon, mainPhotoUrl, markerScale);
      contentDiv.style.cursor = 'pointer';
      
      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: contentDiv,
        yAnchor: 1,
        zIndex: 100, // Ensure marker is above map
      });
      
      customOverlay.setMap(map);
      
      const handleMarkerInteraction = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Ignore clicks if map is being dragged or zoomed
        if (isMapInteractingRef.current) {
          return;
        }
        
        // Set flag to prevent map click handler from firing
        markerClickedRef.current = true;
        
        // Execute immediately
        if (isSingleMemo) {
          onMarkerClick(memo.id);
        } else if (onClusterClick) {
          onClusterClick(cluster.memos.map(m => m.id));
        }
        
        // Reset flag after a delay (increased for mobile compatibility)
        setTimeout(() => {
          markerClickedRef.current = false;
        }, 500);
      };
      
      // Track touch movement to distinguish tap from drag
      let touchStartPos: { x: number; y: number } | null = null;
      let touchMoved = false;
      
      const handleTouchStart = (e: TouchEvent) => {
        // Ignore if map is being dragged or zoomed
        if (isMapInteractingRef.current) {
          return;
        }
        
        // Record touch start position
        if (e.touches.length > 0) {
          touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
          };
          touchMoved = false;
        }
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        // If user moves finger, it's a drag, not a tap
        if (touchStartPos && e.touches.length > 0) {
          const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.x);
          const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.y);
          
          // If moved more than 10px, consider it a drag
          if (deltaX > 10 || deltaY > 10) {
            touchMoved = true;
            // Clear touch data
            touchStartPos = null;
          }
        }
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Ignore if map is being dragged or zoomed
        if (isMapInteractingRef.current) {
          touchStartPos = null;
          touchMoved = false;
          return;
        }
        
        // Ignore if touch was a drag movement
        if (touchMoved) {
          touchStartPos = null;
          touchMoved = false;
          return;
        }
        
        // Set flag to prevent map click handler from firing
        markerClickedRef.current = true;
        
        // Execute marker action
        if (isSingleMemo) {
          onMarkerClick(memo.id);
        } else if (onClusterClick) {
          onClusterClick(cluster.memos.map(m => m.id));
        }
        
        // Reset flags
        touchStartPos = null;
        touchMoved = false;
        
        // Reset marker clicked flag after delay
        setTimeout(() => {
          markerClickedRef.current = false;
        }, 500);
      };
      
      // Handle both click and touch events for better mobile support
      contentDiv.addEventListener('click', handleMarkerInteraction, true); // Use capture phase for desktop
      contentDiv.addEventListener('touchstart', handleTouchStart, true);
      contentDiv.addEventListener('touchmove', handleTouchMove, true);
      contentDiv.addEventListener('touchend', handleTouchEnd, true);

      return { 
        overlay: customOverlay, 
        element: contentDiv,
        handler: handleMarkerInteraction
      };
    });

    setMarkers(newMarkers);

    return () => {
      newMarkers.forEach(marker => {
        if (marker.element) {
          // Remove all event listeners
          if (marker.handler) {
            marker.element.removeEventListener('click', marker.handler, true);
          }
          // Note: touchstart, touchmove, touchend listeners are anonymous functions
          // They will be automatically cleaned up when the element is removed
        }
        if (marker.overlay) {
          marker.overlay.setMap(null);
        }
      });
    };
  }, [map, filteredMemos, onMarkerClick, onClusterClick, markerScale]);

  // Start watching user's real-time location
  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentUserLocation({ lat, lng });
        
        // If location is locked, center map on user location
        if (isLocationLocked) {
          const latlng = new window.kakao.maps.LatLng(lat, lng);
          map.panTo(latlng); // Smooth pan to location
        }
        
        // Notify parent component
        if (onMyLocationClick) {
          onMyLocationClick({ lat, lng });
        }
      },
      (error) => {
        console.log("실시간 위치 추적 오류:", error);
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
  }, [map, onMyLocationClick, isLocationLocked]);

  // When location is NOT locked, display user location marker on map
  useEffect(() => {
    if (!map || !currentUserLocation || isLocationLocked) return;

    const position = new window.kakao.maps.LatLng(currentUserLocation.lat, currentUserLocation.lng);

    // User 아이콘 마커
    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #3b82f6;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        cursor: default;
        transition: all 0.3s ease-out;
      ">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#ffffff" 
          stroke-width="2.5" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    `;

    const userMarker = new window.kakao.maps.CustomOverlay({
      position: position,
      content: markerContent,
      yAnchor: 0.5,
    });
    
    userMarker.setMap(map);

    return () => {
      userMarker.setMap(null);
    };
  }, [map, currentUserLocation, isLocationLocked]);

  const handleMyLocation = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const latlng = new window.kakao.maps.LatLng(lat, lng);
        map.setCenter(latlng);
      });
    }
  };

  const handleSearchAddress = () => {
    if (!searchQuery.trim() || !map || !window.kakao?.maps) return;

    setIsSearching(true);
    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(searchQuery, (result: any, status: any) => {
      setIsSearching(false);

      if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        
        // Remove previous search marker if exists
        if (searchMarker) {
          searchMarker.setMap(null);
        }

        // Create search marker
        const markerContent = document.createElement('div');
        markerContent.innerHTML = createSearchMarkerContent();
        
        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: coords,
          content: markerContent,
          yAnchor: 1,
        });
        
        customOverlay.setMap(map);
        setSearchMarker(customOverlay);
        
        map.setCenter(coords);
        map.setLevel(3);

        toast({
          title: "위치 찾기 완료",
          description: result[0].address_name || searchQuery,
        });
        
        setSearchQuery("");
      } else {
        toast({
          title: "주소를 찾을 수 없습니다",
          description: "다른 주소로 다시 시도해주세요",
          variant: "destructive",
        });
      }
    });
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchAddress();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const toggleMapLock = () => {
    if (!map) return;
    
    const newLockState = !isMapLocked;
    setIsMapLocked(newLockState);
    
    if (newLockState) {
      // 지도 고정: 줌만 비활성화 (드래그는 가능)
      map.setDraggable(true);
      map.setZoomable(false);
      toast({
        title: "지도 확대/축소 잠금",
        description: "지도를 움직일 수 있지만 확대/축소는 불가능합니다",
      });
    } else {
      // 지도 고정 해제: 드래그와 줌 활성화
      map.setDraggable(true);
      map.setZoomable(true);
      toast({
        title: "지도 확대/축소 잠금 해제",
        description: "지도를 자유롭게 움직이고 확대/축소할 수 있습니다",
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      {mapError ? (
        <div className="w-full h-full flex items-center justify-center bg-muted p-8 text-center">
          <div>
            <p className="text-muted-foreground mb-4">{mapError}</p>
            <p className="text-sm text-muted-foreground">
              설정에서 Kakao Maps API 키를 추가하거나,<br />
              그룹과 메모 관리 기능을 사용해보세요.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div ref={mapRef} className="w-full h-full" data-testid="map-container" />
          
          {/* 화면 중앙에 고정된 사용자 위치 마커 (위치 고정 모드일 때만 표시) */}
          {isLocationLocked && currentUserLocation && (
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40"
              style={{ marginTop: '-16px' }} // Adjust for marker height
            >
              <div className="relative w-8 h-8 flex items-center justify-center bg-blue-500 rounded-full border-2 border-white shadow-lg">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#ffffff" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
          )}
          
          {/* 주소 검색 바 */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="flex gap-2 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg border-2 border-primary/30 p-2">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder={t.common.addressSearchPlaceholder}
                  className="pr-10 border-0 focus-visible:ring-0"
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
                onClick={handleSearchAddress}
                disabled={!searchQuery.trim() || isSearching}
                className="h-10 w-10 flex-shrink-0"
                data-testid="button-search-address"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 플로팅 필터 버튼들 (오른쪽 하단) */}
          <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50">
            {/* 지도 확대/축소 잠금 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={toggleMapLock}
                  className={`h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-2xl ${
                    isMapLocked 
                      ? 'bg-destructive hover:bg-destructive/90 border-2 border-destructive' 
                      : 'bg-primary hover:bg-primary/90 border-2 border-primary'
                  }`}
                  data-testid="button-map-lock"
                >
                  {isMapLocked ? (
                    <Lock className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Unlock className="h-5 w-5 text-primary-foreground" />
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
                    
                    // 위치 고정을 활성화할 때, 현재 위치로 지도 이동
                    if (newLockState && map && currentUserLocation) {
                      const latlng = new window.kakao.maps.LatLng(currentUserLocation.lat, currentUserLocation.lng);
                      map.panTo(latlng);
                    }
                    
                    toast({
                      title: newLockState ? "위치 고정" : "위치 고정 해제",
                      description: newLockState 
                        ? "내 위치가 화면 중앙에 고정되며, 지도가 따라 움직입니다" 
                        : "지도를 자유롭게 이동할 수 있습니다",
                    });
                  }}
                  className={`h-10 w-10 rounded-lg shadow-lg transition-all hover:shadow-2xl ${
                    isLocationLocked 
                      ? 'bg-blue-500 hover:bg-blue-600 border-2 border-blue-500' 
                      : 'bg-muted hover:bg-muted/80 border-2 border-border'
                  }`}
                  data-testid="button-location-lock"
                >
                  <User className={`h-5 w-5 ${isLocationLocked ? 'text-white' : 'text-muted-foreground'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isLocationLocked ? "위치 고정 해제" : "위치 고정"}</p>
              </TooltipContent>
            </Tooltip>

            {/* 그룹 필터 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={`h-10 w-10 rounded-lg shadow-lg relative overflow-visible transition-all hover:shadow-2xl ${
                    selectedGroupIds.includes("all") ? 'bg-primary hover:bg-primary/90 border-2 border-primary' : ''
                  }`}
                  onClick={() => setGroupFilterOpen(true)}
                  data-testid="button-group-filter"
                  style={(() => {
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

                    if (colors.length === 0) return {};
                    if (colors.length === 1) {
                      return { backgroundColor: colors[0], borderColor: colors[0] };
                    }

                    const step = 100 / colors.length;
                    const gradientStops = colors.map((color, index) => {
                      const start = index * step;
                      const end = (index + 1) * step;
                      return `${color} ${start}%, ${color} ${end}%`;
                    }).join(', ');

                    return {
                      background: `linear-gradient(135deg, ${gradientStops})`,
                      borderColor: colors[0]
                    };
                  })()}
                >
                  <Users className={`h-5 w-5 ${
                    selectedGroupIds.includes("all") ? 'text-primary-foreground' : ''
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
                <p>그룹 필터</p>
              </TooltipContent>
            </Tooltip>

            {/* 마커 필터 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-lg shadow-lg relative bg-primary hover:bg-primary/90 border-2 border-primary hover:shadow-2xl transition-all"
                  onClick={() => setMarkerFilterOpen(true)}
                  data-testid="button-marker-filter"
                >
                  <Filter className="h-5 w-5 text-primary-foreground" />
                  {!selectedMarkerIcons.includes("all") && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
                      data-testid="badge-marker-filter-count"
                    >
                      {selectedMarkerIcons.filter(icon => icon !== "all").length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>카테고리 필터</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* 마커 필터 다이얼로그 */}
          <Dialog open={markerFilterOpen} onOpenChange={setMarkerFilterOpen}>
            <DialogContent className="sm:max-w-sm" data-testid="dialog-marker-filter">
              <DialogHeader>
                <DialogTitle>마커 필터</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    checked={selectedMarkerIcons.includes("all")}
                    onCheckedChange={() => {
                      onMarkerIconsChange?.(["all"]);
                    }}
                    data-testid="checkbox-marker-icon-all"
                  />
                  <div className="flex items-center flex-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{t.categories.all}</span>
                  </div>
                </label>
                {Object.entries(MARKER_ICON_COMPONENTS).map(([icon, IconComponent]) => (
                  <label key={icon} className="flex items-center space-x-3 cursor-pointer">
                    <Checkbox
                      checked={selectedMarkerIcons.includes(icon)}
                      onCheckedChange={() => {
                        if (selectedMarkerIcons.includes("all")) {
                          onMarkerIconsChange?.([icon]);
                        } else if (selectedMarkerIcons.includes(icon)) {
                          const newSelection = selectedMarkerIcons.filter(i => i !== icon);
                          onMarkerIconsChange?.(newSelection.length === 0 ? ["all"] : newSelection);
                        } else {
                          onMarkerIconsChange?.([...selectedMarkerIcons, icon]);
                        }
                      }}
                      data-testid={`checkbox-marker-icon-${icon}`}
                    />
                    <div className="flex items-center flex-1">
                      <IconComponent className="h-4 w-4 mr-2" />
                      <span>{t.categories[icon as keyof typeof t.categories]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* 그룹 필터 다이얼로그 */}
          <Dialog open={groupFilterOpen} onOpenChange={setGroupFilterOpen}>
            <DialogContent className="sm:max-w-sm" data-testid="dialog-group-filter">
              <DialogHeader>
                <DialogTitle>그룹 필터</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    checked={selectedGroupIds.includes("all")}
                    onCheckedChange={() => {
                      onGroupIdsChange?.(["all"]);
                    }}
                    data-testid="checkbox-group-all"
                  />
                  <span>전체 그룹</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    checked={selectedGroupIds.includes("personal")}
                    onCheckedChange={() => {
                      if (selectedGroupIds.includes("all")) {
                        onGroupIdsChange?.(["personal"]);
                      } else if (selectedGroupIds.includes("personal")) {
                        const newSelection = selectedGroupIds.filter(id => id !== "personal");
                        onGroupIdsChange?.(newSelection.length === 0 ? ["all"] : newSelection);
                      } else {
                        onGroupIdsChange?.([...selectedGroupIds, "personal"]);
                      }
                    }}
                    data-testid="checkbox-group-personal"
                  />
                  <span>개인 메모</span>
                </label>
                {groups.filter(group => group.name !== "개인 메모").map((group) => (
                  <label key={group.id} className="flex items-center space-x-3 cursor-pointer">
                    <Checkbox
                      checked={selectedGroupIds.includes(group.id)}
                      onCheckedChange={() => {
                        if (selectedGroupIds.includes("all")) {
                          onGroupIdsChange?.([group.id]);
                        } else if (selectedGroupIds.includes(group.id)) {
                          const newSelection = selectedGroupIds.filter(id => id !== group.id);
                          onGroupIdsChange?.(newSelection.length === 0 ? ["all"] : newSelection);
                        } else {
                          onGroupIdsChange?.([...selectedGroupIds, group.id]);
                        }
                      }}
                      data-testid={`checkbox-group-${group.id}`}
                    />
                    <div className="flex items-center flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0 mr-2" 
                        style={{ backgroundColor: group.color }}
                      />
                      <span>{group.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
