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
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (map: any) => void;
}

const PERSONAL_MEMO_COLOR = '#9333ea';

function createMarkerContent(color: string): string {
  return `
    <div style="
      position: relative;
      width: 30px;
      height: 40px;
      cursor: pointer;
    ">
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
              fill="${color}" 
              stroke="#ffffff" 
              stroke-width="2"/>
        <circle cx="15" cy="15" r="6" fill="#ffffff"/>
      </svg>
    </div>
  `;
}

export function MapView({ onLocationSelect, memos, onMarkerClick, userLocation, onMapReady }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const markerClickedRef = useRef(false);
  const { toast } = useToast();

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

        window.kakao.maps.event.addListener(kakaoMap, 'click', function(mouseEvent: any) {
          // Ignore map clicks if a marker was just clicked
          if (markerClickedRef.current) {
            markerClickedRef.current = false;
            return;
          }
          
          const latlng = mouseEvent.latLng;
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
        });
      })
      .catch((error) => {
        console.error("Failed to load Kakao Maps:", error);
        setMapError("지도를 불러올 수 없습니다. API 키를 확인해주세요.");
      });
  }, [mapRef.current]);

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

    const newMarkers = memos.map(memo => {
      const position = new window.kakao.maps.LatLng(memo.latitude, memo.longitude);
      
      const markerColor = memo.group?.color || PERSONAL_MEMO_COLOR;
      
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = createMarkerContent(markerColor);
      contentDiv.style.cursor = 'pointer';
      
      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: contentDiv,
        yAnchor: 1,
      });
      
      customOverlay.setMap(map);
      
      const clickHandler = (e: Event) => {
        e.stopPropagation();
        markerClickedRef.current = true;
        onMarkerClick(memo.id);
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
  }, [map, memos, onMarkerClick]);

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
