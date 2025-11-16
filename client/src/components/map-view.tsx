import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation, Search, X } from "lucide-react";
import { loadKakaoMaps } from "@/lib/kakao-maps";
import { useToast } from "@/hooks/use-toast";
import type { MemoWithDetails } from "@shared/schema";

interface MapViewProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
  memos: MemoWithDetails[];
  onMarkerClick: (memoId: string) => void;
  onClusterClick?: (memoIds: string[]) => void;
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (map: any) => void;
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

function createMarkerContent(color: string, iconType: string = 'default'): string {
  const iconPath = getMarkerIconPath(iconType);
  return `
    <div 
      style="
        position: relative;
        width: 30px;
        height: 40px;
        cursor: pointer;
      "
      data-marker-icon="${iconType}"
      aria-label="${iconType} 마커"
    >
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
              fill="${color}" 
              stroke="#ffffff" 
              stroke-width="2"/>
        <circle cx="15" cy="15" r="8" fill="#ffffff"/>
        <g transform="translate(6, 6)" fill="${color}">
          <path d="${iconPath}" />
        </g>
      </svg>
    </div>
  `;
}

function createClusterMarkerContent(color: string, count: number, iconType: string = 'default'): string {
  const iconPath = getMarkerIconPath(iconType);
  return `
    <div 
      style="
        position: relative;
        width: 30px;
        height: 40px;
        cursor: pointer;
      "
      data-marker-icon="${iconType}"
      data-marker-count="${count}"
      aria-label="${iconType} 마커 클러스터 (${count}개)"
    >
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
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
        top: -8px;
        right: -8px;
        background-color: #ef4444;
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        pointer-events: none;
      ">${count}</div>
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

export function MapView({ onLocationSelect, memos, onMarkerClick, onClusterClick, userLocation, onMapReady }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [searchMarker, setSearchMarker] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const markerClickedRef = useRef(false);
  const { toast } = useToast();

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

  // Register map click handler with fresh memos
  useEffect(() => {
    if (!map || !window.kakao?.maps) return;

    const handleMapClick = (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      
      // Delay to allow marker click handler to execute first and set the flag
      setTimeout(() => {
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
      }, 50); // 50ms delay to allow marker click to set flag
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

    const clusters = groupMemosByLocation(memos);
    
    const newMarkers = clusters.map(cluster => {
      const position = new window.kakao.maps.LatLng(cluster.lat, cluster.lng);
      
      const isSingleMemo = cluster.memos.length === 1;
      const memo = cluster.memos[0];
      
      let markerColor: string;
      let markerIcon: string = 'default';
      if (isSingleMemo) {
        markerColor = memo.group?.color || PERSONAL_MEMO_COLOR;
        // 메모의 markerIcon을 우선 사용, 없으면 그룹의 markerIcon 사용
        markerIcon = (memo as any)?.markerIcon || (memo.group as any)?.markerIcon || 'default';
      } else {
        const colors = cluster.memos.map(m => m.group?.color || PERSONAL_MEMO_COLOR);
        const uniqueColors = new Set(colors);
        markerColor = uniqueColors.size === 1 ? colors[0] : '#6b7280';
        
        // 메모의 markerIcon을 우선 사용, 없으면 그룹의 markerIcon 사용
        const icons = cluster.memos.map(m => (m as any)?.markerIcon || (m.group as any)?.markerIcon || 'default');
        const uniqueIcons = new Set(icons);
        markerIcon = uniqueIcons.size === 1 ? icons[0] : 'default';
      }
      
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = isSingleMemo 
        ? createMarkerContent(markerColor, markerIcon)
        : createClusterMarkerContent(markerColor, cluster.memos.length, markerIcon);
      contentDiv.style.cursor = 'pointer';
      
      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: contentDiv,
        yAnchor: 1,
      });
      
      customOverlay.setMap(map);
      
      const clickHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Set flag to prevent map click handler from firing
        markerClickedRef.current = true;
        
        // Execute immediately
        if (isSingleMemo) {
          onMarkerClick(memo.id);
        } else if (onClusterClick) {
          onClusterClick(cluster.memos.map(m => m.id));
        }
        
        // Reset flag after a delay
        setTimeout(() => {
          markerClickedRef.current = false;
        }, 100);
      };
      
      contentDiv.addEventListener('click', clickHandler);

      return { 
        overlay: customOverlay, 
        element: contentDiv,
        handler: clickHandler
      };
    });

    setMarkers(newMarkers);

    return () => {
      newMarkers.forEach(marker => {
        if (marker.handler && marker.element) {
          marker.element.removeEventListener('click', marker.handler);
        }
        if (marker.overlay) {
          marker.overlay.setMap(null);
        }
      });
    };
  }, [map, memos, onMarkerClick, onClusterClick]);

  useEffect(() => {
    if (!map || !userLocation) return;

    const position = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    map.setCenter(position);

    const circle = new window.kakao.maps.Circle({
      center: position,
      radius: 50,
      strokeWeight: 2,
      strokeColor: '#2563eb',
      strokeOpacity: 0.8,
      fillColor: '#3b82f6',
      fillOpacity: 0.3,
    });
    circle.setMap(map);
  }, [map, userLocation]);

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
          
          {/* 주소 검색 바 */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="flex gap-2 bg-background rounded-2xl shadow-lg p-2">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="주소를 입력하세요 (예: 서울시 강남구 역삼동)"
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
          
          <Button
            size="icon"
            className="absolute bottom-20 right-4 h-12 w-12 rounded-full shadow-lg"
            onClick={handleMyLocation}
            data-testid="button-my-location"
          >
            <Navigation className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
}
