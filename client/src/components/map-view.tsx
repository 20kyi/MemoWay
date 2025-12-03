import { useEffect, useRef, useState, useMemo, memo } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, MapPin, Plane, Heart, Utensils, Coffee, ShoppingBag, Dumbbell, Briefcase, Filter, Users, Lock, Unlock, Edit, Trash2, Plus, Save } from "lucide-react";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { useLayoutTheme } from "@/lib/layout-theme-context";
import type { MemoWithDetails, GroupWithMembers } from "@shared/schema";

interface MapViewProps {
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

function createPlaceMarkerContent(placeName: string, distance?: number, label?: string): string {
  const distanceText = distance !== undefined ? `${Math.round(distance)}m` : '';
  return `
    <div style="
      position: relative;
      width: 30px;
      height: 40px;
      cursor: pointer;
    ">
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
              fill="#3b82f6" 
              stroke="#ffffff" 
              stroke-width="2"/>
        <circle cx="15" cy="15" r="6" fill="#ffffff"/>
        ${label ? `
          <text x="15" y="19" text-anchor="middle" font-size="10" font-weight="bold" fill="#3b82f6">${label}</text>
        ` : `
          <circle cx="15" cy="15" r="3" fill="#3b82f6"/>
        `}
      </svg>
      ${distanceText ? `
        <div style="
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #3b82f6;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          border: 1px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">${distanceText}</div>
      ` : ''}
    </div>
  `;
}

// 하버사인 공식을 사용한 거리 계산 (미터 단위)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

function MapViewComponent({ 
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
}: MapViewProps) {
  const { t } = useLanguage();
  const { layoutTheme } = useLayoutTheme();
  const isCoupleTheme = layoutTheme === "couple-clay";
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [searchMarker, setSearchMarker] = useState<any>(null);
  const [searchPlaceMarkers, setSearchPlaceMarkers] = useState<Array<{ overlay: any; placeInfo: any }>>([]);
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [isSearchSidebarOpen, setIsSearchSidebarOpen] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(""); // 사이드바에 표시할 검색어
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLocked, setIsMapLocked] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLocked, setIsLocationLocked] = useState(true); // 위치 고정 모드 (기본값: true)
  const [markers, setMarkers] = useState<Array<{ overlay: any; handler?: (e: MouseEvent) => void; contentDiv?: HTMLElement; topDiv?: HTMLElement | null; memoId?: string; memoIds?: string[] }>>([]);
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

  // Cleanup search markers when component unmounts
  useEffect(() => {
    return () => {
      if (searchMarker) {
        searchMarker.setMap(null);
      }
      searchPlaceMarkers.forEach(marker => {
        if (marker.overlay) {
          marker.overlay.setMap(null);
        }
      });
    };
  }, [searchMarker, searchPlaceMarkers]);

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current) return;
    
    // 이미 지도가 초기화되었으면 무시
    if (map) return;

    let isMounted = true; // 컴포넌트가 마운트되어 있는지 확인

    loadKakaoMaps()
      .then(() => {
        // 컴포넌트가 언마운트되었거나 이미 지도가 있으면 무시
        if (!isMounted || !mapRef.current || !window.kakao?.maps || map) {
          return;
        }

        const container = mapRef.current;
        if (!container) return;

        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 3,
          draggable: true, // 지도 드래그 활성화
          scrollwheel: true, // 마우스 휠 줌 활성화
          disableDoubleClick: false, // 더블클릭 줌 활성화
          disableDoubleClickZoom: false, // 더블클릭 줌 활성화
        };

        try {
          const kakaoMap = new window.kakao.maps.Map(container, options);
          
          // 다시 한 번 마운트 상태 확인
          if (!isMounted) {
            return;
          }
          
          setMap(kakaoMap);
          
          // 모바일 터치 이벤트 지원을 위한 추가 설정
          container.style.touchAction = 'pan-x pan-y pinch-zoom';
          
          // Notify parent that map is ready
          if (onMapReady) {
            onMapReady(kakaoMap);
          }
        } catch (error) {
          console.error("지도 초기화 실패:", error);
          if (isMounted) {
            setMapError("지도를 초기화할 수 없습니다. 페이지를 새로고침해주세요.");
          }
        }
      })
      .catch((error) => {
        console.error("Failed to load Kakao Maps:", error);
        if (isMounted) {
          setMapError("지도를 불러올 수 없습니다. API 키를 확인해주세요.");
        }
      });

    return () => {
      isMounted = false; // 컴포넌트 언마운트 시 플래그 설정
    };
  }, [map, onMapReady]);

  // Auto-move to user location when map first loads
  const hasMovedToUserLocationRef = useRef(false);
  const gpsAttemptCountRef = useRef(0);
  const MAX_GPS_ATTEMPTS = 3;
  const DESIRED_ACCURACY = 30; // meters

  useEffect(() => {
    // pendingLocation이 있으면 자동 위치 이동을 건너뜀
    if (!map || hasMovedToUserLocationRef.current || pendingLocation) return;

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
  }, [map, userLocation, onMyLocationClick, pendingLocation]);

  // pendingLocation 처리: 메모 위치로 정확히 이동
  useEffect(() => {
    if (pendingLocation && map && window.kakao?.maps) {
      hasMovedToUserLocationRef.current = true;
      
      // 위치 고정 모드 해제
      if (isLocationLocked) {
        setIsLocationLocked(false);
      }
      
      // 지도가 완전히 준비될 때까지 약간의 딜레이 후 정확한 위치로 이동
      const moveToPendingLocation = () => {
        try {
          const position = new window.kakao.maps.LatLng(
            pendingLocation.lat,
            pendingLocation.lng
          );
          
          // setCenter를 사용하여 정확히 중심으로 이동 (panTo 대신)
          map.setCenter(position);
          map.setLevel(3); // 적절한 줌 레벨 설정
          
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

  // Update marker scale based on zoom level

  // Detect user dragging the map and disable location lock
  const isDraggingRef = useRef(false);
  const lastDragEndTimeRef = useRef<number>(0); // 드래그 종료 시간 추적
  const isMapInteractingRef = useRef(false); // 지도 조작 중 여부 (터치, 드래그, 핀치 줌 등)
  const markerClickHandledRef = useRef(false); // 마커 클릭이 처리되었는지 여부
  
  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    const handleDragStart = () => {
      isDraggingRef.current = true; // 드래그 시작 플래그 설정
      isMapInteractingRef.current = true; // 지도 조작 중 플래그 설정
      if (isLocationLocked) {
        setIsLocationLocked(false);
      }
    };

    const handleDragEnd = () => {
      // 드래그 종료 시간 기록
      lastDragEndTimeRef.current = Date.now();
      // 드래그 종료 후 약간의 지연을 두고 플래그 해제 (클릭 이벤트와 충돌 방지)
      setTimeout(() => {
        isDraggingRef.current = false;
        isMapInteractingRef.current = false;
      }, 150);
    };

    const handleZoomStart = () => {
      isMapInteractingRef.current = true; // 지도 조작 중 플래그 설정
      if (isLocationLocked) {
        setIsLocationLocked(false);
      }
    };

    const handleZoomChanged = () => {
      // 줌 변경 중에는 지도 조작 중으로 유지
      isMapInteractingRef.current = true;
      // 줌 변경 종료 후 딜레이를 두고 플래그 해제
      setTimeout(() => {
        isMapInteractingRef.current = false;
      }, 200);
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
      // 드래그 중이면 클릭 이벤트 무시 (성능 최적화)
      if (isDraggingRef.current) {
        return;
      }
      
      const latlng = mouseEvent.latLng;
      if (!latlng) {
        console.warn('Map click event has no latLng');
        return;
      }
      const clickLat = latlng.getLat();
      const clickLng = latlng.getLng();
      
      // 지도 클릭 처리
      // 마커 클릭 이벤트가 먼저 처리되도록 약간의 지연
      setTimeout(() => {
        // 마커 클릭이 처리되었으면 지도 클릭 무시
        if (markerClickHandledRef.current) {
          console.log('마커 클릭이 처리되었으므로 지도 클릭 무시');
          return;
        }
        
        // 드래그 중이면 클릭 처리 중단
        if (isDraggingRef.current) {
          return;
        }
        // 마커 위치와 클릭 위치 비교 (더 정확한 거리 계산)
        const clickPosition = new window.kakao.maps.LatLng(clickLat, clickLng);
        const clickedMarker = markers.find(marker => {
          if (!marker.overlay) return false;
          try {
            const markerPosition = marker.overlay.getPosition();
            if (!markerPosition) return false;
            // getLat, getLng 메서드가 존재하는지 확인
            if (typeof markerPosition.getLat !== 'function' || typeof markerPosition.getLng !== 'function') {
              return false;
            }
            const distance = Math.sqrt(
              Math.pow(clickPosition.getLat() - markerPosition.getLat(), 2) +
              Math.pow(clickPosition.getLng() - markerPosition.getLng(), 2)
            );
            // 마커 크기를 고려하여 더 넓은 범위로 감지 (약 50m)
            return distance < 0.0005;
          } catch (error) {
            // 마커 위치를 가져오는 중 오류 발생 시 무시
            console.warn('Error getting marker position:', error);
            return false;
          }
        });

        if (clickedMarker) {
          // 마커가 클릭된 것으로 간주 - 지도 클릭 처리 중단
          return;
        }
        
        console.log(' *** 지도 클릭됨 ***', { lat: clickLat, lng: clickLng });
        
        // 먼저 geocoding을 수행하여 도로명 주소를 가져온 후 비교
        const geocoder = new window.kakao.maps.services.Geocoder();
        
        geocoder.coord2Address(clickLng, clickLat, function(result: any, status: any) {
        if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
          // 도로명 주소 우선, 없으면 지번 주소 사용
          const roadAddress = result[0]?.road_address?.address_name;
          const jibunAddress = result[0]?.address?.address_name;
          const address = roadAddress || jibunAddress || '주소 없음';
          const buildingName = result[0]?.road_address?.building_name || '건물명 없음';
          
          // 주소 정규화 함수 (시/도 표기 통일 + 공백 정리)
          const normalizeAddress = (addr: string): string => {
            if (!addr) return '';
            // 연속된 공백을 하나로 통일하고 앞뒤 공백 제거
            let normalized = addr.trim().replace(/\s+/g, ' ');
            
            // 시/도 표기 통일 (저장된 데이터가 일관성이 없어서 통일 필요)
            normalized = normalized
              .replace(/경기도/g, '경기')
              .replace(/서울특별시/g, '서울')
              .replace(/부산광역시/g, '부산')
              .replace(/대구광역시/g, '대구')
              .replace(/인천광역시/g, '인천')
              .replace(/광주광역시/g, '광주')
              .replace(/대전광역시/g, '대전')
              .replace(/울산광역시/g, '울산')
              .replace(/세종특별자치시/g, '세종')
              .replace(/제주특별자치도/g, '제주')
              .replace(/제주도/g, '제주')
              .replace(/전라북도/g, '전북')
              .replace(/전라남도/g, '전남')
              .replace(/경상북도/g, '경북')
              .replace(/경상남도/g, '경남')
              .replace(/충청북도/g, '충북')
              .replace(/충청남도/g, '충남')
              .replace(/강원특별자치도/g, '강원')
              .replace(/강원도/g, '강원');
            
            return normalized;
          };
          
          // 건물명 정규화 함수
          const normalizeBuildingName = (name: string): string => {
            if (!name) return '';
            // 연속된 공백을 하나로 통일하고 앞뒤 공백 제거
            return name.trim().replace(/\s+/g, ' ');
          };
          
          const normalizedAddress = normalizeAddress(address);
          const normalizedBuildingName = normalizeBuildingName(buildingName);
          
          // 같은 주소와 건물명을 가진 메모 찾기 (정확히 일치하는 경우만)
          const memosAtLocation = memos.filter(memo => {
            const normalizedMemoAddress = normalizeAddress(memo.address);
            const normalizedMemoBuildingName = normalizeBuildingName(memo.buildingName);
            return normalizedAddress === normalizedMemoAddress && 
                   normalizedBuildingName === normalizedMemoBuildingName;
          });
          
          // 같은 주소에 메모가 있으면 저장된 메모 보여주기
          if (memosAtLocation.length > 0) {
            console.log('저장된 메모 발견 - 메모 열기');
            if (memosAtLocation.length === 1) {
              if (onMarkerClick) {
                onMarkerClick(memosAtLocation[0].id);
              }
            } else if (onClusterClick) {
              onClusterClick(memosAtLocation.map(m => m.id));
            } else {
              if (onMarkerClick) {
                onMarkerClick(memosAtLocation[0].id);
              }
            }
            return;
          }
          
          // 같은 주소에 메모가 없으면 새 메모 창 열기
          console.log('새 메모 입력 창 열기 (매칭되는 메모 없음)');
          onLocationSelect({
            lat: clickLat,
            lng: clickLng,
            address,
            buildingName,
          });
        } else {
          // Geocoding 실패 시 새 메모 창 열기
          console.log('Geocoding 실패 - 새 메모 입력 창 열기');
          onLocationSelect({
            lat: clickLat,
            lng: clickLng,
            address: `위도: ${clickLat.toFixed(6)}, 경도: ${clickLng.toFixed(6)}`,
            buildingName: '위치 선택됨',
          });
        }
      });
      }, 50); // 마커 클릭 확인을 위한 딜레이
    };

    window.kakao.maps.event.addListener(map, 'click', handleMapClick);

    return () => {
      window.kakao.maps.event.removeListener(map, 'click', handleMapClick);
    };
  }, [map, memos, markers, onLocationSelect, onMarkerClick, onClusterClick]);

  // Render markers for memos (디바운스로 성능 최적화)
  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    // 디바운스: 마커 업데이트를 100ms 지연시켜 빠른 연속 업데이트 방지
    const timeoutId = setTimeout(() => {

    // 검색 결과가 있으면 메모 핀을 숨김 (마커를 생성하지 않음)
    const hasSearchResults = searchMarker !== null || searchPlaceMarkers.length > 0;
    if (hasSearchResults) {
      // 기존 마커들 제거
      markers.forEach(marker => {
        if (marker.overlay) {
          if (marker.handler && marker.contentDiv) {
            marker.contentDiv.removeEventListener('click', marker.handler);
          }
          marker.overlay.setMap(null);
        }
      });
      // 마커를 생성하지 않고 종료 (cleanup에서 state 정리)
      return;
    }

    // Remove existing markers and their event listeners (중복 제거)
    markers.forEach(marker => {
      if (marker.overlay) {
        // DOM 이벤트 리스너 제거
        if (marker.handler && marker.contentDiv) {
          marker.contentDiv.removeEventListener('click', marker.handler);
        }
        marker.overlay.setMap(null);
      }
    });

    // Create clusters for memos at same location
    const clusters = groupMemosByLocation(filteredMemos);
    
    const newMarkers = clusters.map(cluster => {
      // 좌표 유효성 검사
      if (typeof cluster.lat !== 'number' || typeof cluster.lng !== 'number' || 
          isNaN(cluster.lat) || isNaN(cluster.lng) ||
          !isFinite(cluster.lat) || !isFinite(cluster.lng)) {
        console.warn('Invalid cluster coordinates:', cluster);
        return null;
      }
      const position = new window.kakao.maps.LatLng(cluster.lat, cluster.lng);
      
      const isSingleMemo = cluster.memos.length === 1;
      const memo = cluster.memos[0];
      
      let markerColor: string;
      let markerIcon: string = 'default';
      let mainPhotoUrl: string | undefined;
      
      if (isSingleMemo) {
        markerColor = memo.group?.color || PERSONAL_MEMO_COLOR;
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
      
      // content DOM 요소 생성
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = isSingleMemo 
        ? createMarkerContent(markerColor, markerIcon, mainPhotoUrl, 1)
        : createClusterMarkerContent(markerColor, cluster.memos.length, markerIcon, mainPhotoUrl, 1);
      
      // 마커 스타일 설정
      contentDiv.style.cursor = 'pointer';
      contentDiv.style.pointerEvents = 'auto';
      contentDiv.style.userSelect = 'none';
      contentDiv.style.zIndex = '10000';
      contentDiv.style.position = 'relative';
      // 모바일 터치 이벤트: 마커 클릭만 처리하고 드래그는 지도로 전파
      contentDiv.style.touchAction = 'manipulation'; // 터치 드래그는 지도로 전파
      
      // 드래그와 클릭 구분을 위한 변수
      let isDragging = false;
      const DRAG_THRESHOLD = 5; // 5px 이상 움직이면 드래그로 간주
      
      // 마커 클릭 핸들러
      const handleMarkerClick = (e: MouseEvent) => {
        // 마커 자체의 드래그 상태만 확인 (지도 드래그는 확인하지 않음)
        // 지도 드래그가 끝난 직후에도 마커 클릭은 허용해야 함
        if (isDragging) {
          console.log('마커 드래그 중이므로 클릭 무시');
          return;
        }
        
        console.log('🎯 마커 클릭 핸들러 호출됨', { 
          isSingleMemo, 
          memoId: isSingleMemo ? memo.id : cluster.memos.map(m => m.id),
          hasOnMarkerClick: !!onMarkerClick,
          hasOnClusterClick: !!onClusterClick
        });
        
        // 마커 클릭이 처리되었음을 표시 (지도 클릭 이벤트 방지)
        markerClickHandledRef.current = true;
        setTimeout(() => {
          markerClickHandledRef.current = false;
        }, 100);
        
        e.stopPropagation();
        e.preventDefault();
        e.cancelBubble = true; // IE 호환성
        
        if (isSingleMemo) {
          if (onMarkerClick) {
            console.log('✅ onMarkerClick 호출:', memo.id);
            onMarkerClick(memo.id);
          } else {
            console.warn('⚠️ onMarkerClick이 없습니다');
          }
        } else {
          if (onClusterClick) {
            console.log('✅ onClusterClick 호출:', cluster.memos.map(m => m.id));
            onClusterClick(cluster.memos.map(m => m.id));
          } else if (onMarkerClick) {
            console.log('✅ onMarkerClick 호출 (클러스터):', cluster.memos[0].id);
            onMarkerClick(cluster.memos[0].id);
          } else {
            console.warn('⚠️ onClusterClick과 onMarkerClick이 모두 없습니다');
          }
        }
      };
      
      // 드래그와 클릭 구분을 위한 핸들러 (마우스 + 터치 지원)
      // 성능 최적화: throttle 적용
      let mouseDownX = 0;
      let mouseDownY = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let lastMoveTime = 0;
      const MOVE_THROTTLE = 16; // ~60fps (16ms)
      
      const mouseDownHandler = (event: MouseEvent) => {
        mouseDownX = event.clientX;
        mouseDownY = event.clientY;
        isDragging = false;
      };
      
      const mouseMoveHandler = (event: MouseEvent) => {
        // 성능 최적화: throttle 적용
        const now = Date.now();
        if (now - lastMoveTime < MOVE_THROTTLE) {
          return;
        }
        lastMoveTime = now;
        
        const deltaX = Math.abs(event.clientX - mouseDownX);
        const deltaY = Math.abs(event.clientY - mouseDownY);
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isDragging = true;
        }
      };
      
      // 핀치 줌 감지용 변수
      let isPinching = false;
      let pinchEndTime = 0;
      const PINCH_COOLDOWN = 300; // 핀치 줌 후 클릭 무시 시간 (ms)
      
      // 터치 이벤트 핸들러 (모바일 지원)
      const touchStartHandler = (event: TouchEvent) => {
        // 터치 시작 시 지도 조작 중 플래그 설정
        isMapInteractingRef.current = true;
        
        if (event.touches.length === 1) {
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
          isDragging = false;
          lastMoveTime = Date.now();
          isPinching = false;
        } else if (event.touches.length >= 2) {
          // 멀티터치(핀치 줌 등) 감지
          isDragging = true;
          isPinching = true;
        }
      };
      
      const touchMoveHandler = (event: TouchEvent) => {
        // 터치 이동 중에는 지도 조작 중으로 유지
        isMapInteractingRef.current = true;
        
        // 성능 최적화: throttle 적용
        const now = Date.now();
        if (now - lastMoveTime < MOVE_THROTTLE) {
          return;
        }
        lastMoveTime = now;
        
        if (event.touches.length === 1) {
          const deltaX = Math.abs(event.touches[0].clientX - touchStartX);
          const deltaY = Math.abs(event.touches[0].clientY - touchStartY);
          if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
            isDragging = true;
            // 드래그 중이면 이벤트 전파하여 지도가 드래그되도록 함
            event.stopPropagation();
          }
        } else if (event.touches.length >= 2) {
          // 멀티터치(핀치 줌) 감지
          isDragging = true;
          isPinching = true;
        }
      };
      
      const touchEndHandler = (event: TouchEvent) => {
        // 핀치 줌이 끝났는지 확인
        if (isPinching && event.touches.length < 2) {
          // 핀치 줌이 끝난 시간 기록
          pinchEndTime = Date.now();
          isPinching = false;
        }
        
        // 터치 종료 후 딜레이를 두고 지도 조작 플래그 해제
        setTimeout(() => {
          isMapInteractingRef.current = false;
        }, 200);
        
        // 마커 자체의 드래그 상태만 확인 (지도 조작 상태는 확인하지 않음)
        // 드래그가 아니고, 핀치 줌 후 쿨다운 시간이 지났으며, 단일 터치인 경우에만 클릭 처리
        const timeSincePinch = Date.now() - pinchEndTime;
        if (!isDragging && !isPinching && timeSincePinch > PINCH_COOLDOWN && event.changedTouches.length === 1) {
          console.log('👆 마커 터치 클릭 이벤트 발생', event);
          event.stopPropagation();
          event.preventDefault();
          handleMarkerClick(event as any);
        }
        // 리셋
        isDragging = false;
      };
      
      const clickHandler = (event: MouseEvent) => {
        // 마커 자체의 드래그 상태만 확인 (지도 조작 상태는 확인하지 않음)
        // 드래그가 아닌 경우에만 클릭 처리
        if (!isDragging) {
          console.log('🖱️ 마커 클릭 이벤트 발생', event);
          event.stopPropagation();
          event.preventDefault();
          event.cancelBubble = true;
          handleMarkerClick(event);
        }
        // 리셋
        isDragging = false;
      };
      
      // innerHTML 설정 후 즉시 최상위 div를 찾아서 이벤트 등록
      const topDiv = contentDiv.firstElementChild as HTMLElement;
      if (topDiv) {
        // 마우스 이벤트
        topDiv.addEventListener('mousedown', mouseDownHandler);
        topDiv.addEventListener('mousemove', mouseMoveHandler);
        topDiv.addEventListener('click', clickHandler, true);
        topDiv.addEventListener('click', clickHandler, false);
        // 터치 이벤트 (모바일 지원)
        topDiv.addEventListener('touchstart', touchStartHandler, { passive: true });
        topDiv.addEventListener('touchmove', touchMoveHandler, { passive: true });
        topDiv.addEventListener('touchend', touchEndHandler, { passive: false });
        // 최상위 div에도 스타일 설정
        topDiv.style.cursor = 'pointer';
        topDiv.style.pointerEvents = 'auto';
        topDiv.style.touchAction = 'manipulation';
      }
      
      // contentDiv에도 이벤트 등록
      contentDiv.addEventListener('mousedown', mouseDownHandler);
      contentDiv.addEventListener('mousemove', mouseMoveHandler);
      contentDiv.addEventListener('click', clickHandler, true);
      contentDiv.addEventListener('click', clickHandler, false);
      // 터치 이벤트
      contentDiv.addEventListener('touchstart', touchStartHandler, { passive: true });
      contentDiv.addEventListener('touchmove', touchMoveHandler, { passive: true });
      contentDiv.addEventListener('touchend', touchEndHandler, { passive: false });
      
      // data-click-area div에도 이벤트 등록
      const clickArea = contentDiv.querySelector('[data-click-area="true"]') as HTMLElement;
      if (clickArea) {
        clickArea.addEventListener('mousedown', mouseDownHandler);
        clickArea.addEventListener('mousemove', mouseMoveHandler);
        clickArea.addEventListener('click', clickHandler, true);
        clickArea.addEventListener('click', clickHandler, false);
        // 터치 이벤트
        clickArea.addEventListener('touchstart', touchStartHandler, { passive: true });
        clickArea.addEventListener('touchmove', touchMoveHandler, { passive: true });
        clickArea.addEventListener('touchend', touchEndHandler, { passive: false });
        clickArea.style.pointerEvents = 'auto';
        clickArea.style.cursor = 'pointer';
        clickArea.style.touchAction = 'manipulation';
      }
      
      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: contentDiv,
        yAnchor: 1,
        zIndex: 10000,
        clickable: true,
      });
      
      // 마커 객체 생성
      const markerObj = { 
        overlay: customOverlay,
        handler: clickHandler,
        contentDiv: contentDiv,
        topDiv: topDiv,
        memoId: isSingleMemo ? memo.id : undefined,
        memoIds: !isSingleMemo ? cluster.memos.map(m => m.id) : undefined,
      };
      
      customOverlay.setMap(map);
      
      // setMap 후에도 한 번 더 확인하여 이벤트 등록 (이중 보험)
      requestAnimationFrame(() => {
        const topDivAfter = contentDiv.firstElementChild as HTMLElement;
        if (topDivAfter) {
          topDivAfter.addEventListener('mousedown', mouseDownHandler);
          topDivAfter.addEventListener('mousemove', mouseMoveHandler);
          topDivAfter.addEventListener('click', clickHandler, true);
          topDivAfter.addEventListener('click', clickHandler, false);
          topDivAfter.addEventListener('touchstart', touchStartHandler, { passive: true });
          topDivAfter.addEventListener('touchmove', touchMoveHandler, { passive: true });
          topDivAfter.addEventListener('touchend', touchEndHandler, { passive: false });
        }
        
        const clickAreaAfter = contentDiv.querySelector('[data-click-area="true"]') as HTMLElement;
        if (clickAreaAfter) {
          clickAreaAfter.addEventListener('mousedown', mouseDownHandler);
          clickAreaAfter.addEventListener('mousemove', mouseMoveHandler);
          clickAreaAfter.addEventListener('click', clickHandler, true);
          clickAreaAfter.addEventListener('click', clickHandler, false);
          clickAreaAfter.addEventListener('touchstart', touchStartHandler, { passive: true });
          clickAreaAfter.addEventListener('touchmove', touchMoveHandler, { passive: true });
          clickAreaAfter.addEventListener('touchend', touchEndHandler, { passive: false });
        }
      });
      
      return markerObj;
    }).filter((marker): marker is NonNullable<typeof marker> => marker !== null);

    setMarkers(newMarkers);
    
    // 선택된 메모들만 표시할 때 bounds 조정 (메모 개수가 적을 때만)
    if (filteredMemos.length > 0 && filteredMemos.length <= 100) {
      try {
        const bounds = new window.kakao.maps.LatLngBounds();
        let hasValidBounds = false;
        
        filteredMemos.forEach(memo => {
          if (typeof memo.latitude === 'number' && typeof memo.longitude === 'number' &&
              !isNaN(memo.latitude) && !isNaN(memo.longitude) &&
              isFinite(memo.latitude) && isFinite(memo.longitude)) {
            const position = new window.kakao.maps.LatLng(memo.latitude, memo.longitude);
            bounds.extend(position);
            hasValidBounds = true;
          }
        });
        
        if (hasValidBounds) {
          // 약간의 여백을 추가하기 위해 padding 설정
          map.setBounds(bounds, 50);
        }
      } catch (error) {
        console.warn('Bounds 조정 실패:', error);
      }
    }
    }, 100); // 100ms 디바운스

    return () => {
      clearTimeout(timeoutId);
      // 기존 마커 정리
      markers.forEach(marker => {
        if (marker && marker.overlay) {
          // DOM 이벤트 리스너 제거
          if (marker.handler && marker.contentDiv) {
            marker.contentDiv.removeEventListener('click', marker.handler);
          }
          // overlay를 제거하면 자동으로 모든 이벤트 리스너가 정리됨
          marker.overlay.setMap(null);
        }
      });
    };
  }, [map, filteredMemos, onMarkerClick, onClusterClick, searchMarker, searchPlaceMarkers, markers]);

  // Start watching user's real-time location
  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    let lastUpdateTime = 0;
    let lastLat: number | null = null;
    let lastLng: number | null = null;
    const MIN_UPDATE_INTERVAL = 1000; // 최소 업데이트 간격: 1초
    const MIN_DISTANCE_CHANGE = 0.0001; // 최소 거리 변화: 약 10m (도 단위)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // 시간 기반 필터링: 최소 업데이트 간격 체크
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          return;
        }

        // 거리 기반 필터링: 위치가 충분히 변했는지 체크
        if (lastLat !== null && lastLng !== null) {
          const distance = Math.sqrt(
            Math.pow(lat - lastLat, 2) + Math.pow(lng - lastLng, 2)
          );
          if (distance < MIN_DISTANCE_CHANGE) {
            return; // 위치 변화가 미미하면 업데이트 건너뛰기
          }
        }

        // 위치 업데이트
        lastUpdateTime = now;
        lastLat = lat;
        lastLng = lng;
        
        setCurrentUserLocation({ lat, lng });
        
        // If location is locked, center map on user location
        // pendingLocation이 있으면 자동 위치 이동을 막음
        // 드래그 중이거나 드래그 종료 후 2초 이내일 때는 자동 위치 이동을 막음 (사용자가 지도를 이동 중일 때 방해하지 않음)
        const timeSinceDragEnd = Date.now() - lastDragEndTimeRef.current;
        const isRecentlyDragged = timeSinceDragEnd < 2000; // 2초 이내
        
        if (isLocationLocked && !pendingLocation && !isDraggingRef.current && !isRecentlyDragged) {
          const latlng = new window.kakao.maps.LatLng(lat, lng);
          map.panTo(latlng); // Smooth pan to location
        }
        
        // Notify parent component (위치가 실제로 변경되었을 때만)
        if (onMyLocationClick) {
          onMyLocationClick({ lat, lng });
        }
      },
      (error) => {
        console.log("실시간 위치 추적 오류:", error);
      },
      {
        // 위치 고정 모드일 때만 고정밀도 사용 (배터리 절약)
        enableHighAccuracy: isLocationLocked,
        // 타임아웃 증가로 재시도 빈도 감소
        timeout: isLocationLocked ? 15000 : 10000,
        // 캐시된 위치 정보 활용 (5초 이내 캐시 허용)
        maximumAge: 5000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [map, onMyLocationClick, isLocationLocked, pendingLocation]);

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
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const latlng = new window.kakao.maps.LatLng(lat, lng);
          // 적당한 줌 레벨로 설정 (레벨 3: 시/도 단위, 레벨 4: 시/군/구 단위)
          map.setLevel(3);
          map.setCenter(latlng);
          // 내 위치 버튼 클릭 시 위치 고정 모드 활성화
          setIsLocationLocked(true);
        },
        (error) => {
          console.log("현재 위치 가져오기 오류:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000, // 30초 이내 캐시 허용
        }
      );
    }
  };

  const handleSearchAddress = () => {
    if (!searchQuery.trim() || !map || !window.kakao?.maps) return;

    setIsSearching(true);
    
    // 기존 검색 마커들 제거
    if (searchMarker) {
      searchMarker.setMap(null);
      setSearchMarker(null);
    }
    searchPlaceMarkers.forEach(marker => {
      if (marker.overlay) {
        marker.overlay.setMap(null);
      }
    });
    setSearchPlaceMarkers([]);
    
    // 사용자 위치 가져오기 (검색 기준점 및 거리 계산용)
    const userLat = currentUserLocation?.lat || userLocation?.lat;
    const userLng = currentUserLocation?.lng || userLocation?.lng;
    const hasUserLocation = userLat !== null && userLat !== undefined && 
                           userLng !== null && userLng !== undefined;
    const MAX_RADIUS = 5000; // 5km 반경

    // 지도 중심점 가져오기 (사용자 위치가 없을 때 대체)
    const mapCenter = map.getCenter();
    const searchCenterLat = hasUserLocation ? userLat! : mapCenter.getLat();
    const searchCenterLng = hasUserLocation ? userLng! : mapCenter.getLng();

    // 1. 먼저 주소 검색 시도 (5km 제한 없음)
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(searchQuery, (addressResult: any, addressStatus: any) => {
      if (addressStatus === window.kakao.maps.services.Status.OK && addressResult && addressResult.length > 0) {
        // 주소 검색 성공 - 제한 없이 자유롭게 검색
        setIsSearching(false);
        
        if (!addressResult || addressResult.length === 0 || !addressResult[0] || addressResult[0].x === undefined || addressResult[0].y === undefined) {
          toast({
            title: t.toast.locationError,
            description: t.toast.addressNotFound,
            variant: "destructive",
          });
          return;
        }
        
        // 주소 검색 결과는 단일 마커로 표시
        const coords = new window.kakao.maps.LatLng(addressResult[0].y, addressResult[0].x);
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
        setIsLocationLocked(false);

        toast({
          title: t.toast.locationFound,
          description: addressResult[0].address_name || searchQuery,
        });
        
        setSearchQuery("");
        return;
      }
      
      // 주소 검색 실패 시 플레이스 검색 시도 (5km 제한)
      const places = new window.kakao.maps.services.Places();
      
      // 플레이스 검색 옵션: 현재 위치 기준으로 반경 5km 내에서만 검색
      const searchOptions = {
        location: new window.kakao.maps.LatLng(searchCenterLat, searchCenterLng),
        radius: MAX_RADIUS, // 5km 반경
        sort: 'distance' as const, // 거리순 정렬
      };
      
      places.keywordSearch(searchQuery, (data: any, status: any, pagination: any) => {
      if (status === window.kakao.maps.services.Status.OK && data && data.length > 0) {
        // 검색어 정규화 (공백 제거, 소문자 변환)
        const normalizedQuery = searchQuery.trim().replace(/\s+/g, '').toLowerCase();
        
        // 키워드 검색 성공 - 장소 여러 개 표시
        let placesWithDistance = data.map((place: any) => {
          const placeLat = parseFloat(place.y);
          const placeLng = parseFloat(place.x);
          const distance = hasUserLocation 
            ? calculateDistance(userLat!, userLng!, placeLat, placeLng)
            : undefined;
          
          // 장소명 정규화
          const placeName = (place.place_name || place.address_name || '').replace(/\s+/g, '').toLowerCase();
          const categoryName = (place.category_name || '').replace(/\s+/g, '').toLowerCase();
          
          // 검색어가 장소명에 포함되는지 확인
          const matchesPlaceName = placeName.includes(normalizedQuery);
          const matchesCategory = categoryName.includes(normalizedQuery);
          
          return {
            ...place,
            distance,
            lat: placeLat,
            lng: placeLng,
            matchesPlaceName, // 검색어가 장소명에 정확히 포함되는지
            matchesCategory,  // 검색어가 카테고리에 포함되는지
          };
        });

        // 검색어가 장소명에 포함된 결과를 우선적으로 필터링
        // 1순위: 장소명에 검색어 포함
        // 2순위: 카테고리에 검색어 포함
        const exactMatches = placesWithDistance.filter((place: any) => place.matchesPlaceName);
        const categoryMatches = placesWithDistance.filter((place: any) => !place.matchesPlaceName && place.matchesCategory);
        
        // 정확히 일치하는 결과가 있으면 그것만 사용, 없으면 카테고리 일치 결과 사용
        placesWithDistance = exactMatches.length > 0 ? exactMatches : categoryMatches;

        // 사용자 위치가 있으면 반경 5km 내 필터링 및 거리순 정렬
        if (hasUserLocation) {
          // 반경 5km 내 필터링
          placesWithDistance = placesWithDistance.filter((place: any) => {
            return place.distance !== undefined && place.distance <= MAX_RADIUS;
          });
          
          // 거리순으로 정렬
          placesWithDistance.sort((a: any, b: any) => {
            const distA = a.distance || Infinity;
            const distB = b.distance || Infinity;
            return distA - distB;
          });
        }

        // 상위 10개만 선택
        const top10Places = placesWithDistance.slice(0, 10);

        if (top10Places.length === 0) {
          setIsSearching(false);
          toast({
            title: t.toast.searchNoResults,
            description: t.toast.searchNoResultsDesc,
            variant: "destructive",
          });
          return;
        }

        // 각 장소에 마커 표시 (A, B, C... 라벨 포함)
        const newPlaceMarkers = top10Places.map((place: any, index: number) => {
          const coords = new window.kakao.maps.LatLng(place.lat, place.lng);
          const markerLabel = String.fromCharCode(65 + index); // A, B, C...
          
          // 마커에 라벨 포함
          const markerContent = document.createElement('div');
          markerContent.innerHTML = createPlaceMarkerContent(
            place.place_name || place.address_name,
            place.distance,
            markerLabel
          );
          markerContent.style.cursor = 'pointer';

          const customOverlay = new window.kakao.maps.CustomOverlay({
            position: coords,
            content: markerContent,
            yAnchor: 1,
            zIndex: 10001, // 메모 마커보다 위에 표시
          });

          // 마커 클릭 이벤트 - 사이드바에서 해당 항목으로 스크롤
          const clickHandler = () => {
            map.setCenter(coords);
            map.setLevel(3);
            // 사이드바가 열려있으면 해당 항목으로 스크롤 (선택적)
          };

          markerContent.addEventListener('click', clickHandler);
          customOverlay.setMap(map);

          return {
            overlay: customOverlay,
            placeInfo: { ...place, markerLabel },
          };
        });

        setSearchPlaceMarkers(newPlaceMarkers);
        setSearchResults(top10Places); // 사이드바에 표시할 결과 저장
        setCurrentSearchQuery(searchQuery); // 검색어 저장 (사이드바 헤더용)
        setIsSearchSidebarOpen(true); // 사이드바 열기

        // 첫 번째 장소로 지도 중심 이동
        if (top10Places.length > 0) {
          const firstPlace = top10Places[0];
          const centerCoords = new window.kakao.maps.LatLng(firstPlace.lat, firstPlace.lng);
          map.setCenter(centerCoords);
          map.setLevel(5); // 약간 줌 아웃하여 여러 마커 보이도록
        }

        setIsLocationLocked(false);
        setIsSearching(false);

        toast({
          title: t.toast.searchComplete,
          description: t.toast.searchCompleteDesc
            .replace('{count}', top10Places.length.toString())
            .replace('{radius}', hasUserLocation ? ` (5km 반경 내 장소 검색, 거리순)` : ' (5km 반경 내 장소 검색)'),
        });
        
        setSearchQuery("");
        return;
      }
      
      // 플레이스 검색도 실패한 경우
      setIsSearching(false);
      toast({
        title: t.toast.searchFailed,
        description: t.toast.searchFailedDesc,
        variant: "destructive",
      });
    }, searchOptions); // 플레이스 검색 옵션: 현재 위치 기준, 5km 반경, 거리순 정렬
    }); // 주소 검색 콜백 종료
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchAddress();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    // 검색 마커들 제거
    if (searchMarker) {
      searchMarker.setMap(null);
      setSearchMarker(null);
    }
    searchPlaceMarkers.forEach(marker => {
      if (marker.overlay) {
        marker.overlay.setMap(null);
      }
    });
    setSearchPlaceMarkers([]);
    setSearchResults([]);
    setCurrentSearchQuery("");
    setIsSearchSidebarOpen(false);
    // 검색 취소 시 메모 핀들이 자동으로 다시 표시됨 (useEffect에서 처리)
  };

  const handlePlaceClick = (place: any) => {
    if (!map || !window.kakao?.maps) return;
    
    // 좌표 유효성 검사
    const lat = place.lat ?? parseFloat(place.y);
    const lng = place.lng ?? parseFloat(place.x);
    
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      toast({
        title: t.toast.locationError,
        description: t.toast.locationErrorDesc,
        variant: "destructive",
      });
      return;
    }
    
    const coords = new window.kakao.maps.LatLng(lat, lng);
    map.setCenter(coords);
    map.setLevel(3);
    
    // 사이드바 닫기
    setIsSearchSidebarOpen(false);
    
    toast({
      title: place.place_name || place.address_name,
      description: `${place.road_address_name || place.address_name || ''}${place.distance !== undefined ? ` (${Math.round(place.distance)}m)` : ''}`,
    });
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
        title: t.toast.mapLockEnabled,
        description: t.toast.mapLockEnabledDesc,
      });
    } else {
      // 지도 고정 해제: 드래그와 줌 활성화
      map.setDraggable(true);
      map.setZoomable(true);
      toast({
        title: t.toast.mapLockDisabled,
        description: t.toast.mapLockDisabledDesc,
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
          {/* 검색 결과 사이드바 (카카오맵 스타일) */}
          <Sheet open={isSearchSidebarOpen} onOpenChange={setIsSearchSidebarOpen}>
            <SheetContent side="left" className="w-full sm:w-96 p-0 overflow-hidden">
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <SheetTitle className="text-lg font-semibold">
                      {currentSearchQuery ? `"${currentSearchQuery}" 검색 결과` : '검색 결과'}
                    </SheetTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      장소 {searchResults.length}개
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleClearSearch}
                    title="검색 취소"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)]">
                <div className="px-4 py-4 space-y-2">
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>검색 결과가 없습니다</p>
                    </div>
                  ) : (
                    searchResults.map((place: any, index: number) => (
                      <div
                        key={place.id || index}
                        onClick={() => handlePlaceClick(place)}
                        className="p-4 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <h3 className="font-semibold text-base truncate">
                                {place.place_name || place.address_name}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                              {place.road_address_name || place.address_name || ''}
                            </p>
                            {place.category_name && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {place.category_name.split('>').pop()?.trim()}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {place.distance !== undefined && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {Math.round(place.distance)}m
                                </span>
                              )}
                              {place.phone && (
                                <span>{place.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div 
            ref={mapRef} 
            className={`w-full h-full ${isCoupleTheme ? 'map-container-couple-theme' : ''}`} 
            data-testid="map-container" 
          />
          
          {/* 위치 고정 모드 상태 배너 */}
          {isLocationLocked && (
            <div className={`absolute ${isCoupleTheme ? 'top-[calc(12.1rem+1rem)] sm:top-[calc(13.1rem+1rem)]' : 'top-[calc(5rem+1rem)]'} left-1/2 -translate-x-1/2 z-50 pointer-events-none px-2`}>
              <div 
                className={`relative text-white rounded-2xl flex items-center whitespace-nowrap overflow-hidden ${
                  isCoupleTheme 
                    ? 'px-7 py-5 sm:px-10 sm:py-6 gap-5 sm:gap-6' 
                    : 'px-4 py-2.5 sm:px-5 sm:py-3 gap-2.5 sm:gap-3'
                }`}
                style={{
                  background: isCoupleTheme ? '#779EF3' : '#8fa0d8',
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
                  className={`flex-shrink-0 relative z-10 ${
                    isCoupleTheme 
                      ? 'h-8.5 w-8.5 sm:h-10 sm:w-10' 
                      : 'h-4 w-4 sm:h-5 sm:w-5'
                  }`}
                  style={{ 
                    filter: 'drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.25))',
                  }} 
                />
                <span 
                  className={`font-medium leading-tight relative z-10 ${
                    isCoupleTheme 
                      ? 'text-[24px] sm:text-[24px] md:text-[24px]' 
                      : 'text-[12px] sm:text-[13px] md:text-[14px]'
                  }`}
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
            <div className={`absolute ${isCoupleTheme ? 'top-[calc(12.1rem+1rem)] sm:top-[calc(13.1rem+1rem)]' : 'top-[calc(5rem+1rem)]'} left-1/2 -translate-x-1/2 z-50 px-2`}>
              <button
                onClick={onSaveMap}
                className={`relative text-white rounded-2xl flex items-center whitespace-nowrap overflow-hidden ${
                  isCoupleTheme 
                    ? 'px-7 py-5 sm:px-10 sm:py-6 gap-5 sm:gap-6' 
                    : 'px-4 py-2.5 sm:px-5 sm:py-3 gap-2.5 sm:gap-3'
                } cursor-pointer hover:scale-105 active:scale-95 transition-transform`}
                style={{
                  background: isCoupleTheme ? '#a78bfa' : '#a78bfa',
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
                  className={`flex-shrink-0 relative z-10 ${
                    isCoupleTheme 
                      ? 'h-8.5 w-8.5 sm:h-10 sm:w-10' 
                      : 'h-4 w-4 sm:h-5 sm:w-5'
                  }`}
                  style={{ 
                    filter: 'drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.25))',
                  }} 
                />
                <span 
                  className={`font-medium leading-tight relative z-10 ${
                    isCoupleTheme 
                      ? 'text-[24px] sm:text-[24px] md:text-[24px]' 
                      : 'text-[12px] sm:text-[13px] md:text-[14px]'
                  }`}
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
          
          {/* MemoWay 로고 - 커플 테마에서만 표시 */}
          {isCoupleTheme && (
            <div className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 sm:gap-4 whitespace-nowrap">
              <div className="relative flex-shrink-0">
                <MapPin className="h-8 w-8 sm:h-14 sm:w-14 text-[#A28DB3] drop-shadow-md" fill="currentColor" />
              </div>
              <span className="text-3xl sm:text-5xl font-bold text-[#A28DB3] tracking-tight drop-shadow-md">
                Memo Way
              </span>
            </div>
          )}

          {/* 주소 검색 바 */}
          <div className={`absolute ${isCoupleTheme ? 'top-[5.5rem] sm:top-[6.5rem]' : 'top-4'} ${isCoupleTheme ? 'left-3 right-3' : 'left-4 right-4'} z-10`}>
            <div className="flex flex-col gap-2">
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
                  onClick={handleSearchAddress}
                  disabled={!searchQuery.trim() || isSearching}
                  className="h-10 w-10 flex-shrink-0"
                  data-testid="button-search-address"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>

              {/* 검색 결과 취소 버튼 (검색 결과가 있을 때 표시) */}
              {(searchMarker !== null || searchPlaceMarkers.length > 0) && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleClearSearch}
                    variant="default"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center gap-2"
                    data-testid="button-cancel-search-results"
                  >
                    <X className="h-4 w-4" />
                    <span>검색 결과 취소</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

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
                    
                    // 위치 고정을 활성화할 때, 현재 위치로 지도 이동 및 적절한 줌 레벨 설정
                    if (newLockState && map && currentUserLocation) {
                      const latlng = new window.kakao.maps.LatLng(currentUserLocation.lat, currentUserLocation.lng);
                      // 적당한 줌 레벨로 설정 (레벨 3: 시/도 단위, 레벨 4: 시/군/구 단위)
                      map.setLevel(3);
                      map.panTo(latlng);
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
                  onClick={() => setGroupFilterOpen(true)}
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
                  onClick={() => setMarkerFilterOpen(true)}
                  data-testid="button-marker-filter"
                >
                  <Filter className={`${isCoupleTheme ? 'h-[30px] w-[30px]' : 'h-5 w-5'} ${isCoupleTheme ? 'text-white' : 'text-primary-foreground'}`} />
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
                <p>{t.common.markerFilter}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* 마커 필터 다이얼로그 */}
          <Dialog open={markerFilterOpen} onOpenChange={setMarkerFilterOpen}>
            <DialogContent className="sm:max-w-sm" data-testid="dialog-marker-filter">
              <DialogHeader>
                <DialogTitle>{t.common.markerFilter}</DialogTitle>
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
                <DialogTitle>{t.common.groupFilter}</DialogTitle>
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
                  <span>{t.common.allGroups}</span>
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

// React.memo로 메모이제이션하여 불필요한 리렌더링 방지
export const MapView = memo(MapViewComponent);
