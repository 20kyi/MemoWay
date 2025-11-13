import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { loadKakaoMaps } from "@/lib/kakao-maps";

interface MapViewProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; buildingName: string }) => void;
  memos: Array<{ id: string; latitude: number; longitude: number; buildingName: string; photos: Array<{ url: string }> }>;
  onMarkerClick: (memoId: string) => void;
  userLocation: { lat: number; lng: number } | null;
  onMapReady?: (map: any) => void;
}

export function MapView({ onLocationSelect, memos, onMarkerClick, userLocation, onMapReady }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const markerClickedRef = useRef(false);

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

    markers.forEach(marker => marker.setMap(null));

    const newMarkers = memos.map(memo => {
      const position = new window.kakao.maps.LatLng(memo.latitude, memo.longitude);
      const marker = new window.kakao.maps.Marker({
        position,
        map,
        clickable: true,
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        // Set flag to prevent map click handler from firing
        markerClickedRef.current = true;
        onMarkerClick(memo.id);
      });

      return marker;
    });

    setMarkers(newMarkers);
  }, [map, memos]);

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
